/** Paystack webhook verification — HMAC-SHA512 over the RAW request body, constant-time compare.
 *  Docs: paystack.com/docs/payments/webhooks. Non-negotiable P0 (gap G06). */

import { createHmac, timingSafeEqual } from 'crypto';

export function computeSignature(secretKey: string, rawBody: string | Buffer): string {
  return createHmac('sha512', secretKey).update(rawBody).digest('hex');
}

export function verifyWebhookSignature(secretKey: string, rawBody: string | Buffer, signatureHeader: string | undefined): boolean {
  if (!signatureHeader || !secretKey) return false;
  const expected = computeSignature(secretKey, rawBody);
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export interface PaystackWebhookPayload<T = unknown> {
  event: string;
  data: T;
}

export function parseWebhook(rawBody: string | Buffer): PaystackWebhookPayload {
  return JSON.parse(rawBody.toString('utf8')) as PaystackWebhookPayload;
}
