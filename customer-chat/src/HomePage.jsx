const FEATURES = [
  {
    title: 'Apply online in minutes',
    body: 'A simple, guided application - no branch visit required. Save your progress and pick up anytime.',
  },
  {
    title: 'Get a real answer fast',
    body: "Our underwriting team gives you a clear decision, not a runaround - most applicants hear back within 48 hours.",
  },
  {
    title: 'Close with confidence',
    body: 'A dedicated loan officer walks you through every step to closing, so there are no surprises at the table.',
  },
];

export function HomePage() {
  return (
    <div>
      <nav className="site-nav">
        <span className="site-logo">XYZ Mortgage Company</span>
        <div className="site-nav-links">
          <span>Home</span>
          <span>Rates</span>
          <span>Calculators</span>
          <span>Reviews</span>
          <span>Contact</span>
          <a className="site-nav-cta" href="#top">
            Get Started
          </a>
        </div>
      </nav>

      <header className="site-hero">
        <h1>Your path to homeownership starts here.</h1>
        <p>Competitive rates, transparent terms, and a team with you from application to closing.</p>
        <div className="site-cta-row">
          <button className="site-btn site-btn-primary">Get Pre-Approved</button>
          <button className="site-btn site-btn-secondary">See Today's Rates</button>
        </div>
      </header>

      <div className="site-stats">
        <div className="site-stat">
          <strong>5.875%</strong>
          <span>30-yr fixed APR*</span>
        </div>
        <div className="site-stat">
          <strong>10,000+</strong>
          <span>Homeowners funded</span>
        </div>
        <div className="site-stat">
          <strong>24/7</strong>
          <span>Member support</span>
        </div>
      </div>

      <section className="site-features">
        <h2 className="site-section-title">How it works</h2>
        <div className="site-feature-grid">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="site-feature-card">
              <div className="site-feature-num">{i + 1}</div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <span>© 2026 XYZ Mortgage Company. NMLS #000000. Equal Housing Lender.</span>
        <span>*Rate shown is illustrative and not a commitment to lend.</span>
      </footer>
    </div>
  );
}
