/** TypeORM datasource factory — one Postgres schema per service (or sqlite for zero-infra dev). */
import { DynamicModule } from '@nestjs/common';
import { DataSourceOptions } from 'typeorm';
export declare const Transaction: (options?: import("typeorm-transactional").WrapInTransactionOptions) => MethodDecorator;
/** Loose stand-in for @nestjs/typeorm's EntityClassOrSchema (not exported from root). */
export type EntityClassOrSchema = {
    new (...args: never[]): unknown;
} | Function;
export interface DbOptions {
    schema: string;
    entities: EntityClassOrSchema[];
    /** Service-owned migrations. They run automatically only in production. */
    migrations?: (Function | string)[];
    env?: Record<string, string | undefined>;
}
export declare function dataSourceOptions(opts: DbOptions): DataSourceOptions;
/** Postgres: create schema if missing so each service owns its namespace. */
export declare function ensureSchema(dataSource: {
    query: (sql: string) => Promise<unknown>;
}, schema: string): Promise<void>;
/** Nest TypeORM root: create the service schema, then connect. */
export declare function typeOrmForRoot(opts: DbOptions): DynamicModule;
//# sourceMappingURL=datasource.d.ts.map