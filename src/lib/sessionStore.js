// In-memory conversation state per chat session (keyed by "<channel>:<From>").
// Tracks the running transcript plus the language state machine used to
// satisfy the "sustained switch, not isolated words" requirement.

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes of inactivity -> fresh context

const sessions = new Map();

export function getSession(key) {
  const existing = sessions.get(key);
  if (existing && Date.now() - existing.lastActive < SESSION_TTL_MS) {
    return existing;
  }
  const fresh = {
    turns: [], // [{ role: 'user' | 'assistant', content: string }]
    detectedLanguage: null,
    confidence: null,
    overrideLanguage: null,
    pendingSwitchLanguage: null,
    pendingSwitchCount: 0,
    verifiedCustomer: null, // full customer record once identity is verified this conversation
    lastActive: Date.now(),
  };
  sessions.set(key, fresh);
  return fresh;
}

export function saveSession(key, session) {
  session.lastActive = Date.now();
  sessions.set(key, session);
}

export function transcriptFor(session) {
  return session.turns
    .map((t) => `${t.role === 'user' ? 'User' : 'Assistant'}: ${t.content}`)
    .join('\n');
}
