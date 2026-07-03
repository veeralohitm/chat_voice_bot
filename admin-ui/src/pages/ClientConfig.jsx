import { useEffect, useState } from 'react';
import { api } from '../api';
import { useLanguages } from '../languagesContext';

const OVERFLOW_OPTIONS = ['voicemail', 'callback', 'schedule_followup'];

function Toggle({ checked, onChange }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch-track" />
      <span className="switch-thumb" />
    </label>
  );
}

function ClientRow({ client, onSaved, languages }) {
  const [draft, setDraft] = useState(client);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const dirty = JSON.stringify(draft) !== JSON.stringify(client);

  const toggleLanguage = (code) => {
    setDraft((d) => ({
      ...d,
      supportedLanguages: d.supportedLanguages.includes(code)
        ? d.supportedLanguages.filter((l) => l !== code)
        : [...d.supportedLanguages, code],
    }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateClient(client.accountKey, {
        enabled: draft.enabled,
        supportedLanguages: draft.supportedLanguages,
        fallbackLanguage: draft.fallbackLanguage,
        overflowBehavior: draft.overflowBehavior,
      });
      onSaved(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card card-pad">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="tabular" style={{ fontWeight: 600, fontSize: 14 }}>
            {client.accountKey}
          </span>
          {!draft.enabled && (
            <span className="badge" style={{ color: 'var(--text-muted)', background: 'var(--surface-2)' }}>
              Disabled
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="muted" style={{ fontSize: 12.5 }}>
            Enabled
          </span>
          <Toggle checked={draft.enabled} onChange={(v) => setDraft((d) => ({ ...d, enabled: v }))} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <span className="field-label" style={{ marginBottom: 8 }}>
            Supported languages
          </span>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {languages.map((lang) => (
              <label key={lang.code} className="checkbox-row">
                <input
                  type="checkbox"
                  checked={draft.supportedLanguages.includes(lang.code)}
                  onChange={() => toggleLanguage(lang.code)}
                />
                {lang.name}
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="field-label">Fallback language</span>
            <select
              className="select"
              value={draft.fallbackLanguage}
              onChange={(e) => setDraft((d) => ({ ...d, fallbackLanguage: e.target.value }))}
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="field-label">Overflow behavior</span>
            <select
              className="select"
              value={draft.overflowBehavior}
              onChange={(e) => setDraft((d) => ({ ...d, overflowBehavior: e.target.value }))}
            >
              {OVERFLOW_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt.replace('_', ' ')}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <button className="btn btn-primary" onClick={save} disabled={!dirty || saving}>
          {saving && <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />}
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {error && <span className="error-text">{error}</span>}
      </div>
    </div>
  );
}

function AddClientForm({ existingKeys, onAdded }) {
  const [accountKey, setAccountKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    const key = accountKey.trim();
    if (!key) return;
    if (existingKeys.includes(key)) {
      setError('That account already exists below.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // PUT lazily creates the account with defaults (all languages
      // enabled, English fallback) if it doesn't exist yet - useful for
      // pre-configuring a Twilio number before its first real call/text.
      const created = await api.updateClient(key, { enabled: true });
      onAdded(created);
      setAccountKey('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="card card-pad" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
      <input
        type="text"
        className="input"
        value={accountKey}
        onChange={(e) => setAccountKey(e.target.value)}
        placeholder="+15551234567"
        style={{ flex: '0 1 240px' }}
      />
      <button type="submit" className="btn btn-primary" disabled={saving || !accountKey.trim()}>
        {saving ? 'Adding…' : '+ Add client account'}
      </button>
      {error && <span className="error-text">{error}</span>}
    </form>
  );
}

export function ClientConfig() {
  const [clients, setClients] = useState(null);
  const [error, setError] = useState(null);
  const { languages, loading: languagesLoading } = useLanguages();

  useEffect(() => {
    api
      .getClients()
      .then(setClients)
      .catch((err) => setError(err.message));
  }, []);

  const handleSaved = (updated) => {
    setClients((prev) => prev.map((c) => (c.accountKey === updated.accountKey ? updated : c)));
  };

  const handleAdded = (created) => {
    setClients((prev) => [...prev, created]);
  };

  if (error) return <div className="error-text">Failed to load: {error}</div>;
  if (!clients || languagesLoading)
    return (
      <div className="loading-row">
        <span className="spinner" /> Loading…
      </div>
    );

  return (
    <div>
      <AddClientForm existingKeys={clients.map((c) => c.accountKey)} onAdded={handleAdded} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 480, overflowY: 'auto', paddingRight: 4 }}>
        {clients.length === 0 && (
          <div className="card card-pad muted" style={{ fontSize: 13.5 }}>
            No client accounts yet - add one above, using the Twilio phone number as the account key, or it will be
            created automatically the first time a call or message comes in for that number.
          </div>
        )}
        {clients.map((client) => (
          <ClientRow key={client.accountKey} client={client} onSaved={handleSaved} languages={languages} />
        ))}
      </div>
    </div>
  );
}
