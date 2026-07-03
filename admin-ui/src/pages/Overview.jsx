import { useEffect, useState } from 'react';
import { api } from '../api';
import { StatTile } from '../components/StatTile';
import { LanguageDonutChart } from '../components/LanguageDonutChart';

function IconChat() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export function Overview() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      api
        .getSummary()
        .then((data) => {
          if (!cancelled) {
            setSummary(data);
            setError(null);
          }
        })
        .catch((err) => !cancelled && setError(err.message));
    };

    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (error) return <div className="error-text">Failed to load: {error}</div>;
  if (!summary)
    return (
      <div className="loading-row">
        <span className="spinner" /> Loading…
      </div>
    );

  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
      <StatTile label="Total interactions" value={summary.totalInteractions} icon={<IconChat />} />
      <StatTile label="Escalated to human" value={summary.totalEscalations} icon={<IconAlert />} />
      <StatTile label="Used fallback language" value={summary.totalFallbacks} icon={<IconGlobe />} />
      <div className="card card-pad" style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className="muted" style={{ fontSize: 12.5 }}>By language</span>
        <LanguageDonutChart volumeByLanguage={summary.volumeByLanguage} />
      </div>
    </div>
  );
}
