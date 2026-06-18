import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import pool from '../db';

const router = Router();

// GET /api/v1/seed — Re-run seed data (development only)
router.get('/seed', async (_req: Request, res: Response) => {
  if (process.env.NODE_ENV !== 'development') {
    res.status(403).json({ error: 'Seed endpoint is only available in development mode' });
    return;
  }

  try {
    // Resolve seed.sql relative to the project root.
    // Server must be run from social-media-dashboard/ directory.
    // Override via SEED_SQL_PATH env var if needed.
    const seedPath = process.env.SEED_SQL_PATH || path.resolve(process.cwd(), 'database/seed.sql');

    if (!fs.existsSync(seedPath)) {
      res.status(500).json({ error: 'Seed SQL file not found' });
      return;
    }

    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await pool.query(seedSql);

    res.json({ seeded: true });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ error: 'Failed to seed database' });
  }
});

export default router;
