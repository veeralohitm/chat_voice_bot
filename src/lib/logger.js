// Interaction logging for the Reporting requirement: every interaction records
// detected language, confidence, and fallback/override flags. Persisted to a
// JSONL file (append-only, easy to grep/ship to a real log pipeline later) and
// kept in a bounded in-memory ring buffer so the /reports endpoints are cheap.
// The ring buffer is rebuilt from that file on startup so history survives restarts.

import { readFileSync, existsSync } from 'node:fs';
import { appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANGUAGE_NAMES } from '../config/clients.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = path.join(__dirname, '..', '..', 'logs', 'interactions.jsonl');

const MAX_RECENT = 500;
const recentInteractions = [];

function loadFromDisk() {
  if (!existsSync(LOG_FILE)) return;
  try {
    const lines = readFileSync(LOG_FILE, 'utf-8').split('\n').filter(Boolean);
    for (const line of lines.slice(-MAX_RECENT)) {
      try {
        recentInteractions.push(JSON.parse(line));
      } catch {
        // skip a malformed line rather than fail startup over it
      }
    }
  } catch (err) {
    console.error('[logger] failed to load interaction log:', err.message);
  }
}

loadFromDisk();

export async function logInteraction(record) {
  const entry = {
    timestamp: new Date().toISOString(),
    channel: record.channel, // 'voice' | 'chat'
    accountKey: record.accountKey,
    sessionId: record.sessionId,
    detectedLanguage: record.detectedLanguage ?? null,
    confidence: record.confidence ?? null,
    usedFallback: Boolean(record.usedFallback),
    override: Boolean(record.override),
    escalated: Boolean(record.escalated),
    note: record.note ?? null,
  };

  recentInteractions.push(entry);
  if (recentInteractions.length > MAX_RECENT) {
    recentInteractions.shift();
  }

  try {
    await appendFile(LOG_FILE, JSON.stringify(entry) + '\n');
  } catch (err) {
    console.error('[logger] failed to write interaction log:', err.message);
  }

  return entry;
}

export function getRecentInteractions(limit = 100) {
  return recentInteractions.slice(-limit);
}

// Only counts recognized languages - interactions with no detected language,
// or a stray/invalid code, are left out of the dashboard chart rather than
// bucketed into an "unknown" catch-all.
export function getLanguageVolumeSummary() {
  const summary = {};
  for (const entry of recentInteractions) {
    if (!entry.detectedLanguage || !(entry.detectedLanguage in LANGUAGE_NAMES)) continue;
    summary[entry.detectedLanguage] = (summary[entry.detectedLanguage] || 0) + 1;
  }
  return summary;
}
