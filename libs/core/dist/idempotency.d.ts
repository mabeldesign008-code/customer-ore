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
import { ExecutionContext, NestInterceptor } from '@nestjs/common';
import { CallHandler } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OreEnv } from '@ore/config';
/** Module-scoped token: the service's Postgres schema (e.g. 'cart'). */
export declare const IDEMPOTENCY_SCHEMA = "ORE_IDEMPOTENCY_SCHEMA";
export declare class IdempotencyInterceptor implements NestInterceptor {
    private readonly schema;
    private readonly ds;
    private readonly env;
    private tableReady;
    constructor(schema: string, ds: DataSource | null, env: OreEnv);
    private get isPg();
    /** Postgres: `"schema"."table"`. SQLite has no schemas (the qualifier would parse as
     *  an attached-database reference and fail). */
    private get table();
    /** Positional placeholder: Postgres `$n`, SQLite `?`. */
    private q;
    private ensureTable;
    private find;
    private create;
    private complete;
    private clear;
    intercept(context: ExecutionContext, next: CallHandler): import("rxjs").Observable<any>;
}
/** Convenience factory for AppModule providers:
 *  `{ provide: IDEMPOTENCY_SCHEMA, useValue: schema }, IdempotencyInterceptor` */
export declare function idempotencyProvider(schema: string): (typeof IdempotencyInterceptor | {
    provide: string;
    useValue: string;
})[];
//# sourceMappingURL=idempotency.d.ts.map