"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageKeyFor = storageKeyFor;
function storageKeyFor(scope, id, fileName) {
    const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${scope}/${id}/${Date.now()}-${safe}`;
}
//# sourceMappingURL=types.js.map