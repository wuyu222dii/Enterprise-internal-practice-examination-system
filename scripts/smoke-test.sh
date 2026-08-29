#!/usr/bin/env bash
# API smoke test against local backend
set -e
BASE="${BASE_URL:-http://localhost:8088/api/v1}"

echo "== Login =="
RESP=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"employeeNo":"ADMIN001","password":"Admin@123","clientType":"adminWeb"}')
TOKEN=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('token',''))" 2>/dev/null || echo "")

if [ -z "$TOKEN" ]; then
  echo "Login failed: $RESP"
  exit 1
fi
echo "Token obtained"

echo "== Session =="
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/auth/session" | head -c 200
echo ""

echo "== Departments =="
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/departments" | head -c 200
echo ""

echo "Smoke test passed"
