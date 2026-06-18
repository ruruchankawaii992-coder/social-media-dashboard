import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();

const VALID_PLATFORMS = ['twitter', 'instagram', 'linkedin'];
const VALID_STATUSES = ['draft', 'scheduled', 'published', 'failed'];

function toDateString(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  // Handle string dates from MockPool
  const d = new Date(val as string);
  return isNaN(d.getTime()) ? String(val) : d.toISOString();
}

function rowToPost(row: any): Record<string, any> {
  return {
    id: row.id,
    platform: row.platform,
    content: row.content,
    mediaUrl: row.media_url || undefined,
    scheduledAt: toDateString(row.scheduled_at),
    status: row.status,
    createdAt: toDateString(row.created_at),
    updatedAt: toDateString(row.updated_at),
    authorId: row.created_by || undefined,
  };
}

// GET /api/v1/posts — List posts with filtering and pagination
router.get('/posts', authenticate, async (req: Request, res: Response) => {
  try {
    const platform = req.query.platform as string | undefined;
    const status = req.query.status as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 0;

    if (platform) {
      idx++;
      conditions.push(`p.platform = $${idx}`);
      params.push(platform);
    }
    if (status) {
      idx++;
      conditions.push(`p.status = $${idx}`);
      params.push(status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total matching rows
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM posts p ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Fetch data with author info
    idx++;
    params.push(limit);
    idx++;
    params.push(offset);

    const dataResult = await pool.query(
      `SELECT p.*, u.username, u.display_name, u.avatar
       FROM posts p
       LEFT JOIN users u ON p.created_by = u.id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${idx - 1} OFFSET $${idx}`,
      params
    );

    const data = dataResult.rows.map((row: any) => {
      const post = rowToPost(row);
      post.author = row.username
        ? {
            username: row.username,
            displayName: row.display_name,
            avatar: row.avatar || undefined,
          }
        : undefined;
      return post;
    });

    res.json({ data, total, page, limit });
  } catch (err) {
    console.error('Posts list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/posts/:id — Get single post
router.get('/posts/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT p.*, u.username, u.display_name, u.avatar
       FROM posts p
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    const row = result.rows[0];
    const post = rowToPost(row);
    post.author = row.username
      ? {
          username: row.username,
          displayName: row.display_name,
          avatar: row.avatar || undefined,
        }
      : undefined;

    res.json(post);
  } catch (err) {
    console.error('Post get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/posts — Create new post
router.post('/posts', authenticate, async (req: Request, res: Response) => {
  try {
    const { platform, content, mediaUrl, scheduledAt } = req.body;

    // Validation
    if (!platform || !VALID_PLATFORMS.includes(platform)) {
      res.status(400).json({
        error: `Platform must be one of: ${VALID_PLATFORMS.join(', ')}`,
      });
      return;
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ error: 'Content is required and cannot be empty' });
      return;
    }

    const status = scheduledAt ? 'scheduled' : 'draft';
    const scheduledAtVal = scheduledAt || null;

    const result = await pool.query(
      `INSERT INTO posts (platform, content, media_url, status, scheduled_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [platform, content.trim(), mediaUrl || null, status, scheduledAtVal, req.user!.userId]
    );

    res.status(201).json(rowToPost(result.rows[0]));
  } catch (err) {
    console.error('Post create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/v1/posts/:id — Update post
router.put('/posts/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check existence
    const existing = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    const post = existing.rows[0];

    // Cannot update published posts
    if (post.status === 'published') {
      res.status(400).json({ error: 'Cannot update a published post' });
      return;
    }

    const { content, status, scheduledAt, mediaUrl } = req.body;

    // Validate status if provided
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      res.status(400).json({
        error: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
      });
      return;
    }

    // Validate content if provided
    if (content !== undefined && (typeof content !== 'string' || content.trim().length === 0)) {
      res.status(400).json({ error: 'Content cannot be empty' });
      return;
    }

    const result = await pool.query(
      `UPDATE posts
       SET content = COALESCE($1, content),
           status = COALESCE($2, status),
           scheduled_at = COALESCE($3, scheduled_at),
           media_url = COALESCE($4, media_url),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        content !== undefined ? content.trim() : null,
        status ?? null,
        scheduledAt !== undefined ? scheduledAt : null,
        mediaUrl !== undefined ? mediaUrl : null,
        id,
      ]
    );

    res.json(rowToPost(result.rows[0]));
  } catch (err) {
    console.error('Post update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/v1/posts/:id — Delete post
router.delete('/posts/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    const post = existing.rows[0];
    const user = req.user!;

    // Only author or admin can delete
    if (post.created_by !== user.userId && user.role !== 'admin') {
      res.status(403).json({ error: 'Not authorized to delete this post' });
      return;
    }

    await pool.query('DELETE FROM posts WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error('Post delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
