import { randomUUID } from 'node:crypto';
import twilio from 'twilio';
import { RealtimeSession } from '@openai/agents/realtime';
import { TwilioRealtimeTransportLayer } from '@openai/agents-extensions';
import { getClientConfig } from '../config/clients.js';
import { buildVoiceAgent } from '../agents/voiceAgent.js';
import { verifyTwilioRequest } from '../lib/twilioSignature.js';
import { recordTurn } from '../lib/transcriptStore.js';

export default async function voiceRoutes(fastify) {
  // Configure this as the "A call comes in" webhook (HTTP POST) on your
  // Twilio phone number, e.g. https://<ngrok-domain>/voice/incoming-call
  fastify.post('/voice/incoming-call', { preHandler: verifyTwilioRequest }, async (request, reply) => {
    const accountKey = request.body?.To || 'default';
    const host = request.headers['x-forwarded-host'] || request.headers.host;

    const response = new twilio.twiml.VoiceResponse();
    const connect = response.connect();
    // accountKey travels in the query string (available the instant the
    // websocket connects) rather than as a Twilio <Parameter> (which only
    // arrives inside the "start" event, after the stream is already live).
    connect.stream({ url: `wss://${host}/voice/media-stream?accountKey=${encodeURIComponent(accountKey)}` });

    reply.type('text/xml').send(response.toString());
  });

  fastify.register(async function mediaStreamPlugin(scoped) {
    scoped.get('/voice/media-stream', { websocket: true }, (socket, req) => {
      const accountKey = req.query?.accountKey || 'default';
      const sessionId = randomUUID();
      let session;

      (async () => {
        try {
          const clientConfig = getClientConfig(accountKey);

          if (!clientConfig.enabled) {
            fastify.log.info({ accountKey }, 'Multilingual feature disabled for account, closing stream');
            socket.close();
            return;
          }

          // Set once the model calls end_call, after it has spoken its
          // goodbye. We don't hang up immediately - see the mark handling
          // below, which waits for Twilio to confirm that audio actually
          // finished playing on the call before closing the socket.
          let hangupRequested = false;
          let hungUp = false;
          const hangUp = () => {
            if (hungUp) return;
            hungUp = true;
            fastify.log.info({ accountKey, sessionId }, 'Ending call');
            socket.close();
          };

          // Built once, correctly, up front - no later agent swap, so there's
          // no risk of racing a session.update against the first response.
          const agent = buildVoiceAgent({
            accountKey,
            sessionId,
            clientConfig,
            onEndCall: () => {
              hangupRequested = true;
              // Safety net in case Twilio never echoes the completion mark.
              setTimeout(hangUp, 8000);
            },
          });
          const transport = new TwilioRealtimeTransportLayer({ twilioWebSocket: socket });

          session = new RealtimeSession(agent, {
            transport,
            model: process.env.REALTIME_MODEL || 'gpt-realtime',
            // Twilio Media Streams is always 8kHz mu-law. The transport only
            // fills this in when it's missing, so pin it explicitly rather
            // than relying on whatever the model's own default happens to be.
            config: {
              audio: {
                input: { format: 'g711_ulaw' },
                output: { format: 'g711_ulaw' },
              },
            },
          });

          session.on('error', (err) => {
            fastify.log.error({ err }, 'Realtime session error');
          });

          // Print a live transcript of both sides of the call to the console.
          session.on('transport_event', (event) => {
            if (event.type === 'conversation.item.input_audio_transcription.completed') {
              fastify.log.info(`[${accountKey}] Caller: ${event.transcript}`);
              recordTurn({ sessionId, channel: 'voice', accountKey, role: 'user', text: event.transcript });
            } else if (event.type === 'response.output_audio_transcript.done') {
              fastify.log.info(`[${accountKey}] Assistant: ${event.transcript}`);
              recordTurn({ sessionId, channel: 'voice', accountKey, role: 'assistant', text: event.transcript });
            } else if (
              hangupRequested &&
              event.type === 'twilio_message' &&
              event.message?.event === 'mark' &&
              typeof event.message?.mark?.name === 'string' &&
              event.message.mark.name.startsWith('done:')
            ) {
              // Twilio has confirmed it finished playing the goodbye audio.
              hangUp();
            }
          });

          await session.connect({ apiKey: process.env.OPENAI_API_KEY });
          fastify.log.info({ accountKey, sessionId }, 'Realtime voice session connected');

          // The Realtime API waits for caller audio by default; ask it to
          // speak the opening greeting proactively instead of sitting silent.
          session.transport.sendEvent({ type: 'response.create' });
        } catch (err) {
          fastify.log.error({ err }, 'Failed to start realtime session for call');
          socket.close();
        }
      })();

      socket.addEventListener('close', () => {
        session?.close();
      });
    });
  });
}
