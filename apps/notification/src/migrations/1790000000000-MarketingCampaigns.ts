import { MigrationInterface, QueryRunner } from 'typeorm';

export class MarketingCampaigns1790000000000 implements MigrationInterface {
  name = 'MarketingCampaigns1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "notification"."campaign" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'DRAFT', "titleTemplate" character varying NOT NULL, "bodyTemplate" text NOT NULL, "dataJson" text, "audienceRule" text NOT NULL, "scheduledAt" TIMESTAMP, "createdByUserId" character varying, "approvedByUserId" character varying, "targetCount" integer NOT NULL DEFAULT '0', "sentCount" integer NOT NULL DEFAULT '0', "failCount" integer NOT NULL DEFAULT '0', "openCount" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_campaign_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "notification"."notification_template" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "titleTemplate" character varying NOT NULL, "bodyTemplate" text NOT NULL, "dataJson" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_template_id" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notification"."notification_template"`);
    await queryRunner.query(`DROP TABLE "notification"."campaign"`);
  }
}
