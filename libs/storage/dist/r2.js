"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.R2StorageDriver = void 0;
/** Cloudflare R2 (S3-compatible) storage — zero-egress object storage for images & KYC docs
 *  (doc §Media). Presigned PUT lets clients upload directly to R2 without routing through us. */
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
class R2StorageDriver {
    client;
    bucket;
    publicBaseUrl;
    constructor(cfg) {
        this.bucket = cfg.bucket;
        this.publicBaseUrl = cfg.publicBaseUrl ?? null;
        this.client = new client_s3_1.S3Client({
            region: 'auto',
            endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
            credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
        });
    }
    async putObject(key, body, contentType) {
        await this.client.send(new client_s3_1.PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }));
        return this.getObjectUrl(key);
    }
    getObjectUrl(key) {
        if (this.publicBaseUrl)
            return `${this.publicBaseUrl}/${key}`;
        return `https://${this.bucket}.r2.dev/${key}`;
    }
    async createPresignedUpload(key, contentType, expiresSec = 600) {
        const url = await (0, s3_request_presigner_1.getSignedUrl)(this.client, new client_s3_1.PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }), { expiresIn: expiresSec });
        return { url, method: 'PUT', headers: { 'Content-Type': contentType } };
    }
    async createPresignedDownload(key, expiresSec = 600) {
        return (0, s3_request_presigner_1.getSignedUrl)(this.client, new client_s3_1.GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: expiresSec });
    }
    async deleteObject(key) {
        await this.client.send(new client_s3_1.DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    }
}
exports.R2StorageDriver = R2StorageDriver;
//# sourceMappingURL=r2.js.map