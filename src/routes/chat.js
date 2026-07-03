import { randomUUID } from 'node:crypto';
import { getClientConfig } from '../config/clients.js';
import { handleChatTurn } from '../lib/chatTurnHandler.js';

// Falls back to the Twilio number already seeded in src/data/clients.json so
// the widget works out of the box; pass accountKey explicitly to target a
// different client account.
const DEFAULT_ACCOUNT_KEY = process.env.TWILIO_PHONE_NUMBER || 'default';

export default async function chatRoutes(fastify) {
  // Generic web chat endpoint for a browser-based widget (not Twilio). Reuses
  // the exact same identity-verification + grounded-answer chat agent as
  // SMS/WhatsApp (see chatTurnHandler.js), just over plain JSON instead of TwiML.
  fastify.post('/chat/message', async (request, reply) => {
    const message = (request.body?.message || '').trim();
    const accountKey = request.body?.accountKey || DEFAULT_ACCOUNT_KEY;
    const sessionId = request.body?.sessionId || randomUUID();

    if (!message) {
      reply.code(400).send({ error: 'message is required' });
      return;
    }

    const clientConfig = getClientConfig(accountKey);
    if (!clientConfig.enabled) {
      reply.send({ sessionId, reply: "Sorry, this service isn't available right now.", verified: false });
      return;
    }

    const sessionKey = `webchat:${accountKey}:${sessionId}`;

    try {
      const { replyText, verified } = await handleChatTurn({
        channel: 'webchat',
        accountKey,
        sessionKey,
        userMessage: message,
      });
      reply.send({ sessionId, reply: replyText, verified });
    } catch (err) {
      fastify.log.error({ err }, 'Web chat turn failed');
      reply.code(500).send({
        sessionId,
        reply: 'Sorry, something went wrong on our end. Please try again.',
        verified: false,
      });
    }
  });
}
