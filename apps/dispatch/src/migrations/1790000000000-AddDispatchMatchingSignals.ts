import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Two measurements the matching system was making decisions without.
 *
 * `rider.offerCount` — the denominator for acceptance rate. Scoring used raw lifetime decline
 * and timeout counts clamped at 20, which measured tenure as much as behaviour: a rider with 500
 * deliveries and 20 declines scored exactly as badly as one with 20 and 20, and past the clamp
 * every long-serving rider looked identical, where the signal stopped distinguishing anyone.
 *
 * `assignment.pickedUpAt` — the one interior timestamp of a delivery. Without it the system knew
 * when an order was placed and when it arrived and nothing between, so a slow delivery could not
 * be attributed to the kitchen, the road, or a rider waiting at the counter.
 */
export class AddDispatchMatchingSignals1790000000000 implements MigrationInterface {
  name = 'AddDispatchMatchingSignals1790000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const riders = 'dispatch.rider';
    if ((await queryRunner.hasTable(riders)) && !(await queryRunner.hasColumn(riders, 'offerCount'))) {
      await queryRunner.addColumn(riders, new TableColumn({ name: 'offerCount', type: 'int', default: 0 }));
      // Backfill so existing riders are not read as having refused every offer they ever got.
      // `acceptanceProbability` floors the denominator at the refusal count for exactly this
      // case, but seeding it here means the estimate is right from the first offer rather than
      // relying on that fallback.
      await queryRunner.query(
        `UPDATE "dispatch"."rider" SET "offerCount" = COALESCE("declineCount", 0) + COALESCE("timeoutCount", 0) + COALESCE("completedDeliveries", 0)`,
      );
    }

    const assignments = 'dispatch.assignment';
    if ((await queryRunner.hasTable(assignments)) && !(await queryRunner.hasColumn(assignments, 'pickedUpAt'))) {
      // Deliberately not backfilled. There is no record of when past pickups happened, and
      // inventing one — say, splitting the difference between assignment and completion — would
      // produce leg statistics that look measured and are not.
      await queryRunner.addColumn(
        assignments,
        new TableColumn({ name: 'pickedUpAt', type: 'timestamp', isNullable: true }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const riders = 'dispatch.rider';
    if ((await queryRunner.hasTable(riders)) && (await queryRunner.hasColumn(riders, 'offerCount'))) {
      await queryRunner.dropColumn(riders, 'offerCount');
    }
    const assignments = 'dispatch.assignment';
    if ((await queryRunner.hasTable(assignments)) && (await queryRunner.hasColumn(assignments, 'pickedUpAt'))) {
      await queryRunner.dropColumn(assignments, 'pickedUpAt');
    }
  }
}
