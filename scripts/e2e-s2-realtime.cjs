#!/usr/bin/env node
/* S2: realtime tracking — customer WS subscribes to order room, rider pings a
 * 12-GPS route; assertions on delivery, debounce, ETA, and room isolation. */
const { io } = require('/tmp/wsclient/node_modules/socket.io-client');
const fs = require('fs');
const tokens = JSON.parse(fs.readFileSync('/tmp/ore-e2e/tokens.json', 'utf8'));

const OID = process.argv[2];
const SOCK = 'http://localhost:4106/tracking';
const PATH = '/tracking/socket.io';

const ROUTE = [
  [5.1280, -1.2880], [5.1268, -1.2854], [5.1254, -1.2826], [5.1239, -1.2797],
  [5.1222, -1.2768], [5.1204, -1.2738], [5.1185, -1.2708], [5.1165, -1.2678],
  [5.1144, -1.2649], [5.1122, -1.2620], [5.1100, -1.2592], [5.1077, -1.2564],
];

function connect(token) {
  return new Promise((resolve, reject) => {
    const s = io(SOCK, { path: PATH, auth: { token }, transports: ['websocket'], timeout: 5000 });
    s.on('connect', () => resolve(s));
    s.on('connect_error', (e) => reject(new Error('connect_error: ' + e.message)));
  });
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const results = [];
  const ok = (name, cond, extra = '') => { results.push([cond, name]); console.log(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`); };

  const cust = await connect(tokens.customer);
  const other = await connect(tokens.customer2);
  console.log('both sockets connected');

  const subAck = await new Promise((resolve) => {
    cust.on('subscribed', (d) => resolve(d));
    cust.emit('subscribe', { orderId: OID });
    setTimeout(() => resolve(null), 4000);
  });
  ok('customer subscribes to order room', !!subAck && subAck.orderId === OID, JSON.stringify(subAck));

  const errMsg = await new Promise((resolve) => {
    other.on('error', (d) => resolve(d));
    other.emit('subscribe', { orderId: OID });
    setTimeout(() => resolve(null), 4000);
  });
  ok('cross-customer subscribe rejected (403)', !!errMsg && (errMsg.error?.statusCode === 403 || errMsg.code === 'FORBIDDEN'), JSON.stringify(errMsg));

  const events = [];
  cust.on('rider.location', (d) => events.push(d));
  const t0 = Date.now();
  for (let i = 0; i < ROUTE.length; i++) {
    const [lat, lng] = ROUTE[i];
    const r = await fetch('http://localhost:4106/tracking/rider/location', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${tokens.rider}` },
      body: JSON.stringify({ lat, lng, speedKmh: 25 + (i % 5) * 2, orderId: OID }),
    });
    if (!r.ok) { console.error('ping failed', r.status, await r.text()); process.exit(1); }
    await wait(2500);
  }
  const elapsed = (Date.now() - t0) / 1000;
  ok('rider.location events received by customer', events.length >= 3, `${events.length} WS events in ${elapsed}s (5s debounce)`);
  const last = events[events.length - 1];
  ok('last event has sane coords + ts', !!last && typeof last.lat === 'number' && !!last.ts, JSON.stringify(last));

  // ETA recompute uses the LIVE Google Maps route API → TRACKING_ETA_CHANGED on the bus
  const nats = require('/home/user/ore/node_modules/nats');
  const nc = await nats.connect({ servers: 'nats://localhost:4222' });
  const jsm = await nc.jetstreamManager();
  const msgs = [];
  try {
    const info = await jsm.streams.info('ORE_EVENTS');
    const from = Math.max(1, info.state.messages - 40);
    for (let seq = from; seq <= info.state.messages; seq++) {
      const m = await jsm.streams.getMessage('ORE_EVENTS', { seq }).catch(() => null);
      if (m) {
        const body = JSON.parse(nats.StringCodec().decode(m.data));
        if (body.name && body.name.includes('eta')) msgs.push(body);
      }
    }
  } catch { /* ignore */ }
  await nc.drain();
  ok('TRACKING_ETA_CHANGED published (live maps route)', msgs.length > 0, `${msgs.length} eta event(s), last=${msgs[msgs.length-1]?.payload?.etaMinutes}m`);

  console.log(`\nS2 ${results.every(([c]) => c) ? 'PASSED' : 'FAILED'} — ${results.filter(([c]) => c).length}/${results.length}`);
  process.exit(results.every(([c]) => c) ? 0 : 1);
}

main().catch((e) => { console.error('S2 ERROR', e); process.exit(1); });
