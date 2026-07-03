import twilio from 'twilio';

// Off by default so the demo works immediately behind ngrok (whose URL/host
// header can be finicky to get byte-for-byte right). Turn on for anything
// beyond local testing by setting TWILIO_VALIDATE_SIGNATURE=true and
// PUBLIC_BASE_URL to the exact https URL Twilio is configured to call.
export function verifyTwilioRequest(request, reply, done) {
  if (process.env.TWILIO_VALIDATE_SIGNATURE !== 'true') {
    return done();
  }

  const signature = request.headers['x-twilio-signature'];
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const baseUrl = process.env.PUBLIC_BASE_URL;

  if (!authToken || !baseUrl) {
    request.log.warn(
      'TWILIO_VALIDATE_SIGNATURE=true but TWILIO_AUTH_TOKEN or PUBLIC_BASE_URL is not set; skipping validation.',
    );
    return done();
  }

  const url = `${baseUrl.replace(/\/$/, '')}${request.raw.url}`;
  const isValid = twilio.validateRequest(authToken, signature, url, request.body || {});

  if (!isValid) {
    reply.code(403).send('Invalid Twilio signature');
    return;
  }

  done();
}
