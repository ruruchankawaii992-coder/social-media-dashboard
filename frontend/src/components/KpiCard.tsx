interface KpiCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeDirection?: 'up' | 'down' | 'neutral';
  accentColor: string;
  icon?: string;
}

export default function KpiCard({
  label,
  value,
  change,
  changeDirection,
  accentColor,
  icon,
}: KpiCardProps) {
  const arrow =
    changeDirection === 'up' ? '▲' : changeDirection === 'down' ? '▼' : '―';
  const changeColor =
    changeDirection === 'up'
      ? '#22c55e'
      : changeDirection === 'down'
        ? '#ef4444'
        : '#8888a0';

  return (
    <div
      style={{
        backgroundColor: '#16161e',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.06)',
        borderLeft: `3px solid ${accentColor}`,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 4px 20px rgba(0,0,0,0.3)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            color: '#8888a0',
            fontSize: 12,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {label}
        </span>
        {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
      </div>

      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: '#e8e8f0',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>

      {change !== undefined && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 13,
            color: changeColor,
          }}
        >
          <span style={{ fontSize: 11 }}>{arrow}</span>
          <span>
            {Math.abs(change).toFixed(1)}% vs last week
          </span>
        </div>
      )}
    </div>
  );
}
