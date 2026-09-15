/**
 * DB error helpers for the auth service.
 *
 * Boot-time provisioning (AdminService.onModuleInit) can race with other
 * provisioning paths on a fresh database. SQLite reports a constraint breach
 * as QueryFailedError with driverError.code === 'SQLITE_CONSTRAINT'. This
 * predicate lets callers treat a lost insert race as a no-op instead of a
 * fatal boot error.
 */
export function isUniqueConstraintError(err: unknown): boolean {
  const code = (err as { driverError?: { code?: string } })?.driverError?.code;
  if (code === 'SQLITE_CONSTRAINT') return true;
  const message = err instanceof Error ? err.message : String(err);
  return /UNIQUE constraint failed/i.test(message);
}
