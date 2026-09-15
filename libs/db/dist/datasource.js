"use strict";
/** TypeORM datasource factory — one Postgres schema per service (or sqlite for zero-infra dev). */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transaction = void 0;
exports.dataSourceOptions = dataSourceOptions;
exports.ensureSchema = ensureSchema;
exports.typeOrmForRoot = typeOrmForRoot;
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@ore/config");
const typeorm_transactional_1 = require("typeorm-transactional");
(0, typeorm_transactional_1.initializeTransactionalContext)();
exports.Transaction = typeorm_transactional_1.Transactional;
function dataSourceOptions(opts) {
    const env = (0, config_1.loadEnv)(opts.env);
    const base = {
        entities: opts.entities,
        migrations: opts.migrations,
        migrationsRun: env.nodeEnv === 'production' && (opts.migrations?.length ?? 0) > 0,
        synchronize: env.nodeEnv === 'production' ? false : true, // dev: auto-create; prod: migrations
        logging: env.logLevel === 'debug' ? ['query'] : false,
    };
    if (env.dbType === 'sqlite') {
        return {
            ...base,
            type: 'sqlite',
            database: opts.env?.SQLITE_FILE ?? `./ore-${opts.schema}.sqlite`,
            // better-sqlite3 runs ONE connection per datasource: WAL + busy_timeout make
            // concurrent reads/writes safe, and foreign_keys keeps referential integrity.
            prepareDatabase: (db) => {
                db.pragma('journal_mode = WAL');
                db.pragma('busy_timeout = 5000');
                db.pragma('foreign_keys = ON');
            },
        };
    }
    return {
        ...base,
        type: 'postgres',
        url: env.databaseUrl,
        schema: opts.schema,
    };
}
/** Postgres: create schema if missing so each service owns its namespace. */
async function ensureSchema(dataSource, schema) {
    const safe = schema.replace(/"/g, '');
    await dataSource.query(`CREATE SCHEMA IF NOT EXISTS "${safe}"`);
}
function pgClient(connectionString) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Client } = require('pg');
    return new Client({ connectionString });
}
/** Nest TypeORM root: create the service schema, then connect. */
function typeOrmForRoot(opts) {
    return typeorm_1.TypeOrmModule.forRootAsync({
        useFactory: async () => {
            const options = dataSourceOptions(opts);
            if (options.type === 'postgres') {
                const client = pgClient(options.url);
                await client.connect();
                try {
                    await ensureSchema(client, opts.schema);
                }
                finally {
                    await client.end();
                }
            }
            return options;
        },
        dataSourceFactory: async (options) => {
            if (!options)
                throw new Error('Invalid options passed');
            const { DataSource } = await Promise.resolve().then(() => __importStar(require('typeorm')));
            const ds = new DataSource(options);
            // typeorm-transactional wraps the datasource
            let wrapped = ds;
            try {
                wrapped = (0, typeorm_transactional_1.addTransactionalDataSource)(ds);
            }
            catch (e) { }
            // sqlite runs ONE connection per datasource: concurrent async transactions
            // interleave BEGIN/COMMIT on that connection ("no such savepoint: typeorm_N",
            // "Transaction is not started yet"). Serialize transaction entry per datasource
            // so each window runs to completion before the next starts — for BOTH paths:
            // DataSource.transaction() (used by @Transaction()) and the root
            // EntityManager.transaction() (used directly by some services).
            if (options.type === 'sqlite') {
                const serialize = (txn) => {
                    const original = txn;
                    let chain = Promise.resolve();
                    return (...args) => {
                        const run = () => original(...args);
                        const result = chain.then(run, run);
                        chain = result.then(() => undefined, () => undefined);
                        return result;
                    };
                };
                const origTxn = wrapped.transaction.bind(wrapped);
                wrapped.transaction = serialize(origTxn);
                const mgr = wrapped.manager;
                mgr.transaction = serialize(mgr.transaction.bind(mgr));
            }
            return wrapped;
        },
    });
}
//# sourceMappingURL=datasource.js.map