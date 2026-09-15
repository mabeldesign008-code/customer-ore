#!/usr/bin/env node
/* Mint real JWT tokens for all Ore e2e actors via the live auth API (dev OTP codes). */
const fs = require('fs');
const BASE = process.env.AUTH_URL || 'http://localhost:4100';

const ACTORS = {
  customer: '233500000001',
  customer2: '233500000002',
  admin: '233540000001',
  rider: '233550000001',
  rider2: '233550000002',
  vendor: '233560000001',
  vendor2: '233560000002',
  customer3: '233500000003',
  customer4: '233500000004',
  customer5: '233500000005',
  rider3: '233550000003',
  rider4: '233550000004',
  rider5: '233550000005',
};

async function main() {
  const out = {};
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  for (const [name, phone] of Object.entries(ACTORS)) {
    // pace requests — verify-otp is throttled at 10/min, and 13 actors need 13 verifies,
    // so space actors far enough apart to stay under the rolling window
    await sleep(7000);
    let ver = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      let r = await fetch(`${BASE}/auth/request-otp`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone, purpose: 'login' }),
      });
      const req = await r.json();
      const code = req.devCode;
      if (!code) throw new Error(`${name}: no devCode in ${JSON.stringify(req)}`);
      r = await fetch(`${BASE}/auth/verify-otp`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const candidate = await r.json();
      if (candidate.accessToken) { ver = candidate; break; }
      if (candidate.statusCode !== 429) throw new Error(`${name}: no accessToken — ${JSON.stringify(candidate)}`);
      await sleep(3000); // throttled — wait for the window to reset
    }
    if (!ver) throw new Error(`${name}: throttled after 3 attempts`);
    out[name] = ver.accessToken;
    console.log(`${name} (${phone}) OK token=${ver.accessToken.slice(0, 24)}… roles=${JSON.stringify(ver.user?.roles || ver.roles || 'n/a')}`);
  }
  fs.writeFileSync('/tmp/ore-e2e/tokens.json', JSON.stringify(out, null, 2));
  console.log('saved /tmp/ore-e2e/tokens.json');
}
main().catch((e) => { console.error(e.message); process.exit(1); });
