// Persists full conversation turns (who said what) per session, separate
// from logger.js which only tracks per-event metadata (language, confidence,
// escalation flags). This is what backs the admin dashboard's session list
// and transcript viewer.
//
// Every turn is appended to logs/transcripts.jsonl (durable across
// restarts); the in-memory map is just a bounded, fast-to-query cache of it,
// rebuilt from that file on startup. For heavy long-term usage this should
// move to a real datastore - replaying the whole file on every boot doesn't
// scale forever, but is fine for a single-account prototype.

import { readFileSync, existsSync } from 'node:fs';
import { appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = path.join(__dirname, '..', '..', 'logs', 'transcripts.jsonl');

const MAX_SESSIONS = 200;
const sessions = new Map(); // sessionId -> { sessionId, channel, accountKey, startedAt, updatedAt, turns }
const sessionOrder = []; // order sessions were first seen, for eviction

function getOrCreateSession(sessionId, { channel, accountKey, timestamp }) {
  let session = sessions.get(sessionId);
  if (session) return session;

  const startedAt = timestamp || new Date().toISOString();
  session = { sessionId, channel, accountKey, startedAt, updatedAt: startedAt, turns: [] };
  sessions.set(sessionId, session);
  sessionOrder.push(sessionId);

  if (sessionOrder.length > MAX_SESSIONS) {
    const oldest = sessionOrder.shift();
    sessions.delete(oldest);
  }

  return session;
}

function ingestTurn({ sessionId, channel, accountKey, role, text, timestamp }) {
  const session = getOrCreateSession(sessionId, { channel, accountKey, timestamp });
  session.turns.push({ role, text, timestamp });
  session.updatedAt = timestamp;
}

// Applies a metadata patch (e.g. a recording URL that only becomes available
// after the call ends) to a session that must already exist - if it doesn't
// (out-of-order replay, or the call was never logged), the patch is dropped
// rather than fabricating a session from nothing.
function ingestMeta({ sessionId, ...patch }) {
  const session = sessions.get(sessionId);
  if (!session) return;
  Object.assign(session, patch);
}

function loadFromDisk() {
  if (!existsSync(LOG_FILE)) return;
  try {
    const lines = readFileSync(LOG_FILE, 'utf-8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.type === 'meta') {
          ingestMeta(parsed);
        } else {
          ingestTurn(parsed);
        }
      } catch {
        // skip a malformed line rather than fail startup over it
      }
    }
  } catch (err) {
    console.error('[transcriptStore] failed to load transcript log:', err.message);
  }
}

loadFromDisk();

export async function recordTurn({ sessionId, channel, accountKey, role, text }) {
  if (!text) return;

  const timestamp = new Date().toISOString();
  const session = getOrCreateSession(sessionId, { channel, accountKey, timestamp });
  const turn = { role, text, timestamp };
  session.turns.push(turn);
  session.updatedAt = timestamp;

  try {
    await appendFile(LOG_FILE, JSON.stringify({ sessionId, channel, accountKey, ...turn }) + '\n');
  } catch (err) {
    console.error('[transcriptStore] failed to write transcript log:', err.message);
  }
}

// Attaches metadata that arrives after the fact - currently just the call
// recording URL/duration, which Twilio only sends once the recording is done
// (well after the session itself was created from the first transcript turn).
export async function updateSessionMeta(sessionId, patch) {
  const session = sessions.get(sessionId);
  if (!session) return;

  Object.assign(session, patch);

  try {
    await appendFile(LOG_FILE, JSON.stringify({ type: 'meta', sessionId, ...patch }) + '\n');
  } catch (err) {
    console.error('[transcriptStore] failed to write session meta log:', err.message);
  }
}

export function listSessions() {
  return Array.from(sessions.values())
    .map(({ turns, ...meta }) => ({ ...meta, turnCount: turns.length }))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export function getSessionTranscript(sessionId) {
  return sessions.get(sessionId) || null;
}
