/** Central env access + validation. Services import loadEnv() and read typed values. */
/**
 * Is `ip` an acceptable webhook source? Normalises the IPv4-mapped IPv6 form that Node
 * reports for IPv4 peers on a dual-stack socket (`::ffff:52.31.139.75`), which the old
 * inline check only handled for loopback — a real Paystack delivery arriving over IPv6
 * transport would have been rejected despite being on the allowlist.
 */
export declare function isAllowedWebhookIp(ip: string | undefined, allowed: string[]): boolean;
/**
 * Fetch secrets from AWS Secrets Manager and inject them into process.env.
 * Only runs when USE_SECRETS_MANAGER=true to allow transparent adoption.
 * All keys in the secret JSON blob override (or supplement) what's in .env.
 */
export declare function hydrateSecretsManager(): Promise<void>;
/** Load cwd/.env (and parents) into process.env without overwriting real env. */
export declare function hydrateDotenv(): void;
export interface OreEnv {
    nodeEnv: string;
    logLevel: string;
    dbType: 'postgres' | 'sqlite';
    databaseUrl: string;
    redisUrl: string;
    natsUrl: string;
    /**
     * NATS credentials (audit S-1). The broker ran wide open — an anonymous client connected,
     * enumerated all 92 consumers via the monitoring port and published a forged money event
     * that the ledger and order services accepted. Set NATS_USER/NATS_PASS everywhere and run
     * the broker with `--user/--pass` (see docker-compose.yml); leave empty only for a
     * credential-less local dev broker.
     */
    natsUser: string;
    natsPass: string;
    orchestration: 'inprocess' | 'distributed';
    jwtSecret: string;
    /**
     * Access-token lifetime (JWT_EXPIRES_IN). Default 15m (audit L-2 — was 7d).
     *
     * Access tokens are bearer secrets with no revocation path; a 7-day lifetime turned one
     * captured token into a week of full account access. All first-party clients (admin panel
     * proxy, Flutter apps) already implement silent refresh against the 30-day refresh token,
     * so the short lifetime costs nothing but a few refresh calls.
     */
    jwtExpiresIn: string;
    otpTtlMin: number;
    otpLog: boolean;
    smsProvider: 'log' | 'twilio' | 'hubtel';
    voiceProvider: 'log' | 'twilio';
    twilioAccountSid: string;
    twilioAuthToken: string;
    twilioApiKeySid: string;
    twilioApiSecret: string;
    twilioTwimlAppSid: string;
    twilioVoiceWebhookUrl: string;
    /** Twilio number used as caller id (SMS from-number; voice support-forward callerId). */
    twilioFromNumber: string;
    /**
     * Push Credential SIDs (CR…) registered in the Twilio console, one per platform.
     * Android needs an FCM v1 credential (legacy server keys were killed by Google in 2024);
     * iOS needs an APNs VoIP Services credential. Without them incoming in-app calls only
     * ring while the app is in the foreground, so a rider with the app backgrounded misses
     * every customer call.
     */
    twilioPushCredAndroid: string;
    twilioPushCredIos: string;
    /** Public support line shown in the apps. Replaces the numbers hardcoded per client. */
    supportPhone: string;
    /** Record support calls (dual channel) after announcing consent. Never order calls. */
    voiceRecordSupport: boolean;
    hubtelClientId: string;
    hubtelClientSecret: string;
    hubtelFrom: string;
    hubtelBaseUrl: string;
    storageDriver: 'local' | 'r2';
    storageLocalDir: string;
    r2AccountId: string;
    r2AccessKeyId: string;
    r2SecretAccessKey: string;
    r2Bucket: string;
    r2PublicBaseUrl: string;
    paystackSecretKey: string;
    paystackPublicKey: string;
    paystackBaseUrl: string;
    paystackMode: 'mock' | 'live';
    paystackCurrency: string;
    paystackRefPrefix: string;
    /**
     * Source IPs allowed to POST the Paystack webhook, plus CIDR-free prefixes that are
     * always permitted (loopback and RFC1918, for in-cluster and health-check traffic).
     *
     * Configurable rather than hardcoded (audit M-1): the list was an inline array read
     * alongside a direct `process.env.PAYSTACK_MODE` check, which (a) bypassed loadEnv's
     * validation and (b) coupled the allowlist to payment *mode* — running in mock mode
     * silently disabled source-IP checking entirely. Paystack rotates these addresses and
     * publishes the current set; an operator must be able to update them without a deploy.
     */
    paystackWebhookAllowedIps: string[];
    /**
     * Fastify `trustProxy` setting, as `TRUST_PROXY`.
     *
     * Empty (the default) means OFF: `req.ip` is the socket peer and an `X-Forwarded-For`
     * header is ignored. That is the safe posture when the service is directly reachable.
     *
     * Set it to your ingress/load-balancer CIDR list (`10.0.0.0/8,172.16.0.0/12`) in
     * production so `req.ip` reflects the true client without letting the client choose it.
     * Setting it to `true` trusts the leftmost XFF hop, which any caller can forge — only
     * acceptable on a staging tunnel, and only because the webhook HMAC remains the actual
     * control and the IP allowlist is defence in depth.
     */
    trustProxy: boolean | string[];
    geocoderMode: 'mock' | 'live';
    /**
     * GEOCODER_OSM_FALLBACK (default: true). Whether `LiveGeocoder.google()` may fall back to
     * OpenStreetMap Nominatim when the Google lookup fails or the key is missing. Audit S-10:
     * the fallback existed but was silent and mislabelled — results were reported as
     * `source: GOOGLE_MAPS` no matter who actually answered. With the flag ON the fallback is
     * allowed but results now report `source: OPENSTREETMAP` and log an error in production
     * (Nominatim's ToS is 1 req/s and no heavy production use — it is a safety net, not a
     * substitute). Set it to `false` to make a Google failure a hard geocoding error instead.
     */
    geocoderOsmFallback: boolean;
    googleMapsApiKey: string;
    googleMapsBaseUrl: string;
    what3wordsApiKey: string;
    what3wordsBaseUrl: string;
    ghanaGpsApiKey: string;
    ghanaGpsBaseUrl: string;
    fcmServiceAccountPath: string;
    fcmMode: 'log' | 'firebase';
    resendApiKey: string;
    emailFrom: string;
    emailProvider: 'log' | 'resend';
    /**
     * Promotional send policy. Ghana is GMT+0 year-round (no DST), so these are UTC hours and
     * are compared against getUTCHours() — a timezone conversion here would be a conversion to
     * nowhere. Configurable so an operator in another market is not stuck with Accra's night,
     * and so the deferral path can be exercised without waiting for 22:00.
     */
    marketingQuietStartHour: number;
    marketingQuietEndHour: number;
    marketingFrequencyCap: number;
    marketingFrequencyWindowDays: number;
    riderWithdrawMinPesewas: number;
    riderWithdrawDailyCapPesewas: number;
    riderWithdrawFeePesewas: number;
    riderWithdrawFreePerDay: number;
    riderClearHours: number;
    riderClearCheckIntervalMin: number;
    codRemitTriggerPct: number;
    codUnblockPct: number;
    codTierNewLimitPesewas: number;
    codTierExperiencedLimitPesewas: number;
    codTierSeniorLimitPesewas: number;
    riderTierExperiencedDeliveries: number;
    riderTierSeniorDeliveries: number;
    codEscalateCheckIntervalMin: number;
    codEscalateWarningH: number;
    codEscalateSuspendH: number;
    codEscalateInvestigateH: number;
    codEscalateTerminateH: number;
    errandFeePesewas: number;
    errandTierNewLimitPesewas: number;
    errandTierVerifiedLimitPesewas: number;
    errandTierTrustedLimitPesewas: number;
    errandTierCapLimitPesewas: number;
    errandTierVerifiedDeliveries: number;
    errandTierTrustedDeliveries: number;
    errandTierCapDeliveries: number;
    referralMinOrderPesewas: number;
    referralReferrerCreditPesewas: number;
    referralRefereeCreditPesewas: number;
    referralCreditExpiryDays: number;
    referralMonthlyCap: number;
    referralVelocityMin: number;
    riderMilestone25Deliveries: number;
    riderMilestone50Deliveries: number;
    riderMilestone25Pesewas: number;
    riderMilestone50Pesewas: number;
    vendorBonusAfterOrders: number;
    vendorBonusPesewas: number;
    premiumCommissionDiscountPct: number;
    storyTtlHours: number;
    slaLateAcceptSec: number;
    slaReadyEarlyMin: number;
    slaPenaltyLateAccepts: number;
    slaPenaltyFinancialPesewas: number;
    vendorMinSettlementPesewas: number;
    vendorDailyCapPesewas: number;
    vendorReservePct: number;
    vendorSettleDay: number;
    vendorSettleCheckIntervalMin: number;
    internalServiceKey: string;
    /**
     * Optional per-service allowlist of internal callers (INTERNAL_CALLERS=order,ledger).
     * When non-empty, a service's internal API only accepts calls whose x-ore-service
     * header is in the list — per-pair control on top of the shared key (F-SEC-1).
     */
    internalCallerAllowlist: string[];
    /**
     * Whether the legacy plaintext `x-ore-internal-key` header is still accepted.
     *
     * Defaults OFF (audit S-3): the MAC scheme exists so the shared key never crosses the wire,
     * and while the fallback is accepted that benefit is nil — the plaintext key is still sent,
     * still sufficient, and has no replay protection, no body binding, and no authenticated
     * service identity (which the INTERNAL_CALLERS allowlist relies on). Set
     * INTERNAL_LEGACY_KEY=on ONLY during a rolling deploy from a pre-MAC build; production
     * refuses to boot with it on. `AuthGuard` warns whenever the legacy path fires.
     */
    internalLegacyKeyAccepted: boolean;
    adminEmail: string;
    adminPassword: string;
    adminTotpSecret: string;
    /**
     * HMAC-SHA256 key for event-envelope signing (audit S-1). Defaults to
     * INTERNAL_SERVICE_KEY so a deployment cannot forget to set it and silently run
     * unsigned; set ORE_BUS_SIGNING_KEY to a separate secret to rotate bus signing
     * independently of HTTP internal auth.
     */
    busSigningKey: string;
    dispatchPoolRadiusKm: number;
    dispatchExpandStepKm: number;
    dispatchMaxRadiusKm: number;
    dispatchWaveSize: number;
    riderOfferWindowSec: number;
    riderDeclineCooldownAfter: number;
    riderCooldownMin: number;
    dispatchGrouping: boolean;
    groupJoinWindowMs: number;
    groupMaxVendors: number;
    groupVendorDistanceKm: number;
    batchMaxOrders: number;
    batchVendorDistanceKm: number;
    batchDropDistanceKm: number;
    multiVendorGroupingThresholdMin: number;
    dispatchRouteMaxExtraKm: number;
    dispatchExcludeTimeouts: boolean;
    dispatchScoringWeightsJson: string;
    defaultRiderLocationId: string;
    riderDefaultSessionMin: number;
    riderBlockMinMin: number;
    riderBlockMaxMin: number;
    riderBlockMaxDaysAhead: number;
    riderBlockMaxOpen: number;
    riderBlockGraceMin: number;
    peakPayWindowsJson: string;
    riderDemandMaxDistanceKm: number;
    riderDemandMaxZones: number;
    riderDemandZonesJson: string;
    riderDemandCellKm: number;
    riderOnTimeTargetMin: number;
    parcelServiceFeePesewas: number;
    /** Minutes of slack added to vendor prep time when quoting a delivery window (audit M-2). */
    packingBufferMin: number;
    vendorAcceptSlaSec: number;
    vendorAutoCancelSec: number;
    /** Base URL for gift-confirm links texted to recipients. Was silently polluted by an inline comment. */
    giftBaseUrl: string;
    telegramBotToken: string;
    telegramWebhookSecret: string;
    telegramWebhookUrl: string;
    rateLimitMax: number;
    rateLimitWindow: string;
    /**
     * Boot-time snapshot of the hydrated environment (audit M-2). A few helpers — notably
     * `feePolicyFromEnv()` in @ore/contracts — take a raw string record, and @ore/config
     * must not import contracts (dependency direction). Callers pass `env.rawEnv` to such
     * helpers instead of reaching for `process.env`, so money math is derived from the same
     * hydrated boot snapshot (dotenv loaded, inline comments stripped) and not from a
     * mutable global that any module can poke at runtime.
     */
    rawEnv: Readonly<Record<string, string | undefined>>;
    servicePort(name: string): number;
}
/**
 * The COD escalation ladder: warning → suspension → investigation → termination.
 *
 * Split out and validated because the stages were independent numbers that happened to be
 * ordered. `codEscalationStep` tests them as `> terminateH` before `>= investigateH`, so when
 * both read 72 the INVESTIGATION stage lasted an instant: at 72.0 h a rider was under
 * investigation, and one tick later they were terminated. The code default did exactly that.
 * Production only escaped it because `.env` set 73 — meaning the entire investigation window,
 * for a process the policy describes as offline and manual, was one hour, and any deployment
 * that forgot the variable terminated riders with no investigation at all.
 *
 * The default is now derived from the investigation threshold rather than restated, so the two
 * cannot drift apart again, and the ordering is asserted at load so a future edit fails at boot
 * instead of quietly skipping a stage.
 */
export declare function codEscalationLadder(env: NodeJS.ProcessEnv): {
    codEscalateWarningH: number;
    codEscalateSuspendH: number;
    codEscalateInvestigateH: number;
    codEscalateTerminateH: number;
};
export declare function loadEnv(env?: Record<string, string | undefined>): OreEnv;
/** CORS origin for Nest `enableCors`. Production requires `CORS_ORIGINS` (comma-separated). */
export declare function corsOrigin(env?: Record<string, string | undefined>): boolean | string[];
//# sourceMappingURL=env.d.ts.map