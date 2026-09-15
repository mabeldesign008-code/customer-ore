"use strict";
/** Validate X-Twilio-Signature. https://www.twilio.com/docs/usage/security#validating-requests */
Object.defineProperty(exports, "__esModule", { value: true });
exports.twilioRequestSignature = twilioRequestSignature;
exports.twilioSignatureIsValid = twilioSignatureIsValid;
const crypto_1 = require("crypto");
function twilioRequestSignature(authToken, url, params) {
    const keys = Object.keys(params).sort();
    let data = url;
    for (const key of keys)
        data += key + params[key];
    return (0, crypto_1.createHmac)('sha1', authToken).update(data, 'utf8').digest('base64');
}
function twilioSignatureIsValid(authToken, url, params, provided) {
    if (!authToken || !provided)
        return false;
    const expected = twilioRequestSignature(authToken, url, params);
    const a = Buffer.from(expected);
    const b = Buffer.from(provided);
    if (a.length !== b.length)
        return false;
    return (0, crypto_1.timingSafeEqual)(a, b);
}
//# sourceMappingURL=signature.js.map