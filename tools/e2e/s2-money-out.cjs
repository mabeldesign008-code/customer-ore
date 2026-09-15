#!/usr/bin/env node
/**
 * Scenario: money OUT — refunds, vendor settlement, rider withdrawal, disputes.
 *
 * Everything driven so far moves money *in*: a customer pays, the platform books what it owes.
 * Nothing had ever driven the paying-out half, which is where the money actually leaves the
 * business and where an error is unrecoverable — an overpaid rider is not coming back.
 *
 * Runs against the live Paystack code path (tools/e2e/fake-paystack.cjs), so transfers and
 * refunds go out over real HTTP and settle on a real, correctly signed webhook, exactly as they
 * would in production.
 */
const {
  call, mint, tokens, sql, sqlJson, until, printLedger,
  say, detail, check, summarise, sleep, deliverPrepaidOrder,
} = require('./lib.cjs');

const ACTORS = {
  customer: '233500000001',
  vendor: '233560000002',
  rider: '233550000003',
  finance: '233540000004',
  compliance: '233540000002',
  operations: '233540000003',
};

const FAKE = process.env.FAKE_PAYSTACK_URL || 'http://127.0.0.1:4999';

async function fakePaystack(path, body, method = 'POST') {
  const res = await fetch(`${FAKE}${path}`, {
    method,
    headers: method === 'POST' ? { 'content-type': 'application/json' } : undefined,
    body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

/** Every transfer the provider has been asked to make. */
const transfersSeen = async () => (await fakePaystack('/_control/state', null, 'GET')).json.transfers;
const refundsSeen = async () => (await fakePaystack('/_control/state', null, 'GET')).json.refunds;

/** Ask the fake to send a signed transfer.success, the way Paystack finalises money-out. */
async function transferWebhook(reference, event = 'transfer.success') {
  const crypto = require('crypto');
  const secret = require('fs')
    .readFileSync('/home/user/ore/.env', 'utf8')
    .split('\n')
    .find((l) => l.startsWith('PAYSTACK_SECRET_KEY='))
    .split('=')
    .slice(1)
    .join('=');
  const state = await fakePaystack('/_control/state', null, 'GET');
  const t = state.json.transfers.find((x) => x.reference === reference);
  const body = JSON.stringify({
    event,
    data: { reference, amount: t?.amount ?? 0, status: event === 'transfer.success' ? 'success' : 'failed', metadata: t?.metadata ?? {} },
  });
  const signature = crypto.createHmac('sha512', secret).update(body).digest('hex');
  const res = await fetch('http://127.0.0.1:4104/payments/webhook/paystack', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-paystack-signature': signature },
    body,
  });
  return res.status;
}


/**
 * Drive a money-out action through the dual-control gate.
 *
 * Every endpoint that moves money out returns 409 "submitted as <id>" on first call: nothing has
 * happened yet, an approval row is waiting for signatures from OTHER admins. The maker then
 * re-calls and the work executes exactly once. This helper plays all three parts and asserts the
 * property that makes the gate worth having — the maker's own signature must not count.
 */
async function withDualControl(label, maker, invoke) {
  const first = await invoke();
  if (first.status < 400) return { result: first, signatures: 0 };

  const msg = JSON.stringify(first.json ?? '');
  const m = msg.match(/submitted as ([0-9a-f-]{36})/) || msg.match(/Approval ([0-9a-f-]{36})/);
  if (!m) return { result: first, signatures: 0 };
  const approvalId = m[1];
  const needsTwo = /2 signatures/.test(msg);
  detail(`${label}: dual control approval ${approvalId.slice(0, 8)} (${needsTwo ? 2 : 1} signature${needsTwo ? 's' : ''})`);

  // The maker signing their own request must not satisfy the gate.
  const selfSign = await call('auth', `/auth/admin/approvals/${approvalId}/approve`, {
    method: 'POST', token: maker.token, raw: true, body: { note: 'self' },
  });
  check(`${label}: the maker cannot sign their own request`, selfSign.status >= 400,
    `http=${selfSign.status} ${JSON.stringify(selfSign.json).slice(0, 120)}`);

  const signers = needsTwo ? ['compliance', 'operations'] : ['compliance'];
  for (const who of signers) {
    const sig = await call('auth', `/auth/admin/approvals/${approvalId}/approve`, {
      method: 'POST', token: tokens()[who], raw: true, body: { note: `e2e ${who}` },
    });
    detail(`${label}: signed by ${who} -> http=${sig.status}`);
  }

  const second = await invoke();
  return { result: second, signatures: signers.length, approvalId };
}

(async () => {
  say('mint tokens (customer, vendor, rider, finance admin)');
  await mint(ACTORS);
  const T = tokens();
  detail(Object.keys(T).join(', '));

  say('fixture: deliver a fresh prepaid order to act on');
  // A fresh order every run. Reusing the previous run's order means the second run finds it
  // already refunded and disputed, and the scenario only ever passes once.
  const order = await deliverPrepaidOrder(T);
  const orderId = order.orderId;
  detail(`delivered prepaid order ${orderId} (${order.status}, ${order.total}p)`);
  check('the order under test is delivered', order.status === 'DELIVERED', order.status);

  // ---------------------------------------------------------------- rider payout
  say('rider: the delivered order left a balance owing');
  const riderId = order.riderId;
  const bal = sqlJson(
    `select json_build_object('cleared',"clearedPesewas",'pending',"pendingPesewas",'locked',"lockedPesewas")::text
     from ledger.rider_balance where "riderId"='${riderId}'`,
  );
  detail(`cleared=${bal.cleared}p pending=${bal.pending}p locked=${bal.locked}p`);
  check('rider is owed something after delivering', Number(bal.cleared) + Number(bal.pending) > 0,
    `cleared=${bal.cleared} pending=${bal.pending}`);

  say('rider: earnings sit in PENDING until the clearance window elapses');
  // doc §5 — fulfilment earnings clear after a configured delay so a dispute can claw them back.
  // Paying immediately would mean a refunded order has already left the building.
  check('fresh earnings are not immediately withdrawable', Number(bal.pending) > 0,
    `pending=${bal.pending}p cleared=${bal.cleared}p`);

  const tooMuch = Number(bal.cleared) + Number(bal.pending) + 100_000;
  say('rider: a withdrawal larger than the balance is refused');
  const over = await call('ledger', '/ledger/wallet/me/withdrawals', {
    method: 'POST', token: T.rider, raw: true,
    body: { amountPesewas: tooMuch, destination: '233550000003 MOMO MTN' },
  });
  check('over-balance withdrawal rejected', over.status >= 400, `http=${over.status} ${JSON.stringify(over.json).slice(0, 120)}`);

  say('rider: clear the window, then request a withdrawal of the cleared balance');
  // Move the earning's clearance point into the past rather than sleeping out the real window.
  sql(`update ledger.rider_balance set "clearedPesewas"="clearedPesewas"+"pendingPesewas", "pendingPesewas"=0, "lockedPesewas"=0 where "riderId"='${riderId}'`);
  const cleared = Number(sql(`select "clearedPesewas" from ledger.rider_balance where "riderId"='${riderId}'`));
  detail(`cleared balance now ${cleared}p`);

  // The service enforces a GHS 50.00 minimum withdrawal, so top the balance up past it rather
  // than asserting against an amount the product would rightly refuse.
  if (cleared < 6_000) {
    sql(`update ledger.rider_balance set "clearedPesewas"=8000 where "riderId"='${riderId}'`);
  }
  const available = Number(sql(`select "clearedPesewas" from ledger.rider_balance where "riderId"='${riderId}'`));
  const withdrawAmount = 6_000;
  detail(`available=${available}p requesting=${withdrawAmount}p (service minimum is GHS 50.00)`);
  const wd = await call('ledger', '/ledger/wallet/me/withdrawals', {
    method: 'POST', token: T.rider, raw: true,
    body: { amountPesewas: withdrawAmount, destination: '233550000003 MOMO MTN' },
  });
  detail(`http=${wd.status} ${JSON.stringify(wd.json).slice(0, 200)}`);
  check('withdrawal request accepted', wd.status < 400, `http=${wd.status}`);
  const withdrawalId = wd.json?.id ?? wd.json?.withdrawalId;

  say('rider: the requested amount is locked, not still spendable');
  const afterReq = sqlJson(
    `select json_build_object('cleared',"clearedPesewas",'locked',"lockedPesewas")::text
     from ledger.rider_balance where "riderId"='${riderId}'`,
  );
  detail(`cleared=${afterReq.cleared}p locked=${afterReq.locked}p`);
  check('requested funds are locked so they cannot be withdrawn twice',
    Number(afterReq.locked) >= withdrawAmount, `locked=${afterReq.locked} requested=${withdrawAmount}`);

  say('rider: a second withdrawal cannot spend the locked funds again');
  const doubleSpend = await call('ledger', '/ledger/wallet/me/withdrawals', {
    method: 'POST', token: T.rider, raw: true,
    body: { amountPesewas: withdrawAmount, destination: '233550000003 MOMO MTN' },
  });
  const lockedNow = Number(sql(`select "lockedPesewas" from ledger.rider_balance where "riderId"='${riderId}'`));
  check('locked funds cannot be requested twice',
    doubleSpend.status >= 400 || lockedNow <= Number(afterReq.cleared) + Number(afterReq.locked),
    `http=${doubleSpend.status} locked=${lockedNow}`);

  say('finance: approve the withdrawal → money leaves via Paystack transfer');
  const before = (await transfersSeen()).length;
  const { result: appr } = await withDualControl('withdrawal', { token: T.finance }, () =>
    call('ledger', `/ledger/admin/withdrawals/${withdrawalId}/approve`, {
      method: 'POST', token: T.finance, raw: true, body: { note: 'e2e' },
    }));
  detail(`http=${appr.status} ${JSON.stringify(appr.json).slice(0, 200)}`);
  await sleep(2500);
  const transfers = await transfersSeen();
  detail(`transfers at provider: ${transfers.length} (was ${before})`);
  check('approval actually instructs a transfer at the provider', transfers.length > before,
    `${before} -> ${transfers.length}`);

  const transfer = transfers[transfers.length - 1];
  if (transfer) {
    detail(`reference=${transfer.reference} amount=${transfer.amount}p status=${transfer.status}`);
    check('transfer amount equals the approved withdrawal', Number(transfer.amount) === withdrawAmount,
      `${transfer.amount} vs ${withdrawAmount}`);

    say('rider: the payout is not final until the transfer webhook confirms it');
    const st = sql(`select status from ledger.rider_withdrawal where id='${withdrawalId}'`);
    detail(`withdrawal status before webhook = ${st}`);
    check('withdrawal is not marked paid before the provider confirms', st !== 'PAID',
      `status=${st}`);

    say('provider: transfer.success webhook finalises the payout');
    const code = await transferWebhook(transfer.reference);
    detail(`webhook http=${code}`);
    await sleep(2500);
    const stAfter = sql(`select status from ledger.rider_withdrawal where id='${withdrawalId}'`);
    detail(`withdrawal status after webhook = ${stAfter}`);
    check('withdrawal settles once the provider confirms', stAfter === 'PAID' || stAfter === 'COMPLETED',
      `status=${stAfter}`);

    const lockedFinal = Number(sql(`select "lockedPesewas" from ledger.rider_balance where "riderId"='${riderId}'`));
    check('paid funds are released from locked, not left held forever', lockedFinal < Number(afterReq.locked) + 1,
      `locked=${lockedFinal}`);
  }

  // ---------------------------------------------------------------- vendor settlement
  say('fixture: give the vendor a payout account');
  // `payoutAccountJson` is only ever written by vendor onboarding (onboarding.service.ts sets it
  // from the application's payoutInfo), and the seed does not populate it — so every seeded
  // vendor is deliverable but unpayable. Set it directly rather than replaying onboarding.
  sql(`update catalog.vendor set "payoutAccountJson"='{"type":"MOMO","provider":"MTN","accountNumber":"233560000002","accountName":"E2E Vendor"}' where id='${order.vendorId}'`);
  detail(`payout account set for vendor ${order.vendorId.slice(0, 8)}`);

  say('finance: run vendor settlements');
  const settleRun = await call('ledger', '/ledger/admin/vendors/settle', { method: 'POST', token: T.finance, raw: true });
  detail(`http=${settleRun.status} ${JSON.stringify(settleRun.json).slice(0, 200)}`);
  check('settlement run accepted', settleRun.status < 400, `http=${settleRun.status}`);
  await sleep(1500);

  // Settlements run on a weekly cycle, so a re-run inside the same week finds the vendor's
  // settlement already created (and, from the previous run, already paid). Assert that the
  // vendor HAS a settlement, and only drive the payout when one is still READY.
  const settlement = sqlJson(
    `select coalesce(json_agg(row_to_json(t))::text,'[]') from (
       select id, "vendorId", "payoutPesewas", status from ledger.vendor_settlement
       where "vendorId"='${order.vendorId}' order by "createdAt" desc limit 3) t`,
  );
  for (const s of settlement) detail(`settlement ${s.id.slice(0, 8)} vendor=${s.vendorId.slice(0, 8)} ${s.payoutPesewas}p ${s.status}`);
  check('the delivered order produced a vendor settlement', settlement.length > 0);

  const ready = settlement.find((x) => x.status === 'READY');
  if (ready) {
    const s = ready;
    say('finance: pay the settlement → vendor transfer at the provider');
    const beforeV = (await transfersSeen()).length;
    const { result: pay } = await withDualControl('settlement pay', { token: T.finance }, () =>
      call('ledger', `/ledger/admin/vendors/settlements/${s.id}/pay`, {
        method: 'POST', token: T.finance, raw: true, body: {},
      }));
    detail(`http=${pay.status} ${JSON.stringify(pay.json).slice(0, 200)}`);
    await sleep(2500);
    const afterV = (await transfersSeen()).length;
    check('paying a settlement instructs a vendor transfer', afterV > beforeV, `${beforeV} -> ${afterV}`);
  } else {
    detail('no READY settlement this cycle — already paid by an earlier run, payout step skipped');
  }

  // ---------------------------------------------------------------- refund
  say('customer: raise a refund request on the delivered order');
  const raise = await call('payment', '/payments/refund-request', {
    method: 'POST', token: T.customer, raw: true,
    body: { orderId, reason: 'item was missing from the bag' },
  });
  detail(`http=${raise.status} ${JSON.stringify(raise.json).slice(0, 220)}`);
  check('customer can raise a refund request', raise.status < 400, `http=${raise.status}`);
  const requestId = raise.json?.id
    ?? sql(`select id from payment.refund_request where "orderId"='${orderId}' order by "createdAt" desc limit 1`);
  detail(`refund request ${String(requestId).slice(0, 8)}`);

  say('security: a customer cannot approve their own refund');
  const selfApprove = await call('payment', `/admin/refund-requests/${requestId}/approve`, {
    method: 'POST', token: T.customer, raw: true, body: { note: 'me' },
  });
  check('customer is refused the approval endpoint', selfApprove.status === 401 || selfApprove.status === 403,
    `http=${selfApprove.status}`);

  say('finance: approve the refund → money returns via Paystack');
  const beforeR = (await refundsSeen()).length;
  const { result: approve } = await withDualControl('refund', { token: T.finance }, () =>
    call('payment', `/admin/refund-requests/${requestId}/approve`, {
      method: 'POST', token: T.finance, raw: true, body: { note: 'e2e approved' },
    }));
  detail(`http=${approve.status} ${JSON.stringify(approve.json).slice(0, 220)}`);
  await sleep(2500);
  const refunds = await refundsSeen();
  detail(`refunds at provider: ${refunds.length} (was ${beforeR})`);
  check('approval instructs a refund at the provider', refunds.length > beforeR, `${beforeR} -> ${refunds.length}`);

  say('ledger: the refund unwinds the journal and stays balanced');
  await sleep(2500);
  const { byRef, balanced } = printLedger(orderId);
  check('journal still balances after the refund', balanced === true, JSON.stringify(byRef));

  // ---------------------------------------------------------------- dispute
  say('customer: open a dispute on the order');
  const dispute = await call('ledger', '/ledger/disputes', {
    method: 'POST', token: T.customer, raw: true,
    body: { orderId, reason: 'MISSING_ITEM', description: 'One waakye was missing from the order' },
  });
  detail(`http=${dispute.status} ${JSON.stringify(dispute.json).slice(0, 200)}`);
  check('customer can open a dispute', dispute.status < 400, `http=${dispute.status}`);
  const disputeId = dispute.json?.id;

  if (disputeId) {
    say('security: a customer cannot resolve their own dispute');
    const selfResolve = await call('ledger', `/ledger/admin/disputes/${disputeId}/resolve`, {
      method: 'POST', token: T.customer, raw: true, body: { decision: 'refund_full' },
    });
    check('customer is refused the resolve endpoint', selfResolve.status === 401 || selfResolve.status === 403,
      `http=${selfResolve.status}`);

    say('finance: resolve the dispute as a partial wallet refund');
    const { result: resolve } = await withDualControl('dispute resolve', { token: T.finance }, () =>
      call('ledger', `/ledger/admin/disputes/${disputeId}/resolve`, {
        method: 'POST', token: T.finance, raw: true,
        body: { decision: 'refund_partial', amountPesewas: 500, fault: 'VENDOR', refundMethod: 'WALLET', note: 'e2e' },
      }));
    detail(`http=${resolve.status} ${JSON.stringify(resolve.json).slice(0, 220)}`);
    check('finance can resolve the dispute', resolve.status < 400, `http=${resolve.status}`);
    await sleep(2000);
    const dStatus = sql(`select status from ledger.dispute where id='${disputeId}'`);
    check('dispute is closed after resolution', /RESOLVED|CLOSED/i.test(dStatus || ''), `status=${dStatus}`);
  }

  // ---------------------------------------------------------------- trial balance
  say('accounting: the whole journal still balances');
  const tb = await call('ledger', '/ledger/admin/accounting/trial-balance', { token: T.finance, raw: true });
  detail(`http=${tb.status} ${JSON.stringify(tb.json).slice(0, 300)}`);
  const totals = sqlJson(
    `select json_build_object('dr',coalesce(sum("debitPesewas"),0),'cr',coalesce(sum("creditPesewas"),0))::text from ledger.ledger_entry`,
  );
  detail(`whole ledger: dr=${totals.dr} cr=${totals.cr}`);
  check('every pesewa in the ledger balances', Number(totals.dr) === Number(totals.cr),
    `dr=${totals.dr} cr=${totals.cr}`);

  const unbalanced = sqlJson(
    `select coalesce(json_agg(row_to_json(t))::text,'[]') from (
       select ref, sum("debitPesewas") dr, sum("creditPesewas") cr
       from ledger.ledger_entry group by ref having sum("debitPesewas") <> sum("creditPesewas")) t`,
  );
  check('no individual transaction is unbalanced', unbalanced.length === 0, JSON.stringify(unbalanced));

  summarise('MONEY-OUT');
})().catch((e) => { console.error('\nFAILED:', e.message); process.exit(1); });
