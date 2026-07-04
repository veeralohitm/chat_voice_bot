import { tool } from '@openai/agents';
import { z } from 'zod';
import { logInteraction } from '../lib/logger.js';
import { findCustomer, toPublicLoanRecord, isPlausibleDobYear } from '../lib/customerStore.js';

// Function tools shared by the voice agent. The chat agent instead reports
// language/escalation directly via structured output (see chatAgent.js)
// since it runs one turn at a time behind a webhook rather than a live session.

// onEndCall lets the caller of buildVoiceTools (voice.js) supply the actual
// "hang up the phone" behavior, since that requires access to the Twilio
// socket, which this module intentionally doesn't know about.
//
// sessionContext is a shared mutable object ({ sessionId }), not a plain
// string - the real Twilio CallSid only becomes known slightly after the
// agent/tools are built (it arrives on the Media Stream's native "start"
// event), so voice.js updates sessionContext.sessionId in place once it
// has it. Tools read it fresh at execute() time rather than closing over
// a snapshot, so every log entry after that point uses the real CallSid.
export function buildVoiceTools({ accountKey, sessionContext, clientConfig, onEndCall }) {
  const reportLanguage = tool({
    name: 'report_language',
    description:
      "Report the language currently detected for this caller so it can be logged and so the caller's account settings (supported languages, fallback) can be checked.",
    parameters: z.object({
      languageCode: z
        .string()
        .describe('ISO 639-1 code of the detected language, e.g. "en", "es", "hi".'),
      confidence: z.number().min(0).max(1),
      source: z.enum(['initial', 'switch', 'override']),
    }),
    execute: async ({ languageCode, confidence, source }) => {
      const supported = clientConfig.supportedLanguages.includes(languageCode);
      await logInteraction({
        channel: 'voice',
        accountKey,
        sessionId: sessionContext.sessionId,
        detectedLanguage: languageCode,
        confidence,
        override: source === 'override',
        usedFallback: !supported,
        note: `source=${source}`,
      });

      if (!supported) {
        return {
          supported: false,
          instruction: `Language "${languageCode}" is not supported for this account. Switch to the fallback language "${clientConfig.fallbackLanguage}" and call request_human_transfer.`,
        };
      }

      return { supported: true, instruction: `Continue the conversation in "${languageCode}".` };
    },
  });

  const requestHumanTransfer = tool({
    name: 'request_human_transfer',
    description:
      'Request a transfer to a human agent because the caller\'s language is unsupported or confidence stayed low. Returns what to do based on staffing and the account overflow policy.',
    parameters: z.object({
      languageCode: z.string().describe('The language that needs a human agent.'),
      reason: z.enum(['unsupported_language', 'low_confidence']),
    }),
    execute: async ({ languageCode, reason }) => {
      const fluentAgentAvailable = Boolean(clientConfig.fluentAgentAvailable[languageCode]);

      await logInteraction({
        channel: 'voice',
        accountKey,
        sessionId: sessionContext.sessionId,
        detectedLanguage: languageCode,
        confidence: null,
        escalated: true,
        usedFallback: true,
        note: `transfer_reason=${reason} fluent_agent_available=${fluentAgentAvailable}`,
      });

      if (fluentAgentAvailable) {
        return {
          action: 'transfer',
          instruction: `Tell the caller you're connecting them to a ${languageCode}-speaking team member now, then transfer the call.`,
        };
      }

      return {
        action: clientConfig.overflowBehavior,
        instruction: `No ${languageCode}-speaking agent is available right now. Follow the account's overflow behavior: "${clientConfig.overflowBehavior}". Explain this to the caller in ${clientConfig.fallbackLanguage} and, if it's a callback or voicemail, collect their name and callback number.`,
      };
    },
  });

  const verifyIdentity = tool({
    name: 'verify_identity',
    description:
      "Verify the caller's identity using their full name and the year they were born, and retrieve their mortgage loan record. Must be called before discussing any account-specific details, and before asking why they're calling. Do NOT call this until the caller has themselves said both a full name and a 4-digit birth year - never invent, guess, or estimate either value just to have something to pass in. If you're missing one of them, ask for it out loud instead of calling this tool.",
    parameters: z.object({
      fullName: z.string().describe("The caller's full name exactly as they said it - never invented."),
      dobYear: z.number().int().describe('The 4-digit year the caller said as their birth year - never guessed or estimated.'),
    }),
    execute: async ({ fullName, dobYear }) => {
      if (!isPlausibleDobYear(dobYear)) {
        await logInteraction({
          channel: 'voice',
          accountKey,
          sessionId: sessionContext.sessionId,
          note: `identity_verification=implausible_dob_year name="${fullName}" dobYear=${dobYear}`,
        });
        return {
          verified: false,
          instruction:
            "That isn't a real birth year - you must not guess or fill one in yourself. Ask the caller for their birth year and wait for their actual reply before calling verify_identity again.",
        };
      }

      const match = findCustomer({ fullName, dobYear });

      await logInteraction({
        channel: 'voice',
        accountKey,
        sessionId: sessionContext.sessionId,
        note: `identity_verification=${match ? 'success' : 'failed'} name="${fullName}"`,
      });

      if (!match) {
        return {
          verified: false,
          instruction:
            "No account matches that name and birth year. Ask the caller to double-check and repeat both. After two failed attempts total, apologize, explain you can't access account details without verifying identity, offer to have someone call them back, then say goodbye and call end_call.",
        };
      }

      return {
        verified: true,
        customer: toPublicLoanRecord(match),
        instruction: `Identity verified. Greet ${match.firstName} by name, then ask how you can help. From now on, only answer using these exact fields - never guess or estimate a number. If asked about anything not included here, say you don't have that on file and offer to have a specialist follow up.`,
      };
    },
  });

  const endCall = tool({
    name: 'end_call',
    description:
      'Ends the phone call. Call this only after you have already said your final goodbye/thank-you out loud - never call it before or instead of speaking the goodbye.',
    parameters: z.object({}),
    execute: async () => {
      onEndCall?.();
      return { instruction: 'The call will now end.' };
    },
  });

  return [reportLanguage, requestHumanTransfer, verifyIdentity, endCall];
}
