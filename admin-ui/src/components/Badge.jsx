const TONES = {
  good: { color: 'var(--status-good)', bg: 'var(--status-good-wash)' },
  warning: { color: 'var(--status-warning)', bg: 'var(--status-warning-wash)' },
  critical: { color: 'var(--status-critical)', bg: 'var(--status-critical-wash)' },
  neutral: { color: 'var(--text-secondary)', bg: 'var(--surface-2)' },
};

// Status color always ships with an icon-equivalent (a dot) + label text,
// never color alone.
export function Badge({ tone = 'neutral', children }) {
  const { color, bg } = TONES[tone];
  return (
    <span className="badge" style={{ color, background: bg }}>
      <span className="badge-dot" style={{ background: color }} />
      {children}
    </span>
  );
}
