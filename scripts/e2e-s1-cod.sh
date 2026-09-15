#!/usr/bin/env bash
# S1: COD food order, full journey — customer → vendor → rider → delivered.
# Uses LIVE credentials (Paystack live mode, real maps). Requires full stack + tokens.
set -uo pipefail
cd /tmp/ore-e2e
T=$(jq -r .customer tokens.json); VT=$(jq -r .vendor tokens.json); RT=$(jq -r .rider tokens.json)
ITEM=${1:-259947cf-a80a-421b-941d-fca393fd56dc}
VENDOR=${2:-34f120da-bb17-4eeb-9533-6f7a0a208037}
VLAT=${3:-5.116}; VLNG=${4:--1.252}   # Lemon Lounge
DLAT=${5:-5.128}; DLNG=${6:--1.288}   # UCC Science Block drop
INTKEY="x-ore-internal-key: $(grep -E '^INTERNAL_SERVICE_KEY=' /tmp/ore-e2e/.env | cut -d= -f2-)"

step() { echo; echo "── S1: $*"; }

step "add to cart"
curl -sf -X POST -H "Authorization: Bearer $T" -H "content-type: application/json" \
  http://localhost:4102/cart/items -d "{\"itemId\":\"$ITEM\",\"qty\":2}" >/dev/null && echo ok

step "checkout (COD)"
CHECK=$(curl -sf -X POST -H "Authorization: Bearer $T" -H "content-type: application/json" \
  http://localhost:4102/cart/checkout -d "{\"address\":{\"label\":\"UCC Science Block\",\"lat\":$DLAT,\"lng\":$DLNG,\"details\":\"Room 12\",\"source\":\"MAP\"},\"paymentMethods\":[{\"vendorId\":\"$VENDOR\",\"method\":\"COD\"}],\"note\":\"S1 e2e\",\"leaveAtDoor\":false}")
OID=$(echo "$CHECK" | jq -r '.orders[0].orderId')
echo "orderId=$OID status=$(echo "$CHECK" | jq -r '.orders[0].status') totalGHS=$(echo "$CHECK" | jq -r '.orders[0].totalPesewas/100')"
echo "$OID" > s1-order.txt

step "vendor accepts → ACCEPTED"
curl -sf -X POST -H "Authorization: Bearer $VT" http://localhost:4103/orders/$OID/accept | jq -c '{status}' | head -1

step "vendor marks ready → READY_FOR_PICKUP"
curl -sf -X POST -H "Authorization: Bearer $VT" http://localhost:4103/orders/$OID/ready | jq -c '{status}' | head -1

step "wait for dispatch offer (1s poll, 20s window)"
OFFER=""
for i in $(seq 1 60); do
  OFFER=$(curl -sf -H "Authorization: Bearer $RT" http://localhost:4105/riders/me/offers 2>/dev/null | jq -c --arg oid "$OID" '.[] | select(.orderId==$oid) | .id' -r 2>/dev/null | head -1)
  [ -n "$OFFER" ] && [ "$OFFER" != "null" ] && break
  sleep 1
done
echo "offer=$OFFER"

step "rider accepts offer → RIDER_ASSIGNED"
[ -n "$OFFER" ] && [ "$OFFER" != "null" ] && curl -sf -X POST -H "Authorization: Bearer $RT" http://localhost:4105/offers/$OFFER/accept | jq -c '{ok,status:.orderStatus//.status}' | head -1
sleep 2

step "rider picks up at vendor (geofenced)"
curl -sf -X POST -H "Authorization: Bearer $RT" -H "content-type: application/json" \
  http://localhost:4105/orders/$OID/picked-up -d "{\"riderLat\":$VLAT,\"riderLng\":$VLNG}" | jq -c '{ok}' | head -1
sleep 4

step "reveal delivery OTP (internal — support/test path)"
OTP=$(curl -sf -X POST -H "$INTKEY" http://localhost:4103/internal/orders/$OID/otp/reveal | jq -r '.otp // .plain // .code')
echo "otp=$OTP"

step "rider confirms OTP at drop (geofenced) → DELIVERED"
curl -sf -X POST -H "Authorization: Bearer $RT" -H "content-type: application/json" \
  http://localhost:4103/orders/$OID/confirm-otp -d "{\"otp\":\"$OTP\",\"riderLat\":$DLAT,\"riderLng\":$DLNG}" | jq -c '{id,status}' | head -1

step "final order view"
curl -sf -H "Authorization: Bearer $T" http://localhost:4103/orders/$OID | jq -c '{id, status, paymentMethod, totalPesewas, riderId, deliveredAt}' | head -1
