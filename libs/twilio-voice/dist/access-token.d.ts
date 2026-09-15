/** Twilio Voice Access Token (JWT) — not the SMS Auth Token, not Ore's JWT.
 *
 * Official shape: https://www.twilio.com/docs/iam/access-tokens
 * Header `cty` must be `twilio-fpa;v=1`. Signed with the API Key secret.
 */
export declare const TWILIO_VOICE_TOKEN_TTL_SEC: number;
export interface TwilioVoiceTokenInput {
    accountSid: string;
    apiKeySid: string;
    apiSecret: string;
    twimlAppSid: string;
    identity: string;
    /**
     * Push Credential SID (CR…) for this device's platform — Android (FCM v1) and iOS
     * (APNs VoIP) need SEPARATE credentials. Without it the Voice SDK cannot be woken by
     * push, so incoming calls only ring while the app is in the foreground.
     * https://www.twilio.com/docs/voice/sdks/android/get-started (step 7)
     */
    pushCredentialSid?: string;
    ttlSec?: number;
    now?: Date;
}
export interface TwilioVoiceToken {
    token: string;
    identity: string;
    expiresAt: Date;
    ttlSec: number;
}
export declare function mintTwilioVoiceAccessToken(input: TwilioVoiceTokenInput): TwilioVoiceToken;
//# sourceMappingURL=access-token.d.ts.map