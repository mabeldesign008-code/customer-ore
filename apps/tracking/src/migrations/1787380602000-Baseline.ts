import { MigrationInterface, QueryRunner } from 'typeorm';

export class Baseline1787380602000 implements MigrationInterface {
  name = 'Baseline1787380602000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "tracking"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Baseline rollback intentionally no-op (drop schema only if empty).
  }
}
