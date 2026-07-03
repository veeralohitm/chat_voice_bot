import { getClientConfig } from '../config/clients.js';
import { getSession, saveSession, transcriptFor } from './sessionStore.js';
import { runChatTurn } from '../agents/chatAgent.js';
import { logInteraction } from './logger.js';
import { recordTurn } from './transcriptStore.js';

// Shared by every text-based channel (SMS/WhatsApp, the web chat widget, ...):
// runs one turn through the chat agent and persists session/log/transcript
// state identically regardless of transport, so the two channels can never
// drift into different identity-verification or grounding behavior.
export async function handleChatTurn({ channel, accountKey, sessionKey, userMessage }) {
  const clientConfig = getClientConfig(accountKey);
  const session = getSession(sessionKey);
  const transcript = transcriptFor(session);

  const { output, newlyVerifiedCustomer } = await runChatTurn({
    clientConfig,
    transcript,
    userMessage,
    verifiedCustomer: session.verifiedCustomer,
  });

  session.turns.push({ role: 'user', content: userMessage });
  session.turns.push({ role: 'assistant', content: output.reply });
  session.detectedLanguage = output.languageCode;
  session.confidence = output.confidence;
  if (output.languageSource === 'override') session.overrideLanguage = output.languageCode;
  if (newlyVerifiedCustomer) session.verifiedCustomer = newlyVerifiedCustomer;
  saveSession(sessionKey, session);

  await logInteraction({
    channel,
    accountKey,
    sessionId: sessionKey,
    detectedLanguage: output.languageCode,
    confidence: output.confidence,
    usedFallback: !output.isSupportedLanguage,
    override: output.languageSource === 'override',
    escalated: output.escalateToHuman,
    note: `source=${output.languageSource}${newlyVerifiedCustomer ? ' identity_verified=true' : ''}`,
  });

  const replyText = output.reply?.trim() || "Sorry, I didn't get a response ready in time. Please try again.";
  await recordTurn({ sessionId: sessionKey, channel, accountKey, role: 'user', text: userMessage });
  await recordTurn({ sessionId: sessionKey, channel, accountKey, role: 'assistant', text: replyText });

  return { replyText, verified: Boolean(session.verifiedCustomer) };
}
