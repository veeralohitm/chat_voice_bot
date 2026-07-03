import { getRecentInteractions, getLanguageVolumeSummary } from '../lib/logger.js';
import { listSessions, getSessionTranscript } from '../lib/transcriptStore.js';

// Reporting requirement: interaction records with detected language,
// confidence, and fallback/override flags; volume-by-language summary;
// plus session/transcript views for the admin dashboard.
export default async function reportRoutes(fastify) {
  fastify.get('/reports/interactions', async (request) => {
    const limit = Number(request.query?.limit) || 100;
    return getRecentInteractions(limit);
  });

  fastify.get('/reports/summary', async () => {
    const interactions = getRecentInteractions(500);
    return {
      volumeByLanguage: getLanguageVolumeSummary(),
      totalInteractions: interactions.length,
      totalEscalations: interactions.filter((i) => i.escalated).length,
      totalFallbacks: interactions.filter((i) => i.usedFallback).length,
    };
  });

  // Sessions list enriched with the latest language/escalation flags logged
  // for that sessionId, so the dashboard doesn't need to cross-reference
  // /reports/interactions itself.
  fastify.get('/reports/sessions', async () => {
    const interactions = getRecentInteractions(500);

    return listSessions().map((session) => {
      const related = interactions.filter((i) => i.sessionId === session.sessionId);
      const lastWithLanguage = [...related].reverse().find((i) => i.detectedLanguage);

      return {
        ...session,
        detectedLanguage: lastWithLanguage?.detectedLanguage ?? null,
        confidence: lastWithLanguage?.confidence ?? null,
        escalated: related.some((i) => i.escalated),
        usedFallback: related.some((i) => i.usedFallback),
        override: related.some((i) => i.override),
      };
    });
  });

  fastify.get('/reports/sessions/:sessionId', async (request, reply) => {
    const session = getSessionTranscript(request.params.sessionId);
    if (!session) {
      reply.code(404).send({ error: 'Session not found' });
      return;
    }
    return session;
  });
}
