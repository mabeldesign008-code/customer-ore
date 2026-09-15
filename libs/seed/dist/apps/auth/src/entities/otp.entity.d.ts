export declare class OtpCode {
    /**
     * UUIDv7 (time-ordered) rather than TypeORM's default UUIDv4.
     *
     * Callers pick the newest OTP with `ORDER BY createdAt DESC, id DESC`.
     * TypeORM stores @CreateDateColumn as `datetime` with no precision, which on
     * SQLite truncates to whole seconds, so two OTPs requested in the same second
     * get an identical createdAt and the query falls through to the `id` tiebreaker.
     * With a random UUIDv4 that tiebreaker is a coin flip, so verifyOtp could load
     * the older OTP and reject the code the user was just sent. UUIDv7 sorts by
     * creation time, making the tiebreaker monotonic.
     */
    id: string;
    assignTimeOrderedId(): void;
    phone: string;
    /** SHA-256 of the 6-digit code (never store plaintext). */
    codeHash: string;
    expiresAt: Date;
    attempts: number;
    consumed: boolean;
    createdAt: Date;
}
//# sourceMappingURL=otp.entity.d.ts.map