import { Role } from '@ore/contracts';
import { JwtPayload } from '@ore/core';
import { callerMayDial, normalizeE164, parseVoiceClientIdentity, voiceClientIdentity } from './voice.auth';

function user(partial: Partial<JwtPayload> & Pick<JwtPayload, 'sub' | 'role'>): JwtPayload {
  return { phone: '+233241234567', ...partial };
}

const order = { customerId: 'cust-1', vendorId: 'vend-1', riderId: 'rider-1' };

describe('voice identity', () => {
  it('round-trips ore_{userId}', () => {
    expect(voiceClientIdentity('cust-1')).toBe('ore_cust-1');
    expect(parseVoiceClientIdentity('client:ore_cust-1')).toBe('cust-1');
    expect(parseVoiceClientIdentity('not-ore')).toBeNull();
  });
});

describe('callerMayDial', () => {
  it('lets the customer dial the assigned rider', () => {
    expect(
      callerMayDial(user({ sub: 'cust-1', role: Role.CUSTOMER }), order, 'rider', {
        targetUserId: 'user-r',
      }),
    ).toBe(true);
  });

  it('rejects dialing an unassigned rider or yourself', () => {
    expect(
      callerMayDial(user({ sub: 'cust-1', role: Role.CUSTOMER }), { ...order, riderId: null }, 'rider', {
        targetUserId: 'user-r',
      }),
    ).toBe(false);
    expect(
      callerMayDial(user({ sub: 'cust-1', role: Role.CUSTOMER }), order, 'customer', {
        targetUserId: 'cust-1',
      }),
    ).toBe(false);
  });

  it('rejects PARCEL/ERRAND vendor targets', () => {
    expect(
      callerMayDial(user({ sub: 'cust-1', role: Role.CUSTOMER }), { ...order, vendorId: 'PARCEL' }, 'vendor', {
        targetUserId: 'user-v',
      }),
    ).toBe(false);
  });
});

describe('normalizeE164', () => {
  it('keeps a valid E.164 number untouched', () => {
    expect(normalizeE164('+233241234567')).toBe('+233241234567');
  });

  it('adds the missing + to country-code digits (how auth stores phones)', () => {
    expect(normalizeE164('233241234567')).toBe('+233241234567');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeE164('  +233241234567 ')).toBe('+233241234567');
  });

  it('rejects garbage instead of dialing it', () => {
    expect(normalizeE164('')).toBeNull();
    expect(normalizeE164(null)).toBeNull();
    expect(normalizeE164(undefined)).toBeNull();
    expect(normalizeE164('12345')).toBeNull(); // too short
    expect(normalizeE164('0244123456')).toBeNull(); // local format, leading 0 — not guessable
    expect(normalizeE164('+0244123456')).toBeNull(); // +0 is not a country code
    expect(normalizeE164('call-me')).toBeNull();
  });
});
