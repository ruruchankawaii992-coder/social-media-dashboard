import { useEffect, useState, useCallback, useRef } from 'react';
import type { Platform, WsMessage } from '@shared/types';
import { PLATFORM_COLORS } from '@shared/constants';
import type {
  MetricsUpdatePayload,
  FeedUpdatePayload,
} from '@shared/websocket';
import { ROUTES } from '@shared/api';
import { api, getAuthToken } from '../api/client';
import KpiCard from '../components/KpiCard';
import FeedPanel, { type FeedItem } from '../components/FeedPanel';

const PLATFORMS: Platform[] = ['twitter', 'instagram', 'linkedin'];

const PLATFORM_LABELS: Record<Platform, string> = {
  twitter: 'Twitter',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
};

interface KpiData {
  platform: Platform;
  followers: number;
  engagement: number;
  impressions: number;
  change: number;
  changeDirection: 'up' | 'down' | 'neutral';
}

/** Build initial KPIs from the API /metrics/latest response (which returns KpiCard-like objects with value = followers) */
function buildInitialKpis(apiCards: any[]): KpiData[] {
  // Reduce to one card per platform (the API returns 1 card per platform + total)
  const platformCards = apiCards.filter((c: any) =>
    PLATFORMS.includes(c.platform)
  );
  return platformCards.map((card: any) => ({
    platform: card.platform as Platform,
    followers: card.value,
    engagement: card.platform === 'twitter' ? 3.4 : card.platform === 'instagram' ? 4.7 : 2.9,
    impressions: Math.round(card.value * (card.platform === 'twitter' ? 3.6 : card.platform === 'instagram' ? 3.2 : 3.8)),
    change: card.change ?? 0,
    changeDirection: card.changeDirection ?? 'neutral',
  }));
}

/** Apply a metrics_update payload to the KPIs array */
function applyMetricsUpdate(
  kpis: KpiData[],
  payload: MetricsUpdatePayload
): KpiData[] {
  return kpis.map((k) => {
    if (k.platform !== payload.platform) return k;
    return {
      ...k,
      followers: payload.metrics.followers,
      engagement: payload.metrics.engagement,
      impressions: payload.metrics.impressions,
    };
  });
}

/** Format a number for display: > 1000 → "1.2k", else integer */
function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return Math.round(n).toString();
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KpiData[]>([]);
  const [feeds, setFeeds] = useState<Record<Platform, FeedItem[]>>({
    twitter: [],
    instagram: [],
    linkedin: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const feedCounter = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch initial metrics
  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: any = await api.get<any[]>(ROUTES.METRICS.LATEST);
      setKpis(buildInitialKpis(data));
    } catch (err: any) {
      setError(err.message || 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // WebSocket connection
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws?token=${token}`;

    let reconnectTimer: ReturnType<typeof setTimeout>;
    let ws: WebSocket;

    function connect() {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected');
      };

      ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data);

          if (msg.type === 'metrics_update') {
            const payload = msg.payload as MetricsUpdatePayload;
            setKpis((prev) => applyMetricsUpdate(prev, payload));
          } else if (msg.type === 'feed_update') {
            const payload = msg.payload as FeedUpdatePayload;
            feedCounter.current += 1;
            const newItem: FeedItem = {
              id: feedCounter.current,
              ...payload,
            };
            setFeeds((prev) => ({
              ...prev,
              [payload.platform]: [
                newItem,
                ...prev[payload.platform].slice(0, 49),
              ],
            }));
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        // auto-reconnect after 3s
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // Retry handler
  const handleRetry = () => {
    fetchMetrics();
  };

  // Loading state
  if (loading) {
    return (
      <main style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ color: '#e8e8f0', fontSize: 28, fontWeight: 700, marginBottom: 24 }}>
          Dashboard
        </h1>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              style={{
                backgroundColor: '#16161e',
                borderRadius: 12,
                height: 110,
                border: '1px solid rgba(255,255,255,0.06)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.6; }
          }
        `}</style>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ color: '#e8e8f0', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          Dashboard
        </h1>
        <div
          style={{
            backgroundColor: '#1a1a24',
            borderRadius: 12,
            border: '1px solid rgba(239,68,68,0.2)',
            padding: '32px',
            textAlign: 'center',
            marginTop: 16,
          }}
        >
          <p style={{ color: '#ef4444', fontSize: 15, marginBottom: 16 }}>
            {error}
          </p>
          <button
            onClick={handleRetry}
            style={{
              backgroundColor: '#c084fc',
              color: '#0a0a0f',
              border: 'none',
              padding: '10px 24px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <h1
        style={{
          color: '#e8e8f0',
          fontSize: 28,
          fontWeight: 700,
          marginBottom: 24,
        }}
      >
        Dashboard
      </h1>

      {/* KPI Cards — 3 per platform, arranged by platform */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {PLATFORMS.map((platform) => {
          const kpi = kpis.find((k) => k.platform === platform);
          const color = PLATFORM_COLORS[platform];
          return (
            <div key={platform}>
              {/* Platform header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: color,
                    display: 'inline-block',
                  }}
                />
                <span
                  style={{
                    color: '#e8e8f0',
                    fontWeight: 600,
                    fontSize: 15,
                  }}
                >
                  {PLATFORM_LABELS[platform]}
                </span>
              </div>

              {/* 3 KPI cards in a row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 12,
                }}
                className="kpi-row"
              >
                <KpiCard
                  label="Followers"
                  value={kpi ? fmt(kpi.followers) : '—'}
                  change={kpi?.change}
                  changeDirection={kpi?.changeDirection}
                  accentColor={color}
                  icon="👥"
                />
                <KpiCard
                  label="Engagement Rate"
                  value={kpi ? `${kpi.engagement.toFixed(1)}%` : '—'}
                  accentColor={color}
                  icon="📊"
                />
                <KpiCard
                  label="Impressions"
                  value={kpi ? fmt(kpi.impressions) : '—'}
                  accentColor={color}
                  icon="👁"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Feed Panels */}
      <h2
        style={{
          color: '#e8e8f0',
          fontSize: 20,
          fontWeight: 600,
          marginTop: 32,
          marginBottom: 16,
        }}
      >
        Live Feeds
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
        }}
        className="feeds-grid"
      >
        {PLATFORMS.map((platform) => (
          <FeedPanel
            key={platform}
            platform={platform}
            items={feeds[platform]}
          />
        ))}
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 900px) {
          .kpi-row { grid-template-columns: repeat(2, 1fr) !important; }
          .feeds-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .kpi-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}

export type { KpiData };
