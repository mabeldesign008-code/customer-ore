#!/bin/bash
# One-shot E2E environment setup: deps, builds, infra binaries, infra services, seed.
# Idempotent — safe to run every turn after a sandbox reset.
set -u
cd /home/user/ma-ore

# 1. infra binaries (whole-VM resets wipe these)
if ! which nats-server >/dev/null 2>&1; then
  VER=$(curl -s https://api.github.com/repos/nats-io/nats-server/releases/latest | grep -oP '"tag_name":\s*"\K[^"]+')
  curl -sL -o /tmp/nats.tar.gz "https://github.com/nats-io/nats-server/releases/download/${VER}/nats-server-${VER}-linux-amd64.tar.gz"
  tar xzf /tmp/nats.tar.gz -C /tmp && sudo cp /tmp/nats-server-*/nats-server /usr/local/bin/
fi
if ! which redis-server >/dev/null 2>&1; then
  sudo apt-get update >/dev/null 2>&1 && sudo apt-get install -y redis-server >/dev/null 2>&1
fi
echo "infra binaries: nats=$(which nats-server) redis=$(which redis-server)"

# 2. deps
if [ ! -d node_modules ]; then
  corepack pnpm install > /tmp/setup-install.log 2>&1 || { echo "INSTALL FAIL"; tail -5 /tmp/setup-install.log; exit 1; }
fi
echo "deps OK"

# 3. builds (skip if already built in this turn)
export NODE_OPTIONS=--max-old-space-size=1536
if [ ! -f apps/auth/dist/main.js ]; then
  for l in contracts config geo paystack bus jobs maps notify core storage db seed twilio-voice; do
    (cd libs/$l && corepack pnpm exec tsc -p tsconfig.build.json >/dev/null 2>&1) || echo "BUILD FAIL libs/$l"
  done
  for a in auth catalog cart order payment dispatch tracking notification ledger onboarding referral comms analytics gateway; do
    (cd apps/$a && corepack pnpm exec tsc -p tsconfig.build.json >/dev/null 2>&1) || echo "BUILD FAIL apps/$a"
  done
  ls apps/*/dist/main.js 2>/dev/null | wc -l | xargs echo "apps built:"
else
  echo "builds present"
fi

# 4. infra services
mkdir -p /tmp/e2e-logs /tmp/ore-e2e
pgrep -x nats-server >/dev/null || sudo nohup /usr/local/bin/nats-server -p 4222 -js -sd /tmp/nats-store > /tmp/e2e-logs/nats.log 2>&1 &
pgrep -x redis-server >/dev/null || sudo nohup /usr/bin/redis-server --port 6379 --daemonize no > /tmp/e2e-logs/redis.log 2>&1 &
sleep 3
pgrep -x nats-server >/dev/null && echo "nats UP" || echo "nats DOWN"
pgrep -x redis-server >/dev/null && echo "redis UP" || echo "redis DOWN"

# 5. seed (idempotent)
cd /tmp/ore-e2e
ln -sf /home/user/ma-ore/.env /tmp/ore-e2e/.env
TS_NODE_PROJECT=/home/user/ma-ore/libs/seed/tsconfig.json node --env-file=/home/user/ma-ore/.env \
  -r /home/user/ma-ore/node_modules/ts-node/register/transpile-only \
  /home/user/ma-ore/libs/seed/src/run.ts > /tmp/e2e-logs/seed.log 2>&1 && echo "seed OK" || { echo "SEED FAIL"; tail -8 /tmp/e2e-logs/seed.log; }
echo "setup complete"
