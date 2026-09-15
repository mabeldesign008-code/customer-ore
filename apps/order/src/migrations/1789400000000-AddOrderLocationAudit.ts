import { MigrationInterface, QueryRunner, Table, TableColumn, TableIndex } from 'typeorm';

/** Adds service level and append-only delivery-location history/correction audit. */
export class AddOrderLocationAudit1789400000000 implements MigrationInterface {
  name = 'AddOrderLocationAudit1789400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const orderTable = 'order.order';
    if (await queryRunner.hasTable(orderTable) && !(await queryRunner.hasColumn(orderTable, 'serviceLevel'))) {
      await queryRunner.addColumn(orderTable, new TableColumn({ name: 'serviceLevel', type: 'varchar', default: "'STANDARD'" }));
    }

    const auditTable = 'order.order_address_audit';
    if (!(await queryRunner.hasTable(auditTable))) {
      await queryRunner.createTable(new Table({
        schema: 'order',
        name: 'order_address_audit',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'orderId', type: 'varchar' },
          { name: 'action', type: 'varchar' },
          { name: 'actorId', type: 'varchar', isNullable: true },
          { name: 'actorRole', type: 'varchar', isNullable: true },
          { name: 'source', type: 'varchar', isNullable: true },
          { name: 'beforeJson', type: 'jsonb', isNullable: true },
          { name: 'afterJson', type: 'jsonb' },
          { name: 'reason', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp without time zone', default: 'now()' },
        ],
      }));
      await queryRunner.createIndex(auditTable, new TableIndex({ name: 'IDX_order_address_audit_order_created', columnNames: ['orderId', 'createdAt'] }));
      await queryRunner.createIndex(auditTable, new TableIndex({ name: 'IDX_order_address_audit_order_action', columnNames: ['orderId', 'action'] }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('order.order_address_audit', true);
    if (await queryRunner.hasTable('order.order') && await queryRunner.hasColumn('order.order', 'serviceLevel')) {
      await queryRunner.dropColumn('order.order', 'serviceLevel');
    }
  }
}
