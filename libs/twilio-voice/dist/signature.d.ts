/** Validate X-Twilio-Signature. https://www.twilio.com/docs/usage/security#validating-requests */
export declare function twilioRequestSignature(authToken: string, url: string, params: Record<string, string>): string;
export declare function twilioSignatureIsValid(authToken: string, url: string, params: Record<string, string>, provided: string | undefined): boolean;
//# sourceMappingURL=signature.d.ts.map