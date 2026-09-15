"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStorageDriver = createStorageDriver;
const config_1 = require("@ore/config");
const local_1 = require("./local");
const r2_1 = require("./r2");
function createStorageDriver(env = process.env) {
    const ore = (0, config_1.loadEnv)(env);
    if (ore.storageDriver === 'r2') {
        if (!ore.r2AccountId || !ore.r2AccessKeyId || !ore.r2SecretAccessKey || !ore.r2Bucket) {
            throw new Error('R2 storage requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET');
        }
        return new r2_1.R2StorageDriver({
            accountId: ore.r2AccountId,
            accessKeyId: ore.r2AccessKeyId,
            secretAccessKey: ore.r2SecretAccessKey,
            bucket: ore.r2Bucket,
            publicBaseUrl: ore.r2PublicBaseUrl || undefined,
        });
    }
    return new local_1.LocalStorageDriver(ore.storageLocalDir);
}
//# sourceMappingURL=factory.js.map