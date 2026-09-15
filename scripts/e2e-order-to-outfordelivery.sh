#!/usr/bin/env bash
# Helper: create a COD order and drive it to OUT_FOR_DELIVERY (rider en route).
# Usage: e2e-order-to-outfordelivery.sh [itemId vendorId]
set -uo pipefail
cd /tmp/ore-e2e
T=$(jq -r .customer tokens.json); VT=$(jq -r .vendor tokens.json); RT=$(jq -r .rider tokens.json)
ITEM=${1:-259947cf-a80a-421b-941d-fca393fd56dc}
VENDOR=${2:-34f120da-bb17-4eeb-9533-6f7a0a208037}
VLAT=5.116; VLNG=-1.252; DLAT=5.128; DLNG=-1.288
IK="x-ore-internal-key: $(grep -E '^INTERNAL_SERVICE_KEY=' .env | cut -d= -f2-)"

curl -sf -X POST -H "Authorization: Bearer $T" -H "content-type: application/json" \
  http://localhost:4102/cart/items -d "{\"itemId\":\"$ITEM\",\"qty\":1}" >/dev/null
CHECK=$(curl -sf -X POST -H "Authorization: Bearer $T" -H "content-type: application/json" \
  http://localhost:4102/cart/checkout -d "{\"address\":{\"label\":\"UCC Science Block\",\"lat\":$DLAT,\"lng\":$DLNG,\"details\":\"Room 12\",\"source\":\"MAP\"},\"paymentMethods\":[{\"vendorId\":\"$VENDOR\",\"method\":\"COD\"}],\"note\":\"e2e\"}")
OID=$(echo "$CHECK" | jq -r '.orders[0].orderId')
curl -sf -X POST -H "Authorization: Bearer $VT" http://localhost:4103/orders/$OID/accept >/dev/null
curl -sf -X POST -H "Authorization: Bearer $VT" http://localhost:4103/orders/$OID/ready >/dev/null
OFFER=""
for i in $(seq 1 60); do
  OFFER=$(curl -sf -H "Authorization: Bearer $RT" http://localhost:4105/riders/me/offers 2>/dev/null | jq -c --arg oid "$OID" '.[] | select(.orderId==$oid) | .id' -r 2>/dev/null | head -1)
  [ -n "$OFFER" ] && [ "$OFFER" != "null" ] && break
  sleep 1
done
[ -n "$OFFER" ] && [ "$OFFER" != "null" ] && curl -sf -X POST -H "Authorization: Bearer $RT" http://localhost:4105/offers/$OFFER/accept >/dev/null
sleep 2
curl -sf -X POST -H "Authorization: Bearer $RT" -H "content-type: application/json" \
  http://localhost:4105/orders/$OID/picked-up -d "{\"riderLat\":$VLAT,\"riderLng\":$VLNG}" >/dev/null
sleep 5
echo "$OID"
