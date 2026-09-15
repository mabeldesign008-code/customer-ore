/** Central env access + validation. Services import loadEnv() and read typed values. */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { SERVICE_PORTS } from './urls';

const REQUIRED_GLOBAL = ['JWT_SECRET'];
const DEV_INTERNAL_KEY = 'ore-dev-internal-key-change-me';

/**
 * Paystack's published webhook source addresses, plus loopback so local and in-cluster
 * callers keep working. Override with PAYSTACK_WEBHOOK_IPS (comma-separated) — Paystack
 * rotates these and the list must be updatable without a code deploy.
 */
const DEFAULT_PAYSTACK_WEBHOOK_IPS = [
  '52.31.139.75',
  '52.49.173.169',
  '52.214.14.220',
  '127.0.0.1',
  '::1',
  '::ffff:127.0.0.1',
];

/**
 * Prefixes always treated as internal: loopback and RFC1918 (container/pod networks).
 * Loopback belongs here, not only in DEFAULT_PAYSTACK_WEBHOOK_IPS: once an operator sets
 * PAYSTACK_WEBHOOK_IPS to Paystack's addresses only (the documented production setup), the
 * default list no longer applies — and in-cluster deliveries (mock completion, the payment
 * sweeper, service-to-service webhook replays over the compose network's 127.x/10.x hops)
 * must still be accepted. Audit M-1 review.
 */
const INTERNAL_IP_PREFIXES = ['127.', '10.', '192.168.', '172.', '::1', '::ffff:127.', '::ffff:10.', '::ffff:192.168.', '::ffff:172.'];

/** Parse a comma-separated IP list, falling back to `dflt` when unset or blank. */
function ipList(raw: string | undefined, dflt: string[]): string[] {
  const parsed = (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parsed.length ? parsed : dflt;
}

/**
 * Parse TRUST_PROXY. Empty/absent → false (off, the safe default). `true` → trust all
 * hops (staging tunnels only; forgeable). Anything else → a CIDR/IP allowlist.
 */
function parseTrustProxy(raw: string | undefined): boolean | string[] {
  const v = (raw ?? '').trim();
  if (!v) return false;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * Is `ip` an acceptable webhook source? Normalises the IPv4-mapped IPv6 form that Node
 * reports for IPv4 peers on a dual-stack socket (`::ffff:52.31.139.75`), which the old
 * inline check only handled for loopback — a real Paystack delivery arriving over IPv6
 * transport would have been rejected despite being on the allowlist.
 */
export function isAllowedWebhookIp(ip: string | undefined, allowed: string[]): boolean {
  if (!ip) return false;
  const bare = ip.replace(/^::ffff:/, '');
  if (allowed.includes(ip) || allowed.includes(bare)) return true;
  return INTERNAL_IP_PREFIXES.some((p) => ip.startsWith(p));
}

/**
 * Fetch secrets from AWS Secrets Manager and inject them into process.env.
 * Only runs when USE_SECRETS_MANAGER=true to allow transparent adoption.
 * All keys in the secret JSON blob override (or supplement) what's in .env.
 */
export async function hydrateSecretsManager(): Promise<void> {
  if (process.env.USE_SECRETS_MANAGER !== 'true') return;

  const secretId = process.env.SECRETS_MANAGER_SECRET_ID ?? 'ore-delivery/production';
  const region = process.env.AWS_REGION ?? 'us-east-1';

  try {
    // Lazy import so the SDK is only loaded when actually needed.
    const { SecretsManagerClient, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
    const client = new SecretsManagerClient({ region });
    const response = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
    const raw = response.SecretString;
    if (!raw) throw new Error('SecretString is empty');
    const parsed = JSON.parse(raw) as Record<string, string>;
    for (const [key, value] of Object.entries(parsed)) {
      // Always override so vault is the source of truth in production.
      process.env[key] = value;
    }
    console.log(`[SecretsManager] Loaded ${Object.keys(parsed).length} secrets from "${secretId}"`);
  } catch (err) {
    // Fatal — if secrets manager was requested but failed, abort startup.
    console.error('[SecretsManager] FATAL: Could not fetch secrets:', err);
    process.exit(1);
  }
}

/** Load cwd/.env (and parents) into process.env without overwriting real env. */
export function hydrateDotenv(): void {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../.env'),
    resolve(process.cwd(), '../../.env'),
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    for (const raw of readFileSync(file, 'utf8').split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      } else {
        // Strip inline comments from UNQUOTED values (audit S-6/C-4). `dotenv` semantics:
        // a `#` preceded by whitespace starts a comment. Before this, `PORT=4100 # payment`
        // parsed as the literal "4100 # payment" → Number() = NaN → silent fallback to the
        // code default, and `GIFT_BASE_URL=http://x # comment` texted broken links to real
        // customers. ~40 variables in the shipped .env were polluted this way. Quoted values
        // keep their `#` — wrap secrets containing one in quotes.
        const hash = value.search(/\s#/);
        if (hash >= 0) value = value.slice(0, hash).trimEnd();
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
    break;
  }
}

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
  // transactional + campaign email
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
  // wallet / rider money (doc §5)
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
  // errands (doc §Errands)
  errandFeePesewas: number;
  errandTierNewLimitPesewas: number;
  errandTierVerifiedLimitPesewas: number;
  errandTierTrustedLimitPesewas: number;
  errandTierCapLimitPesewas: number;
  errandTierVerifiedDeliveries: number;
  errandTierTrustedDeliveries: number;
  errandTierCapDeliveries: number;
  // referral (doc §8)
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
  // vendor plans / stories / penalties (doc §4)
  premiumCommissionDiscountPct: number;
  storyTtlHours: number;
  slaLateAcceptSec: number;
  slaReadyEarlyMin: number;
  slaPenaltyLateAccepts: number;
  slaPenaltyFinancialPesewas: number;
  // vendor settlement (doc §4)
  vendorMinSettlementPesewas: number;
  vendorDailyCapPesewas: number;
  vendorReservePct: number;
  vendorSettleDay: number; // 1 = Monday
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
  // ── dispatch knobs (doc §2B–2E). Migrated from raw process.env reads (audit M-2) so
  // they get type coercion, loud NaN failure, and inline-comment stripping like everything
  // else. Several of these were reported "dead config" (audit M-3/H-8) only because the
  // scan looked for typed fields — they were being read here all along, untyped. ──
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
  // ── order-service knobs (audit M-2) ──
  parcelServiceFeePesewas: number;
  /** Minutes of slack added to vendor prep time when quoting a delivery window (audit M-2). */
  packingBufferMin: number;
  vendorAcceptSlaSec: number;
  vendorAutoCancelSec: number;
  // ── notification / comms (audit M-2, M-3) ──
  /** Base URL for gift-confirm links texted to recipients. Was silently polluted by an inline comment. */
  giftBaseUrl: string;
  telegramBotToken: string;
  telegramWebhookSecret: string;
  telegramWebhookUrl: string;
  // ── gateway edge rate limit (audit M-2) ──
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
export function codEscalationLadder(env: NodeJS.ProcessEnv): {
  codEscalateWarningH: number;
  codEscalateSuspendH: number;
  codEscalateInvestigateH: number;
  codEscalateTerminateH: number;
} {
  const warningH = num(env.COD_ESCALATE_WARNING_H, 24);
  const suspendH = num(env.COD_ESCALATE_SUSPEND_H, 48);
  const investigateH = num(env.COD_ESCALATE_INVESTIGATE_H, 72);
  // 24 h of investigation, not the 1 h the old `.env` allowed. How long the window should be is
  // a policy decision; that there must *be* one is not.
  const terminateH = num(env.COD_ESCALATE_TERMINATE_H, investigateH + 24);

  const ladder: Array<[string, number]> = [
    ['COD_ESCALATE_WARNING_H', warningH],
    ['COD_ESCALATE_SUSPEND_H', suspendH],
    ['COD_ESCALATE_INVESTIGATE_H', investigateH],
    ['COD_ESCALATE_TERMINATE_H', terminateH],
  ];
  for (let i = 1; i < ladder.length; i++) {
    const [prevName, prev] = ladder[i - 1];
    const [name, value] = ladder[i];
    if (!(value > prev)) {
      throw new Error(
        `COD escalation ladder must strictly increase: ${name}=${value} must be greater than ${prevName}=${prev}. ` +
          'Equal thresholds silently skip a stage — riders would be terminated without ever being investigated.',
      );
    }
  }

  return {
    codEscalateWarningH: warningH,
    codEscalateSuspendH: suspendH,
    codEscalateInvestigateH: investigateH,
    codEscalateTerminateH: terminateH,
  };
}

export function loadEnv(env: Record<string, string | undefined> = process.env): OreEnv {
  if (env === process.env) hydrateDotenv();
  for (const k of REQUIRED_GLOBAL) {
    if (!env[k]) throw new Error(`Missing required env var: ${k}`);
  }
  const nodeEnv = env.NODE_ENV ?? 'development';
  const internalServiceKey = env.INTERNAL_SERVICE_KEY?.trim() || (nodeEnv === 'production' ? '' : DEV_INTERNAL_KEY);
  if (!internalServiceKey || (nodeEnv === 'production' && internalServiceKey === DEV_INTERNAL_KEY)) {
    throw new Error('Missing required env var: INTERNAL_SERVICE_KEY');
  }

  /**
   * Payment mode, defaulting the safe way round and refusing to run mock in production.
   *
   * This used to be `?? 'mock'`. In mock mode `PaymentService.initialize()` grants the charge
   * immediately without any money moving, so an unset or misspelled `PAYSTACK_MODE` — a k8s
   * configmap typo, a new region, a `.env` that was not copied — meant every prepaid order in
   * production was paid for free, silently, with a SUCCESS row in the payments table to match.
   *
   * The default now follows the environment, and production refuses to boot in mock mode at all.
   * That is the same shape as the `INTERNAL_SERVICE_KEY` check above: a misconfiguration that
   * gives things away for free should stop the process, not degrade quietly. `mockComplete` was
   * already guarded this way, which is what makes the gap an oversight rather than a decision.
   */
  const paystackMode = (env.PAYSTACK_MODE?.trim() as 'mock' | 'live' | undefined)
    ?? (nodeEnv === 'production' ? 'live' : 'mock');
  if (nodeEnv === 'production' && paystackMode !== 'live') {
    throw new Error(
      `PAYSTACK_MODE must be "live" in production (got "${paystackMode}"). ` +
        'Mock mode marks every prepaid charge successful without taking payment.',
    );
  }

  /**
   * Legacy plaintext internal key — OFF by default, and production refuses to boot with it
   * on (audit S-3).
   *
   * It used to default ON: the MAC scheme (x-ore-internal-mac) exists precisely so the shared
   * INTERNAL_SERVICE_KEY never crosses the wire, but with the fallback accepted by default the
   * plaintext key was still sent AND still sufficient — one capture (proxy log, sidecar, crash
   * dump) granted permanent, replayable, body-unbound access to every internal API in the
   * cluster, including money-out. Worse, on the legacy path the INTERNAL_CALLERS allowlist
   * trusts x-ore-service, which the MAC is what authenticates — an attacker with the plaintext
   * key could name any service.
   *
   * Every current caller uses internalFetch(), which always sends the MAC, so nothing in-tree
   * needs the fallback. Set INTERNAL_LEGACY_KEY=on explicitly ONLY during a rolling deploy
   * from a pre-MAC build, and never in production.
   */
  const legacyKeyRequested = ['on', 'true', '1', 'yes'].includes((env.INTERNAL_LEGACY_KEY ?? '').trim().toLowerCase());
  if (nodeEnv === 'production' && legacyKeyRequested) {
    throw new Error(
      'INTERNAL_LEGACY_KEY must be off in production: the plaintext key fallback has no replay ' +
        'protection, no body binding, and defeats the INTERNAL_CALLERS allowlist. Remove the ' +
        'variable (or set it to "off") and deploy the MAC-authenticated build.',
    );
  }
  const ore: OreEnv = {
    nodeEnv,
    logLevel: env.LOG_LEVEL ?? 'info',
    dbType: (env.DB_TYPE as 'postgres' | 'sqlite') ?? 'postgres',
    databaseUrl: env.DATABASE_URL ?? 'postgres://ore:ore@localhost:5432/oredelivery',
    redisUrl: env.REDIS_URL ?? '',
    natsUrl: env.NATS_URL ?? 'nats://localhost:4222',
    natsUser: env.NATS_USER?.trim() ?? '',
    natsPass: env.NATS_PASS ?? '',
    orchestration: (env.ORCHESTRATION as 'inprocess' | 'distributed') ?? 'distributed',
    jwtSecret: env.JWT_SECRET ?? '',
    jwtExpiresIn: env.JWT_EXPIRES_IN ?? '15m',
    otpTtlMin: num(env.AUTH_OTP_TTL_MIN, 10),
    otpLog: env.AUTH_OTP_LOG === 'true' && nodeEnv !== 'production',
    smsProvider: (env.SMS_PROVIDER as 'log' | 'twilio' | 'hubtel') ?? 'log',
    voiceProvider: (env.VOICE_PROVIDER as 'log' | 'twilio') ?? 'log',
    twilioAccountSid: env.TWILIO_ACCOUNT_SID ?? '',
    twilioAuthToken: env.TWILIO_AUTH_TOKEN ?? '',
    twilioApiKeySid: env.TWILIO_API_KEY ?? env.TWILIO_API_KEY_SID ?? '',
    twilioApiSecret: env.TWILIO_API_SECRET ?? '',
    twilioTwimlAppSid: env.TWILIO_TWIML_APP_SID ?? '',
    twilioVoiceWebhookUrl: env.TWILIO_VOICE_WEBHOOK_URL ?? '',
    twilioFromNumber: (env.TWILIO_FROM_NUMBER ?? '').trim(),
    twilioPushCredAndroid: env.TWILIO_PUSH_CRED_ANDROID ?? '',
    twilioPushCredIos: env.TWILIO_PUSH_CRED_IOS ?? '',
    supportPhone: (env.SUPPORT_PHONE ?? '').trim(),
    voiceRecordSupport: env.VOICE_RECORD_SUPPORT !== 'false',
    hubtelClientId: env.HUBTEL_CLIENT_ID ?? '',
    hubtelClientSecret: env.HUBTEL_CLIENT_SECRET ?? '',
    hubtelFrom: env.HUBTEL_FROM ?? 'ore',
    hubtelBaseUrl: env.HUBTEL_BASE_URL ?? 'https://smsc.hubtel.com',
    storageDriver: (env.STORAGE_DRIVER as 'local' | 'r2') ?? 'local',
    storageLocalDir: env.STORAGE_LOCAL_DIR ?? './.storage',
    r2AccountId: env.R2_ACCOUNT_ID ?? '',
    r2AccessKeyId: env.R2_ACCESS_KEY_ID ?? '',
    r2SecretAccessKey: env.R2_SECRET_ACCESS_KEY ?? '',
    r2Bucket: env.R2_BUCKET ?? '',
    r2PublicBaseUrl: env.R2_PUBLIC_BASE_URL ?? '',
    paystackSecretKey: env.PAYSTACK_SECRET_KEY ?? '',
    paystackPublicKey: env.PAYSTACK_PUBLIC_KEY ?? '',
    paystackBaseUrl: env.PAYSTACK_BASE_URL ?? 'https://api.paystack.co',
    paystackMode,
    paystackCurrency: env.PAYSTACK_CURRENCY ?? 'GHS',
    paystackRefPrefix: env.PAYSTACK_REF_PREFIX ?? 'ore-cc',
    paystackWebhookAllowedIps: ipList(env.PAYSTACK_WEBHOOK_IPS, DEFAULT_PAYSTACK_WEBHOOK_IPS),
    trustProxy: parseTrustProxy(env.TRUST_PROXY),
    geocoderMode: (env.GEOCODER_MODE as 'mock' | 'live') ?? 'mock',
    geocoderOsmFallback: env.GEOCODER_OSM_FALLBACK !== 'false',
    googleMapsApiKey: env.GOOGLE_MAPS_API_KEY ?? '',
    googleMapsBaseUrl: env.GOOGLE_MAPS_BASE_URL ?? 'https://maps.googleapis.com/maps/api',
    what3wordsApiKey: env.WHAT3WORDS_API_KEY ?? '',
    what3wordsBaseUrl: env.WHAT3WORDS_BASE_URL ?? 'https://api.what3words.com/v3',
    ghanaGpsApiKey: env.GHANA_GPS_API_KEY ?? '',
    ghanaGpsBaseUrl: env.GHANA_GPS_BASE_URL ?? 'https://api.ghanapostgps.com',
    fcmServiceAccountPath: env.FCM_SERVICE_ACCOUNT_PATH ?? '',
    fcmMode: (env.FCM_MODE as 'log' | 'firebase') ?? 'log',
    // Email. Without a key we log rather than throw: a campaign must be composable and
    // testable in dev, and failing to send a newsletter is not a reason to lose an order.
    resendApiKey: env.RESEND_API_KEY ?? '',
    emailFrom: env.EMAIL_FROM ?? 'Ore Delivery <no-reply@ore.delivery>',
    emailProvider: (env.EMAIL_PROVIDER as 'log' | 'resend') ?? (env.RESEND_API_KEY ? 'resend' : 'log'),
    marketingQuietStartHour: num(env.MARKETING_QUIET_START_HOUR, 22),
    marketingQuietEndHour: num(env.MARKETING_QUIET_END_HOUR, 7),
    marketingFrequencyCap: num(env.MARKETING_FREQUENCY_CAP, 3),
    marketingFrequencyWindowDays: num(env.MARKETING_FREQUENCY_WINDOW_DAYS, 7),
    // wallet / rider money (doc §5) — live defaults in GHS pesewas
    riderWithdrawMinPesewas: num(env.RIDER_WITHDRAW_MIN_PESEWAS, 50 * 100),
    riderWithdrawDailyCapPesewas: num(env.RIDER_WITHDRAW_DAILY_CAP_PESEWAS, 2000 * 100),
    riderWithdrawFeePesewas: num(env.RIDER_WITHDRAW_FEE_PESEWAS, 2 * 100),
    riderWithdrawFreePerDay: num(env.RIDER_WITHDRAW_FREE_PER_DAY, 1),
    riderClearHours: num(env.RIDER_CLEAR_HOURS, 24),
    riderClearCheckIntervalMin: num(env.RIDER_CLEAR_CHECK_INTERVAL_MIN, 10),
    codRemitTriggerPct: num(env.COD_REMIT_TRIGGER_PCT, 90),
    codUnblockPct: num(env.COD_UNBLOCK_PCT, 70),
    codTierNewLimitPesewas: num(env.COD_TIER_NEW_LIMIT_PESEWAS, 1000 * 100),
    codTierExperiencedLimitPesewas: num(env.COD_TIER_EXPERIENCED_LIMIT_PESEWAS, 3000 * 100),
    codTierSeniorLimitPesewas: num(env.COD_TIER_SENIOR_LIMIT_PESEWAS, 5000 * 100),
    riderTierExperiencedDeliveries: num(env.RIDER_TIER_EXPERIENCED_DELIVERIES, 50),
    riderTierSeniorDeliveries: num(env.RIDER_TIER_SENIOR_DELIVERIES, 200),
    codEscalateCheckIntervalMin: num(env.COD_ESCALATE_CHECK_INTERVAL_MIN, 30),
    ...codEscalationLadder(env),
    // errands (doc §Errands)
    errandFeePesewas: num(env.ERRAND_FEE_PESEWAS, 1000),
    errandTierNewLimitPesewas: num(env.ERRAND_TIER_NEW_LIMIT_PESEWAS, 300 * 100),
    errandTierVerifiedLimitPesewas: num(env.ERRAND_TIER_VERIFIED_LIMIT_PESEWAS, 1000 * 100),
    errandTierTrustedLimitPesewas: num(env.ERRAND_TIER_TRUSTED_LIMIT_PESEWAS, 3000 * 100),
    errandTierCapLimitPesewas: num(env.ERRAND_TIER_CAP_LIMIT_PESEWAS, 5000 * 100),
    errandTierVerifiedDeliveries: num(env.ERRAND_TIER_VERIFIED_DELIVERIES, 10),
    errandTierTrustedDeliveries: num(env.ERRAND_TIER_TRUSTED_DELIVERIES, 50),
    errandTierCapDeliveries: num(env.ERRAND_TIER_CAP_DELIVERIES, 100),
    // referral (doc §8)
    referralMinOrderPesewas: num(env.REFERRAL_MIN_ORDER_PESEWAS, 30 * 100),
    referralReferrerCreditPesewas: num(env.REFERRAL_REFERRER_CREDIT_PESEWAS, 10 * 100),
    referralRefereeCreditPesewas: num(env.REFERRAL_REFEREE_CREDIT_PESEWAS, 10 * 100),
    referralCreditExpiryDays: num(env.REFERRAL_CREDIT_EXPIRY_DAYS, 14),
    referralMonthlyCap: num(env.REFERRAL_MONTHLY_CAP, 20),
    referralVelocityMin: num(env.REFERRAL_VELOCITY_MIN, 3),
    riderMilestone25Deliveries: num(env.RIDER_MILESTONE_25_DELIVERIES, 25),
    riderMilestone50Deliveries: num(env.RIDER_MILESTONE_50_DELIVERIES, 50),
    riderMilestone25Pesewas: num(env.RIDER_MILESTONE_25_PESEWAS, 100 * 100),
    riderMilestone50Pesewas: num(env.RIDER_MILESTONE_50_PESEWAS, 200 * 100),
    vendorBonusAfterOrders: num(env.VENDOR_BONUS_AFTER_ORDERS, 20),
    vendorBonusPesewas: num(env.VENDOR_BONUS_PESEWAS, 200 * 100),
    // vendor plans / stories / penalties (doc §4)
    premiumCommissionDiscountPct: num(env.PREMIUM_COMMISSION_DISCOUNT_PCT, 25),
    storyTtlHours: num(env.STORY_TTL_HOURS, 24),
    slaLateAcceptSec: num(env.SLA_LATE_ACCEPT_SEC, 180),
    slaReadyEarlyMin: num(env.SLA_READY_EARLY_MIN, 1),
    slaPenaltyLateAccepts: num(env.SLA_PENALTY_LATE_ACCEPTS, 3),
    slaPenaltyFinancialPesewas: num(env.SLA_PENALTY_FINANCIAL_PESEWAS, 20 * 100),
    // vendor settlement (doc §4)
    vendorMinSettlementPesewas: num(env.VENDOR_MIN_SETTLEMENT_PESEWAS, 100 * 100),
    vendorDailyCapPesewas: num(env.VENDOR_DAILY_CAP_PESEWAS, 10_000 * 100),
    vendorReservePct: num(env.VENDOR_RESERVE_PCT, 10),
    vendorSettleDay: num(env.VENDOR_SETTLE_DAY, 1),
    vendorSettleCheckIntervalMin: num(env.VENDOR_SETTLE_CHECK_INTERVAL_MIN, 6 * 60),
    internalServiceKey,
    internalCallerAllowlist: (env.INTERNAL_CALLERS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    internalLegacyKeyAccepted: legacyKeyRequested,
    adminEmail: env.ADMIN_EMAIL ?? '',
    adminPassword: env.ADMIN_PASSWORD ?? '',
    adminTotpSecret: env.ADMIN_TOTP_SECRET ?? '',
    busSigningKey: env.ORE_BUS_SIGNING_KEY?.trim() || internalServiceKey,
    // ── dispatch knobs (audit M-2 migration; defaults preserved exactly) ──
    dispatchPoolRadiusKm: num(env.DISPATCH_POOL_RADIUS_KM, 2),
    dispatchExpandStepKm: num(env.DISPATCH_EXPAND_STEP_KM, 2),
    dispatchMaxRadiusKm: num(env.DISPATCH_MAX_RADIUS_KM, 10),
    dispatchWaveSize: num(env.DISPATCH_WAVE_SIZE, 3),
    riderOfferWindowSec: num(env.RIDER_OFFER_WINDOW_SEC, 20),
    riderDeclineCooldownAfter: num(env.RIDER_DECLINE_COOLDOWN_AFTER, 5),
    riderCooldownMin: num(env.RIDER_COOLDOWN_MIN, 5),
    dispatchGrouping: (env.DISPATCH_GROUPING ?? 'true') !== 'false',
    groupJoinWindowMs: num(env.GROUP_JOIN_WINDOW_MS, 1500),
    groupMaxVendors: num(env.GROUP_MAX_VENDORS, 3),
    groupVendorDistanceKm: num(env.GROUP_VENDOR_DISTANCE_KM, 2.5),
    batchMaxOrders: num(env.BATCH_MAX_ORDERS, 3),
    batchVendorDistanceKm: num(env.BATCH_VENDOR_DISTANCE_KM, 2.0),
    batchDropDistanceKm: num(env.BATCH_DROP_DISTANCE_KM, 1.5),
    multiVendorGroupingThresholdMin: num(env.MULTI_VENDOR_GROUPING_THRESHOLD_MIN, 10),
    dispatchRouteMaxExtraKm: num(env.DISPATCH_ROUTE_MAX_EXTRA_KM, 3),
    dispatchExcludeTimeouts: (env.DISPATCH_EXCLUDE_TIMEOUTS ?? 'true') !== 'false',
    dispatchScoringWeightsJson: env.DISPATCH_SCORING_WEIGHTS_JSON ?? '',
    defaultRiderLocationId: env.ORE_DEFAULT_RIDER_LOCATION_ID ?? '',
    riderDefaultSessionMin: num(env.RIDER_DEFAULT_SESSION_MIN, 240),
    riderBlockMinMin: num(env.RIDER_BLOCK_MIN_MIN, 30),
    riderBlockMaxMin: num(env.RIDER_BLOCK_MAX_MIN, 480),
    riderBlockMaxDaysAhead: num(env.RIDER_BLOCK_MAX_DAYS_AHEAD, 7),
    riderBlockMaxOpen: num(env.RIDER_BLOCK_MAX_OPEN, 14),
    riderBlockGraceMin: num(env.RIDER_BLOCK_GRACE_MIN, 30),
    peakPayWindowsJson: env.PEAK_PAY_WINDOWS_JSON ?? '',
    riderDemandMaxDistanceKm: num(env.RIDER_DEMAND_MAX_DISTANCE_KM, 8),
    riderDemandMaxZones: num(env.RIDER_DEMAND_MAX_ZONES, 12),
    riderDemandZonesJson: env.RIDER_DEMAND_ZONES_JSON ?? '',
    riderDemandCellKm: num(env.RIDER_DEMAND_CELL_KM, 1.5),
    riderOnTimeTargetMin: num(env.RIDER_ON_TIME_TARGET_MIN, 90),
    // ── order-service knobs ──
    parcelServiceFeePesewas: num(env.PARCEL_SERVICE_FEE_PESEWAS, 500),
    packingBufferMin: num(env.PACKING_BUFFER_MIN, 2),
    vendorAcceptSlaSec: num(env.VENDOR_ACCEPT_SLA_SEC, 180),
    vendorAutoCancelSec: num(env.VENDOR_AUTO_CANCEL_SEC, 300),
    // ── notification / comms ──
    giftBaseUrl: env.GIFT_BASE_URL ?? 'http://localhost:4000',
    telegramBotToken: env.TELEGRAM_BOT_TOKEN?.trim() ?? '',
    telegramWebhookSecret: env.TELEGRAM_WEBHOOK_SECRET?.trim() ?? '',
    telegramWebhookUrl: env.TELEGRAM_WEBHOOK_URL?.trim() ?? '',
    // ── gateway edge rate limit ──
    rateLimitMax: num(env.RATE_LIMIT_MAX, 120),
    rateLimitWindow: env.RATE_LIMIT_WINDOW ?? '1 minute',
    rawEnv: { ...env },
    servicePort: (name: string) => SERVICE_PORTS[name] ?? 0,
  };
  warnUnprovisionedIntegrations(ore, env);
  return ore;
}

/**
 * Name every integration that is configured to run but has no credentials (audit L-3).
 *
 * Five integrations were shipped with no credentials anywhere in the repo or its history —
 * Twilio voice, FCM push, Cloudflare R2, Resend email, Smile ID KYC (plus Mux has a token id
 * and no secret). None were mocked; they were never real. Each degrades to a log line or a
 * local-disk write, so production would have launched with no push notifications, no email
 * receipts, proof-of-delivery photos on ephemeral disk and no rider/vendor KYC — silently.
 *
 * This does not throw: a missing newsletter provider must not stop an order being taken. It
 * makes the gap impossible to miss at boot, once per process, and names the variable to set.
 */
function warnUnprovisionedIntegrations(ore: OreEnv, env: Record<string, string | undefined>): void {
  if (warnedIntegrations) return;
  warnedIntegrations = true;
  const gaps: string[] = [];
  if (ore.voiceProvider === 'twilio' && (!ore.twilioAccountSid || !ore.twilioAuthToken || !ore.twilioTwimlAppSid)) {
    gaps.push('VOICE_PROVIDER=twilio but TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_TWIML_APP_SID are incomplete — rider↔customer calls will not connect');
  }
  if (ore.fcmMode === 'firebase' && !ore.fcmServiceAccountPath) {
    gaps.push('FCM_MODE=firebase but FCM_SERVICE_ACCOUNT_PATH is unset — push notifications will not be delivered');
  }
  if (ore.storageDriver === 'r2' && (!ore.r2AccountId || !ore.r2AccessKeyId || !ore.r2SecretAccessKey || !ore.r2Bucket)) {
    gaps.push('STORAGE_DRIVER=r2 but R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET are incomplete — uploads will fail');
  }
  if (ore.emailProvider === 'resend' && !ore.resendApiKey) {
    gaps.push('EMAIL_PROVIDER=resend but RESEND_API_KEY is unset — receipts and campaign email will not send');
  }
  if (!env.MUX_TOKEN_SECRET && env.MUX_TOKEN_ID) {
    gaps.push('MUX_TOKEN_ID is set but MUX_TOKEN_SECRET is not — signed playback URLs cannot be issued');
  }
  if (!env.SMILE_ID_CLIENT_ID || !env.SMILE_ID_API_KEY) {
    gaps.push('SMILE_ID_CLIENT_ID / SMILE_ID_API_KEY are unset — rider and vendor KYC is non-functional');
  }
  if (ore.voiceProvider === 'log' && ore.nodeEnv === 'production') {
    gaps.push('VOICE_PROVIDER=log in production — Twilio voice was never provisioned; calls are logged, not placed');
  }
  if (ore.voiceProvider === 'twilio' && !ore.twilioPushCredAndroid) {
    gaps.push('TWILIO_PUSH_CRED_ANDROID is unset — Android users only get in-app calls while the app is in the foreground');
  }
  if (ore.voiceProvider === 'twilio' && !ore.twilioPushCredIos) {
    gaps.push('TWILIO_PUSH_CRED_IOS is unset — iOS users only get in-app calls while the app is in the foreground');
  }
  if (!ore.supportPhone) {
    gaps.push('SUPPORT_PHONE is unset — apps fall back to in-app support calling only, with no PSTN line to dial');
  }
  if (ore.fcmMode === 'log' && ore.nodeEnv === 'production') {
    gaps.push('FCM_MODE=log in production — push notifications are logged, not delivered');
  }
  if (ore.emailProvider === 'log' && ore.nodeEnv === 'production') {
    gaps.push('EMAIL_PROVIDER=log in production — email is logged, not sent');
  }
  if (ore.storageDriver === 'local' && ore.nodeEnv === 'production') {
    gaps.push(`STORAGE_DRIVER=local in production — proof-of-delivery photos land in ${ore.storageLocalDir} on ephemeral disk and are lost on redeploy`);
  }
  if (!gaps.length) return;
  const prefix = ore.nodeEnv === 'production' ? '[config] UNPROVISIONED INTEGRATIONS' : '[config] integration gaps';
  console.warn(`${prefix} (${gaps.length}):\n  - ${gaps.join('\n  - ')}`);
}

let warnedIntegrations = false;

/**
 * Numeric env coercion that fails loudly.
 *
 * The old version returned `dflt` whenever the value did not parse, so a typo — or an
 * unstripped inline comment (audit S-6) — silently reverted a money knob to its code
 * default. `DELIVERY_SURGE_MULTIPLIER=1.5  # weekend surge` parsed as NaN and surge
 * pricing quietly stayed at 1.0 during peak. A misconfigured money variable must stop
 * the process at boot, not degrade invisibly at the till.
 */
function num(v: string | undefined, dflt: number, name?: string): number {
  if (v === undefined || v.trim() === '') return dflt;
  const n = Number(v);
  if (!Number.isFinite(n)) {
    throw new Error(
      `Env var ${name ?? '(numeric)'} must be a finite number, got "${v}". ` +
        'Inline comments must be separated by whitespace or the value quoted.',
    );
  }
  return n;
}

/** CORS origin for Nest `enableCors`. Production requires `CORS_ORIGINS` (comma-separated). */
export function corsOrigin(env: Record<string, string | undefined> = process.env): boolean | string[] {
  const raw = env.CORS_ORIGINS?.trim();
  const nodeEnv = env.NODE_ENV ?? 'development';
  if (!raw) return nodeEnv === 'production' ? [] : true;
  if (raw === '*') return true;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}
