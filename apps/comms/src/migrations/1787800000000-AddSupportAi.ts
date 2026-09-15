import { MigrationInterface, QueryRunner, TableColumn, Table, TableIndex } from 'typeorm';

/**
 * Support AI: thread lifecycle + escalation audit.
 *
 * A support thread now has an explicit owner of the conversation. That matters because
 * "the AI is talking" and "a human is talking" must be mutually exclusive states — if
 * both can reply the customer gets two voices, and if an admin takes over the AI must
 * stop immediately rather than on its next turn.
 *
 * `support_escalation` is append-only for the same reason the ledger is: when a customer
 * complains that they were bounced around, the record of who escalated what and why is
 * the only defence. No updates, no deletes.
 */
export class AddSupportAi1787800000000 implements MigrationInterface {
  name = 'AddSupportAi1787800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    const isSqlite = driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs';
    // sqlite spells it `datetime`; Postgres has no such type and fails the whole migration.
    // Matches what the entities declare (`@CreateDateColumn` / `Date` → `timestamp`).
    const tsType = isSqlite ? 'datetime' : 'timestamp';

    if (!isSqlite) {
      await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "comms"`);
    }

    const has = async (table: string, column: string): Promise<boolean> => {
      const rows = await queryRunner.query(
        isSqlite
          ? `PRAGMA table_info("${table}")`
          : `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
        isSqlite ? [] : [table, column],
      );
      return isSqlite
        ? (rows as Array<{ name: string }>).some((r) => r.name === column)
        : (rows as unknown[]).length > 0;
    };

    // status: AI_HANDLING | AI_OFFERED_HUMAN | QUEUED_FOR_HUMAN | HUMAN_ACTIVE | RESOLVED
    if (!(await has('comms_thread', 'status'))) {
      await queryRunner.addColumn(
        'comms_thread',
        new TableColumn({ name: 'status', type: 'varchar', default: "'AI_HANDLING'" }),
      );
    }
    if (!(await has('comms_thread', 'assignedToUserId'))) {
      await queryRunner.addColumn(
        'comms_thread',
        new TableColumn({ name: 'assignedToUserId', type: 'varchar', isNullable: true }),
      );
    }
    if (!(await has('comms_thread', 'escalationReason'))) {
      await queryRunner.addColumn(
        'comms_thread',
        new TableColumn({ name: 'escalationReason', type: 'varchar', isNullable: true }),
      );
    }
    if (!(await has('comms_thread', 'escalationTeam'))) {
      await queryRunner.addColumn(
        'comms_thread',
        new TableColumn({ name: 'escalationTeam', type: 'varchar', isNullable: true }),
      );
    }
    if (!(await has('comms_thread', 'lastAiAt'))) {
      await queryRunner.addColumn(
        'comms_thread',
        new TableColumn({ name: 'lastAiAt', type: tsType, isNullable: true }),
      );
    }
    if (!(await has('comms_thread', 'lastHumanAt'))) {
      await queryRunner.addColumn(
        'comms_thread',
        new TableColumn({ name: 'lastHumanAt', type: tsType, isNullable: true }),
      );
    }

    await queryRunner.createTable(
      new Table({
        name: 'support_escalation',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true, isGenerated: true, generationStrategy: 'uuid' },
          { name: 'threadId', type: 'varchar' },
          { name: 'reason', type: 'varchar' },
          { name: 'summary', type: 'text', isNullable: true },
          { name: 'team', type: 'varchar', default: "'general'" },
          // 'AI' when the assistant escalated itself; otherwise the admin's user id.
          { name: 'actor', type: 'varchar' },
          { name: 'fromStatus', type: 'varchar', isNullable: true },
          { name: 'toStatus', type: 'varchar' },
          { name: 'createdAt', type: tsType, default: isSqlite ? "datetime('now')" : 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'support_escalation',
      new TableIndex({ name: 'idx_support_escalation_thread', columnNames: ['threadId', 'createdAt'] }),
    );

    // Every AI tool call, with arguments. This is how an admin sees WHY the assistant
    // said what it said, and how a bad answer gets traced back to a bad lookup.
    await queryRunner.createTable(
      new Table({
        name: 'support_tool_audit',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true, isGenerated: true, generationStrategy: 'uuid' },
          { name: 'threadId', type: 'varchar' },
          { name: 'tool', type: 'varchar' },
          { name: 'argsJson', type: 'text', isNullable: true },
          { name: 'outcome', type: 'varchar', isNullable: true },
          { name: 'model', type: 'varchar', isNullable: true },
          { name: 'promptTokens', type: 'int', default: 0 },
          { name: 'completionTokens', type: 'int', default: 0 },
          { name: 'createdAt', type: tsType, default: isSqlite ? "datetime('now')" : 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'support_tool_audit',
      new TableIndex({ name: 'idx_support_tool_audit_thread', columnNames: ['threadId', 'createdAt'] }),
    );

    // The escalation queue an admin works from.
    await queryRunner.createIndex(
      'comms_thread',
      new TableIndex({ name: 'idx_comms_thread_support_queue', columnNames: ['status', 'updatedAt'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('comms_thread', 'idx_comms_thread_support_queue').catch(() => undefined);
    await queryRunner.dropTable('support_tool_audit', true).catch(() => undefined);
    await queryRunner.dropTable('support_escalation', true).catch(() => undefined);
    for (const col of ['lastHumanAt', 'lastAiAt', 'escalationTeam', 'escalationReason', 'assignedToUserId', 'status']) {
      await queryRunner.dropColumn('comms_thread', col).catch(() => undefined);
    }
  }
}
