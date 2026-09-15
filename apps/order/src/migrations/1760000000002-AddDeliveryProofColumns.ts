import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/** Adds private delivery-proof object metadata to the existing order table. */
export class AddDeliveryProofColumns1760000000002 implements MigrationInterface {
  name = 'AddDeliveryProofColumns1760000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order';
    if (!(await queryRunner.hasTable(tablePath))) {
      throw new Error(`Cannot add delivery-proof columns: ${tablePath} does not exist`);
    }

    if (!(await queryRunner.hasColumn(tablePath, 'deliveryProofKey'))) {
      await queryRunner.addColumn(
        tablePath,
        new TableColumn({
          name: 'deliveryProofKey',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }

    if (!(await queryRunner.hasColumn(tablePath, 'deliveryProofContentType'))) {
      await queryRunner.addColumn(
        tablePath,
        new TableColumn({
          name: 'deliveryProofContentType',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tablePath = 'order.order';
    if (!(await queryRunner.hasTable(tablePath))) return;
    if (await queryRunner.hasColumn(tablePath, 'deliveryProofContentType')) {
      await queryRunner.dropColumn(tablePath, 'deliveryProofContentType');
    }
    if (await queryRunner.hasColumn(tablePath, 'deliveryProofKey')) {
      await queryRunner.dropColumn(tablePath, 'deliveryProofKey');
    }
  }
}
