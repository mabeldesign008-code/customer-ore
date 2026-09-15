#!/usr/bin/env node
/**
 * Fake Paystack — speaks the real Paystack HTTP API on localhost.
 *
 * Why this exists rather than PAYSTACK_MODE=mock:
 *
 * Mock mode short-circuits inside the client, so everything downstream of `fetch` — the live
 * verify-before-grant branch, the amount and currency comparison, webhook HMAC verification, the
 * transfer and refund response handling — is never executed outside production. That is exactly
 * the code that moves money, and it was the least tested code in the repo. Pointing
 * PAYSTACK_BASE_URL at this server runs the live path end to end while keeping the money fake.
 *
 * It is deliberately strict where the old mock was permissive:
 *   - a reference is `abandoned` until it is explicitly paid, so verify-before-grant can fail
 *   - verify returns the amount that was initialised, so amount tampering is detectable
 *   - the bearer token must match PAYSTACK_SECRET_KEY, so auth wiring is exercised
 *   - unknown references 404 instead of being invented
 *
 * Control endpoints (not part of the real API, prefixed /_control) drive it from tests:
 *   POST /_control/pay/:reference      mark a transaction paid, optionally with a wrong amount
 *   POST /_control/webhook/:reference  send a correctly signed charge.success to the payment svc
 *   GET  /_control/state               dump every transaction, transfer and refund seen
 */
const http = require('http');
const crypto = require('crypto');

const PORT = Number(process.env.FAKE_PAYSTACK_PORT || 4999);
const SECRET = process.env.PAYSTACK_SECRET_KEY || 'sk_test_fake';
const WEBHOOK_TARGET = process.env.WEBHOOK_TARGET || 'http://127.0.0.1:4104/payments/webhook/paystack';

/** reference -> transaction */
const txns = new Map();
const transfers = new Map();
const refunds = [];
const recipients = new Map();

function send(res, code, body) {
  const payload = JSON.stringify(body);
  res.writeHead(code, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) });
  res.end(payload);
}

function authed(req) {
  return (req.headers.authorization || '') === `Bearer ${SECRET}`;
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

/** Post a Paystack-shaped webhook, signed the way Paystack signs: HMAC-SHA512 over the raw body. */
async function postWebhook(event, data) {
  const body = JSON.stringify({ event, data });
  const signature = crypto.createHmac('sha512', SECRET).update(body).digest('hex');
  const res = await fetch(WEBHOOK_TARGET, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-paystack-signature': signature },
    body,
  });
  return { status: res.status, text: await res.text() };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const path = url.pathname;
  const body = req.method === 'POST' ? await readBody(req) : {};

  // ---- control plane -------------------------------------------------------
  if (path.startsWith('/_control/')) {
    const [, , action, ...rest] = path.split('/');
    const reference = decodeURIComponent(rest.join('/'));
    if (action === 'state') {
      return send(res, 200, {
        transactions: [...txns.values()],
        transfers: [...transfers.values()],
        refunds,
        recipients: [...recipients.values()],
      });
    }
    if (action === 'pay') {
      const t = txns.get(reference);
      if (!t) return send(res, 404, { error: `unknown reference ${reference}` });
      // `amount` lets a test pay a different amount than was initialised, to prove the
      // service compares what Paystack says against what it expected.
      t.status = 'success';
      t.paid_at = new Date().toISOString();
      t.channel = body.channel || 'mobile_money';
      if (typeof body.amount === 'number') t.amount = body.amount;
      return send(res, 200, { ok: true, transaction: t });
    }
    if (action === 'webhook') {
      const t = txns.get(reference);
      if (!t) return send(res, 404, { error: `unknown reference ${reference}` });
      const out = await postWebhook(body.event || 'charge.success', {
        reference,
        amount: typeof body.amount === 'number' ? body.amount : t.amount,
        currency: t.currency,
        channel: t.channel || 'mobile_money',
        paid_at: t.paid_at || new Date().toISOString(),
        status: 'success',
        customer: { email: t.email },
        metadata: t.metadata,
      });
      return send(res, 200, out);
    }
    if (action === 'reset') {
      txns.clear();
      transfers.clear();
      recipients.clear();
      refunds.length = 0;
      return send(res, 200, { ok: true });
    }
    return send(res, 404, { error: 'unknown control action' });
  }

  // ---- the parts of the real API the client actually calls -----------------
  if (!authed(req)) return send(res, 401, { status: false, message: 'Invalid key' });

  if (path === '/transaction/initialize' && req.method === 'POST') {
    const reference = body.reference;
    txns.set(reference, {
      reference,
      amount: body.amount,
      currency: body.currency || 'GHS',
      email: body.email,
      metadata: body.metadata,
      // The whole point: a freshly initialised transaction has NOT been paid.
      status: 'abandoned',
      channel: null,
      paid_at: null,
    });
    return send(res, 200, {
      status: true,
      data: {
        reference,
        access_code: `acc_${crypto.randomBytes(6).toString('hex')}`,
        authorization_url: `http://127.0.0.1:${PORT}/checkout/${reference}`,
      },
    });
  }

  if (path.startsWith('/transaction/verify/') && req.method === 'GET') {
    const reference = decodeURIComponent(path.slice('/transaction/verify/'.length));
    const t = txns.get(reference);
    if (!t) return send(res, 404, { status: false, message: 'Transaction reference not found' });
    return send(res, 200, {
      status: true,
      data: {
        status: t.status,
        amount: t.amount,
        currency: t.currency,
        channel: t.channel,
        paid_at: t.paid_at,
        customer: { email: t.email },
        metadata: t.metadata,
      },
    });
  }

  if (path === '/refund' && req.method === 'POST') {
    const t = txns.get(body.transaction);
    if (!t) return send(res, 404, { status: false, message: 'Transaction not found' });
    const alreadyRefunded = refunds
      .filter((r) => r.transaction === body.transaction)
      .reduce((s, r) => s + r.amount, 0);
    const amount = typeof body.amount === 'number' ? body.amount : t.amount - alreadyRefunded;
    if (amount + alreadyRefunded > t.amount) {
      // Paystack will not refund more than was captured; neither will we, so an
      // over-refund bug surfaces here instead of silently printing money.
      return send(res, 400, { status: false, message: 'Refund amount exceeds transaction amount' });
    }
    const record = {
      reference: `RF-${crypto.randomBytes(4).toString('hex')}`,
      transaction: body.transaction,
      status: 'processed',
      amount,
      currency: body.currency || 'GHS',
      reason: body.reason,
    };
    refunds.push(record);
    return send(res, 200, { status: true, data: record });
  }

  if (path === '/transferrecipient' && req.method === 'POST') {
    const code = `RCP_${crypto.randomBytes(5).toString('hex')}`;
    recipients.set(code, { recipient_code: code, ...body });
    return send(res, 200, { status: true, data: { recipient_code: code } });
  }

  if (path === '/transfer' && req.method === 'POST') {
    const record = {
      reference: body.reference,
      amount: body.amount,
      currency: body.currency || 'GHS',
      recipient: body.recipient,
      metadata: body.metadata,
      // Real transfers are asynchronous — the webhook is the source of truth. Saying
      // "pending" here keeps the service on the code path it uses in production.
      status: process.env.FAKE_PAYSTACK_TRANSFER_STATUS || 'pending',
    };
    transfers.set(body.reference, record);
    return send(res, 200, { status: true, data: record });
  }

  if (path.startsWith('/transfer/verify/') && req.method === 'GET') {
    const reference = decodeURIComponent(path.slice('/transfer/verify/'.length));
    const t = transfers.get(reference);
    if (!t) return send(res, 404, { status: false, message: 'Transfer not found' });
    return send(res, 200, { status: true, data: { reference, status: t.status } });
  }

  if (path === '/bank' && req.method === 'GET') {
    return send(res, 200, {
      status: true,
      data: [
        { name: 'MTN Mobile Money', code: 'MTN', currency: 'GHS', type: 'mobile_money' },
        { name: 'Telecel Cash', code: 'VOD', currency: 'GHS', type: 'mobile_money' },
      ],
    });
  }

  return send(res, 404, { status: false, message: `fake-paystack has no route ${req.method} ${path}` });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[fake-paystack] listening on http://127.0.0.1:${PORT} -> webhooks to ${WEBHOOK_TARGET}`);
});
