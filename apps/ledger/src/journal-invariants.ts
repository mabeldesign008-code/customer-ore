/**
 * The ledger's database-level invariants, as DDL.
 *
 * Everything that pays a rider or a vendor reads `ledger_entry`. An application-level check
 * is a convention: it holds only for as long as every code path remembers to call it, and 19
 * call sites once did not. These triggers make the invariants properties of the database
 * instead, so a future code path cannot opt out by forgetting.
 *
 *   1. APPEND-ONLY. A posted row is never updated or deleted. Corrections are reversing
 *      entries, which leaves the original and its correction both visible.
 *   2. BALANCED. For any `ref` — the grouping key every transaction's legs share — total
 *      debits equal total credits.
 *
 * Naming notes that are easy to get wrong:
 *  - The entity declares no explicit column names, so TypeORM keeps the property spelling.
 *    The real columns are "debitPesewas" and "creditPesewas", and they must be quoted: in
 *    Postgres an unquoted identifier folds to lowercase and the trigger would not compile.
 *  - The entity is `@Entity({ schema: 'ledger' })`. Postgres honours that (ledger.ledger_entry);
 *    SQLite has no schemas and ignores it (ledger_entry). The table name is therefore
 *    driver-specific.
 *
 * Kept in one module and shared by the TypeORM migration and the boot-time ensure step so the
 * two cannot drift apart.
 */

/** Column names as they exist on disk (quoted, camelCase). */
const DEBIT = '"debitPesewas"';
const CREDIT = '"creditPesewas"';
const REF = '"ref"';

export const LEDGER_ENTRY_TABLE = 'ledger_entry';

function isSqlite(driver: string): boolean {
  return driver === 'sqlite' || driver === 'better-sqlite3' || driver === 'sqljs';
}

/** The journal table, qualified the way the driver actually stores it. */
export function journalTable(driver: string): string {
  return isSqlite(driver) ? LEDGER_ENTRY_TABLE : `ledger.${LEDGER_ENTRY_TABLE}`;
}

function sqliteDdl(): string[] {
  // SQLite has no deferred/constraint triggers (`CREATE CONSTRAINT TRIGGER` is a syntax
  // error, verified), so an AFTER INSERT balance trigger is impossible here: it fires after
  // every individual leg, and a correctly balanced two-leg transaction is momentarily
  // off-balance between them — the trigger rejects money that is right. Enforcing that on
  // SQLite would break every posting. So SQLite gets the append-only half, which is
  // immediate and works, and the balance half stays where it can actually be evaluated on
  // the whole group: `recordTransaction` (the only writer) plus the balance-invariant spec.
  // Production is Postgres, which does support deferral.
  return [
    `CREATE TRIGGER IF NOT EXISTS ${LEDGER_ENTRY_TABLE}_no_update
     BEFORE UPDATE ON ${LEDGER_ENTRY_TABLE}
     BEGIN
       SELECT RAISE(ABORT,
         'ledger_entry is append-only: posted journal rows cannot be updated. Post a reversing entry instead.');
     END`,
    `CREATE TRIGGER IF NOT EXISTS ${LEDGER_ENTRY_TABLE}_no_delete
     BEFORE DELETE ON ${LEDGER_ENTRY_TABLE}
     BEGIN
       SELECT RAISE(ABORT,
         'ledger_entry is append-only: posted journal rows cannot be deleted. Post a reversing entry instead.');
     END`,
  ];
}

function postgresDdl(): string[] {
  const table = journalTable('postgres');
  return [
    // Audit S-4/C-2: managed Postgres (RDS, Cloud SQL, Supabase, Neon) does not grant
    // CREATEROLE to application users. A bare CREATE ROLE aborted the whole migration
    // transaction — every migration runs in one — leaving the ledger schema empty and the
    // entire money subsystem dead at boot on a fresh production database. Degrade instead:
    // warn and continue. The guards below fail CLOSED when the role is absent (no escape
    // hatch ⇒ strictly append-only, which is the safe direction), and the DBA bootstrap
    // script (scripts/db-bootstrap.sql) creates the role properly where privileges allow.
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ore_ledger_maintenance') THEN
         BEGIN
           CREATE ROLE ore_ledger_maintenance NOLOGIN;
         EXCEPTION WHEN insufficient_privilege THEN
           RAISE WARNING 'ledger: could not create role ore_ledger_maintenance (insufficient_privilege). The ledger stays strictly append-only; a DBA must run scripts/db-bootstrap.sql to enable the maintenance escape hatch.';
         END;
       END IF;
     END $$`,
    `CREATE OR REPLACE FUNCTION ledger_entry_guard() RETURNS trigger AS $fn$
     DECLARE
       maintenance text;
     BEGIN
       -- Escape hatch: a privileged role may opt in for one transaction.
       -- current_setting(..., true) yields NULL instead of raising when unset.
       maintenance := current_setting('ore.ledger_maintenance', true);
       IF maintenance = 'on' THEN
         -- Nested on purpose (audit S-4): pg_has_role() RAISES when the role does not
         -- exist, and on managed Postgres the bootstrap role may legitimately be absent.
         -- Absent role ⇒ no escape hatch ⇒ fail closed, strictly append-only.
         IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ore_ledger_maintenance') THEN
           IF pg_has_role(current_user, 'ore_ledger_maintenance', 'MEMBER') THEN
             RETURN COALESCE(NEW, OLD);
           END IF;
         END IF;
       END IF;
       RAISE EXCEPTION
         'ledger_entry is append-only: % on a posted journal row is forbidden. Post a reversing entry instead.',
         TG_OP
         USING HINT = 'Set LOCAL ore.ledger_maintenance = ''on'' as a member of ore_ledger_maintenance for a genuine correction.';
     END;
     $fn$ LANGUAGE plpgsql`,
    `DROP TRIGGER IF EXISTS ${LEDGER_ENTRY_TABLE}_no_update ON ${table}`,
    `CREATE TRIGGER ${LEDGER_ENTRY_TABLE}_no_update
     BEFORE UPDATE ON ${table}
     FOR EACH ROW EXECUTE FUNCTION ledger_entry_guard()`,
    `DROP TRIGGER IF EXISTS ${LEDGER_ENTRY_TABLE}_no_delete ON ${table}`,
    `CREATE TRIGGER ${LEDGER_ENTRY_TABLE}_no_delete
     BEFORE DELETE ON ${table}
     FOR EACH ROW EXECUTE FUNCTION ledger_entry_guard()`,
    `CREATE OR REPLACE FUNCTION ledger_entry_balance_guard() RETURNS trigger AS $fn$
     DECLARE
       maintenance text;
       net bigint;
     BEGIN
       maintenance := current_setting('ore.ledger_maintenance', true);
       IF maintenance = 'on' THEN
         -- Nested on purpose (audit S-4): see ledger_entry_guard — an absent role must
         -- fail closed, not raise "role does not exist" on every INSERT.
         IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ore_ledger_maintenance') THEN
           IF pg_has_role(current_user, 'ore_ledger_maintenance', 'MEMBER') THEN
             RETURN NULL;
           END IF;
         END IF;
       END IF;
       IF NEW.${REF} IS NULL THEN
         RETURN NULL;
       END IF;
       SELECT COALESCE(SUM(${DEBIT}) - SUM(${CREDIT}), 0) INTO net
       FROM ${table} WHERE ${REF} = NEW.${REF};
       IF net <> 0 THEN
         RAISE EXCEPTION
           'ledger_entry must balance: ref % is off by % (debits minus credits)', NEW.${REF}, net
           USING HINT = 'Every transaction must post legs that sum to zero.';
       END IF;
       RETURN NULL;
     END;
     $fn$ LANGUAGE plpgsql`,
    // DEFERRABLE INITIALLY DEFERRED is the whole point: the check runs at COMMIT, after every
    // leg of the group has been written, instead of after each individual row.
    `DROP TRIGGER IF EXISTS ${LEDGER_ENTRY_TABLE}_balanced ON ${table}`,
    `CREATE CONSTRAINT TRIGGER ${LEDGER_ENTRY_TABLE}_balanced
     AFTER INSERT ON ${table}
     DEFERRABLE INITIALLY DEFERRED
     FOR EACH ROW EXECUTE FUNCTION ledger_entry_balance_guard()`,
  ];
}

/** DDL that installs the invariants for the given TypeORM driver name. */
export function journalInvariantDdl(driver: string): string[] {
  return isSqlite(driver) ? sqliteDdl() : postgresDdl();
}

/** DDL that removes them again (migration `down`). */
export function journalInvariantDropDdl(driver: string): string[] {
  if (isSqlite(driver)) {
    return [
      `DROP TRIGGER IF EXISTS ${LEDGER_ENTRY_TABLE}_no_update`,
      `DROP TRIGGER IF EXISTS ${LEDGER_ENTRY_TABLE}_no_delete`,
    ];
  }
  const table = journalTable(driver);
  return [
    `DROP TRIGGER IF EXISTS ${LEDGER_ENTRY_TABLE}_no_update ON ${table}`,
    `DROP TRIGGER IF EXISTS ${LEDGER_ENTRY_TABLE}_no_delete ON ${table}`,
    `DROP TRIGGER IF EXISTS ${LEDGER_ENTRY_TABLE}_balanced ON ${table}`,
    'DROP FUNCTION IF EXISTS ledger_entry_guard()',
    'DROP FUNCTION IF EXISTS ledger_entry_balance_guard()',
  ];
}
