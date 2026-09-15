import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rider earnings move from the order to the assignment.
 *
 * Before this, `order.riderFeePesewas` was overwritten by every dispatch of the same order.
 * A laundry order dispatches twice (collection, then return) and the second write erased the
 * first, so the ledger — which credits the order's rider at ORDER_DELIVERED — paid only the
 * returning rider. The collection rider was never paid at all.
 *
 * Each assignment now carries the fee agreed when its offer was accepted. The order-level
 * field becomes the running total across legs, which is what the tax engine needs to see as
 * the true delivery-partner cost of the order.
 */
export class AddAssignmentEarnings1789600000000 implements MigrationInterface {
  name = 'AddAssignmentEarnings1789600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    const isSqlite = driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs';
    const table = isSqlite ? `"assignment"` : `"dispatch"."assignment"`;
    const timestamp = isSqlite ? 'datetime' : 'TIMESTAMP WITH TIME ZONE';

    const columns = await queryRunner.getTable(isSqlite ? 'assignment' : 'dispatch.assignment');
    const has = (name: string) => !!columns?.columns.some((c) => c.name === name);

    if (!has('riderFeePesewas')) {
      await queryRunner.query(`ALTER TABLE ${table} ADD "riderFeePesewas" integer NOT NULL DEFAULT 0`);
    }
    if (!has('peakPayPesewas')) {
      await queryRunner.query(`ALTER TABLE ${table} ADD "peakPayPesewas" integer NOT NULL DEFAULT 0`);
    }
    if (!has('earningsPostedAt')) {
      await queryRunner.query(`ALTER TABLE ${table} ADD "earningsPostedAt" ${timestamp}`);
    }

    const offerTable = isSqlite ? `"offer"` : `"dispatch"."offer"`;
    const offerCols = await queryRunner.getTable(isSqlite ? 'offer' : 'dispatch.offer');
    if (!offerCols?.columns.some((c) => c.name === 'peakPayPesewas')) {
      await queryRunner.query(`ALTER TABLE ${offerTable} ADD "peakPayPesewas" integer NOT NULL DEFAULT 0`);
    }

    // Batches carry the whole-batch fee on the offer; this records what each order in the
    // batch is individually worth, so its assignment can be paid correctly.
    const batchTable = isSqlite ? `"batch"` : `"dispatch"."batch"`;
    const batchCols = await queryRunner.getTable(isSqlite ? 'batch' : 'dispatch.batch');
    if (!batchCols?.columns.some((c) => c.name === 'feeByOrderJson')) {
      await queryRunner.query(`ALTER TABLE ${batchTable} ADD "feeByOrderJson" text`);
    }

    // Not backfilled. Historical assignments have no fee of their own, and dispatch cannot read
    // the order schema to recover one (cross-schema access is forbidden by design). Legs left at
    // 0 make `splitLegCredits` return nothing, so the ledger falls back to crediting the order's
    // assigned rider — exactly the old behaviour. In-flight orders are therefore unaffected by
    // this migration; the fix applies to orders dispatched after it.
    //
    // The riders already underpaid by the old bug cannot be identified from this schema either:
    // their fees were overwritten and are gone. That is a manual reconciliation against
    // `dispatch_audit` (`assigned` events carry `feePesewas`), not something a migration can do.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    const isSqlite = driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs';
    const table = isSqlite ? `"assignment"` : `"dispatch"."assignment"`;
    const offerTable = isSqlite ? `"offer"` : `"dispatch"."offer"`;
    const batchTable = isSqlite ? `"batch"` : `"dispatch"."batch"`;
    for (const col of ['earningsPostedAt', 'peakPayPesewas', 'riderFeePesewas']) {
      await queryRunner.query(`ALTER TABLE ${table} DROP COLUMN IF EXISTS "${col}"`);
    }
    await queryRunner.query(`ALTER TABLE ${offerTable} DROP COLUMN IF EXISTS "peakPayPesewas"`);
    await queryRunner.query(`ALTER TABLE ${batchTable} DROP COLUMN IF EXISTS "feeByOrderJson"`);
  }
}
