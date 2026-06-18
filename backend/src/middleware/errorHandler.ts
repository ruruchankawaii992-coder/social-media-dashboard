import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Unhandled error:', err);
  const statusCode = (err as any).statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message;
  res.status(statusCode).json({ error: message });
}
