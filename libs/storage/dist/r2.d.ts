import { PresignedUpload, StorageDriver } from './types';
export interface R2Config {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    publicBaseUrl?: string;
}
export declare class R2StorageDriver implements StorageDriver {
    private readonly client;
    private readonly bucket;
    private readonly publicBaseUrl;
    constructor(cfg: R2Config);
    putObject(key: string, body: Buffer | Uint8Array | string, contentType?: string): Promise<string>;
    getObjectUrl(key: string): string;
    createPresignedUpload(key: string, contentType: string, expiresSec?: number): Promise<PresignedUpload>;
    createPresignedDownload(key: string, expiresSec?: number): Promise<string>;
    deleteObject(key: string): Promise<void>;
}
//# sourceMappingURL=r2.d.ts.map