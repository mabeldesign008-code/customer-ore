import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Retry bookkeeping for stuck webhooks.
 *
 * `handleWebhook` acks Paystack as soon as the row is inserted, then processes in the background
 * with `void processAsync(...)`. If that background work threw — or the pod was rescheduled
 * mid-flight — the row stayed at `processed = false` with nothing on any timer to pick it up.
 * Paystack had already been told 200, so it would never redeliver: the event was lost silently,
 * leaving one error line as the only trace.
 *
 * These columns let a sweeper retry those rows, back off between attempts, and eventually bury
 * an event that will never succeed instead of retrying it forever.
 */
export class AddWebhookRetryTracking1789800000000 implements MigrationInterface {
  name = 'AddWebhookRetryTracking1789800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isSqlite = this.isSqlite(queryRunner);
    const table = isSqlite ? `"webhook_event"` : `"payment"."webhook_event"`;
    const timestamp = isSqlite ? 'datetime' : 'TIMESTAMP WITH TIME ZONE';
    const bool = isSqlite ? 'boolean' : 'boolean';

    const existing = await queryRunner.getTable(isSqlite ? 'webhook_event' : 'payment.webhook_event');
    const has = (name: string) => !!existing?.columns.some((c) => c.name === name);

    if (!has('attempts')) {
      await queryRunner.query(`ALTER TABLE ${table} ADD "attempts" integer NOT NULL DEFAULT 0`);
    }
    if (!has('lastError')) {
      await queryRunner.query(`ALTER TABLE ${table} ADD "lastError" text`);
    }
    if (!has('abandoned')) {
      await queryRunner.query(`ALTER TABLE ${table} ADD "abandoned" ${bool} NOT NULL DEFAULT false`);
    }
    if (!has('lastAttemptAt')) {
      await queryRunner.query(`ALTER TABLE ${table} ADD "lastAttemptAt" ${timestamp}`);
    }

    // The sweeper's query is (processed, abandoned, createdAt) — index it, because it runs every
    // minute and the table only ever grows.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payment_webhook_stuck" ON ${table} ("processed", "abandoned", "createdAt")`,
    );

    // Existing unprocessed rows are eligible for the sweeper immediately: they are exactly the
    // events that were lost, and retrying them is the point of this migration. Their handlers
    // dedupe on eventId, so replaying an event that did in fact complete is a no-op.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isSqlite = this.isSqlite(queryRunner);
    const table = isSqlite ? `"webhook_event"` : `"payment"."webhook_event"`;
    const prefix = isSqlite ? '' : '"payment".';
    await queryRunner.query(`DROP INDEX IF EXISTS ${prefix}"IDX_payment_webhook_stuck"`);
    for (const col of ['lastAttemptAt', 'abandoned', 'lastError', 'attempts']) {
      await queryRunner.query(`ALTER TABLE ${table} DROP COLUMN IF EXISTS "${col}"`);
    }
  }

  private isSqlite(queryRunner: QueryRunner): boolean {
    const driver = queryRunner.connection.options.type;
    return driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs';
  }
}
