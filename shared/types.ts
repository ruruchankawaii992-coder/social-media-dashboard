// User / Auth
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// Platform Types
export type Platform = 'twitter' | 'instagram' | 'linkedin';

// Post / Content
export interface Post {
  id: string;
  platform: Platform;
  content: string;
  mediaUrl?: string;
  scheduledAt?: string; // ISO 8601 — absent for draft posts
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostRequest {
  platform: Platform;
  content: string;
  mediaUrl?: string;
  scheduledAt?: string;
}

// Metrics
export interface MetricSnapshot {
  platform: Platform;
  timestamp: string;
  followers: number;
  engagement: number;
  impressions: number;
  likes: number;
  shares: number;
  comments: number;
}

export interface KpiCard {
  platform: Platform;
  label: string;
  value: number;
  change: number; // percentage change vs previous period
  changeDirection: 'up' | 'down' | 'neutral';
  icon?: string;
  color: string;
}

// Audience Insights
export interface DemographicSegment {
  label: string;
  percentage: number;
  color: string;
}

export interface AudienceInsights {
  demographics: DemographicSegment[];
  ageGroups: DemographicSegment[];
  activeHours: { hour: number; value: number }[];
  topCountries: { country: string; percentage: number }[];
}

// Dashboard Summary
export interface DashboardSummary {
  kpiCards: KpiCard[];
  metricsOverTime: MetricSnapshot[];
  audienceInsights: AudienceInsights;
  recentPosts: Post[];
  lastUpdated: string;
}

// WebSocket Event Types
export type WsEventType =
  | 'metrics_update'
  | 'new_post'
  | 'post_status_change'
  | 'connection_ack'
  | 'feed_update'
  | 'auth_error';

export interface WsMessage<T = unknown> {
  type: WsEventType;
  payload: T;
  timestamp: string;
}
