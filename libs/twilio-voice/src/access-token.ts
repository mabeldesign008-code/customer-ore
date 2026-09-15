/** Twilio Voice Access Token (JWT) — not the SMS Auth Token, not Ore's JWT.
 *
 * Official shape: https://www.twilio.com/docs/iam/access-tokens
 * Header `cty` must be `twilio-fpa;v=1`. Signed with the API Key secret.
 */

import jwt from 'jsonwebtoken';

export const TWILIO_VOICE_TOKEN_TTL_SEC = 15 * 60;

export interface TwilioVoiceTokenInput {
  accountSid: string;
  apiKeySid: string;
  apiSecret: string;
  twimlAppSid: string;
  identity: string;
  /**
   * Push Credential SID (CR…) for this device's platform — Android (FCM v1) and iOS
   * (APNs VoIP) need SEPARATE credentials. Without it the Voice SDK cannot be woken by
   * push, so incoming calls only ring while the app is in the foreground.
   * https://www.twilio.com/docs/voice/sdks/android/get-started (step 7)
   */
  pushCredentialSid?: string;
  ttlSec?: number;
  now?: Date;
}

export interface TwilioVoiceToken {
  token: string;
  identity: string;
  expiresAt: Date;
  ttlSec: number;
}

export function mintTwilioVoiceAccessToken(input: TwilioVoiceTokenInput): TwilioVoiceToken {
  const identity = input.identity.trim();
  if (!identity) throw new Error('Voice identity is required');
  if (!input.accountSid.startsWith('AC')) throw new Error('TWILIO_ACCOUNT_SID is invalid');
  if (!input.apiKeySid.startsWith('SK')) throw new Error('TWILIO_API_KEY is invalid');
  if (!input.twimlAppSid.startsWith('AP')) throw new Error('TWILIO_TWIML_APP_SID is invalid');
  if (!input.apiSecret.trim()) throw new Error('TWILIO_API_SECRET is required');

  const ttlSec = input.ttlSec ?? TWILIO_VOICE_TOKEN_TTL_SEC;
  const now = input.now ?? new Date();
  const iat = Math.floor(now.getTime() / 1000);
  const expiresAt = new Date((iat + ttlSec) * 1000);

  const pushCredentialSid = input.pushCredentialSid?.trim();
  const token = jwt.sign(
    {
      grants: {
        identity,
        voice: {
          incoming: { allow: true },
          outgoing: { application_sid: input.twimlAppSid },
          // Only set when a platform push credential exists. Sending an empty string here
          // makes Twilio reject the registration outright.
          ...(pushCredentialSid ? { push_credential_sid: pushCredentialSid } : {}),
        },
      },
    },
    input.apiSecret,
    {
      algorithm: 'HS256',
      header: { typ: 'JWT', cty: 'twilio-fpa;v=1', alg: 'HS256' },
      issuer: input.apiKeySid,
      subject: input.accountSid,
      jwtid: `${input.apiKeySid}-${iat}`,
      expiresIn: ttlSec,
      notBefore: 0,
    },
  );

  return { token, identity, expiresAt, ttlSec };
}
