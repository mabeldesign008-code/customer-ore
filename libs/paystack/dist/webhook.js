"use strict";
/** Paystack webhook verification — HMAC-SHA512 over the RAW request body, constant-time compare.
 *  Docs: paystack.com/docs/payments/webhooks. Non-negotiable P0 (gap G06). */
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeSignature = computeSignature;
exports.verifyWebhookSignature = verifyWebhookSignature;
exports.parseWebhook = parseWebhook;
const crypto_1 = require("crypto");
function computeSignature(secretKey, rawBody) {
    return (0, crypto_1.createHmac)('sha512', secretKey).update(rawBody).digest('hex');
}
function verifyWebhookSignature(secretKey, rawBody, signatureHeader) {
    if (!signatureHeader || !secretKey)
        return false;
    const expected = computeSignature(secretKey, rawBody);
    const a = Buffer.from(expected);
    const b = Buffer.from(signatureHeader);
    if (a.length !== b.length)
        return false;
    return (0, crypto_1.timingSafeEqual)(a, b);
}
function parseWebhook(rawBody) {
    return JSON.parse(rawBody.toString('utf8'));
}
//# sourceMappingURL=webhook.js.map