import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * `order.commissionPct` (float) → `order.commissionBps` (int).
 *
 * A commission rate is not money, but it decides money. Stored as a float, a rate could not
 * always be written and read back as the same number — 17.7 has no exact binary representation —
 * so recomputing a vendor's share from the stored rate could disagree with the figure the
 * customer was actually charged, on some orders and not others.
 *
 * Basis points (1 bp = 0.01%, so 18% = 1800) are exact and give the arithmetic somewhere to go:
 * a 25% premium discount on 18% is 13.5%, which whole percentages could not express.
 */
export class CommissionPctToBps1789900000000 implements MigrationInterface {
  name = 'CommissionPctToBps1789900000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = 'order.order';
    if (!(await queryRunner.hasTable(table))) return;
    if (await queryRunner.hasColumn(table, 'commissionBps')) return;

    await queryRunner.addColumn(table, new TableColumn({ name: 'commissionBps', type: 'int', default: 0 }));

    if (await queryRunner.hasColumn(table, 'commissionPct')) {
      // ROUND to the nearest basis point. Existing values are whole or half percentages, so this
      // is lossless in practice; rounding rather than truncating means a stored 17.999999999
      // becomes 1800, not 1799.
      await queryRunner.query(
        `UPDATE "order"."order" SET "commissionBps" = ROUND(COALESCE("commissionPct", 0) * 100)::int`,
      );
      // The old column is dropped in the same migration deliberately. Leaving both would leave
      // two sources of truth for the same rate, and the next person to read the entity would
      // have no way to tell which one the ledger actually used.
      await queryRunner.dropColumn(table, 'commissionPct');
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = 'order.order';
    if (!(await queryRunner.hasTable(table))) return;
    if (!(await queryRunner.hasColumn(table, 'commissionPct'))) {
      await queryRunner.addColumn(table, new TableColumn({ name: 'commissionPct', type: 'float', default: 0 }));
    }
    if (await queryRunner.hasColumn(table, 'commissionBps')) {
      await queryRunner.query(`UPDATE "order"."order" SET "commissionPct" = "commissionBps" / 100.0`);
      await queryRunner.dropColumn(table, 'commissionBps');
    }
  }
}
