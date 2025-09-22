#!/bin/bash

# Dev smoke test script - quick health and orders API check
# Usage: bash scripts/dev-smoke.sh

set -e

BASE_URL="${BASE_URL:-http://localhost:5000}"
DEV_API_KEY="${DEV_API_KEY:-dev-allow}"

echo "🔍 Dev smoke tests starting..."
echo "📡 Base URL: $BASE_URL"
echo "🔑 Dev API Key: $DEV_API_KEY"
echo ""

# Test 1: Health check
echo "🏥 Testing health endpoint..."
curl -s -H "x-dev-auth: $DEV_API_KEY" \
     "$BASE_URL/healthz" | jq . || echo "❌ Health check failed"
echo ""

# Test 2: Orders list
echo "📋 Testing orders list endpoint..."
ORDERS_RESPONSE=$(curl -s -H "x-dev-auth: $DEV_API_KEY" \
     -H "Content-Type: application/json" \
     "$BASE_URL/api/v1/orders?limit=5")

echo "$ORDERS_RESPONSE" | jq . || echo "❌ Orders list failed"

# Print array length if response is valid JSON
if echo "$ORDERS_RESPONSE" | jq . > /dev/null 2>&1; then
  ORDERS_COUNT=$(echo "$ORDERS_RESPONSE" | jq 'if type == "array" then length else (if .data then (.data | length) else 0 end) end' 2>/dev/null || echo "0")
  echo "📊 Orders array length: $ORDERS_COUNT"
fi
echo ""

echo "✅ Smoke tests completed!"