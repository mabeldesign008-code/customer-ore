#!/usr/bin/env bash
# Rebuild the whole local environment from a bare sandbox.
#
# This sandbox loses node_modules, pnpm, Postgres, Redis, NATS and every dist between sessions.
# Recovering by hand takes a dozen commands in a specific order and is easy to get subtly wrong
# (build order matters: libs/core needs notify, maps and paystack built first). Doing it as one
# idempotent script means a reset costs one command instead of a debugging session.
#
# Usage: bash tools/e2e/restore-env.sh [--skip-build]
set -u
ORE=/home/user/ore
RUN=/tmp/ore-run
LOGS=/tmp/ore-logs
mkdir -p "$RUN" "$LOGS"

step() { echo; echo "=== $* ==="; }

step "toolchain"
command -v pnpm >/dev/null 2>&1 || sudo npm i -g pnpm@9 >/dev/null 2>&1
[ -d "$ORE/node_modules" ] || {
  (cd "$ORE" && pnpm install 2>&1 | tail -3)
  # Native modules are NOT rebuilt by a plain install here, and an unbuilt better-sqlite3
  # silently fails 44 ledger tests rather than erroring at install time.
  (cd "$ORE" && pnpm rebuild better-sqlite3 sqlite3 2>&1 | tail -2)
}

step "postgres + redis"
command -v psql >/dev/null 2>&1 || sudo apt-get install -y postgresql postgresql-client redis-server >/dev/null 2>&1
pg_isready >/dev/null 2>&1 || sudo pg_ctlcluster 17 main start >/dev/null 2>&1
sleep 2
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='ore'" 2>/dev/null | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE ore LOGIN PASSWORD 'ore' SUPERUSER;" >/dev/null 2>&1
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='oredelivery'" 2>/dev/null | grep -q 1 \
  || sudo -u postgres createdb -O ore oredelivery
redis-cli ping >/dev/null 2>&1 || redis-server --daemonize yes --port 6379 --save '' >/dev/null 2>&1
pg_isready; redis-cli ping

step "nats"
command -v nats-server >/dev/null 2>&1 || {
  curl -sL https://github.com/nats-io/nats-server/releases/download/v2.10.22/nats-server-v2.10.22-linux-amd64.tar.gz -o /tmp/nats.tgz
  tar -xzf /tmp/nats.tgz -C /tmp
  sudo cp /tmp/nats-server-v2.10.22-linux-amd64/nats-server /usr/local/bin/
}
nats-server --version
pgrep -f "nats-server -js" >/dev/null || echo "  (start NATS with start_process: nats-server -js -sd /tmp/natsdata -m 8222 -p 4222)"

step "env overlay"
cat > "$RUN/prod.env" <<'EOF'
NODE_ENV=production
DB_TYPE=postgres
DATABASE_URL=postgres://ore:ore@127.0.0.1:5432/oredelivery
NATS_URL=nats://127.0.0.1:4222
REDIS_URL=redis://127.0.0.1:6379
BUS_MODE=distributed
PAYSTACK_MODE=live
PAYSTACK_BASE_URL=http://127.0.0.1:4999
GEOCODER_MODE=mock
LOG_LEVEL=info
SMS_PROVIDER=log
EMAIL_PROVIDER=log
WEBHOOK_STUCK_AFTER_MS=8000
WEBHOOK_SWEEP_INTERVAL_MS=5000
EOF
echo "wrote $RUN/prod.env"

if [ "${1:-}" != "--skip-build" ]; then
  step "build (one package at a time — 2GB box, parallel builds OOM)"
  cd "$ORE"
  # Two passes: the first fails for libs whose dependencies build later in the alphabet
  # (libs/core needs notify/maps/paystack), the second picks them up.
  for pass in 1 2; do
    fail=0; ok=0
    for p in libs/* apps/*; do
      [ -f "$p/tsconfig.build.json" ] || continue
      if NODE_OPTIONS=--max-old-space-size=1000 npx tsc -p "$p/tsconfig.build.json" > "/tmp/build-$(basename "$p").log" 2>&1; then
        ok=$((ok+1))
      else
        fail=$((fail+1)); [ "$pass" = 2 ] && { echo "FAIL $p"; tail -3 "/tmp/build-$(basename "$p").log"; }
      fi
    done
    echo "pass $pass: ok=$ok fail=$fail"
    [ "$fail" = 0 ] && break
  done
fi

echo
echo "Next:"
echo "  1. start_process: nats-server -js -sd /tmp/natsdata -m 8222 -p 4222"
echo "  2. bash tools/e2e/migrate.sh     # boots each service once to self-migrate"
echo "  3. node libs/seed/dist/libs/seed/src/run.js"
echo "  4. start_process: bash tools/e2e/boot-stack.sh"
