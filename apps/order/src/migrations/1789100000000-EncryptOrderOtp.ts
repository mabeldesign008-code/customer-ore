import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Replace plaintext delivery OTPs with AES-256-GCM ciphertext at rest.
 *
 *  - Adds `otpCipher` (text) to order.order.
 *  - Backfills it from legacy plaintext rows, encrypted with the same scheme the
 *    service uses (OTP_ENC_KEY ?? JWT_SECRET, sha256 → AES-256-GCM, iv.tag.ct base64).
 *  - Drops the legacy `otpPlain` column.
 *
 * Reversible: `down` re-adds `otpPlain` (nullable — the plaintext is gone from the
 * ciphertext once decrypted only by the service, so a full downgrade cannot restore it).
 */
export class EncryptOrderOtp1789100000000 implements MigrationInterface {
  name = 'EncryptOrderOtp1789100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order';
    if (!(await queryRunner.hasTable(tablePath))) return;

    if (!(await queryRunner.hasColumn(tablePath, 'otpCipher'))) {
      await queryRunner.addColumn(
        tablePath,
        new TableColumn({ name: 'otpCipher', type: 'text', isNullable: true }),
      );
    }

    // Backfill legacy plaintext rows using the same derivation as OrderService.
    if (await queryRunner.hasColumn(tablePath, 'otpPlain')) {
      const secret = (process.env.OTP_ENC_KEY ?? process.env.JWT_SECRET ?? 'ore-otp-key').trim();
      const driver = queryRunner.connection.options.type as string;
      const isPg = driver === 'postgres';
      // Inline encryption in SQL is not portable; instead read legacy rows and rewrite.
      const rows = (await queryRunner.query(
        `SELECT id, "otpPlain" FROM ${tablePath} WHERE "otpPlain" IS NOT NULL AND "otpCipher" IS NULL`,
      )) as { id: string; otpPlain: string }[];

      const { createCipheriv, createHash, randomBytes } = await import('crypto');
      const key = createHash('sha256').update(secret).digest();
      const enc = (plain: string): string => {
        const iv = randomBytes(12);
        const cipher = createCipheriv('aes-256-gcm', key, iv);
        const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
        return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${ct.toString('base64')}`;
      };

      for (const row of rows) {
        await queryRunner.query(
          isPg
            ? `UPDATE ${tablePath} SET "otpCipher" = $1 WHERE id = $2`
            : `UPDATE ${tablePath} SET "otpCipher" = ? WHERE id = ?`,
          [enc(String(row.otpPlain)), row.id],
        );
      }

      await queryRunner.dropColumn(tablePath, 'otpPlain');
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order';
    if (!(await queryRunner.hasTable(tablePath))) return;
    if (!(await queryRunner.hasColumn(tablePath, 'otpPlain'))) {
      await queryRunner.addColumn(
        tablePath,
        new TableColumn({ name: 'otpPlain', type: 'varchar', isNullable: true }),
      );
    }
    // The plaintext is not recoverable from the ciphertext here — a downgrade keeps
    // otpPlain NULL and the service falls back to ciphertext-only reads.
  }
}
