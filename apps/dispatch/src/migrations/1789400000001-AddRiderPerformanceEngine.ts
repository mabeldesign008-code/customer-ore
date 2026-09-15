import { MigrationInterface, QueryRunner, Table, TableColumn, TableIndex } from 'typeorm';

/** Configurable Delivery Partner Performance Engine with append-only history. */
export class AddRiderPerformanceEngine1789400000001 implements MigrationInterface {
  name = 'AddRiderPerformanceEngine1789400000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    const incidentTable = 'dispatch.rider_incident';
    if (await queryRunner.hasTable(incidentTable)) {
      const columns = [
        new TableColumn({ name: 'severity', type: 'varchar', default: "'LOW'" }),
        new TableColumn({ name: 'attribution', type: 'varchar', default: "'UNKNOWN'" }),
        new TableColumn({ name: 'excludedFromPerformance', type: 'boolean', default: false }),
        new TableColumn({ name: 'exclusionReason', type: 'text', isNullable: true }),
        new TableColumn({ name: 'performanceImpact', type: 'boolean', default: true }),
        new TableColumn({ name: 'reviewerId', type: 'varchar', isNullable: true }),
        new TableColumn({ name: 'reviewedAt', type: 'timestamp without time zone', isNullable: true }),
        new TableColumn({ name: 'outcome', type: 'varchar', isNullable: true }),
      ];
      for (const column of columns) {
        if (!(await queryRunner.hasColumn(incidentTable, column.name))) await queryRunner.addColumn(incidentTable, column);
      }
    }

    if (!(await queryRunner.hasTable('dispatch.rider_performance_config'))) {
      await queryRunner.createTable(new Table({
        schema: 'dispatch',
        name: 'rider_performance_config',
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
      await queryRunner.createIndex('dispatch.rider_performance_config', new TableIndex({ name: 'IDX_rider_perf_config_active_created', columnNames: ['active', 'createdAt'] }));
    }

    if (!(await queryRunner.hasTable('dispatch.rider_performance_record'))) {
      await queryRunner.createTable(new Table({
        schema: 'dispatch',
        name: 'rider_performance_record',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'riderId', type: 'varchar' },
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
      await queryRunner.createIndex('dispatch.rider_performance_record', new TableIndex({ name: 'IDX_rider_perf_record_rider_period', columnNames: ['riderId', 'periodStart', 'periodEnd'] }));
      await queryRunner.createIndex('dispatch.rider_performance_record', new TableIndex({ name: 'IDX_rider_perf_record_status_created', columnNames: ['status', 'createdAt'] }));
      await queryRunner.createIndex('dispatch.rider_performance_record', new TableIndex({ name: 'IDX_rider_perf_record_reviewer_created', columnNames: ['reviewerId', 'createdAt'] }));
      await queryRunner.createIndex('dispatch.rider_performance_record', new TableIndex({ name: 'IDX_rider_perf_record_outcome_created', columnNames: ['outcome', 'createdAt'] }));
    }

    if (!(await queryRunner.hasTable('dispatch.rider_performance_audit'))) {
      await queryRunner.createTable(new Table({
        schema: 'dispatch',
        name: 'rider_performance_audit',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'riderId', type: 'varchar', isNullable: true },
          { name: 'action', type: 'varchar' },
          { name: 'actorId', type: 'varchar' },
          { name: 'recordId', type: 'varchar', isNullable: true },
          { name: 'payloadJson', type: 'text', isNullable: true },
          { name: 'reason', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp without time zone', default: 'now()' },
        ],
      }));
      await queryRunner.createIndex('dispatch.rider_performance_audit', new TableIndex({ name: 'IDX_rider_perf_audit_rider_created', columnNames: ['riderId', 'createdAt'] }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('dispatch.rider_performance_audit', true);
    await queryRunner.dropTable('dispatch.rider_performance_record', true);
    await queryRunner.dropTable('dispatch.rider_performance_config', true);
    const incidentTable = 'dispatch.rider_incident';
    if (await queryRunner.hasTable(incidentTable)) {
      for (const name of ['outcome', 'reviewedAt', 'reviewerId', 'performanceImpact', 'exclusionReason', 'excludedFromPerformance', 'attribution', 'severity']) {
        if (await queryRunner.hasColumn(incidentTable, name)) await queryRunner.dropColumn(incidentTable, name);
      }
    }
  }
}
