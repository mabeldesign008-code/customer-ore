import { ApplicationStatus, SmileIdStatus, VendorType } from '@ore/contracts';
export { ApplicationStatus, SmileIdStatus };
export type ApplicationKind = 'VENDOR' | 'RIDER';
export type VendorClass = 'INDIVIDUAL' | 'BUSINESS';
export declare class Application {
    id: string;
    applicantUserId: string;
    applicantPhone: string;
    applicantName: string | null;
    kind: ApplicationKind;
    status: ApplicationStatus;
    currentStage: number;
    maxStages: number;
    stageData: Record<string, unknown>;
    smileIdStatus: SmileIdStatus;
    vendorClass: VendorClass | null;
    vendorType: VendorType | null;
    businessName: string | null;
    lat: number | null;
    lng: number | null;
    workplaceGps: Record<string, unknown> | null;
    payoutInfo: Record<string, unknown> | null;
    vehicle: string | null;
    reason: string | null;
    requiresActionField: string | null;
    publicId: string | null;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=application.entity.d.ts.map