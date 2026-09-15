/** TwiML generation for Ore Voice.
 *
 * Order calls dial `<Client>` identities only — the PSTN fallback is a CLIENT-side
 * handoff to the native dialer (owner decision 2026-09-11: no masking, users may call
 * each other's stored numbers directly), so no PSTN noun ever appears in order TwiML.
 * Support calls are the one flow that may dial a `<Number>` (agent-mobile forward when
 * no browser agent answers).
 */
export interface DialClientOptions {
    /** Seconds to ring the callee before giving up. Twilio default is 30. */
    timeoutSec?: number;
    /** URL Twilio POSTs when the dialed leg ends (DialCallStatus) — CDR + fallback hooks. */
    statusCallbackUrl?: string;
    /**
     * URL Twilio requests when the <Dial> completes while the CALLER is still on the line.
     * Support uses it to forward to agent mobiles on no-answer. Order calls do NOT set it:
     * the caller's app handles fallback locally.
     */
    actionUrl?: string;
    /** 'record-from-answer-dual' for support calls (announce the recording when set). */
    record?: 'do-not-record' | 'record-from-answer' | 'record-from-answer-dual';
    recordingStatusCallbackUrl?: string;
}
export declare function escapeXml(value: string): string;
export declare function dialClientTwiml(clientIdentity: string, opts?: DialClientOptions): string;
/**
 * Ring up to 10 support agents (browser softphones) simultaneously; first to accept wins.
 * `actionUrl` fires when NO agent answers while the caller holds — the handler forwards to
 * the on-duty agent's mobile (`forwardAgentMobileTwiml`).
 */
export declare function dialSupportAgentsTwiml(agentIdentities: string[], opts?: DialClientOptions): string;
/** Step 2 of support fallback: caller still on the line, ring the agent's real mobile. */
export declare function forwardAgentMobileTwiml(agentPhoneE164: string, callerIdE164: string, opts?: DialClientOptions): string;
/** No agents anywhere: take a message. Recording status callback persists the URL. */
export declare function supportVoicemailTwiml(opts?: {
    greeting?: string;
    maxSeconds?: number;
    recordingStatusCallbackUrl?: string;
}): string;
/** Consent announcement played before recording a support call (Ghana DPA 2012 notice). */
export declare const RECORDING_ANNOUNCEMENT = "This call may be recorded for quality and training purposes.";
export declare function hangupTwiml(): string;
export declare function rejectTwiml(): string;
//# sourceMappingURL=twiml.d.ts.map