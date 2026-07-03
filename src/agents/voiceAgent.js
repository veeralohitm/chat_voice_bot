import { RealtimeAgent } from '@openai/agents/realtime';
import { buildMultilingualInstructions } from './instructions.js';
import { buildVoiceTools } from './tools.js';

export function buildVoiceAgent({ accountKey, sessionId, clientConfig, businessName, onEndCall }) {
  const instructions = buildMultilingualInstructions({
    supportedLanguages: clientConfig.supportedLanguages,
    fallbackLanguage: clientConfig.fallbackLanguage,
    businessName,
    mode: 'voice',
  });

  return new RealtimeAgent({
    name: 'Multilingual Voice Receptionist',
    instructions,
    tools: buildVoiceTools({ accountKey, sessionId, clientConfig, onEndCall }),
  });
}
