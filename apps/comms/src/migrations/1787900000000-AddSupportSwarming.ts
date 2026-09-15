import { MigrationInterface, QueryRunner, Table, TableColumn, TableIndex } from 'typeorm';

/**
 * Swarming support: participants, ownership, and internal notes.
 *
 * Ownership is a thread field, not a participant field, on purpose — inviting a specialist
 * must never transfer ownership or the customer loses their single point of contact.
 */
export class AddSupportSwarming1787900000000 implements MigrationInterface {
  name = 'AddSupportSwarming1787900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    const isSqlite = driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs';
    // sqlite spells it `datetime`; Postgres has no such type and fails the whole migration.
    // Matches what the entities declare (`@CreateDateColumn` / `Date` → `timestamp`).
    const tsType = isSqlite ? 'datetime' : 'timestamp';
    if (!isSqlite) await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "comms"`);

    const has = async (table: string, column: string): Promise<boolean> => {
      const rows = await queryRunner.query(
        isSqlite ? `PRAGMA table_info("${table}")` : `SELECT column_name FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`,
        isSqlite ? [] : [table, column],
      );
      return isSqlite
        ? (rows as Array<{ name: string }>).some((r) => r.name === column)
        : (rows as unknown[]).length > 0;
    };

    if (!(await has('comms_thread', 'ownerAdminUserId'))) {
      await queryRunner.addColumn('comms_thread', new TableColumn({ name: 'ownerAdminUserId', type: 'varchar', isNullable: true }));
    }
    if (!(await has('comms_thread', 'flaggedTeams'))) {
      await queryRunner.addColumn('comms_thread', new TableColumn({ name: 'flaggedTeams', type: 'varchar', isNullable: true }));
    }
    if (!(await has('comms_message', 'visibility'))) {
      await queryRunner.addColumn('comms_message', new TableColumn({ name: 'visibility', type: 'varchar', default: "'customer'" }));
    }

    await queryRunner.createTable(
      new Table({
        name: 'support_participant',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true, isGenerated: true, generationStrategy: 'uuid' },
          { name: 'threadId', type: 'varchar' },
          { name: 'userId', type: 'varchar' },
          { name: 'adminRole', type: 'varchar', isNullable: true },
          { name: 'invitedBy', type: 'varchar', isNullable: true },
          { name: 'joinedAt', type: tsType, default: isSqlite ? "datetime('now')" : 'now()' },
          { name: 'leftAt', type: tsType, isNullable: true },
        ],
      }),
      true,
    );
    await queryRunner.createIndex('support_participant', new TableIndex({
      name: 'uq_support_participant_thread_user', columnNames: ['threadId', 'userId'], isUnique: true,
    }));
    await queryRunner.createIndex('support_participant', new TableIndex({
      name: 'idx_support_participant_user', columnNames: ['userId', 'leftAt'],
    }));
    // The queue a support rep works from.
    await queryRunner.createIndex('comms_thread', new TableIndex({
      name: 'idx_comms_thread_owner_status', columnNames: ['ownerAdminUserId', 'status'],
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('comms_thread', 'idx_comms_thread_owner_status').catch(() => undefined);
    await queryRunner.dropTable('support_participant', true).catch(() => undefined);
    for (const c of ['visibility']) await queryRunner.dropColumn('comms_message', c).catch(() => undefined);
    for (const c of ['flaggedTeams', 'ownerAdminUserId']) await queryRunner.dropColumn('comms_thread', c).catch(() => undefined);
  }
}
