import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeliveryPartnerTaxProfiles1789500000002 implements MigrationInterface {
  name = 'AddDeliveryPartnerTaxProfiles1789500000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    const isSqlite = driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs';
    const schema = 'dispatch';
    if (!isSqlite) await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);

    const q = (name: string) => (isSqlite ? `"${name}"` : `"${schema}"."${name}"`);
    const timestamp = isSqlite ? 'datetime' : 'timestamp';
    const pk = isSqlite ? 'varchar PRIMARY KEY' : 'uuid PRIMARY KEY DEFAULT uuid_generate_v4()';

    const hasTable = async (name: string): Promise<boolean> => {
      const rows = await queryRunner.query(
        isSqlite
          ? `SELECT name FROM sqlite_master WHERE type='table' AND name='${name}'`
          : `SELECT table_name FROM information_schema.tables WHERE table_schema='${schema}' AND table_name='${name}'`,
      );
      return (rows as unknown[]).length > 0;
    };
    const hasIndex = async (name: string): Promise<boolean> => {
      const rows = await queryRunner.query(
        isSqlite
          ? `SELECT name FROM sqlite_master WHERE type='index' AND name='${name}'`
          : `SELECT indexname FROM pg_indexes WHERE schemaname='${schema}' AND indexname='${name}'`,
      );
      return (rows as unknown[]).length > 0;
    };
    const hasColumn = async (table: string, column: string): Promise<boolean> => {
      const rows = await queryRunner.query(
        isSqlite
          ? `PRAGMA table_info("${table}")`
          : `SELECT column_name AS name FROM information_schema.columns WHERE table_schema='${schema}' AND table_name='${table}'`,
      ) as { name: string }[];
      return rows.some((row) => row.name === column);
    };

    if (await hasTable('rider')) {
      if (!(await hasColumn('rider', 'deliveryPartnerId'))) await queryRunner.query(`ALTER TABLE ${q('rider')} ADD COLUMN "deliveryPartnerId" varchar`);
      if (!(await hasColumn('rider', 'deliveryPartnerType'))) await queryRunner.query(`ALTER TABLE ${q('rider')} ADD COLUMN "deliveryPartnerType" varchar NOT NULL DEFAULT 'INDEPENDENT_DELIVERY_PARTNER'`);
      if (!(await hasColumn('rider', 'fleetPartnerId'))) await queryRunner.query(`ALTER TABLE ${q('rider')} ADD COLUMN "fleetPartnerId" varchar`);
      if (!(await hasColumn('rider', 'contractType'))) await queryRunner.query(`ALTER TABLE ${q('rider')} ADD COLUMN "contractType" varchar NOT NULL DEFAULT 'INDEPENDENT_DELIVERY_PARTNER'`);
      if (!(await hasColumn('rider', 'settlementMethod'))) await queryRunner.query(`ALTER TABLE ${q('rider')} ADD COLUMN "settlementMethod" varchar NOT NULL DEFAULT 'PAYSTACK_TRANSFER'`);
      if (!(await hasColumn('rider', 'residentStatus'))) await queryRunner.query(`ALTER TABLE ${q('rider')} ADD COLUMN "residentStatus" varchar NOT NULL DEFAULT 'UNKNOWN'`);
    }

    if (!(await hasTable('delivery_partner_profile'))) {
      await queryRunner.query(`
        CREATE TABLE ${q('delivery_partner_profile')} (
          "id" ${pk},
          "type" varchar NOT NULL,
          "userId" varchar,
          "fleetPartnerId" varchar,
          "vehicle" varchar,
          "zoneId" varchar,
          "settlementMethod" varchar NOT NULL DEFAULT 'PAYSTACK_TRANSFER',
          "contractType" varchar NOT NULL DEFAULT 'INDEPENDENT_DELIVERY_PARTNER',
          "residentStatus" varchar NOT NULL DEFAULT 'UNKNOWN',
          "status" varchar NOT NULL DEFAULT 'ACTIVE',
          "taxProfileJson" text,
          "createdAt" ${timestamp} NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" ${timestamp} NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    if (!(await hasTable('fleet_partner'))) {
      await queryRunner.query(`
        CREATE TABLE ${q('fleet_partner')} (
          "id" ${pk},
          "name" varchar NOT NULL,
          "contractType" varchar NOT NULL DEFAULT 'FLEET_DELIVERY_PARTNER',
          "residentStatus" varchar NOT NULL DEFAULT 'UNKNOWN',
          "settlementMethod" varchar NOT NULL DEFAULT 'PAYSTACK_TRANSFER',
          "status" varchar NOT NULL DEFAULT 'ACTIVE',
          "taxProfileJson" text,
          "createdAt" ${timestamp} NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" ${timestamp} NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    const indexes: Array<[string, string]> = [
      ['IDX_delivery_partner_profile_user', `CREATE INDEX "IDX_delivery_partner_profile_user" ON ${q('delivery_partner_profile')} ("userId")`],
      ['IDX_delivery_partner_profile_fleet', `CREATE INDEX "IDX_delivery_partner_profile_fleet" ON ${q('delivery_partner_profile')} ("fleetPartnerId")`],
      ['IDX_fleet_partner_name', `CREATE INDEX "IDX_fleet_partner_name" ON ${q('fleet_partner')} ("name")`],
    ];
    for (const [name, sql] of indexes) {
      if (!(await hasIndex(name))) await queryRunner.query(sql);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    const isSqlite = driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs';
    const q = (name: string) => (isSqlite ? `"${name}"` : `"dispatch"."${name}"`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${q('fleet_partner')}`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${q('delivery_partner_profile')}`);
  }
}
