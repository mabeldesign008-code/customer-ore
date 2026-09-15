#!/usr/bin/env bash
# Boot each backend service once so it runs its own migrations, then stop it.
#
# Services self-migrate on boot in production mode. Running them one at a time keeps peak memory
# low and makes a failure attributable to a single service instead of a wall of interleaved logs.
set -u
ORE=/home/user/ore
LOGS=/tmp/ore-logs
mkdir -p "$LOGS"

declare -A P=(
  [auth]=4100 [catalog]=4101 [cart]=4102 [order]=4103 [payment]=4104
  [dispatch]=4105 [tracking]=4106 [notification]=4107 [ledger]=4108
  [onboarding]=4109 [referral]=4110 [comms]=4111 [analytics]=4112
)

cd /tmp/ore-run
for svc in "${!P[@]}"; do
  PORT=${P[$svc]} node --env-file="$ORE/.env" --env-file=/tmp/ore-run/prod.env \
    "$ORE/apps/$svc/dist/main.js" > "$LOGS/mig-$svc.log" 2>&1 &
  pid=$!
  code=000
  for _ in $(seq 1 40); do
    sleep 1
    code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${P[$svc]}/health" 2>/dev/null)
    [ "$code" = "200" ] && break
  done
  echo "$svc -> $code"
  kill $pid 2>/dev/null; wait $pid 2>/dev/null
done

echo "MIGRATE_DONE"
psql "postgres://ore:ore@127.0.0.1:5432/oredelivery" -Atc \
  "select count(*) || ' tables' from information_schema.tables where table_schema not in ('pg_catalog','information_schema')"
