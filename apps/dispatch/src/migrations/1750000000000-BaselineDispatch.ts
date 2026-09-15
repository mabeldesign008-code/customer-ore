/**
 * Baseline schema for the `dispatch` service, generated from its entity definitions.
 *
 * Production runs with `synchronize: false`, so migrations are the only thing that builds a
 * database — but this service's chain began by altering tables that nothing had created. A
 * fresh deploy failed at boot. Dev and test never caught it because they use
 * `synchronize: true` and skip migrations entirely.
 *
 * Every statement is guarded, so this is a no-op against a database that already has the
 * objects: safe to apply to an existing deployment as well as a new one.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class BaselineDispatch1750000000000 implements MigrationInterface {
  name = 'BaselineDispatch1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const driver = queryRunner.connection.options.type;
    if (driver === 'better-sqlite3' || driver === 'sqlite' || driver === 'sqljs') return; // sqlite dev uses synchronize

    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS "dispatch"');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    const statements: string[] = [
      "CREATE TABLE \"dispatch\".\"rider\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"userId\" character varying NOT NULL, \"name\" character varying NOT NULL, \"phone\" character varying NOT NULL, \"vehicle\" character varying NOT NULL DEFAULT 'MOTORBIKE', \"licensePlate\" character varying, \"status\" character varying NOT NULL DEFAULT 'OFFLINE', \"lat\" double precision, \"lng\" double precision, \"verified\" boolean NOT NULL DEFAULT false, \"riderIdentifier\" character varying, \"cityId\" character varying, \"deliveryPartnerId\" character varying, \"deliveryPartnerType\" character varying NOT NULL DEFAULT 'INDEPENDENT_DELIVERY_PARTNER', \"fleetPartnerId\" character varying, \"contractType\" character varying NOT NULL DEFAULT 'INDEPENDENT_DELIVERY_PARTNER', \"settlementMethod\" character varying NOT NULL DEFAULT 'PAYSTACK_TRANSFER', \"residentStatus\" character varying NOT NULL DEFAULT 'UNKNOWN', \"cityCode\" character varying, \"approvalYear\" integer, \"sequenceNumber\" integer, \"approvedAt\" TIMESTAMP, \"identifierStatus\" character varying NOT NULL DEFAULT 'UNASSIGNED', \"codBlocked\" boolean NOT NULL DEFAULT false, \"codBlockReason\" character varying, \"codTier\" character varying NOT NULL DEFAULT 'NEW', \"codStatus\" character varying NOT NULL DEFAULT 'CLEAR', \"completedDeliveries\" integer NOT NULL DEFAULT '0', \"errandTrustTier\" character varying NOT NULL DEFAULT 'NEW', \"completedErrands\" integer NOT NULL DEFAULT '0', \"rating\" double precision NOT NULL DEFAULT '5', \"reliabilityScore\" double precision NOT NULL DEFAULT '1', \"offerCount\" integer NOT NULL DEFAULT '0', \"declineCount\" integer NOT NULL DEFAULT '0', \"timeoutCount\" integer NOT NULL DEFAULT '0', \"cancellationCount\" integer NOT NULL DEFAULT '0', \"restrictedUntil\" TIMESTAMP, \"restrictionReason\" character varying, \"cooldownUntil\" TIMESTAMP, \"lastJobAt\" TIMESTAMP, \"idleSince\" TIMESTAMP, \"pausedUntil\" TIMESTAMP, \"sessionEndsAt\" TIMESTAMP, \"maxCodLimitPesewas\" integer NOT NULL DEFAULT '0', \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_1ed6540e613592e2a470a162ef1\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_dispatch_rider_pool\" ON \"dispatch\".\"rider\" (\"status\", \"lat\", \"lng\") ",
      "CREATE UNIQUE INDEX \"UQ_dispatch_rider_city_year_sequence\" ON \"dispatch\".\"rider\" (\"cityCode\", \"approvalYear\", \"sequenceNumber\") ",
      "CREATE UNIQUE INDEX \"UQ_dispatch_rider_identifier\" ON \"dispatch\".\"rider\" (\"riderIdentifier\") ",
      "CREATE TABLE \"dispatch\".\"offer\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"orderId\" character varying NOT NULL, \"batchId\" character varying, \"riderId\" character varying NOT NULL, \"vendorId\" character varying NOT NULL, \"status\" character varying NOT NULL DEFAULT 'PENDING', \"expiresAt\" TIMESTAMP NOT NULL, \"attempt\" integer NOT NULL DEFAULT '0', \"riderFeePesewas\" integer NOT NULL DEFAULT '0', \"peakPayPesewas\" integer NOT NULL DEFAULT '0', \"pickupDistanceKm\" double precision NOT NULL DEFAULT '0', \"deliveryDistanceKm\" double precision NOT NULL DEFAULT '0', \"score\" double precision NOT NULL DEFAULT '0', \"validationJson\" text, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_57c6ae1abe49201919ef68de900\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_9eead00c8eb6453cb9b406777a\" ON \"dispatch\".\"offer\" (\"orderId\", \"status\") ",
      "CREATE TABLE \"dispatch\".\"assignment\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"orderId\" character varying NOT NULL, \"riderId\" character varying NOT NULL, \"offerId\" character varying, \"batchId\" character varying, \"pickupDistanceKm\" double precision NOT NULL DEFAULT '0', \"score\" double precision NOT NULL DEFAULT '0', \"source\" character varying NOT NULL DEFAULT 'competitive_wave', \"riderFeePesewas\" integer NOT NULL DEFAULT '0', \"peakPayPesewas\" integer NOT NULL DEFAULT '0', \"earningsPostedAt\" TIMESTAMP, \"validationJson\" text, \"status\" character varying NOT NULL DEFAULT 'ACTIVE', \"assignedAt\" TIMESTAMP NOT NULL DEFAULT now(), \"pickedUpAt\" TIMESTAMP, \"completedAt\" TIMESTAMP, CONSTRAINT \"PK_43c2f5a3859f54cedafb270f37e\" PRIMARY KEY (\"id\"))",
      "CREATE UNIQUE INDEX \"assignment_active_order\" ON \"dispatch\".\"assignment\" (\"orderId\") WHERE \"status\" = 'ACTIVE'",
      "CREATE TABLE \"dispatch\".\"dispatch_audit\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"orderId\" character varying NOT NULL, \"riderId\" character varying, \"eventType\" character varying NOT NULL, \"detailJson\" text, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_1fe63e269f7ad4bf952c0578480\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_6447e257bdf21b61596b5e29a0\" ON \"dispatch\".\"dispatch_audit\" (\"orderId\") ",
      "CREATE TABLE \"dispatch\".\"offer_exclusion\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"orderId\" character varying NOT NULL, \"riderId\" character varying NOT NULL, \"reason\" character varying NOT NULL, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_f901fe601d48f3ca08339e7c7ac\" PRIMARY KEY (\"id\"))",
      "CREATE UNIQUE INDEX \"IDX_051f094686abbd82f5d10a241e\" ON \"dispatch\".\"offer_exclusion\" (\"orderId\", \"riderId\") ",
      "CREATE TABLE \"dispatch\".\"batch\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"type\" character varying NOT NULL, \"riderId\" character varying, \"status\" character varying NOT NULL DEFAULT 'PENDING', \"orderIds\" text NOT NULL, \"pickupOrder\" text NOT NULL, \"dropOrder\" text NOT NULL, \"totalRiderFeePesewas\" integer NOT NULL DEFAULT '0', \"codExposurePesewas\" integer NOT NULL DEFAULT '0', \"feeByOrderJson\" text, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_57da3b830b57bec1fd329dcaf43\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_e904630f8da6a593789ada69b5\" ON \"dispatch\".\"batch\" (\"riderId\", \"status\") ",
      "CREATE TABLE \"dispatch\".\"rider_incident\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"riderId\" character varying NOT NULL, \"orderId\" character varying, \"type\" character varying NOT NULL, \"note\" text, \"lat\" double precision, \"lng\" double precision, \"status\" character varying NOT NULL DEFAULT 'OPEN', \"severity\" character varying NOT NULL DEFAULT 'LOW', \"attribution\" character varying NOT NULL DEFAULT 'UNKNOWN', \"excludedFromPerformance\" boolean NOT NULL DEFAULT false, \"exclusionReason\" text, \"performanceImpact\" boolean NOT NULL DEFAULT true, \"reviewerId\" character varying, \"reviewedAt\" TIMESTAMP, \"outcome\" character varying, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_c614733948730950d0fa2021771\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_499ff2b4913358fd3721d40bcf\" ON \"dispatch\".\"rider_incident\" (\"riderId\", \"createdAt\") ",
      "CREATE TABLE \"dispatch\".\"rider_block\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"riderId\" character varying NOT NULL, \"startsAt\" TIMESTAMP NOT NULL, \"endsAt\" TIMESTAMP NOT NULL, \"status\" character varying NOT NULL DEFAULT 'SCHEDULED', \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_ba6eeae1370230e7005cf2a1b1d\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_a88e9bbf997e68fad20006e690\" ON \"dispatch\".\"rider_block\" (\"riderId\", \"startsAt\") ",
      "CREATE TABLE \"dispatch\".\"rider_identifier_sequence\" (\"cityCode\" character varying NOT NULL, \"approvalYear\" integer NOT NULL, \"seq\" integer NOT NULL DEFAULT '0', CONSTRAINT \"PK_39e5b7523a6aba398208f7234d7\" PRIMARY KEY (\"cityCode\", \"approvalYear\"))",
      "CREATE TABLE \"dispatch\".\"rider_identifier_audit\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"riderId\" character varying NOT NULL, \"eventType\" character varying NOT NULL, \"identifier\" character varying NOT NULL, \"previousIdentifier\" character varying, \"cityId\" character varying, \"cityCode\" character varying, \"approvalYear\" integer, \"sequenceNumber\" integer, \"previousCityId\" character varying, \"previousCityCode\" character varying, \"previousApprovalYear\" integer, \"previousSequenceNumber\" integer, \"reason\" text NOT NULL, \"actorId\" character varying NOT NULL, \"actorRole\" character varying, \"approvalReference\" character varying, \"metadataJson\" text, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_43e35037b9bbd730ad9de4c29a0\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_5599655e3d234835f84f4a5e7e\" ON \"dispatch\".\"rider_identifier_audit\" (\"previousIdentifier\") ",
      "CREATE INDEX \"IDX_721b94f83a0a81f7d2e2b48995\" ON \"dispatch\".\"rider_identifier_audit\" (\"identifier\") ",
      "CREATE INDEX \"IDX_6af2502623010e41e242df2332\" ON \"dispatch\".\"rider_identifier_audit\" (\"riderId\") ",
      "CREATE TABLE \"dispatch\".\"rider_performance_config\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"name\" character varying NOT NULL, \"version\" integer NOT NULL, \"reviewPeriod\" character varying NOT NULL DEFAULT 'MONTHLY', \"active\" boolean NOT NULL DEFAULT true, \"configJson\" text NOT NULL, \"createdBy\" character varying NOT NULL, \"approvedBy\" character varying, \"notes\" text, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_84c00308a524e52fd528eca8c8a\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_d36170ffa3b7ed39874a919c9c\" ON \"dispatch\".\"rider_performance_config\" (\"active\", \"createdAt\") ",
      "CREATE TABLE \"dispatch\".\"rider_performance_record\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"riderId\" character varying NOT NULL, \"periodStart\" TIMESTAMP NOT NULL, \"periodEnd\" TIMESTAMP NOT NULL, \"configVersion\" integer NOT NULL, \"configId\" character varying, \"reviewerId\" character varying, \"overallScore\" double precision, \"grade\" character varying, \"status\" character varying NOT NULL, \"trend\" character varying NOT NULL, \"insufficientData\" boolean NOT NULL DEFAULT false, \"resultJson\" text NOT NULL, \"metricCategories\" text, \"incidentTypes\" text, \"actionCodes\" text, \"outcome\" character varying, \"recordType\" character varying NOT NULL DEFAULT 'REVIEW', \"linkedRecordId\" character varying, \"notes\" text, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_377e683e49017962c0ff51cc2b7\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_580e3fe429a90beb9d8c2797f5\" ON \"dispatch\".\"rider_performance_record\" (\"outcome\", \"createdAt\") ",
      "CREATE INDEX \"IDX_4f22097e2dea45ab0afa647045\" ON \"dispatch\".\"rider_performance_record\" (\"reviewerId\", \"createdAt\") ",
      "CREATE INDEX \"IDX_abf31dcf5be50b064078853e64\" ON \"dispatch\".\"rider_performance_record\" (\"status\", \"createdAt\") ",
      "CREATE INDEX \"IDX_0d50a950631612f78005c8d8f1\" ON \"dispatch\".\"rider_performance_record\" (\"riderId\", \"periodStart\", \"periodEnd\") ",
      "CREATE TABLE \"dispatch\".\"rider_performance_audit\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"riderId\" character varying, \"action\" character varying NOT NULL, \"actorId\" character varying NOT NULL, \"recordId\" character varying, \"payloadJson\" text, \"reason\" text, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_9c9004a9ccfa047f8721dfa6580\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_81f7371c17983cbf786c4c95b7\" ON \"dispatch\".\"rider_performance_audit\" (\"riderId\", \"createdAt\") ",
      "CREATE TABLE \"dispatch\".\"delivery_partner_profile\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"type\" character varying NOT NULL, \"userId\" character varying, \"fleetPartnerId\" character varying, \"vehicle\" character varying, \"zoneId\" character varying, \"settlementMethod\" character varying NOT NULL DEFAULT 'PAYSTACK_TRANSFER', \"contractType\" character varying NOT NULL DEFAULT 'INDEPENDENT_DELIVERY_PARTNER', \"residentStatus\" character varying NOT NULL DEFAULT 'UNKNOWN', \"status\" character varying NOT NULL DEFAULT 'ACTIVE', \"taxProfileJson\" text, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_bdc67d5dadfafdeb723700bfc5f\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_e6fa84272e07cbff6e6545ae26\" ON \"dispatch\".\"delivery_partner_profile\" (\"fleetPartnerId\") ",
      "CREATE INDEX \"IDX_479a88890a9981449bf63035a3\" ON \"dispatch\".\"delivery_partner_profile\" (\"userId\") ",
      "CREATE TABLE \"dispatch\".\"fleet_partner\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"name\" character varying NOT NULL, \"contractType\" character varying NOT NULL DEFAULT 'FLEET_DELIVERY_PARTNER', \"residentStatus\" character varying NOT NULL DEFAULT 'UNKNOWN', \"settlementMethod\" character varying NOT NULL DEFAULT 'PAYSTACK_TRANSFER', \"status\" character varying NOT NULL DEFAULT 'ACTIVE', \"taxProfileJson\" text, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_46deea0846bf1c5f871cb940025\" PRIMARY KEY (\"id\"))",
      "CREATE INDEX \"IDX_12c255b96562d019da32e0a24d\" ON \"dispatch\".\"fleet_partner\" (\"name\") ",
    ];

    for (const sql of statements) {
      try {
        await queryRunner.query(sql);
      } catch (err) {
        // Already present (existing deployment) — the object this statement creates is exactly
        // what a later migration or an earlier deploy already produced. Anything else rethrows.
        const msg = (err as Error).message;
        if (!/already exists/i.test(msg)) throw err;
      }
    }
  }

  public async down(): Promise<void> {
    // Intentionally empty: dropping a service's entire schema is never what a rollback wants.
  }
}
