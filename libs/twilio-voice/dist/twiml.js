"use strict";
/** TwiML generation for Ore Voice.
 *
 * Order calls dial `<Client>` identities only — the PSTN fallback is a CLIENT-side
 * handoff to the native dialer (owner decision 2026-09-11: no masking, users may call
 * each other's stored numbers directly), so no PSTN noun ever appears in order TwiML.
 * Support calls are the one flow that may dial a `<Number>` (agent-mobile forward when
 * no browser agent answers).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RECORDING_ANNOUNCEMENT = void 0;
exports.escapeXml = escapeXml;
exports.dialClientTwiml = dialClientTwiml;
exports.dialSupportAgentsTwiml = dialSupportAgentsTwiml;
exports.forwardAgentMobileTwiml = forwardAgentMobileTwiml;
exports.supportVoicemailTwiml = supportVoicemailTwiml;
exports.hangupTwiml = hangupTwiml;
exports.rejectTwiml = rejectTwiml;
function escapeXml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
function recordingAnnouncement(opts) {
    return opts.record && opts.record !== 'do-not-record'
        ? `<Say>${escapeXml(exports.RECORDING_ANNOUNCEMENT)}</Say>`
        : '';
}
function dialAttrs(opts) {
    const parts = ['answerOnBridge="true"'];
    if (opts.timeoutSec)
        parts.push(`timeout="${Math.max(5, Math.min(60, Math.floor(opts.timeoutSec)))}"`);
    if (opts.statusCallbackUrl) {
        parts.push(`statusCallback="${escapeXml(opts.statusCallbackUrl)}"`);
        parts.push('statusCallbackEvent="initiated ringing answered completed"');
    }
    if (opts.actionUrl)
        parts.push(`action="${escapeXml(opts.actionUrl)}"`);
    if (opts.record && opts.record !== 'do-not-record') {
        parts.push(`record="${opts.record}"`);
        if (opts.recordingStatusCallbackUrl) {
            parts.push(`recordingStatusCallback="${escapeXml(opts.recordingStatusCallbackUrl)}"`);
        }
    }
    return parts.join(' ');
}
function dialClientTwiml(clientIdentity, opts = {}) {
    const identity = clientIdentity.trim();
    if (!identity)
        return hangupTwiml();
    return (`<?xml version="1.0" encoding="UTF-8"?>` +
        `<Response>${recordingAnnouncement(opts)}<Dial ${dialAttrs(opts)}><Client>${escapeXml(identity)}</Client></Dial></Response>`);
}
/**
 * Ring up to 10 support agents (browser softphones) simultaneously; first to accept wins.
 * `actionUrl` fires when NO agent answers while the caller holds — the handler forwards to
 * the on-duty agent's mobile (`forwardAgentMobileTwiml`).
 */
function dialSupportAgentsTwiml(agentIdentities, opts = {}) {
    const ids = agentIdentities.map((id) => id.trim()).filter(Boolean).slice(0, 10);
    if (ids.length === 0)
        return hangupTwiml();
    const clients = ids.map((id) => `<Client>${escapeXml(id)}</Client>`).join('');
    return (`<?xml version="1.0" encoding="UTF-8"?>` +
        `<Response>${recordingAnnouncement(opts)}<Dial ${dialAttrs(opts)}>${clients}</Dial></Response>`);
}
/** Step 2 of support fallback: caller still on the line, ring the agent's real mobile. */
function forwardAgentMobileTwiml(agentPhoneE164, callerIdE164, opts = {}) {
    const phone = agentPhoneE164.trim();
    if (!phone.startsWith('+'))
        return hangupTwiml();
    const callerId = callerIdE164.trim().startsWith('+') ? ` callerId="${escapeXml(callerIdE164.trim())}"` : '';
    return (`<?xml version="1.0" encoding="UTF-8"?>` +
        `<Response><Dial${callerId} ${dialAttrs(opts)}><Number>${escapeXml(phone)}</Number></Dial></Response>`);
}
/** No agents anywhere: take a message. Recording status callback persists the URL. */
function supportVoicemailTwiml(opts = {}) {
    const greeting = opts.greeting ??
        'Our support team is not available right now. Please leave a message after the tone and we will call you back.';
    const maxSeconds = Math.max(10, Math.min(600, opts.maxSeconds ?? 120));
    const cb = opts.recordingStatusCallbackUrl
        ? ` recordingStatusCallback="${escapeXml(opts.recordingStatusCallbackUrl)}"`
        : '';
    return (`<?xml version="1.0" encoding="UTF-8"?>` +
        `<Response><Say>${escapeXml(greeting)}</Say>` +
        `<Record maxLength="${maxSeconds}" transcribe="false"${cb} /></Response>`);
}
/** Consent announcement played before recording a support call (Ghana DPA 2012 notice). */
exports.RECORDING_ANNOUNCEMENT = 'This call may be recorded for quality and training purposes.';
function hangupTwiml() {
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`;
}
function rejectTwiml() {
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Reject/></Response>`;
}
//# sourceMappingURL=twiml.js.map