/** Cloudflare R2 (S3-compatible) storage — zero-egress object storage for images & KYC docs
 *  (doc §Media). Presigned PUT lets clients upload directly to R2 without routing through us. */
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PresignedUpload, StorageDriver } from './types';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl?: string; // e.g. https://media.ore.gh
}

export class R2StorageDriver implements StorageDriver {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string | null;

  constructor(cfg: R2Config) {
    this.bucket = cfg.bucket;
    this.publicBaseUrl = cfg.publicBaseUrl ?? null;
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    });
  }

  async putObject(key: string, body: Buffer | Uint8Array | string, contentType?: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
    return this.getObjectUrl(key);
  }

  getObjectUrl(key: string): string {
    if (this.publicBaseUrl) return `${this.publicBaseUrl}/${key}`;
    return `https://${this.bucket}.r2.dev/${key}`;
  }

  async createPresignedUpload(key: string, contentType: string, expiresSec = 600): Promise<PresignedUpload> {
    const url = await getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn: expiresSec },
    );
    return { url, method: 'PUT', headers: { 'Content-Type': contentType } };
  }

  async createPresignedDownload(key: string, expiresSec = 600): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: expiresSec });
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
