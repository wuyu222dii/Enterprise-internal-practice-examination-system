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

MUST_CHANGE=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('session',{}).get('mustChangePassword', False))" 2>/dev/null || echo "False")
if [ "$MUST_CHANGE" = "True" ]; then
  echo "== Change password =="
  curl -s -X POST "$BASE/auth/change-password" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"currentPassword":"Admin@123","newPassword":"Admin@12345"}' | head -c 200
  echo ""
fi

echo "== Departments =="
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/departments" | head -c 200
echo ""

echo "== Employees =="
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/employees?page=1&pageSize=5" | head -c 200
echo ""

echo "== Audit logs =="
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/admin/audit-logs?page=1&pageSize=5" | head -c 200
echo ""

echo "Smoke test passed"
