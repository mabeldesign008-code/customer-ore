#!/usr/bin/env bash
# S5: Friday-surge concurrency — 5 COD journeys in parallel, same vendor.
# Phase 1: 5 concurrent checkouts + vendor accept/ready.
# Phase 2: accept any dispatch offer seen on our riders; drive EVERY RIDER_ASSIGNED
#          order (incl. batch members) through pickup → OTP → delivery.
set -uo pipefail
cd /tmp/ore-e2e
ITEM=${1:-90ab9fa5-8781-444a-ad96-9404f3a459e6}
VENDOR=${2:-37667cf5-d06f-4f2d-97fb-89bdee6d4e62}
VLAT=5.116; VLNG=-1.252
IK="x-ore-internal-key: $(grep -E '^INTERNAL_SERVICE_KEY=' .env | cut -d= -f2-)"
RESULTS=/tmp/ore-e2e/s5-results.txt
OIDFILE=/tmp/ore-e2e/s5-oids.txt
: > "$RESULTS"; : > "$OIDFILE"

# ── Fixture reset: only our 5 riders AVAILABLE + COD-CLEAR ──────────
python3 - <<'PY'
import sqlite3
db = sqlite3.connect('/tmp/ore-e2e/ore-dispatch.sqlite')
ours = {'5dc4ae56', '79925429', 'dbfffe58', '2a5ba5ae', '9f90d2bf'}
for r in db.execute("SELECT id, userId FROM rider").fetchall():
    if r[1][:8] in ours:
        db.execute("UPDATE rider SET status='AVAILABLE', codStatus='CLEAR', codBlocked=0, cooldownUntil=NULL, pausedUntil=NULL, idleSince=datetime('now') WHERE id=?", (r[0],))
    else:
        db.execute("UPDATE rider SET status='OFFLINE' WHERE id=?", (r[0],))
db.execute("UPDATE offer SET status='SUPERSEDED' WHERE status='PENDING'")
db.commit()
print('fixture: 5 riders AVAILABLE/CLEAR, others OFFLINE')
PY

RIDER_KEYS="rider rider2 rider3 rider4 rider5"
DROPS=("5.128,-1.288,UCC Science Block" "5.132,-1.293,UCC Central Cafeteria" "5.124,-1.284,UCC Library" "5.121,-1.297,UCC SRC Building" "5.135,-1.281,UCC Chemistry Dept")
OIDS=("" "" "" "" "" "")

curl_retry() { # retry only on HTTP 429; stop otherwise
  local out code
  for try in 1 2 3; do
    out=$(curl -s --max-time 10 "$@")
    code=$(echo "$out" | jq -r 'if type=="object" then (.statusCode // .error.statusCode // "") else "" end' 2>/dev/null)
    if [ "$code" != "429" ] && [ -n "$out" ]; then echo "$out"; return 0; fi
    sleep 2
  done
  echo "$out"
}

checkout_ready() { # $1=idx — run in background
  local i=$1 k=customer T VT DROP DLAT DLNG DLABEL CHECK OID
  [ $i -gt 1 ] && k=customer$i
  T=$(jq -r .$k tokens.json); VT=$(jq -r .vendor tokens.json)
  IFS=',' read -r DLAT DLNG DLABEL <<< "${DROPS[$((i-1))]}"
  curl_retry -X POST -H "Authorization: Bearer $T" -H "content-type: application/json" \
    http://localhost:4102/cart/items -d "{\"itemId\":\"$ITEM\",\"qty\":1}" >/dev/null
  CHECK=$(curl_retry -X POST -H "Authorization: Bearer $T" -H "content-type: application/json" \
    http://localhost:4102/cart/checkout -d "{\"address\":{\"label\":\"$DLABEL\",\"lat\":$DLAT,\"lng\":$DLNG,\"details\":\"S5J$i\",\"source\":\"MAP\"},\"paymentMethods\":[{\"vendorId\":\"$VENDOR\",\"method\":\"COD\"}],\"note\":\"S5-$i\"}")
  OID=$(echo "$CHECK" | jq -r '.orders[0].orderId // empty')
  echo "$i $OID" >> "$OIDFILE"
  if [ -z "$OID" ]; then echo "J$i CHECKOUT_FAIL: $(echo "$CHECK" | jq -c .error)" >> "$RESULTS"; return 1; fi
  curl_retry -X POST -H "Authorization: Bearer $VT" http://localhost:4103/orders/$OID/accept >/dev/null
  curl_retry -X POST -H "Authorization: Bearer $VT" http://localhost:4103/orders/$OID/ready >/dev/null
}

# ── Phase 1: concurrent checkout + vendor ready ─────────────────────
pids=()
for i in 1 2 3 4 5; do checkout_ready $i & pids+=($!); done
for p in "${pids[@]}"; do wait $p; done
while read -r i oid; do OIDS[$i]=$oid; done < "$OIDFILE"
echo "orders: ${OIDS[*]:1}"
for i in 1 2 3 4 5; do [ -z "${OIDS[$i]}" ] && { echo "phase1 failed — abort"; exit 1; }; done

# riderId → token map
declare -A RIDER_TOK
for rk in $RIDER_KEYS; do
  RTOK=$(jq -r .$rk tokens.json)
  RID=$(curl_retry -H "Authorization: Bearer $RTOK" http://localhost:4105/riders/me | jq -r .id)
  RIDER_TOK[$RID]=$RTOK
  echo "rider map: ${RID:0:8} <- $rk"
done

# ── Phase 2: accept offers, then drive all assigned orders ──────────
declare -A ACCEPTED PROCESSED

drive_order() { # $1=idx
  local i=$1 oid=${OIDS[$1]} T ST RID RT DROP DLAT DLNG OTP
  [ -n "${PROCESSED[$oid]:-}" ] && return
  # customer-facing GET masks riderId — use the internal endpoint
  ST=$(curl_retry -H "$IK" http://localhost:4103/internal/orders/$oid | jq -r .status)
  case "$ST" in
    RIDER_ASSIGNED)
      RID=$(curl_retry -H "$IK" http://localhost:4103/internal/orders/$oid | jq -r .riderId)
      RT=${RIDER_TOK[$RID]:-}
      if [ -z "$RT" ]; then echo "J$i $oid RIDER_NOT_OURS(${RID:0:8})" >> "$RESULTS"; PROCESSED[$oid]=1; return; fi
      IFS=',' read -r DLAT DLNG DLABEL <<< "${DROPS[$((i-1))]}"
      curl_retry -X POST -H "Authorization: Bearer $RT" -H "content-type: application/json" \
        http://localhost:4105/orders/$oid/picked-up -d "{\"riderLat\":$VLAT,\"riderLng\":$VLNG}" >/dev/null
      sleep 4
      OTP=$(curl_retry -X POST -H "$IK" http://localhost:4103/internal/orders/$oid/otp/reveal | jq -r '.otp // empty')
      if [ -z "$OTP" ]; then echo "J$i $oid NO_OTP" >> "$RESULTS"; PROCESSED[$oid]=1; return; fi
      ST=$(curl_retry -X POST -H "Authorization: Bearer $RT" -H "content-type: application/json" \
        http://localhost:4103/orders/$oid/confirm-otp -d "{\"otp\":\"$OTP\",\"riderLat\":$DLAT,\"riderLng\":$DLNG}" | jq -r '.status // "FAIL"')
      echo "$i $oid $ST" >> "$RESULTS"
      echo "J$i done: $ST (rider ${RID:0:8})"
      PROCESSED[$oid]=1
      ;;
  esac
}

for iter in $(seq 1 60); do
  # (a) accept any pending offer for our orders (dedup by offer id)
  for rk in $RIDER_KEYS; do
    RTOK=$(jq -r .$rk tokens.json)
    OFFERS=$(curl_retry -H "Authorization: Bearer $RTOK" http://localhost:4105/riders/me/offers 2>/dev/null)
    for ofid in $(echo "$OFFERS" | jq -r --argjson oids "$(printf '%s\n' "${OIDS[@]:1}" | jq -R -s 'split("\n") | map(select(length>0))')" '.[] | select((.orderId as $o | $oids | index($o)) != null) | .id' 2>/dev/null); do
      if [ -z "${ACCEPTED[$ofid]:-}" ]; then
        curl_retry -X POST -H "Authorization: Bearer $RTOK" http://localhost:4105/offers/$ofid/accept >/dev/null
        ACCEPTED[$ofid]=1
        echo "accepted offer ${ofid:0:8} as $rk"
      fi
    done
  done
  # (b) drive every assigned order
  for i in 1 2 3 4 5; do drive_order $i; done
  # (c) finished?
  [ "$(wc -l < "$RESULTS")" -ge 5 ] && break
  sleep 3
done

echo "--- results ---"
cat "$RESULTS"
