import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/** Adds a durable order-issue report for vendor/customer operations follow-up. */
export class AddOrderIssues1760000000007 implements MigrationInterface {
  name = 'AddOrderIssues1760000000007';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order_issue';
    if (!(await queryRunner.hasTable(tablePath))) {
      await queryRunner.createTable(new Table({
        schema: 'order',
        name: 'order_issue',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'orderId', type: 'varchar' },
          { name: 'vendorId', type: 'varchar' },
          { name: 'reporterUserId', type: 'varchar' },
          { name: 'category', type: 'varchar' },
          { name: 'note', type: 'text', isNullable: true },
          { name: 'status', type: 'varchar', default: "'OPEN'" },
          { name: 'createdAt', type: 'timestamp without time zone', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp without time zone', default: 'now()' },
        ],
      }));
    }
    const table = await queryRunner.getTable(tablePath);
    if (table && !table.indices.some((index) => index.name === 'IDX_order_issue_orderId_createdAt')) {
      await queryRunner.createIndex(tablePath, new TableIndex({ name: 'IDX_order_issue_orderId_createdAt', columnNames: ['orderId', 'createdAt'] }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('order.order_issue', true);
  }
}
