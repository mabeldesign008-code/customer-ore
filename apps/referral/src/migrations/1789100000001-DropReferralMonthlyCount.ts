import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/** The referral cap is now counted from actual claims in the current calendar month;
 *  the stored lifetime counter (`monthlyCount`) was monotonic and never reset. */
export class DropReferralMonthlyCount1789100000001 implements MigrationInterface {
  name = 'DropReferralMonthlyCount1789100000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'referral.referral_code';
    if (!(await queryRunner.hasTable(tablePath))) return;
    if (await queryRunner.hasColumn(tablePath, 'monthlyCount')) {
      await queryRunner.dropColumn(tablePath, 'monthlyCount');
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'referral.referral_code';
    if (!(await queryRunner.hasTable(tablePath))) return;
    if (!(await queryRunner.hasColumn(tablePath, 'monthlyCount'))) {
      await queryRunner.addColumn(
        tablePath,
        new TableColumn({ name: 'monthlyCount', type: 'int', default: 0 }),
      );
    }
  }
}
