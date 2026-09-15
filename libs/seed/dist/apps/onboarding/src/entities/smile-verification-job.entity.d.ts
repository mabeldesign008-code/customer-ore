/**
 * Provider-job correlation and final-result storage for SmileID verification.
 * Raw image bytes are never stored here.
 */
export declare class SmileVerificationJob {
    id: string;
    applicationId: string;
    applicantUserId: string;
    providerJobId: string;
    providerUserId: string | null;
    status: string;
    reason: string | null;
    message: string | null;
    providerPayload: Record<string, unknown> | null;
    providerCreatedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=smile-verification-job.entity.d.ts.map