import type { MetricSnapshot, Post, Platform } from './types';

export interface MetricsUpdatePayload {
  platform: Platform;
  metrics: MetricSnapshot;
}

export interface NewPostPayload {
  post: Post;
}

export interface PostStatusChangePayload {
  postId: string;
  previousStatus: Post['status'];
  newStatus: Post['status'];
}

export interface ConnectionAckPayload {
  clientId: string;
  message: string;
}

export interface AuthErrorPayload {
  message: string;
}

export interface FeedUpdatePayload {
  platform: Platform;
  content: string;
  metrics: {
    likes: number;
    shares: number;
    comments: number;
  };
  timestamp: string;
}
