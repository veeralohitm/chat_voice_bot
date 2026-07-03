export function StatTile({ label, value, icon }) {
  return (
    <div className="card card-pad" style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="muted" style={{ fontSize: 12.5 }}>
          {label}
        </span>
        {icon && (
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: 'var(--sequential-wash)',
              color: 'var(--sequential)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="tabular" style={{ fontSize: 30, fontWeight: 650, letterSpacing: '-0.01em' }}>
        {value}
      </div>
    </div>
  );
}
