import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';
import { buildMultilingualInstructions } from './instructions.js';
import { findCustomer, toPublicLoanRecord, isPlausibleDobYear } from '../lib/customerStore.js';

export const ChatTurnOutput = z.object({
  reply: z.string().describe('The message to send back to the user, in the detected/active language.'),
  languageCode: z.string().describe('ISO 639-1 code of the language used for this reply, e.g. "en", "es", "hi".'),
  confidence: z.number().min(0).max(1).describe('Confidence in the detected language for this message.'),
  languageSource: z.enum(['initial', 'switch', 'override', 'unchanged']),
  isSupportedLanguage: z.boolean(),
  escalateToHuman: z.boolean().describe('True if this should be handed to a human agent.'),
});

// The tool mutates `verificationResult` (a plain object owned by the caller)
// instead of returning the customer through the structured turn output,
// since outputType is fixed to ChatTurnOutput and doesn't carry loan fields.
//
// `conversationText` is the actual transcript so far (prior turns + this
// message) - used to catch a model inventing a birth year that merely looks
// plausible but was never actually typed by the user. Prompt instructions
// alone aren't reliable enough on a smaller/faster model to prevent this, so
// this is a deterministic check independent of how well it follows them.
function buildVerifyIdentityTool(verificationResult, conversationText) {
  return tool({
    name: 'verify_identity',
    description:
      "Verify the user's identity using their full name and the year they were born, and retrieve their mortgage loan record. Must be called before discussing any account-specific details. Do NOT call this until the user has themselves typed both a full name and a 4-digit birth year somewhere in the conversation - never invent, guess, or estimate either value just to have something to pass in. If you're missing one of them, ask for it in plain text instead of calling this tool.",
    parameters: z.object({
      fullName: z.string().describe("The user's full name exactly as they typed it - never invented."),
      dobYear: z.number().int().describe('The 4-digit year the user typed as their birth year - never guessed or estimated.'),
    }),
    execute: async ({ fullName, dobYear }) => {
      if (!isPlausibleDobYear(dobYear)) {
        return {
          verified: false,
          instruction:
            "That isn't a real birth year - you must not guess or fill one in yourself. Ask the user for their birth year and wait for their actual reply before calling verify_identity again.",
        };
      }

      if (!conversationText.includes(String(dobYear))) {
        return {
          verified: false,
          instruction:
            "That birth year was never actually typed by the user anywhere in this conversation - you must have invented it. Ask them directly for their birth year and only call verify_identity again once they've replied with an actual year.",
        };
      }

      const match = findCustomer({ fullName, dobYear });

      if (!match) {
        return {
          verified: false,
          instruction:
            "No account matches that name and birth year. Ask them to double-check and repeat both. After two failed attempts total, apologize, explain you can't access account details without verifying identity, and offer to have someone follow up.",
        };
      }

      verificationResult.customer = match;
      const publicRecord = toPublicLoanRecord(match);

      return {
        verified: true,
        customer: publicRecord,
        instruction: `Identity verified. Greet ${match.firstName} by name, then help with their request. From now on, only answer using these exact fields - never guess or estimate a number. If asked about anything not included here, say you don't have that on file and offer to have a specialist follow up.`,
      };
    },
  });
}

function buildChatAgent({ clientConfig, verifiedCustomer, verificationResult, conversationText }) {
  const instructions = buildMultilingualInstructions({
    supportedLanguages: clientConfig.supportedLanguages,
    fallbackLanguage: clientConfig.fallbackLanguage,
    mode: 'chat',
  });

  const knownCustomerNote = verifiedCustomer
    ? `\n\nThis user has already been verified this conversation as ${verifiedCustomer.firstName} ${verifiedCustomer.lastName}. Their loan record: ${JSON.stringify(toPublicLoanRecord(verifiedCustomer))}. Do not ask for their name or birth year again, and do not call verify_identity again - just help them using this data.`
    : '';

  return new Agent({
    name: 'Multilingual Chat Receptionist',
    model: process.env.CHAT_MODEL || 'gpt-4.1-mini',
    instructions: `${instructions}${knownCustomerNote}

OUTPUT
- Language reporting has no tool in this mode. Instead, return structured output every turn: the reply text, the language you used, your confidence, why the language was chosen ("initial" | "switch" | "override" | "unchanged"), whether that language is in the supported list, and whether this needs human escalation (true only when unsupported language or persistent low confidence, matching the fallback/escalation rules above).
- You do have the "verify_identity" tool for identity checks - use it exactly as instructed above, then still return the structured output as your final turn result.
- When escalateToHuman is true, "reply" should still contain a polite message in the fallback language telling the user a human will follow up, following the account's overflow behavior described above.`,
    tools: verifiedCustomer ? [] : [buildVerifyIdentityTool(verificationResult, conversationText)],
    outputType: ChatTurnOutput,
  });
}

// Runs one chat turn. `transcript` is the full prior conversation as plain
// text (see sessionStore.transcriptFor); `userMessage` is the new inbound
// text; `verifiedCustomer` is the full customer record if this session has
// already passed identity verification, or null otherwise.
export async function runChatTurn({ clientConfig, transcript, userMessage, verifiedCustomer }) {
  const verificationResult = { customer: null };
  const input = transcript ? `${transcript}\nUser: ${userMessage}` : `User: ${userMessage}`;
  const agent = buildChatAgent({ clientConfig, verifiedCustomer, verificationResult, conversationText: input });

  const result = await run(agent, input);
  return {
    output: result.finalOutput,
    newlyVerifiedCustomer: verificationResult.customer,
  };
}
