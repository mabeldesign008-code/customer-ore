import { AdminRole, ApplicationStatus } from '@ore/contracts';
export declare class AuditLog {
    id: string;
    applicationId: string;
    reviewerId: string;
    reviewerRole: AdminRole;
    action: 'APPROVED' | 'REJECTED' | 'REQUIRES_ACTION' | 'SUSPENDED' | 'SMILE_MANUAL';
    previousState: ApplicationStatus | string;
    newState: ApplicationStatus | string;
    reason: string | null;
    requiresActionField: string | null;
    createdAt: Date;
}
//# sourceMappingURL=audit-log.entity.d.ts.map