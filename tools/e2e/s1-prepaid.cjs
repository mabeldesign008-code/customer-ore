#!/usr/bin/env node
/**
 * Scenario: PREPAID food order, cart → Paystack → delivery → ledger.
 *
 * The COD path was driven in Chunk 12; the prepaid path never has been, and it is the one that
 * involves the payment service at all. COD produces a `cod_cash_receivable` debit — the rider is
 * carrying the money. Prepaid must produce a settled cash position instead, and it must refuse to
 * grant the order until the charge is actually verified.
 */
const {
  call, mint, tokens, sql, sqlJson, until, printLedger, freeRiders,
  say, detail, check, summarise, sleep,
} = require('./lib.cjs');

const ACTORS = { customer: '233500000001', vendor: '233560000002', rider: '233550000003' };

const FAKE = process.env.FAKE_PAYSTACK_URL || 'http://127.0.0.1:4999';

/** Drive the fake provider's control plane (not part of the real Paystack API). */
async function fakePaystack(path, body) {
  const res = await fetch(`${FAKE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

/** Ask the fake to send a genuinely signed charge.success for a reference. */
async function payWebhook(reference, opts = {}) {
  const out = await fakePaystack(`/_control/webhook/${encodeURIComponent(reference)}`, { event: 'charge.success', ...opts });
  return out.json ?? out;
}
const VENDOR = process.env.E2E_VENDOR || '';
const DROP = { lat: 5.128, lng: -1.288 };

(async () => {
  say('mint tokens against a production-mode auth service');
  await mint(ACTORS);
  const T = tokens();
  detail('customer, vendor, rider');

  freeRiders();

  const vendorId = VENDOR || sql(`select v.id from catalog.vendor v join auth."user" u on u.id::text=v."ownerUserId" where u.phone='${ACTORS.vendor}' limit 1`);
  const vendorLoc = sqlJson(`select json_build_object('lat',lat,'lng',lng)::text from catalog.vendor where id='${vendorId}'`);
  const item = sqlJson(`select json_build_object('id',id,'name',name,'price',"pricePesewas")::text from catalog.menu_item where "vendorId"='${vendorId}' and available limit 1`);

  say('cart: add item');
  await call('cart', '/cart/items', { method: 'POST', token: T.customer, body: { itemId: item.id, qty: 2 } });
  detail(`${item.name} x2 @ ${item.price}p`);

  say('cart: checkout PREPAID');
  const checkout = await call('cart', '/cart/checkout', {
    method: 'POST', token: T.customer,
    body: {
      address: { label: 'UCC Science Block', lat: DROP.lat, lng: DROP.lng, details: 'Room 12', source: 'MAP' },
      paymentMethods: [{ vendorId, method: 'PREPAID' }],
      note: 'prepaid e2e', leaveAtDoor: false,
    },
  });
  const order = checkout.orders[0];
  const orderId = order.orderId;
  detail(`orderId=${orderId} status=${order.status} total=${order.totalPesewas}p prepaidTotal=${checkout.prepaidTotalPesewas}p`);
  check('prepaid order starts unpaid, not confirmed', order.status === 'PENDING_PAYMENT', `status=${order.status}`);

  say('payment: a transaction was initialised for the order');
  const payment = await until('payment record', async () => {
    const p = await call('payment', `/internal/payments/order/${orderId}`, { internal: true, raw: true });
    return p.ok && p.json?.payment?.reference ? p.json.payment : null;
  });
  detail(`reference=${payment.reference} status=${payment.status} amount=${payment.amountPesewas}p`);
  check('charge amount equals the prepaid total', Number(payment.amountPesewas) === Number(checkout.prepaidTotalPesewas),
    `${payment.amountPesewas} vs ${checkout.prepaidTotalPesewas}`);

  say('security: the order must NOT be granted before the charge is verified');
  const beforePay = await call('order', `/orders/${orderId}`, { token: T.customer });
  check('order still PENDING_PAYMENT before payment completes', beforePay.status === 'PENDING_PAYMENT', `status=${beforePay.status}`);
  check('no ledger entries before payment', printLedger(orderId).rows.length === 0);

  say('security: a webhook with a forged signature is rejected');
  const forged = await call('payment', '/payments/webhook/paystack', {
    method: 'POST', raw: true,
    body: { event: 'charge.success', data: { reference: payment.reference, amount: checkout.prepaidTotalPesewas, currency: 'GHS' } },
  });
  check('webhook without a valid signature is refused', forged.status === 401 || forged.status === 400,
    `http=${forged.status}`);
  const stillUnpaid = await call('order', `/orders/${orderId}`, { token: T.customer });
  check('forged webhook granted nothing', stillUnpaid.status === 'PENDING_PAYMENT', `status=${stillUnpaid.status}`);

  say('security: a correctly signed webhook is still refused while Paystack says unpaid');
  // This is the control that matters, and until now it was untestable: PAYSTACK_MODE=mock
  // short-circuited verify() to "success" for every reference. Here the signature is genuine —
  // computed by the fake with the real secret — but the transaction has not been paid, so the
  // service must call verify, be told "abandoned", and grant nothing.
  const premature = await payWebhook(payment.reference);
  detail(`webhook http=${premature.status}`);
  await sleep(1500);
  const afterPremature = await call('order', `/orders/${orderId}`, { token: T.customer });
  check('signed webhook for an unpaid charge grants nothing', afterPremature.status === 'PENDING_PAYMENT',
    `status=${afterPremature.status}`);
  check('unpaid charge posts no ledger entries', printLedger(orderId).rows.length === 0);
  const stillInitiated = sql(`select status from payment.checkout_payment where reference='${payment.reference}'`);
  check('payment row not marked SUCCESS on an unverified webhook', stillInitiated !== 'SUCCESS', `status=${stillInitiated}`);

  say('recovery: paying for real, the stuck webhook is retried by the sweeper');
  // Paystack was already told 200 for that webhook, so it will never redeliver it. The only
  // thing that can rescue this order is the service's own retry sweeper. That is precisely the
  // real-world race — a webhook landing microseconds before the transaction settles — and until
  // now nothing had ever exercised the recovery.
  await fakePaystack(`/_control/pay/${payment.reference}`, {});
  const confirmed = await until('order to leave PENDING_PAYMENT', async () => {
    const o = await call('order', `/orders/${orderId}`, { token: T.customer });
    return o.status !== 'PENDING_PAYMENT' ? o : null;
  }, { timeoutMs: 90_000, stepMs: 2000 });
  detail(`status=${confirmed.status}`);
  check('paid order is confirmed once the sweeper replays the webhook', confirmed.status === 'CONFIRMED', `status=${confirmed.status}`);

  const paidRow = sqlJson(`select json_build_object('status',status,'amount',"amountPesewas")::text from payment.checkout_payment where reference='${payment.reference}'`);
  check('payment row marked SUCCESS', paidRow.status === 'SUCCESS', `status=${paidRow.status}`);
  check('recorded amount is the amount charged', Number(paidRow.amount) === Number(checkout.prepaidTotalPesewas),
    `recorded=${paidRow.amount} charged=${checkout.prepaidTotalPesewas}`);

  say('payment: replaying the same webhook is idempotent');
  const replay = await payWebhook(payment.reference);
  await sleep(2000);
  const payRows = Number(sql(`select count(*) from payment.checkout_payment where reference='${payment.reference}'`));
  check('replay does not create a second payment row', payRows === 1, `${payRows} rows, http=${replay.status}`);

  say('order: vendor accepts, then marks ready');
  detail((await call('order', `/orders/${orderId}/accept`, { method: 'POST', token: T.vendor })).status);
  detail((await call('order', `/orders/${orderId}/ready`, { method: 'POST', token: T.vendor })).status);

  say('dispatch: wait for an offer, accept it');
  const offer = await until('dispatch offer', async () => {
    const offers = await call('dispatch', '/riders/me/offers', { token: T.rider, raw: true });
    const list = Array.isArray(offers.json) ? offers.json : [];
    return list.find((o) => o.orderId === orderId) ?? null;
  });
  detail(`offer=${offer.id} riderFee=${offer.riderFeePesewas ?? '?'}p`);
  await call('dispatch', `/offers/${offer.id}/accept`, { method: 'POST', token: T.rider });
  await sleep(1500);

  say('dispatch: rider picks up at the vendor');
  await call('dispatch', `/orders/${orderId}/picked-up`, { method: 'POST', token: T.rider, body: { riderLat: vendorLoc.lat, riderLng: vendorLoc.lng } });
  await sleep(2500);

  say('order: OTP at the door → DELIVERED');
  const reveal = await call('order', `/internal/orders/${orderId}/otp/reveal`, { method: 'POST', internal: true });
  const otp = reveal.otp ?? reveal.plain ?? reveal.code;
  const delivered = await call('order', `/orders/${orderId}/confirm-otp`, {
    method: 'POST', token: T.rider, body: { otp, riderLat: DROP.lat, riderLng: DROP.lng },
  });
  detail(`status=${delivered.status}`);
  check('order delivered', delivered.status === 'DELIVERED');

  say('ledger: the delivered prepaid order posts a balanced journal');
  // Wait for the DELIVERY journal specifically. Waiting for "any rows" is satisfied instantly by
  // the payment-capture legs posted minutes earlier, and the assertions then run against a
  // journal the settlement has not landed in yet.
  await until('delivery journal', () => {
    const n = Number(sql(`select count(*) from ledger.ledger_entry where "orderId"='${orderId}' and ref='delivered:${orderId}'`));
    return n > 0 ? n : null;
  }, { timeoutMs: 60_000, stepMs: 1500 });
  const { rows, balanced } = printLedger(orderId);
  check('journal balances on every ref', balanced === true);
  const accounts = new Set(rows.map((r) => r.account));
  check('prepaid does NOT create a cash-on-delivery receivable', !accounts.has('cod_cash_receivable'),
    [...accounts].join(', '));
  check('vendor is credited', rows.some((r) => r.account === 'vendor_payable' && Number(r.cr) > 0));
  check('rider is credited', rows.some((r) => r.account === 'rider_payable' && Number(r.cr) > 0));
  check('platform revenue recognised', rows.some((r) => r.account === 'platform_revenue' && Number(r.cr) > 0));
  check('GRA taxes accrued', rows.some((r) => /vat_payable|nhil_payable|getfund_payable/.test(r.account) && Number(r.cr) > 0));

  require('fs').writeFileSync('/tmp/ore-run/prepaid-order.txt', orderId);
  summarise('PREPAID');
})().catch((e) => { console.error('\nFAILED:', e.message); process.exit(1); });
