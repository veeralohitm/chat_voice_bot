export function Section({ id, title, subtitle, sectionRef, children }) {
  return (
    <section id={id} ref={sectionRef} style={{ scrollMarginTop: 20 }}>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{title}</h2>
        {subtitle && (
          <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
            {subtitle}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}
