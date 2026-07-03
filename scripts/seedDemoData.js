// One-off script to seed realistic demo sessions into the logs, so the
// admin dashboard has example Fallback/Escalated/Override sessions to show
// for both the voice and webchat channels without needing a real phone call
// or a lucky LLM run to trigger each flag naturally.
//
// Run with: node scripts/seedDemoData.js
// Then restart the backend (node --watch only watches imported modules, not
// log file writes, so it won't pick this up on its own).

import { logInteraction } from '../src/lib/logger.js';
import { recordTurn } from '../src/lib/transcriptStore.js';

const ACCOUNT_KEY = '+17578216949';

async function seedSession({ sessionId, channel, turns, interactions }) {
  for (const turn of turns) {
    await recordTurn({ sessionId, channel, accountKey: ACCOUNT_KEY, role: turn.role, text: turn.text });
  }
  for (const interaction of interactions) {
    await logInteraction({ channel, accountKey: ACCOUNT_KEY, sessionId, ...interaction });
  }
  console.log(`seeded ${sessionId}`);
}

await seedSession({
  sessionId: 'demo-voice-fallback-escalated',
  channel: 'voice',
  turns: [
    { role: 'assistant', text: 'Welcome to XYZ Mortgage Company. May I have your full name and the year you were born to get started?' },
    { role: 'user', text: 'Bonjour, je m\'appelle Marie Dubois, née en 1985.' },
    { role: 'assistant', text: "I'm sorry, could you please repeat that?" },
    { role: 'user', text: 'Je parle français, pas anglais.' },
    { role: 'assistant', text: "I'll continue in English since I'm not able to support French right now. Let me see about connecting you with someone who speaks French, or I can take a message for a callback." },
  ],
  interactions: [
    { detectedLanguage: 'fr', confidence: 0.88, usedFallback: true, note: 'source=initial' },
    { detectedLanguage: 'fr', escalated: true, usedFallback: true, note: 'transfer_reason=unsupported_language fluent_agent_available=false' },
  ],
});

await seedSession({
  sessionId: 'demo-voice-override',
  channel: 'voice',
  turns: [
    { role: 'assistant', text: 'Welcome to XYZ Mortgage Company. May I have your full name and the year you were born to get started?' },
    { role: 'user', text: 'Hi, my name is Priya Sharma, born in 1990.' },
    { role: 'assistant', text: 'Thank you, Priya. Your identity has been verified. How can I help you today?' },
    { role: 'user', text: 'Actually, can we continue in Hindi instead?' },
    { role: 'assistant', text: 'बिल्कुल, मैं अब हिंदी में जारी रखूंगी। मैं आपकी कैसे मदद कर सकती हूं?' },
  ],
  interactions: [
    { detectedLanguage: 'en', confidence: 0.95, note: 'source=initial' },
    { detectedLanguage: 'en', confidence: 0.95, note: 'identity_verification=success name="Priya Sharma"' },
    { detectedLanguage: 'hi', confidence: 0.99, override: true, note: 'source=override' },
  ],
});

await seedSession({
  sessionId: 'demo-webchat-fallback-escalated',
  channel: 'webchat',
  turns: [
    { role: 'user', text: 'Guten Tag, ich brauche Hilfe mit meinem Konto.' },
    { role: 'assistant', text: "I'm sorry, we don't currently support German. I'll continue in English, and I'll have a specialist who speaks German follow up with you as soon as possible." },
  ],
  interactions: [
    { detectedLanguage: 'de', confidence: 0.9, usedFallback: true, escalated: true, note: 'source=initial' },
  ],
});

await seedSession({
  sessionId: 'demo-webchat-override',
  channel: 'webchat',
  turns: [
    { role: 'user', text: 'Hi, my name is David Okafor, born 1988.' },
    { role: 'assistant', text: 'Thank you, David. Your identity has been verified. How can I help you today?' },
    { role: 'user', text: 'Can we switch to Spanish please?' },
    { role: 'assistant', text: 'Por supuesto, David. Continuaré en español. ¿En qué puedo ayudarte hoy?' },
  ],
  interactions: [
    { detectedLanguage: 'en', confidence: 0.95, note: 'source=initial identity_verified=true' },
    { detectedLanguage: 'es', confidence: 0.97, override: true, note: 'source=override' },
  ],
});

console.log('Done. Restart the backend to load this into the dashboard.');
