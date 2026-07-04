import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

// Looks up a call's recording directly via the REST API, keyed by CallSid
// (which is our sessionId for voice calls) - a fallback for when the
// recordingStatusCallback webhook doesn't reach this server (e.g. a local
// dev tunnel that changed, or a delivery hiccup), rather than depending on
// that webhook exclusively. Twilio has already finished the recording by the
// time anyone would click play, so this is always safe to call on demand.
export async function findRecordingByCallSid(callSid) {
  if (!client || !callSid) return null;

  const recordings = await client.recordings.list({ callSid, limit: 1 });
  const recording = recordings[0];
  if (!recording) return null;

  return {
    mediaUrl: `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`,
    duration: recording.duration ? Number(recording.duration) : null,
  };
}

export function isTwilioConfigured() {
  return Boolean(client);
}

export { accountSid as twilioAccountSid, authToken as twilioAuthToken };
