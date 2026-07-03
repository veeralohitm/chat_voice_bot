import { useEffect, useState } from 'react';
import { api } from '../api';
import { Badge } from '../components/Badge';
import { useLanguages } from '../languagesContext';

function formatTime(iso) {
  return new Date(iso).toLocaleString();
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function TranscriptPanel({ sessionId, onClose }) {
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getSessionTranscript(sessionId)
      .then((data) => !cancelled && setSession(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(14,17,22,0.25)', zIndex: 9 }}
      />
      <div
        className="card"
        style={{
          position: 'fixed',
          top: 12,
          right: 12,
          bottom: 12,
          width: 420,
          maxWidth: 'calc(100% - 24px)',
          padding: 20,
          overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="section-title" style={{ margin: 0 }}>
            Transcript
          </h2>
          <button className="btn btn-secondary" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        {error && <div className="error-text">{error}</div>}
        {!session && !error && (
          <div className="loading-row">
            <span className="spinner" /> Loading…
          </div>
        )}

        {session && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {session.turns.map((turn, i) => (
              <div
                key={i}
                style={{ display: 'flex', flexDirection: 'column', alignItems: turn.role === 'user' ? 'flex-end' : 'flex-start' }}
              >
                <div className="muted" style={{ fontSize: 11, marginBottom: 3 }}>
                  {turn.role === 'user' ? 'Caller/User' : 'Assistant'} · {formatTime(turn.timestamp)}
                </div>
                <div
                  style={{
                    maxWidth: '85%',
                    background: turn.role === 'user' ? 'var(--sequential-wash)' : 'var(--surface-2)',
                    borderRadius: 'var(--radius-md)',
                    padding: '9px 13px',
                    fontSize: 13.5,
                    lineHeight: 1.45,
                  }}
                >
                  {turn.text}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const { namesByCode } = useLanguages();

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      api
        .getSessions()
        .then((data) => !cancelled && (setSessions(data), setError(null)))
        .catch((err) => !cancelled && setError(err.message));
    };

    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div>
      {error && <div className="error-text" style={{ marginBottom: 12 }}>Failed to load: {error}</div>}

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Channel</th>
                <th>Account</th>
                <th>Language</th>
                <th>Turns</th>
                <th>Updated</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.sessionId} onClick={() => setSelectedId(s.sessionId)}>
                  <td style={{ textTransform: 'capitalize' }}>{s.channel}</td>
                  <td>{s.accountKey}</td>
                  <td>{namesByCode[s.detectedLanguage] || s.detectedLanguage || '—'}</td>
                  <td className="tabular">{s.turnCount}</td>
                  <td className="muted">{formatTime(s.updatedAt)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {s.escalated && <Badge tone="critical">Escalated</Badge>}
                      {s.usedFallback && <Badge tone="warning">Fallback</Badge>}
                      {s.override && <Badge tone="good">Override</Badge>}
                    </div>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && !error && (
                <tr>
                  <td colSpan={6} className="muted">
                    No sessions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedId && <TranscriptPanel sessionId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
