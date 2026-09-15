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

import { createHash } from 'crypto';
import { ConflictException, ExecutionContext, Inject, Injectable, NestInterceptor, Optional } from '@nestjs/common';
import { CallHandler } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { defer, of } from 'rxjs';
import { catchError, mergeAll, mergeMap } from 'rxjs/operators';
import { OreEnv } from '@ore/config';
import { ORE_ENV } from './ore-env';

/** Module-scoped token: the service's Postgres schema (e.g. 'cart'). */
export const IDEMPOTENCY_SCHEMA = 'ORE_IDEMPOTENCY_SCHEMA';

interface KeyRow {
  key: string;
  request_hash: string;
  status: 'in_flight' | 'completed';
  response_code: number;
  response_body: unknown;
}

const POLL_MS = 250;
const POLL_ROUNDS = 24; // ~6s

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private tableReady = false;

  constructor(
    @Inject(IDEMPOTENCY_SCHEMA) private readonly schema: string,
    // @nestjs/typeorm registers the DataSource under both its class token and a
    // string token; the class token is the one that is reliably visible to
    // sibling providers, so inject that. Optional: pass-through when no DB.
    @Optional() @Inject(DataSource) private readonly ds: DataSource | null,
    @Inject(ORE_ENV) private readonly env: OreEnv,
  ) {}

  private get isPg(): boolean {
    return this.ds?.options.type === 'postgres';
  }

  /** Postgres: `"schema"."table"`. SQLite has no schemas (the qualifier would parse as
   *  an attached-database reference and fail). */
  private get table(): string {
    return this.isPg ? `"${this.schema}"."idempotency_keys"` : `"idempotency_keys"`;
  }

  /** Positional placeholder: Postgres `$n`, SQLite `?`. */
  private q(n: number): string {
    return this.isPg ? `$${n}` : '?';
  }

  private async ensureTable(): Promise<void> {
    if (this.tableReady || !this.ds) return;
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

  private async find(key: string): Promise<KeyRow | null> {
    if (!this.ds) return null;
    const res = (await this.ds.query(
      `SELECT key, request_hash AS request_hash, status, response_code AS response_code, response_body AS response_body
       FROM ${this.table} WHERE key = ${this.q(1)}`,
      [key],
    )) as KeyRow[] | [KeyRow[], number];
    const rows = Array.isArray(res) && Array.isArray(res[0]) ? (res[0] as KeyRow[]) : (res as KeyRow[]);
    const row = rows[0] ?? null;
    if (row && typeof row.response_body === 'string') {
      try { row.response_body = JSON.parse(row.response_body); } catch { /* leave as-is */ }
    }
    return row;
  }

  private async create(key: string, method: string, path: string, requestHash: string): Promise<void> {
    if (!this.ds) return;
    await this.ds.query(
      `INSERT INTO ${this.table} (key, method, path, request_hash) VALUES (${this.q(1)}, ${this.q(2)}, ${this.q(3)}, ${this.q(4)})
       `,
      [key, method, path, requestHash],
    );
  }

  private async complete(key: string, code: number, body: unknown): Promise<void> {
    if (!this.ds) return;
    const serialized = JSON.stringify(body ?? null);
    // Postgres casts to jsonb; SQLite stores the JSON as text.
    const bodyExpr = this.isPg ? `${this.q(3)}::jsonb` : this.q(3);
    const ts = this.isPg ? 'now()' : 'CURRENT_TIMESTAMP';
    await this.ds.query(
      `UPDATE ${this.table} SET status = 'completed', response_code = ${this.q(2)}, response_body = ${bodyExpr}, "updatedAt" = ${ts} WHERE key = ${this.q(1)}`,
      [key, code, serialized],
    );
  }

  private async clear(key: string): Promise<void> {
    if (!this.ds) return;
    await this.ds.query(`DELETE FROM ${this.table} WHERE key = ${this.q(1)}`, [key]);
  }

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    const key = (req.headers?.['idempotency-key'] as string | undefined)?.trim();
    if (!key || key.length > 128) return next.handle();

    const method = req.method ?? 'POST';
    const path = String(req.url ?? req.raw?.url ?? '').split('?')[0];
    const body = req.body ?? {};
    const requestHash = sha256(`${method}:${path}:${JSON.stringify(body)}`);

    // defer produces Observable<Observable<T>>; mergeAll() flattens to Observable<T>
    // (Fastify cannot serialize a nested Observable).
    return defer(async () => {
      await this.ensureTable();

      let current = await this.find(key);
      if (current && current.status === 'completed') {
        if (current.request_hash !== requestHash) {
          throw new ConflictException('Idempotency-Key was already used with a different request');
        }
        const res = context.switchToHttp().getResponse();
        if (typeof res.status === 'function' && typeof current.response_code === 'number') {
          res.status(current.response_code);
        }
        return of(current.response_body);
      }

      if (current && current.status === 'in_flight') {
        for (let i = 0; i < POLL_ROUNDS && current.status === 'in_flight'; i += 1) {
          await new Promise((r) => setTimeout(r, POLL_MS));
          current = await this.find(key);
          if (!current) break;
        }
        if (current && current.status === 'completed') {
          const res = context.switchToHttp().getResponse();
          if (typeof res.status === 'function' && typeof current.response_code === 'number') {
            res.status(current.response_code);
          }
          return of(current.response_body);
        }
        throw new ConflictException('A request with this Idempotency-Key is still in progress');
      }

      try {
        await this.create(key, method, path, requestHash);
      } catch (err) {
        throw new ConflictException('A request with this Idempotency-Key is still in progress');
      }
      // Execute the handler; persist the response BEFORE it is emitted downstream so
      // a replay after this point returns the stored result, not a duplicate side effect.
      return next.handle().pipe(
        mergeMap(async (value) => {
          const res = context.switchToHttp().getResponse();
          const code = typeof res?.statusCode === 'number' ? res.statusCode : 200;
          await this.complete(key, code, value);
          return value;
        }),
        catchError(async (err) => {
          await this.clear(key).catch(() => undefined);
          throw err;
        }),
      );
    }).pipe(mergeAll());
  }
}

/** Convenience factory for AppModule providers:
 *  `{ provide: IDEMPOTENCY_SCHEMA, useValue: schema }, IdempotencyInterceptor` */
export function idempotencyProvider(schema: string) {
  return [
    { provide: IDEMPOTENCY_SCHEMA, useValue: schema },
    IdempotencyInterceptor,
  ];
}
