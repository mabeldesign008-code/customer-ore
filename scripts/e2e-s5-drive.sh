#!/usr/bin/env bash
# One-off: drive previously-assigned S5 orders to DELIVERED (runner bug workaround).
set -uo pipefail
cd /tmp/ore-e2e
VLAT=5.116; VLNG=-1.252
IK="x-ore-internal-key: $(grep -E '^INTERNAL_SERVICE_KEY=' .env | cut -d= -f2-)"
RESULTS=/tmp/ore-e2e/s5-results2.txt; : > "$RESULTS"
RIDER_KEYS="rider rider2 rider3 rider4 rider5"
DROPS=("5.128,-1.288,UCC Science Block" "5.132,-1.293,UCC Central Cafeteria" "5.124,-1.284,UCC Library" "5.121,-1.297,UCC SRC Building" "5.135,-1.281,UCC Chemistry Dept")
declare -A OIDS
while read -r i oid; do OIDS[$i]=$oid; done < /tmp/ore-e2e/s5-oids.txt

declare -A RIDER_TOK
for rk in $RIDER_KEYS; do
  RTOK=$(jq -r .$rk tokens.json)
  RID=$(curl -s -H "Authorization: Bearer $RTOK" http://localhost:4105/riders/me | jq -r .id)
  RIDER_TOK[$RID]=$RTOK
done

for i in 1 2 3 4 5; do
  OID=${OIDS[$i]}
  ST=$(curl -s -H "$IK" http://localhost:4103/internal/orders/$OID | jq -r .status)
  if [ "$ST" != "RIDER_ASSIGNED" ]; then echo "$i $OID skip($ST)" >> "$RESULTS"; continue; fi
  RID=$(curl -s -H "$IK" http://localhost:4103/internal/orders/$OID | jq -r .riderId)
  RT=${RIDER_TOK[$RID]:-}
  [ -z "$RT" ] && { echo "$i $OID RIDER_NOT_OURS(${RID:0:8})" >> "$RESULTS"; continue; }
  IFS=',' read -r DLAT DLNG DLABEL <<< "${DROPS[$((i-1))]}"
  curl -s -X POST -H "Authorization: Bearer $RT" -H "content-type: application/json" \
    http://localhost:4105/orders/$OID/picked-up -d "{\"riderLat\":$VLAT,\"riderLng\":$VLNG}" >/dev/null
  sleep 4
  OTP=$(curl -s -X POST -H "$IK" http://localhost:4103/internal/orders/$OID/otp/reveal | jq -r '.otp // empty')
  ST=$(curl -s -X POST -H "Authorization: Bearer $RT" -H "content-type: application/json" \
    http://localhost:4103/orders/$OID/confirm-otp -d "{\"otp\":\"$OTP\",\"riderLat\":$DLAT,\"riderLng\":$DLNG}" | jq -r '.status // "FAIL"')
  echo "$i $OID $ST" >> "$RESULTS"
  echo "J$i done: $ST (rider ${RID:0:8})"
done
echo "--- results ---"; cat "$RESULTS"
