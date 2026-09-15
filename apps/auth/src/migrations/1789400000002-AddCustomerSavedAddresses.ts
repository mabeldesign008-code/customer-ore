import { MigrationInterface, QueryRunner, Table, TableColumn, TableIndex } from 'typeorm';

/** Customer saved-address store plus append-only support correction audit. */
export class AddCustomerSavedAddresses1789400000002 implements MigrationInterface {
  name = 'AddCustomerSavedAddresses1789400000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    const userTable = 'auth.user';
    if (await queryRunner.hasTable(userTable)) {
      const codColumns = [
        new TableColumn({ name: 'customerCodTier', type: 'varchar', default: "'NEW'" }),
        new TableColumn({ name: 'customerCodBlocked', type: 'boolean', default: false }),
        new TableColumn({ name: 'customerCodBlockReason', type: 'text', isNullable: true }),
      ];
      for (const column of codColumns) {
        if (!(await queryRunner.hasColumn(userTable, column.name))) await queryRunner.addColumn(userTable, column);
      }
    }

    if (!(await queryRunner.hasTable('auth.customer_saved_address'))) {
      await queryRunner.createTable(new Table({
        schema: 'auth',
        name: 'customer_saved_address',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'customerId', type: 'varchar' },
          { name: 'label', type: 'varchar' },
          { name: 'addressJson', type: 'text' },
          { name: 'isDefault', type: 'boolean', default: false },
          { name: 'active', type: 'boolean', default: true },
          { name: 'createdBy', type: 'varchar', isNullable: true },
          { name: 'updatedBy', type: 'varchar', isNullable: true },
          { name: 'createdAt', type: 'timestamp without time zone', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp without time zone', default: 'now()' },
        ],
      }));
      await queryRunner.createIndex('auth.customer_saved_address', new TableIndex({ name: 'IDX_customer_saved_address_customer_active', columnNames: ['customerId', 'active'] }));
    }

    if (!(await queryRunner.hasTable('auth.customer_address_audit'))) {
      await queryRunner.createTable(new Table({
        schema: 'auth',
        name: 'customer_address_audit',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'customerId', type: 'varchar' },
          { name: 'addressId', type: 'varchar', isNullable: true },
          { name: 'action', type: 'varchar' },
          { name: 'actorId', type: 'varchar' },
          { name: 'actorRole', type: 'varchar' },
          { name: 'beforeJson', type: 'text', isNullable: true },
          { name: 'afterJson', type: 'text', isNullable: true },
          { name: 'reason', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp without time zone', default: 'now()' },
        ],
      }));
      await queryRunner.createIndex('auth.customer_address_audit', new TableIndex({ name: 'IDX_customer_address_audit_customer_created', columnNames: ['customerId', 'createdAt'] }));
      await queryRunner.createIndex('auth.customer_address_audit', new TableIndex({ name: 'IDX_customer_address_audit_address_created', columnNames: ['addressId', 'createdAt'] }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('auth.customer_address_audit', true);
    await queryRunner.dropTable('auth.customer_saved_address', true);
    const userTable = 'auth.user';
    if (await queryRunner.hasTable(userTable)) {
      for (const name of ['customerCodBlockReason', 'customerCodBlocked', 'customerCodTier']) {
        if (await queryRunner.hasColumn(userTable, name)) await queryRunner.dropColumn(userTable, name);
      }
    }
  }
}
