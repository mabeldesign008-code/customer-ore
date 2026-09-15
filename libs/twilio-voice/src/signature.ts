/** Validate X-Twilio-Signature. https://www.twilio.com/docs/usage/security#validating-requests */

import { createHmac, timingSafeEqual } from 'crypto';

export function twilioRequestSignature(authToken: string, url: string, params: Record<string, string>): string {
  const keys = Object.keys(params).sort();
  let data = url;
  for (const key of keys) data += key + params[key];
  return createHmac('sha1', authToken).update(data, 'utf8').digest('base64');
}

export function twilioSignatureIsValid(
  authToken: string,
  url: string,
  params: Record<string, string>,
  provided: string | undefined,
): boolean {
  if (!authToken || !provided) return false;
  const expected = twilioRequestSignature(authToken, url, params);
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
