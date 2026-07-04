import { randomUUID } from 'node:crypto';
import twilio from 'twilio';
import { RealtimeSession } from '@openai/agents/realtime';
import { TwilioRealtimeTransportLayer } from '@openai/agents-extensions';
import { getClientConfig } from '../config/clients.js';
import { buildVoiceAgent } from '../agents/voiceAgent.js';
import { verifyTwilioRequest } from '../lib/twilioSignature.js';
import { recordTurn, updateSessionMeta } from '../lib/transcriptStore.js';

// Only constructed if creds are present, so recording is opt-in via .env
// rather than a hard requirement for the rest of the app to boot.
const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

export default async function voiceRoutes(fastify) {
  // Configure this as the "A call comes in" webhook (HTTP POST) on your
  // Twilio phone number, e.g. https://<ngrok-domain>/voice/incoming-call
  fastify.post('/voice/incoming-call', { preHandler: verifyTwilioRequest }, async (request, reply) => {
    const accountKey = request.body?.To || 'default';
    const callSid = request.body?.CallSid;
    const host = request.headers['x-forwarded-host'] || request.headers.host;

    // Recording is triggered via the REST API on the in-progress call, not
    // via TwiML - <Record> doesn't compose with <Connect><Stream> (Stream
    // takes exclusive control of the call), so this is the documented way
    // to record a call that's being driven by a Media Stream. It runs
    // alongside the stream, not instead of it.
    if (twilioClient && callSid) {
      try {
        await twilioClient.calls(callSid).recordings.create({
          recordingStatusCallback: `https://${host}/voice/recording-status`,
          recordingStatusCallbackEvent: ['completed'],
        });
      } catch (err) {
        fastify.log.error({ err, callSid }, 'Failed to start call recording');
      }
    }

    const response = new twilio.twiml.VoiceResponse();
    const connect = response.connect();
    // accountKey travels in the query string (available the instant the
    // websocket connects) rather than as a Twilio <Parameter> (which only
    // arrives inside the "start" event, after the stream is already live).
    // callSid deliberately does NOT ride along here too - Twilio doesn't
    // reliably preserve a second query parameter on this URL in practice
    // (confirmed: both params came through empty on a real call once a
    // second was added). callSid isn't needed here anyway - it's already a
    // native field on the Media Stream's own "start" event below.
    connect.stream({ url: `wss://${host}/voice/media-stream?accountKey=${encodeURIComponent(accountKey)}` });

    reply.type('text/xml').send(response.toString());
  });

  // Twilio POSTs here once the recording is done processing. RecordingUrl
  // has no file extension by default - appending .mp3 makes it directly
  // playable; Twilio also serves .wav at the same base URL if preferred.
  fastify.post('/voice/recording-status', async (request, reply) => {
    const { CallSid, RecordingUrl, RecordingDuration, RecordingStatus } = request.body || {};

    if (RecordingStatus === 'completed' && CallSid && RecordingUrl) {
      await updateSessionMeta(CallSid, {
        recordingUrl: `${RecordingUrl}.mp3`,
        recordingDuration: RecordingDuration ? Number(RecordingDuration) : null,
      });
      fastify.log.info({ callSid: CallSid }, 'Call recording ready');
    }

    reply.code(204).send();
  });

  fastify.register(async function mediaStreamPlugin(scoped) {
    scoped.get('/voice/media-stream', { websocket: true }, (socket, req) => {
      const accountKey = req.query?.accountKey || 'default';
      // A placeholder until the "start" event's native callSid field
      // arrives (see below) - sessionContext is a shared mutable object so
      // every tool/log call downstream reads the latest value instead of a
      // snapshot taken before we knew the real CallSid.
      const sessionContext = { sessionId: randomUUID() };
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
            fastify.log.info({ accountKey, sessionId: sessionContext.sessionId }, 'Ending call');
            socket.close();
          };

          // Built once, correctly, up front - no later agent swap, so there's
          // no risk of racing a session.update against the first response.
          const agent = buildVoiceAgent({
            accountKey,
            sessionContext,
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
            if (event.type === 'twilio_message' && event.message?.event === 'start' && event.message.start?.callSid) {
              // The real CallSid, native to every Media Stream "start" event -
              // no query string or custom parameter needed to get it.
              sessionContext.sessionId = event.message.start.callSid;
              fastify.log.info({ accountKey, sessionId: sessionContext.sessionId }, 'Resolved real CallSid for session');
            } else if (event.type === 'conversation.item.input_audio_transcription.completed') {
              fastify.log.info(`[${accountKey}] Caller: ${event.transcript}`);
              recordTurn({ sessionId: sessionContext.sessionId, channel: 'voice', accountKey, role: 'user', text: event.transcript });
            } else if (event.type === 'response.output_audio_transcript.done') {
              fastify.log.info(`[${accountKey}] Assistant: ${event.transcript}`);
              recordTurn({ sessionId: sessionContext.sessionId, channel: 'voice', accountKey, role: 'assistant', text: event.transcript });
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
          fastify.log.info({ accountKey, sessionId: sessionContext.sessionId }, 'Realtime voice session connected');

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
