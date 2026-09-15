/**
 * Shared harness for the live end-to-end scenarios.
 *
 * These drive real HTTP against services running in `NODE_ENV=production` on real Postgres,
 * NATS JetStream and Redis. Only the payment provider and the geocoder are mocked, via
 * `PAYSTACK_MODE=mock` / `GEOCODER_MODE=mock`.
 *
 * They are deliberately not jest specs: they need a whole stack booted, they mutate a shared
 * database, and their value is in being runnable against a staging deployment as a smoke test.
 * `tools/integration` covers what can be asserted without a full stack.
 */
const fs = require('fs');
const { execSync } = require('child_process');
const { createHash } = require('crypto');

const PG = process.env.DATABASE_URL || 'postgres://ore:ore@127.0.0.1:5432/oredelivery';
const ENV_FILE = process.env.ORE_ENV_FILE || '/home/user/ore/.env';
const TOKENS = process.env.ORE_TOKENS || '/tmp/ore-run/tokens.json';

const PORTS = {
  gateway: 4000, auth: 4100, catalog: 4101, cart: 4102, order: 4103, payment: 4104,
  dispatch: 4105, tracking: 4106, notification: 4107, ledger: 4108, onboarding: 4109,
  referral: 4110, comms: 4111, analytics: 4112,
};

const envText = fs.readFileSync(ENV_FILE, 'utf8');
const envVar = (k) => (envText.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim() ?? '';
const INTERNAL_KEY = envVar('INTERNAL_SERVICE_KEY');
const JWT_SECRET = envVar('JWT_SECRET');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** One-shot SQL, returned as raw text. Uses psql so the harness needs no pg driver. */
function sql(q) {
  // psql -c takes one argument; a multi-line template literal would arrive with literal \n.
  const oneLine = q.replace(/\s+/g, ' ').trim();
  return execSync(`psql "${PG}" -Atc ${JSON.stringify(oneLine)}`, { encoding: 'utf8' }).trim();
}
/** SQL returning JSON — `q` must select a single json/jsonb column. */
function sqlJson(q) {
  const out = sql(q);
  return out ? JSON.parse(out) : null;
}
function exec(q) {
  execSync(`psql "${PG}" -qc ${JSON.stringify(q.replace(/\s+/g, ' ').trim())}`, { encoding: 'utf8' });
}

class HttpError extends Error {
  constructor(method, url, status, body) {
    super(`${method} ${url} -> ${status} ${String(body).slice(0, 400)}`);
    this.status = status;
    this.body = body;
  }
}

/**
 * Call a service. `internal: true` adds the legacy internal key header; `token` adds a bearer.
 *
 * Content-type is only set when there is a body — the services reject an empty body that
 * declares itself JSON, which is correct and easy to trip over.
 */
async function call(service, path, { method = 'GET', token, internal, body, raw = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  if (internal) headers['x-ore-internal-key'] = INTERNAL_KEY;
  const url = `http://127.0.0.1:${PORTS[service]}${path}`;
  const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  if (raw) return { status: res.status, ok: res.ok, json };
  if (!res.ok) throw new HttpError(method, url, res.status, text);
  return json;
}

/**
 * Recover the OTP a production auth service refused to leak.
 *
 * `AUTH_OTP_LOG` is ignored when NODE_ENV=production, which is right — so rather than weaken the
 * service under test, brute-force the 6 digits out of the stored sha256. Takes well under a
 * second and keeps the stack in genuine production mode.
 */
function crackOtp(hash) {
  for (let c = 100000; c <= 999999; c++) {
    if (createHash('sha256').update(`${JWT_SECRET}:${c}`).digest('hex') === hash) return String(c);
  }
  throw new Error('OTP not recovered from hash');
}

/** Request an OTP, backing off when the login throttler pushes back. */
async function requestOtp(name, phone, attempts = 6) {
  for (let i = 0; i < attempts; i++) {
    const res = await call('auth', '/auth/request-otp', { method: 'POST', body: { phone, purpose: 'login' }, raw: true });
    if (res.status !== 429) return res.json;
    const waitMs = 5000 * (i + 1);
    console.log(`    (throttled minting ${name}, waiting ${waitMs / 1000}s)`);
    await sleep(waitMs);
  }
  throw new Error(`${name}: still throttled after ${attempts} attempts`);
}

/** True when a cached JWT still has comfortable life left. */
function stillValid(jwt) {
  try {
    const claims = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'));
    return typeof claims.exp === 'number' && claims.exp * 1000 - Date.now() > 5 * 60_000;
  } catch {
    return false;
  }
}

/**
 * Mint access tokens, reusing cached ones where possible.
 *
 * Re-minting on every run trips the login throttler (429) — which is the throttler doing its job,
 * so the harness adapts rather than the service being weakened. Set ORE_FORCE_MINT=1 to override.
 */
async function mint(actors) {
  const out = {};
  const cached = fs.existsSync(TOKENS) ? JSON.parse(fs.readFileSync(TOKENS, 'utf8')) : {};
  for (const [name, phone] of Object.entries(actors)) {
    if (!process.env.ORE_FORCE_MINT && cached[name] && stillValid(cached[name])) {
      out[name] = cached[name];
      continue;
    }
    const req = await requestOtp(name, phone);
    if (!req.sent) throw new Error(`${name}: request-otp ${JSON.stringify(req)}`);
    const hash = sql(`select "codeHash" from auth.otp_code where phone='${phone}' and consumed=false order by "createdAt" desc limit 1`);
    const v = await call('auth', '/auth/verify-otp', { method: 'POST', body: { phone, code: crackOtp(hash) } });
    if (!v.accessToken) throw new Error(`${name}: verify-otp ${JSON.stringify(v)}`);
    out[name] = v.accessToken;
    await sleep(900); // verify-otp is throttled
  }
  const prev = fs.existsSync(TOKENS) ? JSON.parse(fs.readFileSync(TOKENS, 'utf8')) : {};
  fs.mkdirSync(require('path').dirname(TOKENS), { recursive: true });
  fs.writeFileSync(TOKENS, JSON.stringify({ ...prev, ...out }, null, 2));
  return out;
}

const tokens = () => JSON.parse(fs.readFileSync(TOKENS, 'utf8'));

/** Poll until `fn` returns something truthy, or throw. Async work is allowed. */
async function until(label, fn, { timeoutMs = 45_000, stepMs = 500 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    last = await fn();
    if (last) return last;
    await sleep(stepMs);
  }
  throw new Error(`timed out waiting for ${label}`);
}

/** Every journal line for an order, plus the debit/credit totals per ref. */
function ledgerFor(orderId) {
  const rows = sqlJson(
    `select coalesce(json_agg(row_to_json(t))::text,'[]') from (
       select ref, account, "debitPesewas" as dr, "creditPesewas" as cr
       from ledger.ledger_entry where "orderId"='${orderId}' order by id) t`,
  ) || [];
  const byRef = {};
  for (const r of rows) {
    byRef[r.ref] ??= { dr: 0, cr: 0 };
    byRef[r.ref].dr += Number(r.dr);
    byRef[r.ref].cr += Number(r.cr);
  }
  return { rows, byRef };
}

function printLedger(orderId) {
  const { rows, byRef } = ledgerFor(orderId);
  if (!rows.length) { console.log('    (no ledger entries)'); return { rows, byRef, balanced: null }; }
  for (const r of rows) {
    console.log(`    ${String(r.account).padEnd(32)} dr=${String(r.dr).padStart(7)} cr=${String(r.cr).padStart(7)}  ${r.ref}`);
  }
  let balanced = true;
  for (const [ref, t] of Object.entries(byRef)) {
    const ok = t.dr === t.cr;
    if (!ok) balanced = false;
    console.log(`    ${ok ? 'BALANCED  ' : 'UNBALANCED'} ${ref}: dr=${t.dr} cr=${t.cr}`);
  }
  return { rows, byRef, balanced };
}

/** Reset dispatch state left behind by a previous scenario so riders are offerable again. */
function freeRiders() {
  exec(`update dispatch.assignment set status='CANCELLED', "completedAt"=now() where status='ACTIVE'`);
  exec(`update dispatch.offer set status='EXPIRED' where status='PENDING'`);
  exec(`delete from dispatch.offer_exclusion`);
  exec(`update dispatch.rider set status='AVAILABLE' where status <> 'OFFLINE'`);
}

let step = 0;
const say = (msg) => { console.log(`\n${String(++step).padStart(2)}. ${msg}`); };
const detail = (d) => console.log(`    ${d}`);
const resetSteps = () => { step = 0; };

const checks = [];
function check(label, condition, extra = '') {
  checks.push({ label, ok: !!condition });
  console.log(`    ${condition ? 'PASS' : 'FAIL'}  ${label}${extra ? ` — ${extra}` : ''}`);
}
function summarise(title) {
  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${'='.repeat(60)}\n${title}: ${checks.length - failed.length}/${checks.length} checks passed`);
  for (const f of failed) console.log(`  FAILED: ${f.label}`);
  if (failed.length) process.exitCode = 1;
  return failed.length === 0;
}

module.exports = {
  PORTS, INTERNAL_KEY, sleep, sql, sqlJson, exec, call, mint, tokens, until,
  ledgerFor, printLedger, freeRiders, say, detail, resetSteps, check, summarise, HttpError,
};

/**
 * Create and deliver a fresh PREPAID order, returning its identifiers.
 *
 * Scenarios that act on a delivered order (refunds, settlements, payouts) need one that has not
 * already been refunded, disputed or settled by a previous run. Reusing the last run's order makes
 * a scenario pass once and then fail on every re-run, which is worse than not testing it.
 *
 * This is the s1 happy path with the security assertions stripped out — s1 still owns those.
 */
async function deliverPrepaidOrder(T, { vendorPhone = '233560000002' } = {}) {
  const FAKE = process.env.FAKE_PAYSTACK_URL || 'http://127.0.0.1:4999';
  const ctl = async (path, body) => {
    const r = await fetch(`${FAKE}${path}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}),
    });
    return r.json().catch(() => null);
  };

  freeRiders();
  const vendorId = sql(`select v.id from catalog.vendor v join auth."user" u on u.id::text=v."ownerUserId" where u.phone='${vendorPhone}' limit 1`);
  const vendorLoc = sqlJson(`select json_build_object('lat',lat,'lng',lng)::text from catalog.vendor where id='${vendorId}'`);
  const item = sqlJson(`select json_build_object('id',id)::text from catalog.menu_item where "vendorId"='${vendorId}' and available limit 1`);
  const DROP = { lat: 5.128, lng: -1.288 };

  await call('cart', '/cart/items', { method: 'POST', token: T.customer, body: { itemId: item.id, qty: 2 } });
  const checkout = await call('cart', '/cart/checkout', {
    method: 'POST', token: T.customer,
    body: {
      address: { label: 'UCC Science Block', lat: DROP.lat, lng: DROP.lng, details: 'Room 12', source: 'MAP' },
      paymentMethods: [{ vendorId, method: 'PREPAID' }],
      note: 'money-out fixture', leaveAtDoor: false,
    },
  });
  const orderId = checkout.orders[0].orderId;

  const payment = await until('payment record', async () => {
    const p = await call('payment', `/internal/payments/order/${orderId}`, { internal: true, raw: true });
    return p.ok && p.json?.payment?.reference ? p.json.payment : null;
  });
  await ctl(`/_control/pay/${encodeURIComponent(payment.reference)}`, {});
  await ctl(`/_control/webhook/${encodeURIComponent(payment.reference)}`, { event: 'charge.success' });
  await until('order confirmed', async () => {
    const o = await call('order', `/orders/${orderId}`, { token: T.customer });
    return o.status !== 'PENDING_PAYMENT' ? o : null;
  }, { timeoutMs: 60_000, stepMs: 2000 });

  await call('order', `/orders/${orderId}/accept`, { method: 'POST', token: T.vendor });
  await call('order', `/orders/${orderId}/ready`, { method: 'POST', token: T.vendor });
  const offer = await until('dispatch offer', async () => {
    const offers = await call('dispatch', '/riders/me/offers', { token: T.rider, raw: true });
    return (Array.isArray(offers.json) ? offers.json : []).find((o) => o.orderId === orderId) ?? null;
  });
  await call('dispatch', `/offers/${offer.id}/accept`, { method: 'POST', token: T.rider });
  await sleep(1500);
  await call('dispatch', `/orders/${orderId}/picked-up`, { method: 'POST', token: T.rider, body: { riderLat: vendorLoc.lat, riderLng: vendorLoc.lng } });
  await sleep(2500);
  const reveal = await call('order', `/internal/orders/${orderId}/otp/reveal`, { method: 'POST', internal: true });
  await call('order', `/orders/${orderId}/confirm-otp`, {
    method: 'POST', token: T.rider, body: { otp: reveal.otp ?? reveal.plain ?? reveal.code, riderLat: DROP.lat, riderLng: DROP.lng },
  });
  await until('delivery journal', () => {
    const n = Number(sql(`select count(*) from ledger.ledger_entry where "orderId"='${orderId}' and ref='delivered:${orderId}'`));
    return n > 0 ? n : null;
  }, { timeoutMs: 60_000, stepMs: 1500 });

  const row = sqlJson(`select json_build_object('id',id,'vendorId',"vendorId",'riderId',"riderId",'total',"totalPesewas",'status',status)::text from "order"."order" where id='${orderId}'`);
  return { ...row, orderId, reference: payment.reference };
}

module.exports.deliverPrepaidOrder = deliverPrepaidOrder;
