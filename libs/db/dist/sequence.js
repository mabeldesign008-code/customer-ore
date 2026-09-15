"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextSequenceValue = nextSequenceValue;
async function nextSequenceValue(repo, key) {
    const manager = repo.manager;
    const isPostgres = manager.connection.options.type === 'postgres';
    if (isPostgres) {
        const schema = (repo.metadata.schema ? `"${repo.metadata.schema}".` : '');
        const table = `${schema}"${repo.metadata.tableName}"`;
        const rows = (await manager.query(`INSERT INTO ${table} (key, seq) VALUES ($1, 1)
       ON CONFLICT (key) DO UPDATE SET seq = ${table}.seq + 1
       RETURNING seq`, [key]));
        return rows[0]?.seq ?? 1;
    }
    // SQLite: Use upsert, but because TypeORM's sqlite3 driver returns changes/lastID 
    // instead of RETURNING rows, we do a subsequent read.
    await manager.query(`INSERT INTO "${repo.metadata.tableName}" (key, seq) VALUES (?, 1)
     ON CONFLICT (key) DO UPDATE SET seq = seq + 1`, [key]);
    const rows = await manager.query(`SELECT seq FROM "${repo.metadata.tableName}" WHERE key = ?`, [key]);
    return rows[0]?.seq ?? 1;
}
//# sourceMappingURL=sequence.js.map