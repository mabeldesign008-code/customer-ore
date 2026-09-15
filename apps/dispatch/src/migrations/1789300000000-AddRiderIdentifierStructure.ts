import { MigrationInterface, QueryRunner, Table, TableColumn, TableIndex } from 'typeorm';

/** Implements the YDR-CC-YYYY-NNNN Rider ID structure with DB-level uniqueness/history. */
export class AddRiderIdentifierStructure1789300000000 implements MigrationInterface {
  name = 'AddRiderIdentifierStructure1789300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS "dispatch"');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await this.addColumns(queryRunner, 'dispatch.rider', [
      new TableColumn({ name: 'riderIdentifier', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'cityId', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'cityCode', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'approvalYear', type: 'integer', isNullable: true }),
      new TableColumn({ name: 'sequenceNumber', type: 'integer', isNullable: true }),
      new TableColumn({ name: 'approvedAt', type: 'timestamp with time zone', isNullable: true }),
      new TableColumn({ name: 'identifierStatus', type: 'varchar', default: "'UNASSIGNED'" }),
    ]);

    await this.createIndexIfMissing(queryRunner, 'dispatch.rider', new TableIndex({
      name: 'UQ_dispatch_rider_identifier',
      columnNames: ['riderIdentifier'],
      isUnique: true,
    }));
    await this.createIndexIfMissing(queryRunner, 'dispatch.rider', new TableIndex({
      name: 'UQ_dispatch_rider_city_year_sequence',
      columnNames: ['cityCode', 'approvalYear', 'sequenceNumber'],
      isUnique: true,
    }));

    if (!(await queryRunner.hasTable('dispatch.rider_identifier_sequence'))) {
      await queryRunner.createTable(new Table({
        schema: 'dispatch',
        name: 'rider_identifier_sequence',
        columns: [
          { name: 'cityCode', type: 'varchar', isPrimary: true },
          { name: 'approvalYear', type: 'integer', isPrimary: true },
          { name: 'seq', type: 'integer', default: '0' },
        ],
      }));
    }

    if (!(await queryRunner.hasTable('dispatch.rider_identifier_audit'))) {
      await queryRunner.createTable(new Table({
        schema: 'dispatch',
        name: 'rider_identifier_audit',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'riderId', type: 'varchar' },
          { name: 'eventType', type: 'varchar' },
          { name: 'identifier', type: 'varchar' },
          { name: 'previousIdentifier', type: 'varchar', isNullable: true },
          { name: 'cityId', type: 'varchar', isNullable: true },
          { name: 'cityCode', type: 'varchar', isNullable: true },
          { name: 'approvalYear', type: 'integer', isNullable: true },
          { name: 'sequenceNumber', type: 'integer', isNullable: true },
          { name: 'previousCityId', type: 'varchar', isNullable: true },
          { name: 'previousCityCode', type: 'varchar', isNullable: true },
          { name: 'previousApprovalYear', type: 'integer', isNullable: true },
          { name: 'previousSequenceNumber', type: 'integer', isNullable: true },
          { name: 'reason', type: 'text' },
          { name: 'actorId', type: 'varchar' },
          { name: 'actorRole', type: 'varchar', isNullable: true },
          { name: 'approvalReference', type: 'varchar', isNullable: true },
          { name: 'metadataJson', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp with time zone', default: 'now()' },
        ],
      }));
    }

    await this.createIndexIfMissing(queryRunner, 'dispatch.rider_identifier_audit', new TableIndex({
      name: 'IDX_rider_identifier_audit_riderId',
      columnNames: ['riderId'],
    }));
    await this.createIndexIfMissing(queryRunner, 'dispatch.rider_identifier_audit', new TableIndex({
      name: 'IDX_rider_identifier_audit_identifier',
      columnNames: ['identifier'],
    }));
    await this.createIndexIfMissing(queryRunner, 'dispatch.rider_identifier_audit', new TableIndex({
      name: 'IDX_rider_identifier_audit_previousIdentifier',
      columnNames: ['previousIdentifier'],
    }));

    // Existing verified Rider rows predate the YDR structure. Backfill them from the
    // controlled default location (Cape Coast / CC) in one database operation, record the
    // migration event, and advance the DB counter so future approvals continue after the
    // highest assigned sequence. This is intentionally a migration-only repair path; runtime
    // allocation still uses the atomic sequence table, never COUNT()+1.
    if (queryRunner.connection.options.type === 'postgres') {
      const hasLegacyPublicId = await queryRunner.hasColumn('dispatch.rider', 'publicId');
      await queryRunner.query(`
        WITH pending AS (
          SELECT
            id,
            COALESCE(EXTRACT(YEAR FROM "approvedAt")::int, EXTRACT(YEAR FROM "createdAt")::int, EXTRACT(YEAR FROM now())::int) AS approval_year,
            ROW_NUMBER() OVER (
              PARTITION BY COALESCE(EXTRACT(YEAR FROM "approvedAt")::int, EXTRACT(YEAR FROM "createdAt")::int, EXTRACT(YEAR FROM now())::int)
              ORDER BY "createdAt", id
            ) AS ordinal
          FROM dispatch.rider
          WHERE verified = true AND "riderIdentifier" IS NULL
        ), offsets AS (
          SELECT
            approval_year,
            COALESCE((
              SELECT seq FROM dispatch.rider_identifier_sequence s
              WHERE s."cityCode" = 'CC' AND s."approvalYear" = pending.approval_year
            ), 0) AS offset_seq
          FROM pending
          GROUP BY approval_year
        ), assigned AS (
          SELECT pending.id, pending.approval_year, (pending.ordinal + offsets.offset_seq)::int AS sequence_number
          FROM pending
          JOIN offsets ON offsets.approval_year = pending.approval_year
        )
        UPDATE dispatch.rider r
        SET
          "cityId" = 'cape-coast',
          "cityCode" = 'CC',
          "approvalYear" = assigned.approval_year,
          "sequenceNumber" = assigned.sequence_number,
          "riderIdentifier" = 'YDR-CC-' || assigned.approval_year::text || '-' || LPAD(assigned.sequence_number::text, 4, '0'),
          "approvedAt" = COALESCE(r."approvedAt", r."createdAt", now()),
          "identifierStatus" = 'ACTIVE'
        FROM assigned
        WHERE r.id = assigned.id
      `);

      await queryRunner.query(`
        INSERT INTO dispatch.rider_identifier_sequence ("cityCode", "approvalYear", seq)
        SELECT "cityCode", "approvalYear", MAX("sequenceNumber")
        FROM dispatch.rider
        WHERE "cityCode" IS NOT NULL AND "approvalYear" IS NOT NULL AND "sequenceNumber" IS NOT NULL
        GROUP BY "cityCode", "approvalYear"
        ON CONFLICT ("cityCode", "approvalYear") DO UPDATE SET seq = GREATEST(dispatch.rider_identifier_sequence.seq, EXCLUDED.seq)
      `);

      await queryRunner.query(`
        INSERT INTO dispatch.rider_identifier_audit (
          id, "riderId", "eventType", identifier, "previousIdentifier", "cityId", "cityCode",
          "approvalYear", "sequenceNumber", reason, "actorId", "actorRole", "approvalReference", "metadataJson", "createdAt"
        )
        SELECT
          uuid_generate_v4(),
          id,
          'CREATED',
          "riderIdentifier",
          ${hasLegacyPublicId ? '"publicId"' : 'NULL'},
          "cityId",
          "cityCode",
          "approvalYear",
          "sequenceNumber",
          'Backfilled during Rider ID structure migration',
          'migration',
          'system',
          'migration:1789300000000',
          ${hasLegacyPublicId ? `json_build_object('source', 'migration', 'legacyPublicId', "publicId")::text` : `json_build_object('source', 'migration')::text`},
          now()
        FROM dispatch.rider
        WHERE "riderIdentifier" IS NOT NULL
      `);

      if (hasLegacyPublicId) {
        await queryRunner.dropColumn('dispatch.rider', 'publicId');
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('dispatch.rider') && !(await queryRunner.hasColumn('dispatch.rider', 'publicId'))) {
      await queryRunner.addColumn('dispatch.rider', new TableColumn({ name: 'publicId', type: 'varchar', isNullable: true }));
    }
    await queryRunner.dropTable('dispatch.rider_identifier_audit', true);
    await queryRunner.dropTable('dispatch.rider_identifier_sequence', true);
    await this.dropIndexIfPresent(queryRunner, 'dispatch.rider', 'UQ_dispatch_rider_city_year_sequence');
    await this.dropIndexIfPresent(queryRunner, 'dispatch.rider', 'UQ_dispatch_rider_identifier');
    await this.dropColumns(queryRunner, 'dispatch.rider', [
      'identifierStatus',
      'approvedAt',
      'sequenceNumber',
      'approvalYear',
      'cityCode',
      'cityId',
      'riderIdentifier',
    ]);
  }

  private async addColumns(queryRunner: QueryRunner, tablePath: string, columns: TableColumn[]): Promise<void> {
    if (!(await queryRunner.hasTable(tablePath))) return;
    for (const column of columns) {
      if (!(await queryRunner.hasColumn(tablePath, column.name))) {
        await queryRunner.addColumn(tablePath, column);
      }
    }
  }

  private async dropColumns(queryRunner: QueryRunner, tablePath: string, columnNames: string[]): Promise<void> {
    if (!(await queryRunner.hasTable(tablePath))) return;
    for (const name of columnNames) {
      if (await queryRunner.hasColumn(tablePath, name)) {
        await queryRunner.dropColumn(tablePath, name);
      }
    }
  }

  private async createIndexIfMissing(queryRunner: QueryRunner, tablePath: string, index: TableIndex): Promise<void> {
    const table = await queryRunner.getTable(tablePath);
    if (table && !table.indices.some((existing) => existing.name === index.name)) {
      await queryRunner.createIndex(tablePath, index);
    }
  }

  private async dropIndexIfPresent(queryRunner: QueryRunner, tablePath: string, indexName: string): Promise<void> {
    const table = await queryRunner.getTable(tablePath);
    if (table?.indices.some((index) => index.name === indexName)) {
      await queryRunner.dropIndex(tablePath, indexName);
    }
  }
}
