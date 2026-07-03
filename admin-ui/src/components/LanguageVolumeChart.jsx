import { useLanguages } from '../languagesContext';

// Magnitude comparison across a handful of categories -> bar chart, one hue
// (sequential blue), sorted high to low, value labeled at the tip. No legend
// needed: a single series' identity is already named by the chart title.
export function LanguageVolumeChart({ volumeByLanguage }) {
  const { namesByCode } = useLanguages();
  const entries = Object.entries(volumeByLanguage || {}).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, count]) => count));

  if (entries.length === 0) {
    return <div className="muted" style={{ fontSize: 13.5, padding: '20px 0' }}>No interactions logged yet.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {entries.map(([code, count]) => {
        const widthPct = (count / max) * 100;
        return (
          <div key={code} style={{ display: 'grid', gridTemplateColumns: '84px 1fr 36px', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', textAlign: 'right' }}>
              {namesByCode[code] || code}
            </div>
            <div style={{ background: 'var(--surface-2)', borderRadius: '0 5px 5px 0', height: 18, position: 'relative' }}>
              <div
                style={{
                  width: `${widthPct}%`,
                  height: '100%',
                  maxWidth: '100%',
                  background: 'var(--sequential)',
                  // Square at the baseline (left), rounded data-end (right).
                  borderRadius: '0 5px 5px 0',
                }}
              />
            </div>
            <div className="tabular" style={{ fontSize: 12.5, color: 'var(--text-primary)', fontWeight: 500 }}>
              {count}
            </div>
          </div>
        );
      })}
    </div>
  );
}
