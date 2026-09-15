"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageDriver = void 0;
/** Local disk storage — dev/sandbox with zero cloud keys. Objects are served by the
 *  hosting service via GET /media/:key (see onboarding service). */
const fs_1 = require("fs");
const path_1 = require("path");
class LocalStorageDriver {
    dir;
    constructor(dir) {
        this.dir = dir;
        (0, fs_1.mkdirSync)(dir, { recursive: true });
    }
    putObject(key, body, _contentType) {
        const p = (0, path_1.join)(this.dir, key);
        (0, fs_1.mkdirSync)(p.split('/').slice(0, -1).join('/'), { recursive: true });
        (0, fs_1.writeFileSync)(p, body);
        return Promise.resolve(this.getObjectUrl(key));
    }
    getObjectUrl(key) {
        return `/media/${key}`;
    }
    createPresignedUpload(key, contentType) {
        return Promise.resolve({
            url: '/media/upload',
            method: 'POST',
            headers: { 'x-ore-key': key, 'x-ore-content-type': contentType },
        });
    }
    createPresignedDownload(key) {
        return Promise.resolve(this.getObjectUrl(key));
    }
    deleteObject(key) {
        const p = (0, path_1.join)(this.dir, key);
        if ((0, fs_1.existsSync)(p))
            (0, fs_1.rmSync)(p);
        return Promise.resolve();
    }
    readObject(key) {
        return (0, fs_1.readFileSync)((0, path_1.join)(this.dir, key));
    }
}
exports.LocalStorageDriver = LocalStorageDriver;
//# sourceMappingURL=local.js.map