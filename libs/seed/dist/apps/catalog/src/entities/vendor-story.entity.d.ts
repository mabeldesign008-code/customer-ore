import { StoryKind } from '@ore/contracts';
/** WhatsApp-status style vendor story (doc §4 — Premium only). */
export declare class VendorStory {
    id: string;
    vendorId: string;
    kind: StoryKind;
    mediaKey: string;
    muxPlaybackId: string | null;
    caption: string | null;
    active: boolean;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=vendor-story.entity.d.ts.map