import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Admin RBAC spine: the admin account, the per-admin permission overrides, and the
 * append-only audit log.
 *
 * Idempotent by design — every statement checks for existence first. The repo runs
 * `synchronize: true` outside production, so in dev these tables may already exist by
 * the time this runs; in production this migration is the only thing that creates them.
 *
 * Also backfills an `admin_user` row for every existing role='admin' user so nobody who
 * can log in today is locked out when PermissionGuard starts requiring a provisioned row.
 */
export class AddAdminRbac1788000000000 implements MigrationInterface {
  name = 'AddAdminRbac1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    const isSqlite = driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs';
    // sqlite spells it `datetime`; Postgres has no such type and fails the whole migration.
    // Matches what the entities declare (`@CreateDateColumn` / `Date` → `timestamp`).
    const tsType = isSqlite ? 'datetime' : 'timestamp';
    // Unqualified DDL lands in `public`, not the service's schema — TypeORM's `schema` option
    // does not apply to raw queries. That silently broke schema-per-service and made the
    // `hasTable` probes below (which look in this schema) always false, so the migration was
    // never actually idempotent either. sqlite has no schemas, so the two dialects differ.
    const q = (t: string) => (isSqlite ? `"${t}"` : `"auth"."${t}"`);
    if (!isSqlite) await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "auth"`);

    const hasTable = async (name: string): Promise<boolean> => {
      const rows = await queryRunner.query(
        isSqlite
          ? `SELECT name FROM sqlite_master WHERE type='table' AND name='${name}'`
          : `SELECT table_name FROM information_schema.tables WHERE table_schema='auth' AND table_name='${name}'`,
      );
      return (rows as unknown[]).length > 0;
    };

    if (!(await hasTable('admin_user'))) {
      await queryRunner.query(`
        CREATE TABLE ${q('admin_user')} (
          "id" varchar PRIMARY KEY,
          "userId" varchar NOT NULL,
          "adminRole" varchar NOT NULL DEFAULT 'support',
          "displayName" varchar,
          "jobTitle" varchar,
          "status" varchar NOT NULL DEFAULT 'ACTIVE',
          "pendingTotpSecret" varchar,
          "totpEnrolledAt" ${tsType},
          "telegramChatId" varchar,
          "telegramLinkedAt" ${tsType},
          "notificationPrefsJson" text,
          "invitedBy" varchar,
          "invitedAt" ${tsType},
          "lastLoginAt" ${tsType},
          "lastLoginIp" varchar,
          "createdAt" ${tsType} NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" ${tsType} NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);
      await queryRunner.query(`CREATE UNIQUE INDEX "idx_admin_user_user" ON ${q('admin_user')} ("userId")`);
      await queryRunner.query(`CREATE INDEX "idx_admin_user_role_status" ON ${q('admin_user')} ("adminRole", "status")`);
    }

    if (!(await hasTable('admin_role_grant'))) {
      await queryRunner.query(`
        CREATE TABLE ${q('admin_role_grant')} (
          "id" varchar PRIMARY KEY,
          "adminUserId" varchar NOT NULL,
          "permission" varchar NOT NULL,
          "mode" varchar NOT NULL DEFAULT 'grant',
          "grantedBy" varchar,
          "reason" text,
          "createdAt" ${tsType} NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);
      await queryRunner.query(
        `CREATE UNIQUE INDEX "idx_admin_grant_user_perm" ON ${q('admin_role_grant')} ("adminUserId", "permission")`,
      );
    }

    if (!(await hasTable('admin_action'))) {
      await queryRunner.query(`
        CREATE TABLE ${q('admin_action')} (
          "id" varchar PRIMARY KEY,
          "actorUserId" varchar,
          "actorAdminRole" varchar,
          "permission" varchar,
          "decision" varchar NOT NULL,
          "reason" varchar,
          "service" varchar,
          "method" varchar,
          "path" varchar,
          "resourceType" varchar,
          "resourceId" varchar,
          "amountPesewas" integer,
          "beforeJson" text,
          "afterJson" text,
          "degraded" boolean NOT NULL DEFAULT 0,
          "ip" varchar,
          "userAgent" varchar,
          "traceId" varchar,
          "createdAt" ${tsType} NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);
      await queryRunner.query(`CREATE INDEX "idx_admin_action_actor" ON ${q('admin_action')} ("actorUserId", "createdAt")`);
      await queryRunner.query(`CREATE INDEX "idx_admin_action_resource" ON ${q('admin_action')} ("resourceType", "resourceId")`);
      await queryRunner.query(`CREATE INDEX "idx_admin_action_perm" ON ${q('admin_action')} ("permission", "createdAt")`);
    }

    // Backfill: every admin who can log in today keeps access. `user.adminRole` is the
    // bootstrap value; super_admin for anything predating per-admin roles.
    //
    // Branched, not try/caught. This used to run the sqlite variant and fall back to the
    // Postgres one in `.catch()`. On Postgres the first statement fails — no `randomblob`, and
    // an unqualified `"user"` — and a failed statement aborts the entire transaction, so the
    // fallback could never run and the whole migration died. A catch does not undo a failed
    // statement; it only hides which one it was.
    if (isSqlite) {
      await queryRunner.query(
        `INSERT INTO ${q('admin_user')} ("id", "userId", "adminRole", "displayName", "status", "totpEnrolledAt")
         SELECT lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))),
                u."id",
                COALESCE(u."adminRole", 'super_admin'),
                COALESCE(u."name", u."email"),
                'ACTIVE',
                u."totpSecret" IS NOT NULL
         FROM "user" u
         WHERE u."role" = 'admin'
           AND NOT EXISTS (SELECT 1 FROM ${q('admin_user')} a WHERE a."userId" = u."id")`,
      );
    } else {
      // Two type mismatches the old .catch() was hiding, either of which meant this backfill
      // inserted nobody and every existing admin silently lost access on deploy:
      //   - admin_user.userId is varchar while user.id is uuid, and Postgres refuses that
      //     comparison rather than coercing it;
      //   - totpEnrolledAt is a timestamp, but the source expression was the boolean
      //     `totpSecret IS NOT NULL`. sqlite stored 0/1 in a date column without complaint.
      // The CASE matches what AdminService does on the live bootstrap path: the column is only
      // ever read as `!!totpEnrolledAt`, so "enrolled, first observed now" is the honest value.
      await queryRunner.query(
        `INSERT INTO ${q('admin_user')} ("id", "userId", "adminRole", "displayName", "status", "totpEnrolledAt")
         SELECT gen_random_uuid(), u."id"::text, COALESCE(u."adminRole", 'super_admin'),
                COALESCE(u."name", u."email"), 'ACTIVE',
                CASE WHEN u."totpSecret" IS NOT NULL THEN now() ELSE NULL END
         FROM "auth"."user" u
         WHERE u."role" = 'admin'
           AND NOT EXISTS (SELECT 1 FROM "auth"."admin_user" a WHERE a."userId" = u."id"::text)
         ON CONFLICT DO NOTHING`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('admin_action', true).catch(() => undefined);
    await queryRunner.dropTable('admin_role_grant', true).catch(() => undefined);
    await queryRunner.dropTable('admin_user', true).catch(() => undefined);
  }
}
