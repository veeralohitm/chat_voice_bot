export function StatTile({ label, value, icon }) {
  return (
    <div className="card card-pad" style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="muted" style={{ fontSize: 12.5 }}>
          {label}
        </span>
        {icon && (
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: `linear-gradient(135deg, var(--sequential), var(--sequential-hover))`,
              boxShadow: '0 4px 12px rgba(42, 120, 214, 0.3)',
              color: '#fff',
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
