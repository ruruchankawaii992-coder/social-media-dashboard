export const API_BASE = '/api/v1';

export const ROUTES = {
  AUTH: {
    LOGIN: `${API_BASE}/auth/login`,
    LOGOUT: `${API_BASE}/auth/logout`,
    ME: `${API_BASE}/auth/me`,
  },
  METRICS: {
    LATEST: `${API_BASE}/metrics/latest`,
    HISTORY: (platform?: string) =>
      `${API_BASE}/metrics/history${platform ? `?platform=${platform}` : ''}`,
  },
  INSIGHTS: {
    AUDIENCE: (platform: string) => `${API_BASE}/insights/audience?platform=${platform}`,
    ACTIVITY: (platform: string) => `${API_BASE}/insights/activity?platform=${platform}`,
  },
  POSTS: {
    LIST: `${API_BASE}/posts`,
    CREATE: `${API_BASE}/posts`,
    UPDATE: (id: string) => `${API_BASE}/posts/${id}`,
    DELETE: (id: string) => `${API_BASE}/posts/${id}`,
  },
} as const;

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}
