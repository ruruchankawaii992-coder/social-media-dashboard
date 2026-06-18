import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './app';
import { createWebSocketServer } from './ws';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

const server = http.createServer(app);
createWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`Social Media Dashboard API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`WebSocket server attached to same port (ws://localhost:${PORT})`);
});
