import { PresignedUpload, StorageDriver } from './types';
export declare class LocalStorageDriver implements StorageDriver {
    private readonly dir;
    constructor(dir: string);
    putObject(key: string, body: Buffer | Uint8Array | string, _contentType?: string): Promise<string>;
    getObjectUrl(key: string): string;
    createPresignedUpload(key: string, contentType: string): Promise<PresignedUpload>;
    createPresignedDownload(key: string): Promise<string>;
    deleteObject(key: string): Promise<void>;
    readObject(key: string): Buffer;
}
//# sourceMappingURL=local.d.ts.map