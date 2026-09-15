import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddCustomerLoyalty1760000000002 implements MigrationInterface {
  name = 'AddCustomerLoyalty1760000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('ledger.customer_loyalty'))) {
      await queryRunner.createTable(new Table({
        schema: 'ledger',
        name: 'customer_loyalty',
        columns: [
          { name: 'userId', type: 'varchar', isPrimary: true },
          { name: 'points', type: 'int', default: 0 },
          { name: 'lifetimeEarned', type: 'int', default: 0 },
          { name: 'lifetimeRedeemed', type: 'int', default: 0 },
          { name: 'createdAt', type: 'timestamp without time zone', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp without time zone', default: 'now()' },
        ],
      }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ledger.customer_loyalty', true);
  }
}
