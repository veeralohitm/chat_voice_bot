import twilio from 'twilio';
import { getClientConfig } from '../config/clients.js';
import { verifyTwilioRequest } from '../lib/twilioSignature.js';
import { handleChatTurn } from '../lib/chatTurnHandler.js';

export default async function smsRoutes(fastify) {
  // Configure this as the Messaging webhook (HTTP POST) on your Twilio
  // number for both SMS and WhatsApp, e.g. https://<ngrok-domain>/sms/incoming
  fastify.post('/sms/incoming', { preHandler: verifyTwilioRequest }, async (request, reply) => {
    const from = request.body?.From;
    const accountKey = request.body?.To || 'default';
    const body = (request.body?.Body || '').trim();

    fastify.log.info({ from, accountKey, body }, 'Inbound SMS/WhatsApp message');

    const clientConfig = getClientConfig(accountKey);
    const response = new twilio.twiml.MessagingResponse();

    if (!clientConfig.enabled || !from || !body) {
      fastify.log.warn(
        { from, accountKey, bodyEmpty: !body, enabled: clientConfig.enabled },
        'Skipping chat turn - disabled account or missing from/body',
      );
      if (clientConfig.enabled === false) {
        response.message("Sorry, this service isn't available right now.");
      }
      const twiml = response.toString();
      fastify.log.info({ twiml }, 'Outbound TwiML');
      reply.type('text/xml').send(twiml);
      return;
    }

    const sessionKey = `chat:${accountKey}:${from}`;

    try {
      const { replyText } = await handleChatTurn({ channel: 'chat', accountKey, sessionKey, userMessage: body });
      response.message(replyText);
    } catch (err) {
      fastify.log.error({ err }, 'Chat turn failed');
      response.message("Sorry, something went wrong on our end. We'll follow up shortly.");
    }

    const twiml = response.toString();
    fastify.log.info({ twiml }, 'Outbound TwiML');
    reply.type('text/xml').send(twiml);
  });
}
