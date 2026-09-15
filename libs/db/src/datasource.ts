/** TypeORM datasource factory — one Postgres schema per service (or sqlite for zero-infra dev). */

import { TypeOrmModule } from '@nestjs/typeorm';
import { DynamicModule } from '@nestjs/common';
import { DataSourceOptions } from 'typeorm';
import { loadEnv } from '@ore/config';
import { initializeTransactionalContext, addTransactionalDataSource, Transactional } from 'typeorm-transactional';

initializeTransactionalContext();

export const Transaction = Transactional;

/** Loose stand-in for @nestjs/typeorm's EntityClassOrSchema (not exported from root). */
export type EntityClassOrSchema = { new (...args: never[]): unknown } | Function;

export interface DbOptions {
  schema: string; // e.g. 'catalog'
  entities: EntityClassOrSchema[];
  /** Service-owned migrations. They run automatically only in production. */
  migrations?: (Function | string)[];
  env?: Record<string, string | undefined>;
}

export function dataSourceOptions(opts: DbOptions): DataSourceOptions {
  const env = loadEnv(opts.env);
  const base = {
    entities: opts.entities as never[],
    migrations: opts.migrations,
    migrationsRun: env.nodeEnv === 'production' && (opts.migrations?.length ?? 0) > 0,
    synchronize: env.nodeEnv === 'production' ? false : true, // dev: auto-create; prod: migrations
    logging: env.logLevel === 'debug' ? ['query'] : false,
  };

  if (env.dbType === 'sqlite') {
    return {
      ...base,
      type: 'sqlite' as const,
      database: opts.env?.SQLITE_FILE ?? `./ore-${opts.schema}.sqlite`,
      // better-sqlite3 runs ONE connection per datasource: WAL + busy_timeout make
      // concurrent reads/writes safe, and foreign_keys keeps referential integrity.
      prepareDatabase: (db) => {
        db.pragma('journal_mode = WAL');
        db.pragma('busy_timeout = 5000');
        db.pragma('foreign_keys = ON');
      },
    } as DataSourceOptions;
  }

  return {
    ...base,
    type: 'postgres' as const,
    url: env.databaseUrl,
    schema: opts.schema,
  } as DataSourceOptions;
}

/** Postgres: create schema if missing so each service owns its namespace. */
export async function ensureSchema(dataSource: { query: (sql: string) => Promise<unknown> }, schema: string): Promise<void> {
  const safe = schema.replace(/"/g, '');
  await dataSource.query(`CREATE SCHEMA IF NOT EXISTS "${safe}"`);
}

type PgClient = {
  connect(): Promise<void>;
  query(sql: string): Promise<unknown>;
  end(): Promise<void>;
};

function pgClient(connectionString: string): PgClient {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Client } = require('pg') as { Client: new (opts: { connectionString: string }) => PgClient };
  return new Client({ connectionString });
}

/** Nest TypeORM root: create the service schema, then connect. */
export function typeOrmForRoot(opts: DbOptions): DynamicModule {
  return TypeOrmModule.forRootAsync({
    useFactory: async () => {
      const options = dataSourceOptions(opts);
      if (options.type === 'postgres') {
        const client = pgClient((options as { url: string }).url);
        await client.connect();
        try {
          await ensureSchema(client, opts.schema);
        } finally {
          await client.end();
        }
      }
      return options;
    },
    dataSourceFactory: async (options) => {
      if (!options) throw new Error('Invalid options passed');
      
      const { DataSource } = await import('typeorm');
      const ds = new DataSource(options);
      
      // typeorm-transactional wraps the datasource
      let wrapped = ds; try { wrapped = addTransactionalDataSource(ds) as any; } catch (e) {}
      // sqlite runs ONE connection per datasource: concurrent async transactions
      // interleave BEGIN/COMMIT on that connection ("no such savepoint: typeorm_N",
      // "Transaction is not started yet"). Serialize transaction entry per datasource
      // so each window runs to completion before the next starts — for BOTH paths:
      // DataSource.transaction() (used by @Transaction()) and the root
      // EntityManager.transaction() (used directly by some services).
      if ((options as { type?: string }).type === 'sqlite') {
        const serialize = (txn: (...args: unknown[]) => Promise<unknown>) => {
          const original = txn;
          let chain: Promise<unknown> = Promise.resolve();
          return (...args: unknown[]) => {
            const run = () => original(...args);
            const result = chain.then(run, run);
            chain = result.then(
              () => undefined,
              () => undefined,
            );
            return result;
          };
        };
        const origTxn = wrapped.transaction.bind(wrapped) as (...args: unknown[]) => Promise<unknown>;
        (wrapped as { transaction: (...args: unknown[]) => Promise<unknown> }).transaction = serialize(origTxn);
        const mgr = wrapped.manager as { transaction: (...args: unknown[]) => Promise<unknown> };
        mgr.transaction = serialize(mgr.transaction.bind(mgr) as (...args: unknown[]) => Promise<unknown>);
      }
      return wrapped;
    },
  });
}
