import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Voice call-detail records (in-app calling rollout, 2026-09-11).
 *
 * One row per call attempt — created BEFORE Twilio is involved so calls that never
 * connect are still evidenced. Twilio status callbacks and client-reported fallback
 * events update the row; the tel: fallback handoff happens on the device, so without
 * the client events the CDR would claim nothing happened.
 *
 * Raw guarded statements, matching BaselineComms: TypeORM's Table builder mishandles
 * the varchar/uuid generated-PK combination on this version (syntax error at "NOT"),
 * and the raw style keeps fresh-deploy and existing-deploy both safe.
 */
export class AddVoiceCalls1789200000000 implements MigrationInterface {
  name = 'AddVoiceCalls1789200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    if (driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs') return; // sqlite dev uses synchronize

    const statements: string[] = [
      'CREATE SCHEMA IF NOT EXISTS "comms"',
      'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"',
      `CREATE TABLE "comms"."voice_call" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "callId" character varying NOT NULL,
        "kind" character varying NOT NULL,
        "orderId" character varying,
        "callerUserId" character varying NOT NULL,
        "callerRole" character varying NOT NULL,
        "targetUserId" character varying,
        "target" character varying,
        "provider" character varying NOT NULL,
        "platform" character varying,
        "status" character varying NOT NULL DEFAULT 'initiated',
        "fallbackUsed" boolean NOT NULL DEFAULT false,
        "fallbackEvents" text,
        "twilioCallSid" character varying,
        "recordingUrl" text,
        "topic" character varying,
        "lastError" character varying,
        "startedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "answeredAt" TIMESTAMP,
        "endedAt" TIMESTAMP,
        "durationSec" integer,
        CONSTRAINT "PK_voice_call_id" PRIMARY KEY ("id")
      )`,
      'CREATE UNIQUE INDEX "UQ_voice_call_callId" ON "comms"."voice_call" ("callId")',
      'CREATE INDEX "IDX_voice_call_caller_started" ON "comms"."voice_call" ("callerUserId", "startedAt")',
      'CREATE INDEX "IDX_voice_call_status" ON "comms"."voice_call" ("status")',
      'CREATE INDEX "IDX_voice_call_sid" ON "comms"."voice_call" ("twilioCallSid")',
    ];

    for (const sql of statements) {
      try {
        await queryRunner.query(sql);
      } catch (err) {
        // Already present (existing deployment) — safe to re-apply. Anything else rethrows.
        const msg = (err as Error).message;
        if (!/already exists/i.test(msg)) throw err;
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    if (driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs') return;
    await queryRunner.query('DROP TABLE IF EXISTS "comms"."voice_call"');
  }
}
