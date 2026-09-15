/**
 * An admin account. 1:1 with `user` where role='admin'.
 *
 * This lives in its own table rather than as more columns on `user` because `user` is
 * shared by customers, vendors and riders and is written by the public OTP signup path.
 * Admin-only concerns — TOTP enrolment, suspension, Telegram alerting, job title —
 * have no business on a row a customer signup also touches.
 *
 * `status` is checked live by `PermissionGuard` on every admin request (cached 15s),
 * so suspending somebody bites immediately instead of waiting out their access token.
 */
export declare class AdminUser {
    id: string;
    userId: string;
    /** AdminRole. Authoritative — `user.adminRole` is only the bootstrap backfill. */
    adminRole: string;
    displayName: string | null;
    jobTitle: string | null;
    /** ACTIVE | SUSPENDED | REVOKED | PENDING_ENROLMENT */
    status: string;
    /**
     * Null until the admin completes first-login enrolment. An admin who has not enrolled
     * cannot be issued a session — see AuthService.adminLogin.
     */
    pendingTotpSecret: string | null;
    totpEnrolledAt: Date | null;
    /**
     * One-shot enrolment token.
     *
     * `adminLogin` deliberately refuses anyone without `user.totpSecret`, and that secret
     * only exists once enrolment completes — so enrolment cannot require a login token or
     * the admin could never get in. This token is the way in: handed to the invitee once,
     * consumed by POST /auth/admin/enrol, and cleared on success.
     */
    enrolToken: string | null;
    enrolTokenExpiresAt: Date | null;
    /** Where escalation alerts go. Linked via the /link <code> bot flow, never typed in. */
    telegramChatId: string | null;
    telegramLinkedAt: Date | null;
    notificationPrefsJson: Record<string, unknown> | null;
    invitedBy: string | null;
    invitedAt: Date | null;
    lastLoginAt: Date | null;
    lastLoginIp: string | null;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=admin-user.entity.d.ts.map