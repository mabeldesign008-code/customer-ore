import jwt from 'jsonwebtoken';
import { mintTwilioVoiceAccessToken } from './access-token';

describe('mintTwilioVoiceAccessToken', () => {
  const creds = {
    accountSid: 'ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    apiKeySid: 'SKbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    apiSecret: 'voice-api-secret',
    twimlAppSid: 'APcccccccccccccccccccccccccccccccc',
    identity: 'ore_user-1',
    now: new Date('2026-08-19T12:00:00.000Z'),
  };

  it('mints a Voice grant JWT signed with the API secret', () => {
    const minted = mintTwilioVoiceAccessToken(creds);
    const decoded = jwt.verify(minted.token, creds.apiSecret) as {
      iss: string;
      sub: string;
      grants: { identity: string; voice: { incoming: { allow: boolean }; outgoing: { application_sid: string } } };
    };
    const header = jwt.decode(minted.token, { complete: true })?.header as { cty?: string };

    expect(header.cty).toBe('twilio-fpa;v=1');
    expect(decoded.iss).toBe(creds.apiKeySid);
    expect(decoded.sub).toBe(creds.accountSid);
    expect(decoded.grants.identity).toBe('ore_user-1');
    expect(decoded.grants.voice.incoming.allow).toBe(true);
    expect(decoded.grants.voice.outgoing.application_sid).toBe(creds.twimlAppSid);
    expect(minted.ttlSec).toBe(15 * 60);
  });

  it('includes push_credential_sid in the voice grant when provided', () => {
    const minted = mintTwilioVoiceAccessToken({ ...creds, pushCredentialSid: 'CRdddddddddddddddddddddddddddddddd' });
    const decoded = jwt.verify(minted.token, creds.apiSecret) as {
      grants: { voice: { push_credential_sid?: string } };
    };
    expect(decoded.grants.voice.push_credential_sid).toBe('CRdddddddddddddddddddddddddddddddd');
  });

  it('omits push_credential_sid entirely when absent or blank (empty string breaks registration)', () => {
    for (const pushCredentialSid of [undefined, '  ']) {
      const minted = mintTwilioVoiceAccessToken({ ...creds, pushCredentialSid });
      const decoded = jwt.verify(minted.token, creds.apiSecret) as { grants: { voice: Record<string, unknown> } };
      expect('push_credential_sid' in decoded.grants.voice).toBe(false);
    }
  });

  it('rejects SMS-style auth tokens used as an API key', () => {
    expect(() => mintTwilioVoiceAccessToken({ ...creds, apiKeySid: creds.accountSid })).toThrow('TWILIO_API_KEY');
  });
});
