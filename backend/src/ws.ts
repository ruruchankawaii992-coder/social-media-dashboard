import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from './middleware/auth';
import type { Platform, WsMessage } from '../../shared/types';
import type {
  FeedUpdatePayload,
  MetricsUpdatePayload,
  ConnectionAckPayload,
  AuthErrorPayload,
} from '../../shared/websocket';

const JWT_SECRET = process.env.JWT_SECRET || 'smm-dev-secret-key-2026';

const PLATFORMS: Platform[] = ['twitter', 'instagram', 'linkedin'];

// ---- Mock content pools (17 unique items per platform) ----
const MOCK_CONTENT: Record<Platform, string[]> = {
  twitter: [
    'Excited to announce our new feature launch! 🚀 #innovation #tech',
    'Great insights from today\'s team meeting. Collaboration is key! 🤝',
    'Just hit 10k followers! Thank you all for the support 🙏',
    'Our latest blog post is live — check it out! Link in bio 🔗',
    'Happy Monday! Starting the week with a fresh perspective ✨',
    'Customer feedback is the lifeblood of improvement. Always listening 👂',
    'Behind every great product is an amazing team. Proud of ours! 💪',
    'New industry report just dropped. Some surprising trends 📊',
    'Throwback to our first product launch. How far we\'ve come! 🕰️',
    'Tip of the day: Consistency beats intensity every time ⏰',
    'Weekend vibes! What\'s everyone working on? 🛠️',
    'We\'re hiring! Join our amazing team. Link in bio 📢',
    'Just wrapped up an incredible client call. The future is bright! ☀️',
    'Interesting thread on AI trends this morning. Worth a read 🧵',
    'Grateful for our community. You make it all worthwhile ❤️',
    'Product update v2.1 is rolling out now. Check your dashboard! 🆕',
    'Morning coffee + Twitter = my productivity hack ☕',
  ],
  instagram: [
    'Sunset vibes from the office rooftop! 🌅 #OfficeLife #Sunset',
    'Behind the scenes of our latest photoshoot 📸✨',
    'Team lunch celebrating our Q2 wins! 🎉 #TeamGoals',
    'New collection drop — swipe to see more! 🆕 #NewArrivals',
    'Morning routine: coffee, code, repeat ☕💻',
    'Our creative space reimagined. Welcome to the new studio! 🏢',
    'Friday feels! Who else is ready for the weekend? 🙌',
    'Workshop mode: activated. Learning never stops 📚',
    'City lights from our office window. Dream big! 🌃',
    'Sneak peek of something we\'ve been cooking up 🍳',
    'Appreciation post for our incredible community ❤️',
    'New branding, who dis? Fresh look just dropped 🔥',
    'Office pets day! Meet our furry team members 🐾',
    'Wall art that inspires us daily. What\'s your favorite quote? 🎨',
    'Golden hour at the workspace. Pure magic ✨',
    'Celebrating diversity and inclusion every single day 🌈',
    'Late night grind. The best ideas come after midnight 🌙',
  ],
  linkedin: [
    'Thrilled to share our Q2 growth metrics — 40% increase in engagement! Key takeaways from our strategy shift.',
    'Key takeaway from today\'s industry webinar: authenticity drives connection in a world of AI-generated content.',
    'I\'m proud to announce that we\'ve been recognized as a top workplace in 2026! A testament to our amazing culture.',
    'New blog post: \'The Future of Social Media Analytics\' — exploring emerging trends in data-driven decision making.',
    'Grateful for the opportunity to speak at last week\'s industry conference. The energy was absolutely incredible.',
    '5 lessons I learned building a product from 0 to 10k users: 1) Listen to early adopters 2) Ship fast 3) Iterate...',
    'Excited to welcome three new team members this month! Expanding our engineering and design teams further.',
    'Reflecting on 10 years in the industry — the one thing that never changes: the importance of relationships.',
    'Our latest case study is live! How we helped a client achieve 3x ROI through targeted social strategy.',
    'Important leadership insight: psychological safety isn\'t a perk — it\'s a competitive advantage for teams.',
    'Just published a comprehensive guide to content scheduling in 2026. Link in the comments below.',
    'Proud moment: our team just shipped the biggest update of the year. Six months of relentless hard work paying off.',
    'The data doesn\'t lie: companies investing in employee development see 34% higher retention rates. Invest in your people.',
    'Attended an inspiring workshop on inclusive design today. Some truly eye-opening perspectives shared.',
    'Celebrating our 500th customer! From idea to 500 clients — the journey has been nothing short of incredible.',
    'New industry partnership announcement! Joining forces to drive innovation in social media analytics.',
    'Weekend reading: \'The Lean Startup\' — still one of the most relevant and practical business books out there.',
  ],
};

// ---- Running metric state (starts from mock pool baselines) ----
interface SimMetrics {
  followers: number;
  engagement: number;
  impressions: number;
  likes: number;
  shares: number;
  comments: number;
}

const BASELINE_METRICS: Record<Platform, SimMetrics> = {
  twitter: { followers: 12400, engagement: 3.2, impressions: 45000, likes: 520, shares: 180, comments: 95 },
  instagram: { followers: 28500, engagement: 4.8, impressions: 92000, likes: 2100, shares: 340, comments: 420 },
  linkedin: { followers: 8200, engagement: 2.9, impressions: 31000, likes: 380, shares: 140, comments: 65 },
};

const currentMetrics: Record<Platform, SimMetrics> = JSON.parse(JSON.stringify(BASELINE_METRICS));

// ---- Helpers ----

/**
 * Apply a random fluctuation of ±percent% to a value.
 */
function fluctuate(value: number, percent: number): number {
  const delta = value * (percent / 100);
  return value + (Math.random() * 2 - 1) * delta;
}

/**
 * Generate a metrics_update payload for a platform, applying small random drift.
 */
function generateMetricsUpdate(platform: Platform): MetricsUpdatePayload {
  const curr = currentMetrics[platform];
  const updated: SimMetrics = {
    followers: Math.round(fluctuate(curr.followers, 2.5)),
    engagement: parseFloat(fluctuate(curr.engagement, 5).toFixed(2)),
    impressions: Math.round(fluctuate(curr.impressions, 3)),
    likes: Math.round(fluctuate(curr.likes, 5)),
    shares: Math.round(fluctuate(curr.shares, 5)),
    comments: Math.round(fluctuate(curr.comments, 5)),
  };
  currentMetrics[platform] = updated;
  return {
    platform,
    metrics: {
      platform,
      timestamp: new Date().toISOString(),
      ...updated,
    },
  };
}

/**
 * Build a typed WsMessage and send it as JSON to a single client.
 * Returns true if the message was sent, false if the connection was not open.
 */
function sendTo<T>(ws: WebSocket, type: string, payload: T): boolean {
  if (ws.readyState !== WebSocket.OPEN) return false;
  const msg: WsMessage<T> = {
    type: type as any,
    payload,
    timestamp: new Date().toISOString(),
  };
  try {
    ws.send(JSON.stringify(msg));
    return true;
  } catch (err) {
    console.error('WebSocket send error:', (err as Error).message);
    return false;
  }
}

/**
 * Broadcast a typed message to all connected clients.
 */
function broadcast(wss: WebSocketServer, type: string, payload: unknown): void {
  const msg = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(msg);
      } catch (err) {
        console.error('WebSocket broadcast error:', (err as Error).message);
      }
    }
  });
}

// ---- WebSocket server factory ----

export function createWebSocketServer(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server });

  // Simulation timers (server-level, not per-client)
  let metricsInterval: ReturnType<typeof setInterval> | null = null;
  let feedTimeout: ReturnType<typeof setTimeout> | null = null;

  function scheduleNextFeed(): void {
    const delay = 5000 + Math.random() * 5000; // 5–10 seconds
    feedTimeout = setTimeout(() => {
      const platform = PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)];
      const pool = MOCK_CONTENT[platform];
      const content = pool[Math.floor(Math.random() * pool.length)];
      const update: FeedUpdatePayload = {
        platform,
        content,
        metrics: {
          likes: Math.round(50 + Math.random() * 450),
          shares: Math.round(10 + Math.random() * 190),
          comments: Math.round(5 + Math.random() * 95),
        },
        timestamp: new Date().toISOString(),
      };
      broadcast(wss, 'feed_update', update);

      // Reschedule if clients are still connected
      if (wss.clients.size > 0) {
        scheduleNextFeed();
      } else {
        feedTimeout = null;
      }
    }, delay);
  }

  function startSimulation(): void {
    if (!metricsInterval) {
      metricsInterval = setInterval(() => {
        for (const platform of PLATFORMS) {
          broadcast(wss, 'metrics_update', generateMetricsUpdate(platform));
        }
      }, 5000);
    }
    if (!feedTimeout) {
      scheduleNextFeed();
    }
  }

  function stopSimulation(): void {
    if (metricsInterval !== null) {
      clearInterval(metricsInterval);
      metricsInterval = null;
    }
    if (feedTimeout !== null) {
      clearTimeout(feedTimeout);
      feedTimeout = null;
    }
  }

  // ---- Connection handler ----

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    // Parse token from query string: ws://host:4000?token=xxx
    const url = new URL(req.url || '', 'http://localhost');
    const token = url.searchParams.get('token');

    if (!token) {
      sendTo<AuthErrorPayload>(ws, 'auth_error', {
        message: 'Authentication required. Provide a valid JWT token as ?token= parameter.',
      });
      ws.close(4001, 'auth_required');
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

      // Acknowledge successful connection
      sendTo<ConnectionAckPayload>(ws, 'connection_ack', {
        clientId: decoded.userId,
        message: `Connected as ${decoded.username}. Real-time feed active.`,
      });

      // Start simulation if this is the first active client
      startSimulation();
    } catch {
      sendTo<AuthErrorPayload>(ws, 'auth_error', {
        message: 'Invalid or expired token. Authentication required.',
      });
      ws.close(4001, 'auth_required');
    }

    // ---- Client disconnect ----

    ws.on('close', () => {
      // Stop simulation when the last client leaves
      if (wss.clients.size === 0) {
        stopSimulation();
      }
    });

    ws.on('error', (err) => {
      console.error('WebSocket client error:', err.message);
    });
  });

  // ---- Graceful shutdown ----

  const shutdown = (): void => {
    stopSimulation();
    wss.clients.forEach((client) => {
      client.close(1001, 'Server shutting down');
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return wss;
}
