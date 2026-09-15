#!/bin/bash
# Ore E2E boot: infra + all 14 backend services with the REAL .env credentials.
# No mock forcing — PAYSTACK_MODE / GEOCODER_MODE come from .env (live).
set -u
# --- infra: NATS + Redis (idempotent) ---
pgrep -x nats-server >/dev/null || { sudo nohup /usr/local/bin/nats-server -p 4222 > /tmp/e2e-logs/nats.log 2>&1 & sleep 1; }
pgrep -x redis-server >/dev/null || { sudo nohup /usr/bin/redis-server --port 6379 --daemonize no > /tmp/e2e-logs/redis.log 2>&1 & sleep 1; }
mkdir -p /tmp/ore-e2e /tmp/e2e-logs
cd /tmp/ore-e2e
# Services load .env relative to cwd; give them the real one.
ln -sf /home/user/ore/.env /tmp/ore-e2e/.env

# Only infra wiring is exported; app credentials come from .env.
export NODE_ENV=development
export DB_TYPE=sqlite
export NATS_URL=nats://localhost:4222
export REDIS_URL=redis://localhost:6379

echo "=== seeding (idempotent) ==="
TS_NODE_PROJECT=/home/user/ore/libs/seed/tsconfig.json node --env-file=/home/user/ore/.env -r /home/user/ore/node_modules/ts-node/register/transpile-only /home/user/ore/libs/seed/src/run.ts > /tmp/e2e-logs/seed.log 2>&1
tail -3 /tmp/e2e-logs/seed.log

APPS="auth catalog cart order payment dispatch tracking notification ledger onboarding referral comms analytics gateway"
for a in $APPS; do
  echo "=== starting $a ==="
  (node /home/user/ore/apps/$a/dist/main.js > /tmp/e2e-logs/$a.log 2>&1) &
done

echo "all launched"

# Keep this process alive so the service children stay attached to it.
wait
