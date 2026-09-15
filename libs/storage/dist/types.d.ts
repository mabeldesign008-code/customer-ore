export type StorageDriverName = 'local' | 'r2';
export interface PresignedUpload {
    url: string;
    method: 'PUT' | 'POST';
    headers: Record<string, string>;
}
export interface StorageDriver {
    /** Server-side write (receipts, small files, dev uploads). */
    putObject(key: string, body: Buffer | Uint8Array | string, contentType?: string): Promise<string>;
    /** Public URL for an object (images served to clients). */
    getObjectUrl(key: string): string;
    /** Client-direct upload URL (presigned PUT for R2; local upload endpoint in dev). */
    createPresignedUpload(key: string, contentType: string, expiresSec?: number): Promise<PresignedUpload>;
    /** Signed download URL for private objects (KYC documents). */
    createPresignedDownload(key: string, expiresSec?: number): Promise<string>;
    deleteObject(key: string): Promise<void>;
}
export declare function storageKeyFor(scope: string, id: string, fileName: string): string;
//# sourceMappingURL=types.d.ts.map