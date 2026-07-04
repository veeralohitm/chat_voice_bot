const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050';

async function request(path, options) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  getLanguages: () => request('/admin/languages'),
  getSummary: () => request('/reports/summary'),
  getInteractions: (limit = 100) => request(`/reports/interactions?limit=${limit}`),
  getSessions: () => request('/reports/sessions'),
  getSessionTranscript: (sessionId) => request(`/reports/sessions/${encodeURIComponent(sessionId)}`),
  // A URL, not a fetch call - handed straight to an <audio> tag's src.
  recordingUrlFor: (sessionId) => `${BASE_URL}/reports/sessions/${encodeURIComponent(sessionId)}/recording`,
  getClients: () => request('/admin/clients'),
  updateClient: (accountKey, patch) =>
    request(`/admin/clients/${encodeURIComponent(accountKey)}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),
};
