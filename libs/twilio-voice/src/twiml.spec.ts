import {
  RECORDING_ANNOUNCEMENT,
  dialClientTwiml,
  dialSupportAgentsTwiml,
  escapeXml,
  forwardAgentMobileTwiml,
  hangupTwiml,
  supportVoicemailTwiml,
} from './twiml';

describe('TwiML', () => {
  it('dials a client identity and never embeds a phone number tag', () => {
    const xml = dialClientTwiml('ore_cust-1');
    expect(xml).toContain('<Client>ore_cust-1</Client>');
    expect(xml).not.toContain('<Number');
    expect(xml).not.toContain('+233');
  });

  it('escapes identity XML', () => {
    expect(escapeXml('a<b&c>')).toBe('a&lt;b&amp;c&gt;');
    expect(dialClientTwiml('ore_<x>')).toContain('ore_&lt;x&gt;');
  });

  it('hangs up when the identity is empty', () => {
    expect(dialClientTwiml('  ')).toBe(hangupTwiml());
  });

  it('adds timeout, status callback and events for CDR tracking', () => {
    const xml = dialClientTwiml('ore_cust-1', {
      timeoutSec: 25,
      statusCallbackUrl: 'https://gw/api/comms/comms/voice/status?callId=abc',
    });
    expect(xml).toContain('answerOnBridge="true"');
    expect(xml).toContain('timeout="25"');
    expect(xml).toContain('statusCallback="https://gw/api/comms/comms/voice/status?callId=abc"');
    expect(xml).toContain('statusCallbackEvent="initiated ringing answered completed"');
  });

  it('clamps the ring timeout into the 5..60 range Twilio allows', () => {
    expect(dialClientTwiml('ore_x', { timeoutSec: 999 })).toContain('timeout="60"');
    expect(dialClientTwiml('ore_x', { timeoutSec: 1 })).toContain('timeout="5"');
  });

  it('rings up to ten support agents simultaneously and never more', () => {
    const ids = Array.from({ length: 14 }, (_, i) => `ore_agent-${i}`);
    const xml = dialSupportAgentsTwiml(ids, { actionUrl: 'https://gw/act' });
    expect(xml.match(/<Client>/g)).toHaveLength(10);
    expect(xml).toContain('<Client>ore_agent-0</Client>');
    expect(xml).toContain('action="https://gw/act"');
    expect(dialSupportAgentsTwiml([])).toBe(hangupTwiml());
  });

  it('forwards to an agent mobile with a valid caller id, refuses non-E.164', () => {
    const xml = forwardAgentMobileTwiml('+233241234567', '+233302000000');
    expect(xml).toContain('<Number>+233241234567</Number>');
    expect(xml).toContain('callerId="+233302000000"');
    expect(forwardAgentMobileTwiml('0241234567', '+233302000000')).toBe(hangupTwiml());
  });

  it('announces recording consent exactly once, only when recording', () => {
    const rec = dialSupportAgentsTwiml(['ore_a1'], { record: 'record-from-answer-dual' });
    expect(rec.match(/<Say>/g)).toHaveLength(1);
    expect(rec).toContain(RECORDING_ANNOUNCEMENT);
    expect(rec).toContain('record="record-from-answer-dual"');
    expect(dialSupportAgentsTwiml(['ore_a1'])).not.toContain('<Say>');
  });

  it('takes a voicemail message when no agent is reachable', () => {
    const xml = supportVoicemailTwiml({ maxSeconds: 90 });
    expect(xml).toContain('<Record maxLength="90"');
    expect(xml).toContain('not available right now');
  });
});
