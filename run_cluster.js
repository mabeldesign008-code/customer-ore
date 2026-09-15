#!/usr/bin/env node
/**
 * Boot the whole backend cluster from compiled dist, one process per service.
 *
 * Audit S-7: this file used to hardcode `DB_TYPE: 'sqlite'` and `NODE_ENV: 'development'`
 * into every child's environment. That made it a one-command way to start the money
 * subsystem on a throwaway database in development mode — which is also the mode where
 * loadEnv relaxes its production checks (mock Paystack allowed, weak internal key, no
 * NATS credentials required). It also spawned only 7 of the 18 services and detached them,
 * so `Ctrl-C` left orphans holding the ports and the next run failed confusingly.
 *
 * Now: the environment is inherited and only NODE_ENV/DB_TYPE are defaulted, sqlite is
 * refused outright in production, every service starts (gateway last, since it proxies to
 * the others), logs land in `logs/<service>.log`, and signals are forwarded so the cluster
 * actually stops when you stop it.
 *
 * Usage: node run_cluster.js          (dev defaults)
 *        NODE_ENV=production node run_cluster.js
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const NODE_ENV = process.env.NODE_ENV || 'development';
// Same default loadEnv uses — do not invent a different one here.
const DB_TYPE = process.env.DB_TYPE || 'postgres';

if (NODE_ENV === 'production' && DB_TYPE === 'sqlite') {
  console.error(
    'run_cluster: refusing to start — NODE_ENV=production with DB_TYPE=sqlite.\n' +
      '  The ledger, payments and tax engine need Postgres (journal invariants, row locks,\n' +
      '  advisory locks). Set DB_TYPE=postgres and a real DATABASE_URL.',
  );
  process.exit(1);
}

// Gateway last: it proxies to every other service and fails noisily if they are not up.
// (vendor/customer/rider/admin have no main.ts — they are modules mounted into the others.)
const SERVICES = [
  'auth', 'onboarding', 'catalog', 'cart',
  'order', 'dispatch', 'tracking', 'payment', 'ledger', 'referral',
  'notification', 'comms', 'analytics', 'gateway',
];

const logsDir = path.join(__dirname, 'logs');
fs.mkdirSync(logsDir, { recursive: true });

const env = { ...process.env, NODE_ENV, DB_TYPE };
const children = [];

for (const service of SERVICES) {
  const main = path.join(__dirname, 'apps', service, 'dist', 'main.js');
  if (!fs.existsSync(main)) {
    console.warn(`SKIP ${service} — ${path.relative(__dirname, main)} not found (run pnpm build:backend)`);
    continue;
  }
  const out = fs.openSync(path.join(logsDir, `${service}.log`), 'a');
  const child = spawn(process.execPath, ['--max-old-space-size=256', main], {
    cwd: __dirname,
    env,
    stdio: ['ignore', out, out],
  });
  child.on('exit', (code, signal) => {
    console.error(`${service} exited (code ${code}, signal ${signal}) — see logs/${service}.log`);
  });
  children.push({ service, child });
  console.log(`started ${service} (pid ${child.pid}) → logs/${service}.log`);
}

if (!children.length) {
  console.error('run_cluster: nothing to start — no service is built. Run `pnpm build:backend`.');
  process.exit(1);
}

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\nrun_cluster: ${signal} — stopping ${children.length} service(s)`);
  for (const { service, child } of children) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM');
      console.log(`  stopped ${service} (pid ${child.pid})`);
    }
  }
  // Give them a moment to flush, then let the process end naturally.
  setTimeout(() => process.exit(0), 1500);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
