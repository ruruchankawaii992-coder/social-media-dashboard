import { useEffect, useState, useCallback } from 'react';
import type { Platform } from '@shared/types';
import { PLATFORM_COLORS } from '@shared/constants';
import { ROUTES } from '@shared/api';
import { api } from '../api/client';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

const PLATFORMS: Platform[] = ['twitter', 'instagram', 'linkedin'];
const PLATFORM_LABELS: Record<Platform, string> = {
  twitter: 'Twitter',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
};

interface DemographicSegment {
  label: string;
  percentage: number;
  color: string;
}

interface ActivityHour {
  hour: number;
  posts: number;
  engagement: number;
}

/** Custom tooltip for dark theme */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        backgroundColor: '#1a1a24',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 13,
        color: '#e8e8f0',
      }}
    >
      {label !== undefined && <p style={{ marginBottom: 4, fontWeight: 600 }}>{label}</p>}
      {payload.map((entry: any, idx: number) => (
        <p key={idx} style={{ color: entry.color, margin: 0 }}>
          {entry.name}: {entry.value}
          {entry.name === 'percentage' || entry.name === 'Engagement' ? '%' : ''}
        </p>
      ))}
    </div>
  );
}

function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div
      style={{
        backgroundColor: '#1a1a24',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 13,
        color: '#e8e8f0',
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: 2 }}>{d?.label}</p>
      <p style={{ margin: 0 }}>{d?.percentage}%</p>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div
      style={{
        backgroundColor: '#16161e',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.06)',
        height: 350,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: '3px solid #1a1a2e',
          borderTopColor: '#c084fc',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
        aria-label="Loading"
        role="status"
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function InsightsPage() {
  const [platform, setPlatform] = useState<Platform>('twitter');
  const [demographics, setDemographics] = useState<DemographicSegment[]>([]);
  const [activity, setActivity] = useState<ActivityHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (p: Platform) => {
    setLoading(true);
    setError(null);
    try {
      const [demoData, activityData] = await Promise.all([
        api.get<DemographicSegment[]>(ROUTES.INSIGHTS.AUDIENCE(p)),
        api.get<ActivityHour[]>(ROUTES.INSIGHTS.ACTIVITY(p)),
      ]);
      setDemographics(demoData);
      setActivity(activityData);
    } catch (err: any) {
      setError(err.message || 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(platform);
  }, [platform, fetchData]);

  const color = PLATFORM_COLORS[platform];

  // Prepare donut data
  const donutData = demographics.map((d) => ({
    name: d.label,
    value: d.percentage,
    color: d.color,
    label: d.label,
    percentage: d.percentage,
  }));

  // Prepare bar data
  const barData = activity.map((a) => ({
    hour: `${a.hour}:00`,
    Posts: a.posts,
    Engagement: a.engagement,
  }));

  return (
    <main style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <h1
          style={{
            color: '#e8e8f0',
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          Insights
        </h1>

        {/* Platform dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label
            htmlFor="platform-select"
            style={{ color: '#8888a0', fontSize: 14 }}
          >
            Platform:
          </label>
          <select
            id="platform-select"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Platform)}
            style={{
              backgroundColor: '#16161e',
              color: '#e8e8f0',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 14,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            backgroundColor: '#1a1a24',
            borderRadius: 12,
            border: '1px solid rgba(239,68,68,0.2)',
            padding: 32,
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          <p style={{ color: '#ef4444', fontSize: 15, marginBottom: 16 }}>
            {error}
          </p>
          <button
            onClick={() => fetchData(platform)}
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
      )}

      {/* Charts grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 20,
        }}
        className="insights-grid"
      >
        {/* Donut Chart — Demographics */}
        <div
          style={{
            backgroundColor: '#16161e',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.06)',
            padding: '20px',
          }}
        >
          <h2
            style={{
              color: '#e8e8f0',
              fontSize: 16,
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            Age Demographics
          </h2>
          {loading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  stroke="none"
                >
                  {donutData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: '#8888a0' }}
                  iconType="circle"
                  formatter={(value: string) => (
                    <span style={{ color: '#8888a0' }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar Chart — Activity */}
        <div
          style={{
            backgroundColor: '#16161e',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.06)',
            padding: '20px',
          }}
        >
          <h2
            style={{
              color: '#e8e8f0',
              fontSize: 16,
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            24-Hour Activity
          </h2>
          {loading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={barData} barCategoryGap={2}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                  vertical={false}
                />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: '#8888a0', fontSize: 10 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  tickLine={false}
                  interval={2}
                />
                <YAxis
                  tick={{ fill: '#8888a0', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="Posts"
                  fill={color}
                  radius={[4, 4, 0, 0]}
                  opacity={0.85}
                />
                <Bar
                  dataKey="Engagement"
                  fill="#c084fc"
                  radius={[4, 4, 0, 0]}
                  opacity={0.6}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .insights-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}
