// Appends a follow-up question/answer + closing to the two existing
// "override" demo sessions (seeded by seedDemoData.js), so they show a
// complete grounded exchange after the language switch instead of cutting
// off right at "I'll continue in <language> now."
//
// Run with: node scripts/seedOverrideFollowup.js
// Then restart the backend (log file writes aren't picked up by --watch).

import { recordTurn } from '../src/lib/transcriptStore.js';

const ACCOUNT_KEY = '+17578216949';

async function appendTurns(sessionId, channel, turns) {
  for (const turn of turns) {
    await recordTurn({ sessionId, channel, accountKey: ACCOUNT_KEY, role: turn.role, text: turn.text });
  }
  console.log(`appended ${turns.length} turns to ${sessionId}`);
}

// Priya Sharma (CUST-1003): balance $519,760.88, next payment 2026-07-15, $3,312.77
await appendTurns('demo-voice-override', 'voice', [
  { role: 'user', text: 'मेरा वर्तमान लोन बैलेंस कितना है?' },
  {
    role: 'assistant',
    text: 'आपका वर्तमान बैलेंस $519,760.88 है, और आपका अगला भुगतान 15 जुलाई 2026 को देय है, राशि $3,312.77। क्या आपको कुछ और चाहिए?',
  },
  { role: 'user', text: 'नहीं, बस इतना ही, धन्यवाद।' },
  { role: 'assistant', text: 'धन्यवाद प्रिया, XYZ Mortgage Company को कॉल करने के लिए। आपका दिन शुभ हो!' },
]);

// David Okafor (CUST-1004): balance $264,310.55, next payment 2026-07-20, $1,738.02
await appendTurns('demo-webchat-override', 'webchat', [
  { role: 'user', text: '¿Cuál es mi saldo actual y cuándo es mi próximo pago?' },
  {
    role: 'assistant',
    text: 'Tu saldo actual es $264,310.55 y tu próximo pago vence el 20 de julio de 2026, por un monto de $1,738.02. ¿Hay algo más en lo que pueda ayudarte?',
  },
  { role: 'user', text: 'No, eso es todo, gracias.' },
  { role: 'assistant', text: '¡De nada, David! Gracias por comunicarte con XYZ Mortgage Company. Que tengas un buen día.' },
]);

console.log('Done. Restart the backend to load this into the dashboard.');
