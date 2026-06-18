import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import authRouter from './auth';
import metricsRouter from './routes/metrics';
import insightsRouter from './routes/insights';
import postsRouter from './routes/posts';
import seedRouter from './routes/seed';

const app = express();

// Global middleware
app.use(cors());
app.use(express.json());

// Health check (unauthenticated, used by Docker)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// API v1 routes
app.use('/api/v1', authRouter);
app.use('/api/v1', metricsRouter);
app.use('/api/v1', insightsRouter);
app.use('/api/v1', postsRouter);
app.use('/api/v1', seedRouter);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
