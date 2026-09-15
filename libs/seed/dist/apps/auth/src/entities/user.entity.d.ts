import { Role } from '@ore/contracts';
export declare class User {
    id: string;
    phone: string;
    role: Role;
    roles: string[];
    name: string | null;
    email: string | null;
    passwordHash: string | null;
    totpSecret: string | null;
    deviceToken: string | null;
    deviceFingerprint: string | null;
    verified: boolean;
    /** AdminRole for admin users; null for everyone else. Drives support queue routing. */
    adminRole: string | null;
    publicId: string | null;
    /** ACTIVE | SUSPENDED | BANNED. Only ACTIVE may transact. */
    status: string;
    /** When a SUSPENDED account may come back on its own. Null for an indefinite suspension. */
    suspendedUntil: Date | null;
    /** Shown to the customer and kept in the audit trail. Mandatory — a suspension with no
     * reason is unauditable and, in a dispute, indefensible. */
    suspensionReason: string | null;
    suspendedBy: string | null;
    lastLoginAt: Date | null;
    /** City, for the operations map and for city-scoped marketing. */
    city: string | null;
    /**
     * Marketing consent. Separate from `verified`: a verified account is not a consenting
     * one, and conflating them is how you end up emailing people who never asked.
     */
    marketingConsent: boolean;
    /** Customer COD risk tier. Applies only to customer accounts and is enforced at checkout. */
    customerCodTier: 'NEW' | 'STANDARD' | 'TRUSTED' | 'PREMIUM';
    customerCodBlocked: boolean;
    customerCodBlockReason: string | null;
    /** Bumped on suspend/ban so issued tokens stop being trusted immediately. */
    tokenEpoch: number;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=user.entity.d.ts.map