// Per-client (per Twilio number) configuration.
// No database yet: this is an in-memory store, seeded at startup from
// src/data/clients.json so known accounts show up immediately instead of
// waiting for their first call/text. Swap this out for a real datastore when
// moving beyond a single-account demo.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '..', 'data', 'clients.json');

export const LANGUAGE_NAMES = {
  en: 'English',
  es: 'Spanish',
  hi: 'Hindi',
};

const DEFAULT_CONFIG = {
  enabled: true,
  supportedLanguages: ['en', 'es', 'hi'],
  fallbackLanguage: 'en',
  // What to do when no language-fluent human agent is available to take a transfer.
  overflowBehavior: 'voicemail', // 'callback' | 'voicemail' | 'schedule_followup'
  // Which supported languages currently have a fluent human agent staffed.
  fluentAgentAvailable: { en: true, es: false, hi: false },
  detectionConfidenceThreshold: 0.6,
  switchConfidenceThreshold: 0.75,
};

const clientConfigs = new Map();

function normalizeKey(accountKey) {
  return String(accountKey || 'default').trim();
}

function seedFromFile() {
  let seeds = [];
  try {
    seeds = JSON.parse(readFileSync(DATA_FILE, 'utf-8')).clients || [];
  } catch (err) {
    console.error('[clients config] failed to load src/data/clients.json:', err.message);
    return;
  }

  for (const seed of seeds) {
    const key = normalizeKey(seed.accountKey);
    clientConfigs.set(key, { ...DEFAULT_CONFIG, ...seed, accountKey: key });
  }
}

seedFromFile();

export function getClientConfig(accountKey) {
  const key = normalizeKey(accountKey);
  if (!clientConfigs.has(key)) {
    clientConfigs.set(key, { ...DEFAULT_CONFIG, accountKey: key });
  }
  return clientConfigs.get(key);
}

export function updateClientConfig(accountKey, patch) {
  const key = normalizeKey(accountKey);
  const current = getClientConfig(key);
  const updated = { ...current, ...patch, accountKey: key };
  clientConfigs.set(key, updated);
  return updated;
}

export function listClientConfigs() {
  return Array.from(clientConfigs.values());
}
