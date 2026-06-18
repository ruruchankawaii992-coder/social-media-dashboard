import { randomUUID } from 'crypto';
import { Pool, PoolClient } from 'pg';

// Try to connect to real Postgres; fall back to in-memory mock if unavailable
const USE_MOCK = process.env.SMM_USE_MOCK === 'true' || process.env.USE_MOCK_DB === 'true';

// ---- In-memory mock data ----
// We pre-compute the bcrypt hash for "password123" so login works:
// Generated via: await bcrypt.hash("password123", 10)
const ADMIN_PASSWORD_HASH = '$2b$10$CirX292l78.bYwIALGe5l.tCVNag086dxqiQOAlz2V48rH1cljZWC';

const MOCK_USERS = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    username: 'admin',
    password_hash: ADMIN_PASSWORD_HASH,
    display_name: 'Admin',
    email: 'admin@smm.local',
    avatar: null,
    role: 'admin',
    created_at: new Date(),
  },
];

interface MockPost {
  id: string;
  platform: string;
  content: string;
  media_url: string | null;
  status: string;
  scheduled_at: Date | null;
  published_at: Date | null;
  engagement_score: number;
  likes: number;
  shares: number;
  comments: number;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const MOCK_POSTS: MockPost[] = [];

const MOCK_METRICS_BY_PLATFORM: Record<
  string,
  { followers: number; engagement: number; impressions: number; likes: number; shares: number; comments: number; timestamp: Date }[]
> = {
  twitter: [
    { followers: 12400, engagement: 3.2, impressions: 45000, likes: 520, shares: 180, comments: 95, timestamp: new Date() },
    { followers: 12100, engagement: 3.5, impressions: 42000, likes: 480, shares: 160, comments: 88, timestamp: new Date(Date.now() - 7 * 86400000) },
    { followers: 11800, engagement: 3.1, impressions: 40000, likes: 450, shares: 150, comments: 82, timestamp: new Date(Date.now() - 14 * 86400000) },
  ],
  instagram: [
    { followers: 28500, engagement: 4.8, impressions: 92000, likes: 2100, shares: 340, comments: 420, timestamp: new Date() },
    { followers: 27800, engagement: 4.6, impressions: 88000, likes: 1950, shares: 310, comments: 390, timestamp: new Date(Date.now() - 7 * 86400000) },
    { followers: 26500, engagement: 4.4, impressions: 84000, likes: 1800, shares: 290, comments: 360, timestamp: new Date(Date.now() - 14 * 86400000) },
  ],
  linkedin: [
    { followers: 8200, engagement: 2.9, impressions: 31000, likes: 380, shares: 140, comments: 65, timestamp: new Date() },
    { followers: 7900, engagement: 2.7, impressions: 29000, likes: 350, shares: 120, comments: 58, timestamp: new Date(Date.now() - 7 * 86400000) },
    { followers: 7600, engagement: 2.8, impressions: 27500, likes: 330, shares: 110, comments: 52, timestamp: new Date(Date.now() - 14 * 86400000) },
  ],
};

const MOCK_AUDIENCE: Record<string, { age_group: string; percentage: number; active_hour: number; active_hour_percentage: number }[]> = {
  twitter: [
    { age_group: '18-24', percentage: 25, active_hour: 14, active_hour_percentage: 18 },
    { age_group: '25-34', percentage: 35, active_hour: 14, active_hour_percentage: 18 },
    { age_group: '35-44', percentage: 22, active_hour: 14, active_hour_percentage: 18 },
    { age_group: '45+', percentage: 18, active_hour: 14, active_hour_percentage: 18 },
  ],
  instagram: [
    { age_group: '18-24', percentage: 38, active_hour: 20, active_hour_percentage: 22 },
    { age_group: '25-34', percentage: 32, active_hour: 20, active_hour_percentage: 22 },
    { age_group: '35-44', percentage: 18, active_hour: 20, active_hour_percentage: 22 },
    { age_group: '45+', percentage: 12, active_hour: 20, active_hour_percentage: 22 },
  ],
  linkedin: [
    { age_group: '18-24', percentage: 15, active_hour: 10, active_hour_percentage: 14 },
    { age_group: '25-34', percentage: 40, active_hour: 10, active_hour_percentage: 14 },
    { age_group: '35-44', percentage: 28, active_hour: 10, active_hour_percentage: 14 },
    { age_group: '45+', percentage: 17, active_hour: 10, active_hour_percentage: 14 },
  ],
};

// ---- Mock pool ----
class MockPool {
  async query(text: string, params?: any[]): Promise<{ rows: any[]; rowCount: number }> {
    const sql = text.trim().toUpperCase();

    if (sql.startsWith('SELECT')) {
      return this._handleSelect(text, params);
    }
    if (sql.startsWith('INSERT')) {
      return this._handleInsert(text, params);
    }
    if (sql.startsWith('UPDATE')) {
      return this._handleUpdate(text, params);
    }
    if (sql.startsWith('DELETE')) {
      return this._handleDelete(text, params);
    }
    return { rows: [], rowCount: 0 };
  }

  async connect(): Promise<PoolClient> {
    throw new Error('connect() not supported in mock mode');
  }

  async end(): Promise<void> {
    // nothing to clean up
  }

  on(_event: string, _handler: (...args: any[]) => void): void {
    // ignore event handlers
  }

  // ---- SELECT handler ----
  private _handleSelect(text: string, params?: any[]): { rows: any[]; rowCount: number } {
    const upper = text.toUpperCase();

    // users table queries
    if (upper.includes('FROM USERS')) {
      return this._selectUsers(text, params);
    }

    // metric_snapshots queries
    if (upper.includes('FROM METRIC_SNAPSHOTS')) {
      return this._selectMetrics(text, params);
    }

    // audience_insights queries
    if (upper.includes('FROM AUDIENCE_INSIGHTS')) {
      return this._selectAudience(text, params);
    }

    // posts queries
    if (upper.includes('FROM POSTS')) {
      return this._selectPosts(text, params);
    }

    return { rows: [], rowCount: 0 };
  }

  private _selectUsers(_text: string, params?: any[]): { rows: any[]; rowCount: number } {
    const byId = _text.toUpperCase().includes('WHERE ID =');
    if (byId) {
      const user = MOCK_USERS.find((u) => u.id === params?.[0]);
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }
    // Default: search by username (login endpoint)
    const username = params?.[0] || '';
    const user = MOCK_USERS.find((u) => u.username === username);
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
  }

  private _getPlatformFromSelect(text: string, params?: any[]): string | undefined {
    // Look for "WHERE platform = $1" — the $1 param will be the platform
    const platformMatch = text.match(/where\s+(?:p\.)?platform\s*=\s*\$(\d+)/i);
    if (platformMatch) {
      const idx = parseInt(platformMatch[1], 10) - 1;
      const val = params?.[idx];
      if (typeof val === 'string' && ['twitter', 'instagram', 'linkedin'].includes(val)) {
        return val;
      }
    }
    return undefined;
  }

  private _selectMetrics(text: string, params?: any[]): { rows: any[]; rowCount: number } {
    const platform = this._getPlatformFromSelect(text, params);
    // When a specific platform is queried, use its data. Otherwise, flatten all platforms
    // and attach the platform key to each entry so GROUP BY results are correct.
    const allRows: (Record<string, any> & { platform: string })[] = [];
    for (const [plat, entries] of Object.entries(MOCK_METRICS_BY_PLATFORM)) {
      for (const entry of entries) {
        allRows.push({ ...entry, platform: plat });
      }
    }
    const rows = platform
      ? allRows.filter((r) => r.platform === platform)
      : allRows;

    // If LIMIT 1, return latest
    if (text.toUpperCase().includes('LIMIT 1') && rows.length > 0) {
      return { rows: [rows[0]], rowCount: 1 };
    }

    // If there's a date filter (for week-ago comparison), return 2nd entry
    if (text.toUpperCase().includes('INTERVAL') && rows.length > 1) {
      return { rows: [rows[1]], rowCount: 1 };
    }

    // For history queries with GROUP BY, simulate aggregated data
    const lower = text.toLowerCase();
    if (lower.includes('group by') || lower.includes('date(timestamp)')) {
      const historyRows = rows.map((r) => ({
        date: r.timestamp.toISOString().split('T')[0],
        platform: r.platform,
        followers: r.followers,
        engagement: r.engagement,
        impressions: r.impressions,
      }));
      return { rows: historyRows, rowCount: historyRows.length };
    }

    return { rows, rowCount: rows.length };
  }

  private _selectAudience(text: string, params?: any[]): { rows: any[]; rowCount: number } {
    const platform = params?.[0] as string | undefined;
    const data = platform && MOCK_AUDIENCE[platform]
      ? MOCK_AUDIENCE[platform]
      : Object.values(MOCK_AUDIENCE).flat();

    const lower = text.toLowerCase();

    // If querying age_group and percentage (demographics)
    if (lower.includes('age_group') && !lower.includes('active_hour')) {
      const rows = data.map((d) => ({
        age_group: d.age_group,
        percentage: d.percentage,
      }));
      return { rows, rowCount: rows.length };
    }

    // If querying active_hour (activity)
    if (lower.includes('active_hour') && data.length > 0) {
      const first = data[0];
      return {
        rows: [{ active_hour: first.active_hour, active_hour_percentage: first.active_hour_percentage }],
        rowCount: 1,
      };
    }

    return { rows: data, rowCount: data.length };
  }

  private _selectPosts(text: string, params?: any[]): { rows: any[]; rowCount: number } {
    const lower = text.toLowerCase();
    let posts = [...MOCK_POSTS];

    // If there's a WHERE clause for platform
    if (lower.includes('where') && params) {
      // platform filter
      const platformIdx = lower.includes('p.platform') ? params.findIndex((_, i) => {
        // Heuristic: find the first string parameter that's a valid platform
        return typeof params[i] === 'string' && ['twitter', 'instagram', 'linkedin'].includes(params[i]);
      }) : -1;

      if (platformIdx >= 0) {
        posts = posts.filter((p) => p.platform === params[platformIdx]);
      }
    }

    // If WHERE id = $1
    if (params && params.length === 1 && typeof params[0] === 'string') {
      const id = params[0];
      const filtered = posts.filter((p) => p.id === id);
      if (filtered.length > 0) {
        const row = filtered[0];
        // Join with users table
        const user = MOCK_USERS[0];
        return {
          rows: [{
            ...row,
            username: user.username,
            display_name: user.display_name,
            avatar: user.avatar,
          }],
          rowCount: 1,
        };
      }
    }

    // If it's a COUNT query
    if (lower.includes('count(*)')) {
      return { rows: [{ count: posts.length.toString() }], rowCount: 1 };
    }

    // For listing with LIMIT/OFFSET
    const limitMatch = text.match(/LIMIT\s+(\d+)/i);
    const offsetMatch = text.match(/OFFSET\s+(\d+)/i);
    const limit = limitMatch ? parseInt(limitMatch[1], 10) : posts.length;
    const offset = offsetMatch ? parseInt(offsetMatch[1], 10) : 0;
    const sliced = posts.slice(offset, offset + limit);

    // Join with users
    const user = MOCK_USERS[0];
    const rows = sliced.map((p) => ({
      ...p,
      username: user.username,
      display_name: user.display_name,
      avatar: user.avatar,
    }));

    return { rows, rowCount: rows.length };
  }

  // ---- INSERT handler ----
  private _handleInsert(text: string, params?: any[]): { rows: any[]; rowCount: number } {
    if (text.toUpperCase().includes('INTO POSTS')) {
      const [platform, content, mediaUrl, status, scheduledAt, createdBy] = params || [];

      const newPost: MockPost = {
        id: randomUUID(),
        platform: platform || '',
        content: content || '',
        media_url: mediaUrl || null,
        status: status || 'draft',
        scheduled_at: scheduledAt || null,
        published_at: null,
        engagement_score: 0,
        likes: 0,
        shares: 0,
        comments: 0,
        created_by: createdBy || null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      MOCK_POSTS.push(newPost);
      return { rows: [{ ...newPost }], rowCount: 1 };
    }

    return { rows: [], rowCount: 0 };
  }

  // ---- UPDATE handler ----
  private _handleUpdate(text: string, params?: any[]): { rows: any[]; rowCount: number } {
    if (text.toUpperCase().includes('UPDATE POSTS')) {
      // Find by id (last param is id)
      const id = params?.[params.length - 1];
      const idx = MOCK_POSTS.findIndex((p) => p.id === id);
      if (idx === -1) return { rows: [], rowCount: 0 };

      const post = MOCK_POSTS[idx];
      // Apply COALESCE updates: params are [content, status, scheduledAt, mediaUrl, id]
      if (params && params.length >= 4) {
        if (params[0] !== null && params[0] !== undefined) post.content = params[0];
        if (params[1] !== null && params[1] !== undefined) post.status = params[1];
        if (params[2] !== null && params[2] !== undefined) post.scheduled_at = params[2];
        if (params[3] !== null && params[3] !== undefined) post.media_url = params[3];
      }
      post.updated_at = new Date();
      MOCK_POSTS[idx] = post;

      return { rows: [{ ...post }], rowCount: 1 };
    }

    return { rows: [], rowCount: 0 };
  }

  // ---- DELETE handler ----
  private _handleDelete(text: string, params?: any[]): { rows: any[]; rowCount: number } {
    if (text.toUpperCase().includes('DELETE FROM POSTS')) {
      const id = params?.[0];
      const idx = MOCK_POSTS.findIndex((p) => p.id === id);
      if (idx === -1) return { rows: [], rowCount: 0 };
      MOCK_POSTS.splice(idx, 1);
      return { rows: [], rowCount: 1 };
    }

    return { rows: [], rowCount: 0 };
  }
}

// ---- Export ----
const shouldMock = USE_MOCK || !process.env.SMM_DATABASE_URL;

let dbPool: Pool | MockPool;

if (shouldMock) {
  console.log('[db] Using in-memory mock database');
  dbPool = new MockPool();
} else {
  dbPool = new Pool({
    connectionString:
      process.env.SMM_DATABASE_URL ||
      process.env.DATABASE_URL ||
      'postgresql://smm_user:smm_pass@localhost:5432/smm_dashboard',
  });

  (dbPool as Pool).on('error', (err) => {
    console.error('Unexpected database pool error:', err);
    process.exit(-1);
  });
}

export default dbPool;
