import { getClientConfig, updateClientConfig, listClientConfigs, LANGUAGE_NAMES } from '../config/clients.js';

// Minimal admin API for the Config requirement: enable/disable the feature,
// choose supported languages, and set fallback behavior per client account.
// accountKey is the client's Twilio number (E.164) by convention.
export default async function adminRoutes(fastify) {
  // Single source of truth for "which languages exist" - frontends fetch
  // this instead of hardcoding their own copy, so adding a language here is
  // the only code change needed for it to show up everywhere.
  fastify.get('/admin/languages', async () => {
    return Object.entries(LANGUAGE_NAMES).map(([code, name]) => ({ code, name }));
  });

  fastify.get('/admin/clients', async () => listClientConfigs());

  fastify.get('/admin/clients/:accountKey', async (request) => {
    return getClientConfig(request.params.accountKey);
  });

  fastify.put('/admin/clients/:accountKey', async (request, reply) => {
    const allowedKeys = [
      'enabled',
      'supportedLanguages',
      'fallbackLanguage',
      'overflowBehavior',
      'fluentAgentAvailable',
      'detectionConfidenceThreshold',
      'switchConfidenceThreshold',
    ];
    const patch = Object.fromEntries(
      Object.entries(request.body || {}).filter(([key]) => allowedKeys.includes(key)),
    );

    if (Object.keys(patch).length === 0) {
      reply.code(400).send({ error: `No valid fields provided. Allowed: ${allowedKeys.join(', ')}` });
      return;
    }

    return updateClientConfig(request.params.accountKey, patch);
  });
}
