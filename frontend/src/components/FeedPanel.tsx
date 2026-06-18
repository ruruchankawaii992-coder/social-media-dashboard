import type { Platform } from '@shared/types';
import { PLATFORM_COLORS } from '@shared/constants';
import type { FeedUpdatePayload } from '@shared/websocket';

interface FeedItem extends FeedUpdatePayload {
  id: number;
}

interface FeedPanelProps {
  platform: Platform;
  items: FeedItem[];
}

const PLATFORM_LABELS: Record<Platform, string> = {
  twitter: 'Twitter',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
};

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function FeedPanel({ platform, items }: FeedPanelProps) {
  const color = PLATFORM_COLORS[platform];

  return (
    <div
      style={{
        backgroundColor: '#16161e',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: color,
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        <span style={{ color: '#e8e8f0', fontWeight: 600, fontSize: 14 }}>
          {PLATFORM_LABELS[platform]}
        </span>
        <span style={{ color: '#8888a0', fontSize: 12, marginLeft: 'auto' }}>
          live
        </span>
      </div>

      {/* Feed list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          maxHeight: 320,
          minHeight: 120,
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}
      >
        {items.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: 'center',
              color: '#8888a0',
              fontSize: 13,
            }}
          >
            Waiting for feed data...
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              style={{
                padding: '12px 18px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                animation: 'fadeIn 0.3s ease',
              }}
            >
              <p
                style={{
                  color: '#d0d0e0',
                  fontSize: 13,
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                }}
              >
                {item.content}
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  fontSize: 11,
                  color: '#8888a0',
                }}
              >
                <span>{formatTime(item.timestamp)}</span>
                <span>♥ {item.metrics.likes}</span>
                <span>↗ {item.metrics.shares}</span>
                <span>💬 {item.metrics.comments}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export type { FeedItem };
