const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050';

export async function sendMessage({ sessionId, message }) {
  const res = await fetch(`${BASE_URL}/chat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `${res.status} ${res.statusText}`);
  }

  return res.json();
}
