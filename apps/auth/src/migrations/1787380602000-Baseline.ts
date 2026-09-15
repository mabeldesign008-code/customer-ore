import { MigrationInterface, QueryRunner } from 'typeorm';

export class Baseline1787380602000 implements MigrationInterface {
  name = 'Baseline1787380602000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "auth"`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "auth"."id_counter" (key character varying NOT NULL, seq integer NOT NULL, CONSTRAINT "PK_id_counter" PRIMARY KEY ("key"))`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "auth"."user" (id uuid NOT NULL, phone character varying NOT NULL, role character varying NOT NULL, roles text NOT NULL, name character varying, email character varying, passwordHash character varying, totpSecret character varying, deviceToken character varying, deviceFingerprint character varying, verified boolean NOT NULL, publicId character varying, createdAt timestamp without time zone NOT NULL, updatedAt timestamp without time zone NOT NULL, CONSTRAINT "PK_user" PRIMARY KEY ("id"))`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Baseline rollback intentionally no-op (drop schema only if empty).
  }
}
