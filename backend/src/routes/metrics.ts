import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();

const PLATFORM_META: Record<string, { label: string; color: string }> = {
  twitter: { label: 'Twitter', color: '#1DA1F2' },
  instagram: { label: 'Instagram', color: '#E4405F' },
  linkedin: { label: 'LinkedIn', color: '#0A66C2' },
};

// GET /api/v1/metrics/latest — Return 4 KPI cards
router.get('/metrics/latest', authenticate, async (_req: Request, res: Response) => {
  try {
    const platforms = ['twitter', 'instagram', 'linkedin'];
    const cards: any[] = [];
    let totalFollowers = 0;
    let totalChangeRaw = 0;
    let count = 0;

    for (const platform of platforms) {
      // Latest snapshot
      const latestResult = await pool.query(
        `SELECT followers, engagement, impressions
         FROM metric_snapshots
         WHERE platform = $1
         ORDER BY timestamp DESC LIMIT 1`,
        [platform]
      );

      // Snapshot from 7+ days ago for change comparison
      const weekAgoResult = await pool.query(
        `SELECT followers
         FROM metric_snapshots
         WHERE platform = $1 AND timestamp <= NOW() - INTERVAL '7 days'
         ORDER BY timestamp DESC LIMIT 1`,
        [platform]
      );

      if (latestResult.rows.length === 0) continue;

      const latest = latestResult.rows[0];
      const weekAgo = weekAgoResult.rows[0];

      totalFollowers += Number(latest.followers);
      count++;

      const prevFollowers = weekAgo ? Number(weekAgo.followers) : Number(latest.followers);
      const rawChange = prevFollowers > 0
        ? ((Number(latest.followers) - prevFollowers) / prevFollowers) * 100
        : 0;

      totalChangeRaw += rawChange;

      cards.push({
        platform,
        label: PLATFORM_META[platform].label,
        value: Number(latest.followers),
        change: Math.abs(Math.round(rawChange * 100) / 100),
        changeDirection: rawChange >= 0 ? 'up' : 'down',
        color: PLATFORM_META[platform].color,
      });
    }

    // Total aggregate card
    const avgChange = count > 0 ? totalChangeRaw / count : 0;
    cards.push({
      platform: 'total',
      label: 'Total',
      value: totalFollowers,
      change: Math.abs(Math.round(avgChange * 100) / 100),
      changeDirection: avgChange >= 0 ? 'up' : 'down',
      color: '#c084fc',
    });

    res.json(cards);
  } catch (err) {
    console.error('Metrics error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/metrics/history — Time-series data for charts
router.get('/metrics/history', authenticate, async (req: Request, res: Response) => {
  try {
    const platform = req.query.platform as string | undefined;
    const days = parseInt(req.query.days as string, 10) || 14;
    const since = new Date();
    since.setDate(since.getDate() - days);

    if (platform && !['twitter', 'instagram', 'linkedin'].includes(platform)) {
      res.status(400).json({ error: 'Platform must be one of: twitter, instagram, linkedin' });
      return;
    }

    if (platform) {
      const result = await pool.query(
        `SELECT DATE(timestamp) AS date,
                ROUND(AVG(followers))::int AS followers,
                ROUND(AVG(engagement)::numeric, 2) AS engagement,
                ROUND(AVG(impressions))::int AS impressions
         FROM metric_snapshots
         WHERE platform = $1 AND timestamp >= $2
         GROUP BY DATE(timestamp)
         ORDER BY date ASC`,
        [platform, since]
      );
      res.json(result.rows);
    } else {
      const result = await pool.query(
        `SELECT DATE(timestamp) AS date,
                platform,
                ROUND(AVG(followers))::int AS followers,
                ROUND(AVG(engagement)::numeric, 2) AS engagement,
                ROUND(AVG(impressions))::int AS impressions
         FROM metric_snapshots
         WHERE timestamp >= $1
         GROUP BY DATE(timestamp), platform
         ORDER BY date ASC`,
        [since]
      );
      res.json(result.rows);
    }
  } catch (err) {
    console.error('Metrics history error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
