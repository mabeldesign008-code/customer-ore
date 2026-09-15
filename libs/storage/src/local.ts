/** Local disk storage — dev/sandbox with zero cloud keys. Objects are served by the
 *  hosting service via GET /media/:key (see onboarding service). */
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { PresignedUpload, StorageDriver } from './types';

export class LocalStorageDriver implements StorageDriver {
  constructor(private readonly dir: string) {
    mkdirSync(dir, { recursive: true });
  }

  putObject(key: string, body: Buffer | Uint8Array | string, _contentType?: string): Promise<string> {
    const p = join(this.dir, key);
    mkdirSync(p.split('/').slice(0, -1).join('/'), { recursive: true });
    writeFileSync(p, body);
    return Promise.resolve(this.getObjectUrl(key));
  }

  getObjectUrl(key: string): string {
    return `/media/${key}`;
  }

  createPresignedUpload(key: string, contentType: string): Promise<PresignedUpload> {
    return Promise.resolve({
      url: '/media/upload',
      method: 'POST',
      headers: { 'x-ore-key': key, 'x-ore-content-type': contentType },
    });
  }

  createPresignedDownload(key: string): Promise<string> {
    return Promise.resolve(this.getObjectUrl(key));
  }

  deleteObject(key: string): Promise<void> {
    const p = join(this.dir, key);
    if (existsSync(p)) rmSync(p);
    return Promise.resolve();
  }

  readObject(key: string): Buffer {
    return readFileSync(join(this.dir, key));
  }
}
