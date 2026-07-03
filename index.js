import 'dotenv/config';
import Fastify from 'fastify';
import fastifyFormBody from '@fastify/formbody';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';

import voiceRoutes from './src/routes/voice.js';
import smsRoutes from './src/routes/sms.js';
import chatRoutes from './src/routes/chat.js';
import adminRoutes from './src/routes/admin.js';
import reportRoutes from './src/routes/reports.js';

if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-key-here') {
  console.warn('[startup] OPENAI_API_KEY is missing or still a placeholder in .env — voice/chat calls will fail.');
}

const fastify = Fastify({ logger: true });

await fastify.register(fastifyFormBody);
await fastify.register(fastifyWebsocket);
// Local-dev only: lets the admin-ui React dev server (a different origin/port)
// call this API directly. Restrict this before deploying anywhere shared.
// @fastify/cors defaults to only allowing GET,HEAD,POST - our admin API uses
// PUT, so it must be listed explicitly or the browser blocks it at the
// preflight stage with no server-side error to show for it.
await fastify.register(fastifyCors, { origin: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] });

await fastify.register(voiceRoutes);
await fastify.register(smsRoutes);
await fastify.register(chatRoutes);
await fastify.register(adminRoutes);
await fastify.register(reportRoutes);

fastify.get('/', async () => ({ status: 'ok', service: 'multilingual-voice-chat-bot' }));

const port = Number(process.env.PORT) || 5050;

try {
  await fastify.listen({ port, host: '0.0.0.0' });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
