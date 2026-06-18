import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();

const AGE_GROUP_COLORS: Record<string, string> = {
  '18-24': '#818cf8',
  '25-34': '#c084fc',
  '35-44': '#f472b6',
  '45+': '#fb923c',
};

// GET /api/v1/insights/audience — Demographic segments for a platform
router.get('/insights/audience', authenticate, async (req: Request, res: Response) => {
  try {
    const platform = req.query.platform as string;

    if (!platform) {
      res.status(400).json({ error: 'Platform query parameter is required' });
      return;
    }

    if (!['twitter', 'instagram', 'linkedin'].includes(platform)) {
      res.status(400).json({ error: 'Platform must be one of: twitter, instagram, linkedin' });
      return;
    }

    const result = await pool.query(
      `SELECT age_group, percentage
       FROM audience_insights
       WHERE platform = $1 AND snapshot_date = CURRENT_DATE
       ORDER BY age_group`,
      [platform]
    );

    const segments = result.rows.map((row: any) => ({
      label: row.age_group,
      percentage: Number(row.percentage),
      color: AGE_GROUP_COLORS[row.age_group] || '#94a3b8',
    }));

    res.json(segments);
  } catch (err) {
    console.error('Audience insights error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/insights/activity — Hourly activity distribution
router.get('/insights/activity', authenticate, async (req: Request, res: Response) => {
  try {
    const platform = req.query.platform as string;

    if (!platform) {
      res.status(400).json({ error: 'Platform query parameter is required' });
      return;
    }

    if (!['twitter', 'instagram', 'linkedin'].includes(platform)) {
      res.status(400).json({ error: 'Platform must be one of: twitter, instagram, linkedin' });
      return;
    }

    // Get the peak active_hour from audience_insights
    const peakResult = await pool.query(
      `SELECT active_hour, active_hour_percentage
       FROM audience_insights
       WHERE platform = $1 AND snapshot_date = CURRENT_DATE AND active_hour IS NOT NULL
       LIMIT 1`,
      [platform]
    );

    const peakHour = peakResult.rows.length > 0 ? Number(peakResult.rows[0].active_hour) : 12;
    const peakPct = peakResult.rows.length > 0 ? Number(peakResult.rows[0].active_hour_percentage) : 15;

    // Generate 24-hour bell-curve distribution around peak hour
    const activity: { hour: number; posts: number; engagement: number }[] = [];
    for (let h = 0; h < 24; h++) {
      // Normal distribution spread around peakHour
      const spread = Math.exp(-Math.pow(h - peakHour, 2) / 30);
      // Business-hour boost (more activity 9-17)
      const boost = (h >= 9 && h <= 17) ? 1.3 : 1.0;
      const posts = Math.round(15 * spread * boost * (peakPct / 15));
      const engagement = Math.round(posts * (5 - Math.abs(h - peakHour) * 0.2));
      activity.push({ hour: h, posts: Math.max(0, posts), engagement });
    }

    res.json(activity);
  } catch (err) {
    console.error('Activity insights error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
