import type { Platform } from './types';

export const MOCK_CREDENTIALS = {
  username: 'admin',
  password: 'password123',
};

export const PLATFORM_COLORS: Record<Platform, string> = {
  twitter: '#1DA1F2',
  instagram: '#E4405F',
  linkedin: '#0A66C2',
};

export const WEBSOCKET_EVENTS = {
  METRICS_UPDATE: 'metrics_update',
  NEW_POST: 'new_post',
  POST_STATUS_CHANGE: 'post_status_change',
  CONNECTION_ACK: 'connection_ack',
} as const;

export const WS_PORT = 4001;
export const API_PORT = 4000;
