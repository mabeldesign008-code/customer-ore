#!/usr/bin/env bash
# S3: prepaid via REAL Paystack test API — checkout → real initialize →
# webhook security (forged 401) → verify-before-grant rejects unpaid reference.
set -uo pipefail
cd /tmp/ore-e2e
T=$(jq -r .customer tokens.json)
ITEM=${1:-259947cf-a80a-421b-941d-fca393fd56dc}
VENDOR=${2:-34f120da-bb17-4eeb-9533-6f7a0a208037}
DLAT=5.128; DLNG=-1.288
SK=$(grep -E '^PAYSTACK_SECRET_KEY=' .env | cut -d= -f2-)
WB="http://localhost:4104/payments/webhook/paystack"

step() { echo; echo "── S3: $*"; }

step "add to cart"
curl -sf -X POST -H "Authorization: Bearer $T" -H "content-type: application/json" \
  http://localhost:4102/cart/items -d "{\"itemId\":\"$ITEM\",\"qty\":2}" >/dev/null && echo ok

step "checkout (PREPAID)"
CHECK=$(curl -sf -X POST -H "Authorization: Bearer $T" -H "content-type: application/json" \
  http://localhost:4102/cart/checkout -d "{\"address\":{\"label\":\"UCC Science Block\",\"lat\":$DLAT,\"lng\":$DLNG,\"details\":\"Room 12\",\"source\":\"MAP\"},\"paymentMethods\":[{\"vendorId\":\"$VENDOR\",\"method\":\"PREPAID\"}],\"note\":\"S3 e2e\"}")
echo "$CHECK" | jq -c '{checkoutId, orders: [.orders[] | {orderId, status, paymentMethod, totalPesewas}], prepaidTotalPesewas}'
CID=$(echo "$CHECK" | jq -r .checkoutId)
OID=$(echo "$CHECK" | jq -r '.orders[0].orderId')
echo "$CID" > s3-checkout.txt; echo "$OID" > s3-order.txt

step "payment initialized with real Paystack (reference + authorization_url)"
IK="x-ore-internal-key: $(grep -E '^INTERNAL_SERVICE_KEY=' .env | cut -d= -f2-)"
REF=$(curl -s -H "$IK" http://localhost:4104/internal/payments/order/$OID | jq -r '.payment.reference // empty')
echo "reference=$REF"
AUTH_URL=$(curl -s https://api.paystack.co/transaction/verify/$REF -H "Authorization: Bearer $SK" | jq -r '.data.authorization_url // empty')
echo "paystack authorization_url=$AUTH_URL"
curl -s -o /dev/null -w "hosted page HTTP %{http_code}\n" --max-time 10 "$AUTH_URL"

step "real Paystack sees the transaction as unpaid (abandoned)"
curl -s https://api.paystack.co/transaction/verify/$REF -H "Authorization: Bearer $SK" | jq -c '{status: .data.status, amount: .data.amount, currency: .data.currency, channel: .data.channel}'

step "forged webhook signature → 401"
BODY='{"event":"charge.success","data":{"reference":"'$REF'","amount":10000,"currency":"GHS"}}'
FORGED=$(printf '%s' "$BODY" | openssl dgst -sha512 -hmac "wrong-secret-key-0000000000000000000000000000" -hex | awk '{print $2}')
CODE=$(curl -s -o /tmp/s3-forged.json -w "%{http_code}" -X POST -H "content-type: application/json" -H "x-paystack-signature: $FORGED" -d "$BODY" "$WB")
echo "http=$CODE $(cat /tmp/s3-forged.json | head -c 150)"

step "authentic charge.success webhook (real HMAC over raw body) → verify-before-grant rejects abandoned"
BODY='{"event":"charge.success","data":{"reference":"'$REF'","amount":'$(echo "$CHECK" | jq -r .prepaidTotalPesewas)',"currency":"GHS","paid_at":"2026-08-31T22:30:00.000Z","id":"evt-s3-001"}}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha512 -hmac "$SK" -hex | awk '{print $2}')
CODE=$(curl -s -o /tmp/s3-auth.json -w "%{http_code}" -X POST -H "content-type: application/json" -H "x-paystack-signature: $SIG" -d "$BODY" "$WB")
echo "http=$CODE $(cat /tmp/s3-auth.json | head -c 200)"

step "order still PENDING_PAYMENT, no grant"
curl -s -H "Authorization: Bearer $T" http://localhost:4103/orders/$OID | jq -c '{id, status, paymentMethod}'

step "replay same webhook → dedupe (no second attempt)"
CODE=$(curl -s -o /tmp/s3-replay.json -w "%{http_code}" -X POST -H "content-type: application/json" -H "x-paystack-signature: $SIG" -d "$BODY" "$WB")
echo "http=$CODE $(cat /tmp/s3-replay.json | head -c 150)"
