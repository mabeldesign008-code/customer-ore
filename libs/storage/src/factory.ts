import { loadEnv } from '@ore/config';
import { LocalStorageDriver } from './local';
import { R2StorageDriver } from './r2';
import { StorageDriver } from './types';

export function createStorageDriver(env: Record<string, string | undefined> = process.env): StorageDriver {
  const ore = loadEnv(env);
  if (ore.storageDriver === 'r2') {
    if (!ore.r2AccountId || !ore.r2AccessKeyId || !ore.r2SecretAccessKey || !ore.r2Bucket) {
      throw new Error('R2 storage requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET');
    }
    return new R2StorageDriver({
      accountId: ore.r2AccountId,
      accessKeyId: ore.r2AccessKeyId,
      secretAccessKey: ore.r2SecretAccessKey,
      bucket: ore.r2Bucket,
      publicBaseUrl: ore.r2PublicBaseUrl || undefined,
    });
  }
  return new LocalStorageDriver(ore.storageLocalDir);
}
