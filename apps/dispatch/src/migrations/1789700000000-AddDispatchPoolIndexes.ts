import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Index the dispatch pool query.
 *
 * `buildPool` loaded every AVAILABLE rider on the platform and rejected them one at a time in
 * application code, so a dispatch in Accra paid for riders in Kumasi. It now filters to a
 * lat/lng bounding box in SQL, which needs an index to be worth anything.
 *
 * `(status, lat, lng)` rather than PostGIS: a box query is two `BETWEEN`s on ordinary columns, it
 * behaves identically on SQLite in tests, and it needs no extension. `status` leads because it is
 * by far the most selective — most riders are not available at any given moment. If the fleet
 * ever outgrows this, the upgrade is a `geography(Point)` column with a GiST index, and the
 * bounding-box call site is the only thing that has to change.
 *
 * Also indexes the assignment lookup that used to run once per candidate rider and now runs once
 * per pool.
 */
export class AddDispatchPoolIndexes1789700000000 implements MigrationInterface {
  name = 'AddDispatchPoolIndexes1789700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isSqlite = this.isSqlite(queryRunner);
    const rider = isSqlite ? `"rider"` : `"dispatch"."rider"`;
    const assignment = isSqlite ? `"assignment"` : `"dispatch"."assignment"`;

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_dispatch_rider_pool" ON ${rider} ("status", "lat", "lng")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_dispatch_assignment_rider_status" ON ${assignment} ("riderId", "status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_dispatch_assignment_order_status" ON ${assignment} ("orderId", "status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isSqlite = this.isSqlite(queryRunner);
    const prefix = isSqlite ? '' : '"dispatch".';
    for (const name of ['IDX_dispatch_rider_pool', 'IDX_dispatch_assignment_rider_status', 'IDX_dispatch_assignment_order_status']) {
      await queryRunner.query(`DROP INDEX IF EXISTS ${prefix}"${name}"`);
    }
  }

  private isSqlite(queryRunner: QueryRunner): boolean {
    const driver = queryRunner.connection.options.type;
    return driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs';
  }
}
