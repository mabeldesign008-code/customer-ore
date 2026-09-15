"use strict";
/** Idempotency — `Idempotency-Key` header support for mutating endpoints (checkout,
 *  payment initialize). Keys are stored in a per-service `idempotency_keys` table:
 *  - replay with same key + same payload → stored response, same status code
 *  - same key + different payload → 409 CONFLICT
 *  - same key + still in flight → waits briefly, then 409 if still running
 *  A failed handler clears the key so a retry can succeed.
 *
 *  Wiring (one concrete class, per-service schema token):
 *    providers: [
 *      { provide: IDEMPOTENCY_SCHEMA, useValue: 'cart' },
 *      IdempotencyInterceptor,                     // DI-instantiated (@Injectable)
 *    ]
 *    controller: @UseInterceptors(IdempotencyInterceptor)
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdempotencyInterceptor = exports.IDEMPOTENCY_SCHEMA = void 0;
exports.idempotencyProvider = idempotencyProvider;
const crypto_1 = require("crypto");
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const ore_env_1 = require("./ore-env");
/** Module-scoped token: the service's Postgres schema (e.g. 'cart'). */
exports.IDEMPOTENCY_SCHEMA = 'ORE_IDEMPOTENCY_SCHEMA';
const POLL_MS = 250;
const POLL_ROUNDS = 24; // ~6s
function sha256(input) {
    return (0, crypto_1.createHash)('sha256').update(input).digest('hex');
}
let IdempotencyInterceptor = class IdempotencyInterceptor {
    schema;
    ds;
    env;
    tableReady = false;
    constructor(schema, ds, env) {
        this.schema = schema;
        this.ds = ds;
        this.env = env;
    }
    get isPg() {
        return this.ds?.options.type === 'postgres';
    }
    /** Postgres: `"schema"."table"`. SQLite has no schemas (the qualifier would parse as
     *  an attached-database reference and fail). */
    get table() {
        return this.isPg ? `"${this.schema}"."idempotency_keys"` : `"idempotency_keys"`;
    }
    /** Positional placeholder: Postgres `$n`, SQLite `?`. */
    q(n) {
        return this.isPg ? `$${n}` : '?';
    }
    async ensureTable() {
        if (this.tableReady || !this.ds)
            return;
        // The old DDL was Postgres-only (schema-qualified table, jsonb, timestamptz, now()),
        // so any client sending Idempotency-Key on the sqlite dev database got a 500
        // (audit F-DEV-2). Same shape on both drivers.
        const bodyCol = this.isPg ? 'response_body jsonb' : 'response_body text';
        const tsCol = this.isPg ? 'timestamptz NOT NULL DEFAULT now()' : 'datetime NOT NULL DEFAULT CURRENT_TIMESTAMP';
        await this.ds.query(`CREATE TABLE IF NOT EXISTS ${this.table} (
      key text PRIMARY KEY,
      method text NOT NULL,
      path text NOT NULL,
      request_hash text NOT NULL,
      status text NOT NULL DEFAULT 'in_flight',
      response_code integer,
      ${bodyCol},
      "createdAt" ${tsCol},
      "updatedAt" ${tsCol}
    )`);
        this.tableReady = true;
    }
    async find(key) {
        if (!this.ds)
            return null;
        const res = (await this.ds.query(`SELECT key, request_hash AS request_hash, status, response_code AS response_code, response_body AS response_body
       FROM ${this.table} WHERE key = ${this.q(1)}`, [key]));
        const rows = Array.isArray(res) && Array.isArray(res[0]) ? res[0] : res;
        const row = rows[0] ?? null;
        if (row && typeof row.response_body === 'string') {
            try {
                row.response_body = JSON.parse(row.response_body);
            }
            catch { /* leave as-is */ }
        }
        return row;
    }
    async create(key, method, path, requestHash) {
        if (!this.ds)
            return;
        await this.ds.query(`INSERT INTO ${this.table} (key, method, path, request_hash) VALUES (${this.q(1)}, ${this.q(2)}, ${this.q(3)}, ${this.q(4)})
       `, [key, method, path, requestHash]);
    }
    async complete(key, code, body) {
        if (!this.ds)
            return;
        const serialized = JSON.stringify(body ?? null);
        // Postgres casts to jsonb; SQLite stores the JSON as text.
        const bodyExpr = this.isPg ? `${this.q(3)}::jsonb` : this.q(3);
        const ts = this.isPg ? 'now()' : 'CURRENT_TIMESTAMP';
        await this.ds.query(`UPDATE ${this.table} SET status = 'completed', response_code = ${this.q(2)}, response_body = ${bodyExpr}, "updatedAt" = ${ts} WHERE key = ${this.q(1)}`, [key, code, serialized]);
    }
    async clear(key) {
        if (!this.ds)
            return;
        await this.ds.query(`DELETE FROM ${this.table} WHERE key = ${this.q(1)}`, [key]);
    }
    intercept(context, next) {
        const req = context.switchToHttp().getRequest();
        const key = req.headers?.['idempotency-key']?.trim();
        if (!key || key.length > 128)
            return next.handle();
        const method = req.method ?? 'POST';
        const path = String(req.url ?? req.raw?.url ?? '').split('?')[0];
        const body = req.body ?? {};
        const requestHash = sha256(`${method}:${path}:${JSON.stringify(body)}`);
        // defer produces Observable<Observable<T>>; mergeAll() flattens to Observable<T>
        // (Fastify cannot serialize a nested Observable).
        return (0, rxjs_1.defer)(async () => {
            await this.ensureTable();
            let current = await this.find(key);
            if (current && current.status === 'completed') {
                if (current.request_hash !== requestHash) {
                    throw new common_1.ConflictException('Idempotency-Key was already used with a different request');
                }
                const res = context.switchToHttp().getResponse();
                if (typeof res.status === 'function' && typeof current.response_code === 'number') {
                    res.status(current.response_code);
                }
                return (0, rxjs_1.of)(current.response_body);
            }
            if (current && current.status === 'in_flight') {
                for (let i = 0; i < POLL_ROUNDS && current.status === 'in_flight'; i += 1) {
                    await new Promise((r) => setTimeout(r, POLL_MS));
                    current = await this.find(key);
                    if (!current)
                        break;
                }
                if (current && current.status === 'completed') {
                    const res = context.switchToHttp().getResponse();
                    if (typeof res.status === 'function' && typeof current.response_code === 'number') {
                        res.status(current.response_code);
                    }
                    return (0, rxjs_1.of)(current.response_body);
                }
                throw new common_1.ConflictException('A request with this Idempotency-Key is still in progress');
            }
            try {
                await this.create(key, method, path, requestHash);
            }
            catch (err) {
                throw new common_1.ConflictException('A request with this Idempotency-Key is still in progress');
            }
            // Execute the handler; persist the response BEFORE it is emitted downstream so
            // a replay after this point returns the stored result, not a duplicate side effect.
            return next.handle().pipe((0, operators_1.mergeMap)(async (value) => {
                const res = context.switchToHttp().getResponse();
                const code = typeof res?.statusCode === 'number' ? res.statusCode : 200;
                await this.complete(key, code, value);
                return value;
            }), (0, operators_1.catchError)(async (err) => {
                await this.clear(key).catch(() => undefined);
                throw err;
            }));
        }).pipe((0, operators_1.mergeAll)());
    }
};
exports.IdempotencyInterceptor = IdempotencyInterceptor;
exports.IdempotencyInterceptor = IdempotencyInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(exports.IDEMPOTENCY_SCHEMA)),
    __param(1, (0, common_1.Optional)()),
    __param(1, (0, common_1.Inject)(typeorm_1.DataSource)),
    __param(2, (0, common_1.Inject)(ore_env_1.ORE_ENV)),
    __metadata("design:paramtypes", [String, Object, Object])
], IdempotencyInterceptor);
/** Convenience factory for AppModule providers:
 *  `{ provide: IDEMPOTENCY_SCHEMA, useValue: schema }, IdempotencyInterceptor` */
function idempotencyProvider(schema) {
    return [
        { provide: exports.IDEMPOTENCY_SCHEMA, useValue: schema },
        IdempotencyInterceptor,
    ];
}
//# sourceMappingURL=idempotency.js.map