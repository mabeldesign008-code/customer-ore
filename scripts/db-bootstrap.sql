-- ============================================================================
-- Ore Delivery — database bootstrap (DBA-run, OUTSIDE app migrations)
-- ============================================================================
-- Audit S-4/C-2: the ledger's append-only escape hatch needs a maintenance role.
-- App migrations used to CREATE ROLE themselves, which requires CREATEROLE —
-- managed Postgres (RDS, Cloud SQL, Supabase, Neon) does not grant that to
-- application users, and the failure rolled back the ENTIRE migration
-- transaction, leaving the ledger schema empty and the money subsystem dead at
-- boot. The migration now degrades gracefully (warns, stays strictly
-- append-only). Run this script once per environment as a role that CAN create
-- roles (e.g. the master/admin user), then the escape hatch works:
--
--   BEGIN;
--   SET LOCAL ore.ledger_maintenance = 'on';   -- only as a member of the role
--   ...genuine correction (reversing entries preferred; see ledger policy)...
--   COMMIT;
--
-- Usage:  psql "$DATABASE_URL_AS_ADMIN" -f scripts/db-bootstrap.sql
-- Idempotent: safe to re-run.
-- ============================================================================

-- 1) Ledger maintenance role (NOLOGIN — membership is granted to the app role
--    or an operator role; it exists so pg_has_role() has something to check).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ore_ledger_maintenance') THEN
    CREATE ROLE ore_ledger_maintenance NOLOGIN;
    RAISE NOTICE 'created role ore_ledger_maintenance';
  ELSE
    RAISE NOTICE 'role ore_ledger_maintenance already exists';
  END IF;
END
$$;

-- 2) Grant membership to the application role so an operator connected as the
--    app user can perform a genuine correction inside an explicit transaction.
--    Adjust 'ore' if your app connects under a different role.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ore') THEN
    EXECUTE 'GRANT ore_ledger_maintenance TO ore';
    RAISE NOTICE 'granted ore_ledger_maintenance to ore';
  ELSE
    RAISE WARNING 'role "ore" not found — grant ore_ledger_maintenance to your app role manually';
  END IF;
END
$$;

-- 3) Sanity: report what the ledger guards will now allow.
SELECT
  EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ore_ledger_maintenance') AS maintenance_role_exists,
  current_user AS connected_as;
