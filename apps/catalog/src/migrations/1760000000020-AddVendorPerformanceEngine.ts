import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/** Configurable Vendor Performance Engine with append-only score/audit history. */
export class AddVendorPerformanceEngine1760000000020 implements MigrationInterface {
  name = 'AddVendorPerformanceEngine1760000000020';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('catalog.vendor_performance_config'))) {
      await queryRunner.createTable(new Table({
        schema: 'catalog',
        name: 'vendor_performance_config',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar' },
          { name: 'version', type: 'int' },
          { name: 'reviewPeriod', type: 'varchar', default: "'MONTHLY'" },
          { name: 'active', type: 'boolean', default: true },
          { name: 'configJson', type: 'text' },
          { name: 'createdBy', type: 'varchar' },
          { name: 'approvedBy', type: 'varchar', isNullable: true },
          { name: 'notes', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp without time zone', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp without time zone', default: 'now()' },
        ],
      }));
      await queryRunner.createIndex('catalog.vendor_performance_config', new TableIndex({ name: 'IDX_vendor_perf_config_active_created', columnNames: ['active', 'createdAt'] }));
    }

    if (!(await queryRunner.hasTable('catalog.vendor_performance_record'))) {
      await queryRunner.createTable(new Table({
        schema: 'catalog',
        name: 'vendor_performance_record',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'vendorId', type: 'varchar' },
          { name: 'periodStart', type: 'timestamp without time zone' },
          { name: 'periodEnd', type: 'timestamp without time zone' },
          { name: 'configVersion', type: 'int' },
          { name: 'configId', type: 'varchar', isNullable: true },
          { name: 'reviewerId', type: 'varchar', isNullable: true },
          { name: 'overallScore', type: 'float8', isNullable: true },
          { name: 'grade', type: 'varchar', isNullable: true },
          { name: 'status', type: 'varchar' },
          { name: 'trend', type: 'varchar' },
          { name: 'insufficientData', type: 'boolean', default: false },
          { name: 'resultJson', type: 'text' },
          { name: 'metricCategories', type: 'text', isNullable: true },
          { name: 'incidentTypes', type: 'text', isNullable: true },
          { name: 'actionCodes', type: 'text', isNullable: true },
          { name: 'outcome', type: 'varchar', isNullable: true },
          { name: 'recordType', type: 'varchar', default: "'REVIEW'" },
          { name: 'linkedRecordId', type: 'varchar', isNullable: true },
          { name: 'notes', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp without time zone', default: 'now()' },
        ],
      }));
      await queryRunner.createIndex('catalog.vendor_performance_record', new TableIndex({ name: 'IDX_vendor_perf_record_vendor_period', columnNames: ['vendorId', 'periodStart', 'periodEnd'] }));
      await queryRunner.createIndex('catalog.vendor_performance_record', new TableIndex({ name: 'IDX_vendor_perf_record_status_created', columnNames: ['status', 'createdAt'] }));
      await queryRunner.createIndex('catalog.vendor_performance_record', new TableIndex({ name: 'IDX_vendor_perf_record_reviewer_created', columnNames: ['reviewerId', 'createdAt'] }));
      await queryRunner.createIndex('catalog.vendor_performance_record', new TableIndex({ name: 'IDX_vendor_perf_record_outcome_created', columnNames: ['outcome', 'createdAt'] }));
    }

    if (!(await queryRunner.hasTable('catalog.vendor_performance_audit'))) {
      await queryRunner.createTable(new Table({
        schema: 'catalog',
        name: 'vendor_performance_audit',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'vendorId', type: 'varchar', isNullable: true },
          { name: 'action', type: 'varchar' },
          { name: 'actorId', type: 'varchar' },
          { name: 'recordId', type: 'varchar', isNullable: true },
          { name: 'payloadJson', type: 'text', isNullable: true },
          { name: 'reason', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp without time zone', default: 'now()' },
        ],
      }));
      await queryRunner.createIndex('catalog.vendor_performance_audit', new TableIndex({ name: 'IDX_vendor_perf_audit_vendor_created', columnNames: ['vendorId', 'createdAt'] }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('catalog.vendor_performance_audit', true);
    await queryRunner.dropTable('catalog.vendor_performance_record', true);
    await queryRunner.dropTable('catalog.vendor_performance_config', true);
  }
}
