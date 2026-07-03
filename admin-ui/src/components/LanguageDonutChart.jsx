import { useLanguages } from '../languagesContext';

// Compact part-of-whole donut for the top stat row. A donut/pie is usually
// the wrong form for comparing close values across categories, but here it's
// a deliberate choice for a small at-a-glance card alongside the stat tiles,
// not the primary analytical chart - the exact split is still one click away
// on the Sessions table if needed.
const SIZE = 84;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function LanguageDonutChart({ volumeByLanguage }) {
  const { namesByCode } = useLanguages();
  const entries = Object.entries(volumeByLanguage || {}).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, count]) => sum + count, 0) || 1;

  if (entries.length === 0) {
    return <div className="muted" style={{ fontSize: 12 }}>No data yet.</div>;
  }

  let cumulative = 0;
  const segments = entries.map(([code, count], i) => {
    const pct = count / total;
    const dash = pct * CIRCUMFERENCE;
    const offset = -cumulative * CIRCUMFERENCE;
    cumulative += pct;
    return { code, count, pct, dash, offset, color: `var(--series-${(i % 3) + 1})` };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--surface-2)" strokeWidth={STROKE} />
        {segments.map((s) => (
          <circle
            key={s.code}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={s.color}
            strokeWidth={STROKE}
            strokeDasharray={`${s.dash} ${CIRCUMFERENCE}`}
            strokeDashoffset={s.offset}
          />
        ))}
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {segments.map((s) => (
          <div key={s.code} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <span className="muted">{namesByCode[s.code] || s.code}</span>
            <span className="tabular" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {Math.round(s.pct * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
