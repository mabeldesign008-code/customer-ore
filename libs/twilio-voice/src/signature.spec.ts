import { twilioRequestSignature, twilioSignatureIsValid } from './signature';

describe('twilio signature', () => {
  const token = 'auth-token';
  const url = 'https://api.ore.app/api/comms/voice/twiml';
  const params = { To: 'ore_rider', orderId: 'ord-1', From: 'client:ore_cust' };

  it('accepts the HMAC Twilio would send', () => {
    const sig = twilioRequestSignature(token, url, params);
    expect(twilioSignatureIsValid(token, url, params, sig)).toBe(true);
  });

  it('rejects a missing or wrong signature', () => {
    expect(twilioSignatureIsValid(token, url, params, undefined)).toBe(false);
    expect(twilioSignatureIsValid(token, url, params, 'nope')).toBe(false);
  });
});
