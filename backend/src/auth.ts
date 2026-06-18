import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from './db';
import { authenticate, JwtPayload } from './middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'smm-dev-secret-key-2026';

// POST /api/v1/auth/login
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const result = await pool.query(
      `SELECT id, username, password_hash, display_name, email, avatar, role
       FROM users WHERE username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
      role: user.role || 'admin',
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || undefined,
        displayName: user.display_name,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/auth/logout — No-op for stateless JWT auth
router.post('/auth/logout', (_req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

// GET /api/v1/auth/me
router.get('/auth/me', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, avatar, display_name, role
       FROM users WHERE id = $1`,
      [req.user!.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar || undefined,
      displayName: user.display_name,
      role: user.role,
    });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
