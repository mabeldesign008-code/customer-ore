#!/usr/bin/env bash
# Boot the live stack for tools/e2e scenarios.
#
# PAYSTACK_MODE is live and pointed at tools/e2e/fake-paystack.cjs, not mock: mock mode
# short-circuits inside the client so the live verify/webhook/transfer/refund code — the code that
# moves money — never runs. Production also refuses to boot in mock mode now (see loadEnv).
set -u
ORE=/home/user/ore
RUN=/tmp/ore-run
LOGS=/tmp/ore-logs
mkdir -p "$LOGS"

# Only start the fake provider if nothing is already serving it.
if ! (exec 3<>/dev/tcp/127.0.0.1/4999) 2>/dev/null; then
  export PAYSTACK_SECRET_KEY="$(grep '^PAYSTACK_SECRET_KEY=' "$ORE/.env" | cut -d= -f2-)"
  node "$ORE/tools/e2e/fake-paystack.cjs" > "$LOGS/fake-paystack.log" 2>&1 &
  echo "fake-paystack pid $!"
  sleep 1
else
  echo "fake-paystack already listening on 4999"
fi

boot() {
  local svc="$1" port="$2"
  PORT="$port" node --env-file="$ORE/.env" --env-file="$RUN/prod.env" \
    "$ORE/apps/$svc/dist/main.js" > "$LOGS/$svc.log" 2>&1 &
  echo "$svc pid $! port $port"
}

cd "$RUN"
boot auth 4100
boot catalog 4101
boot cart 4102
boot order 4103
boot payment 4104
boot dispatch 4105
boot ledger 4108
boot gateway 4000

wait
