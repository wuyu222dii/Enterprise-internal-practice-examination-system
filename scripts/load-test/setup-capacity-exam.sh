#!/usr/bin/env bash
# Builds the CAP-01 exam on top of scripts/load-test/seed-capacity.sql:
#   50 rule lines x 2 questions = 100-question paper, 10 attempts, 2,000 selected assignees.
#
# Also reports the two CAP-01 timings that requirement 17.2 caps:
#   - publish preflight and freeze over 50 rules / 50,000 candidate versions  (<= 30s)
#   - 2,000-assignee expansion                                               (<= 10s)
#
# Usage: scripts/load-test/setup-capacity-exam.sh
# Prints the created exam id on the last line so the k6 scripts can consume it.
set -euo pipefail

BASE="${BASE_URL:-http://localhost:8088/api/v1}"
ADMIN_NO="${ADMIN_NO:-ADMIN001}"
# seed-capacity.sql resets ADMIN001 to this password.
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin@123}"
ASSIGNEE_COUNT="${ASSIGNEE_COUNT:-2000}"
RULE_LINES="${RULE_LINES:-50}"
DRAW_PER_LINE="${DRAW_PER_LINE:-2}"

log() { printf '%s\n' "$*" >&2; }

api() {
  local method="$1" path="$2" body="${3:-}"
  if [[ -n "$body" ]]; then
    curl -sS -X "$method" "$BASE$path" \
      -H "Authorization: Bearer $TOKEN" \
      -H 'Content-Type: application/json' \
      --data-binary "$body"
  else
    curl -sS -X "$method" "$BASE$path" -H "Authorization: Bearer $TOKEN"
  fi
}

# --- login (tolerates the bootstrap must-change-password state) -----------------
login() {
  local password="$1"
  curl -sS -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
    -d "{\"employeeNo\":\"$ADMIN_NO\",\"password\":\"$password\",\"clientType\":\"adminWeb\"}"
}

response="$(login "$ADMIN_PASSWORD")"
TOKEN="$(printf '%s' "$response" | jq -r '.data.token // empty')"
if [[ -z "$TOKEN" ]]; then
  log "admin login failed: $response"
  log "run scripts/load-test/seed-capacity.sql first; it resets ADMIN001 to a known password"
  exit 1
fi
log "logged in as $ADMIN_NO"

# --- create draft ---------------------------------------------------------------
EXAM_ID="$(api POST /admin/exams \
  '{"title":"容量压测考试","description":"CAP-01 fixture"}' | jq -r '.data.id')"
[[ -n "$EXAM_ID" && "$EXAM_ID" != "null" ]] || { log "exam creation failed"; exit 1; }
log "created exam $EXAM_ID"

# Open immediately and keep the window wide enough for a 30-minute sustained run.
OPEN_START_AT="$(date -u -v-1M '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -d '1 minute ago' '+%Y-%m-%dT%H:%M:%SZ')"
STOP_ATTEMPT_AT="$(date -u -v+8H '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -d '8 hours' '+%Y-%m-%dT%H:%M:%SZ')"

api PUT "/admin/exams/$EXAM_ID/wizard/basic" \
  "$(jq -nc --arg open "$OPEN_START_AT" --arg stop "$STOP_ATTEMPT_AT" \
     '{title:"容量压测考试", description:"CAP-01 fixture", openStartAt:$open, stopAttemptAt:$stop}')" >/dev/null

# 50 rule lines, each drawing 2 questions -> a 100-question paper.
RULES="$(jq -nc \
  --argjson lines "$RULE_LINES" \
  --argjson draw "$DRAW_PER_LINE" \
  '{
     durationMinutes: 120,
     maxAttempts: 10,
     passingScore: 60,
     ruleLines: [range(0; $lines) | {bankId: "qb_cap", type: "singleChoice", drawCount: $draw, scorePerQuestion: 1}]
   }')"
api PUT "/admin/exams/$EXAM_ID/wizard/rules" "$RULES" >/dev/null
log "configured $RULE_LINES rule lines"

# 2,000 of the 5,000 capacity employees.
ASSIGNEES="$(jq -nc --argjson count "$ASSIGNEE_COUNT" \
  '{mode: "selected", employeeIds: [range(1; $count + 1) | "emp_cap_" + (.|tostring)]}')"
api PUT "/admin/exams/$EXAM_ID/wizard/assignees" "$ASSIGNEES" >/dev/null
log "configured $ASSIGNEE_COUNT assignees"

api PUT "/admin/exams/$EXAM_ID/wizard/visibility" \
  '{"perItemReviewAllowed":true,"passingScoreVisible":true,"passConclusionVisible":true}' >/dev/null

# --- preflight (CAP-01: 50 rules / 50,000 candidate versions, <= 30s) ----------
start=$(python3 -c 'import time; print(time.perf_counter())')
preflight="$(api POST "/admin/exams/$EXAM_ID/preflight")"
preflight_seconds=$(python3 -c "import time; print(f'{time.perf_counter() - $start:.3f}')")
ready="$(printf '%s' "$preflight" | jq -r '.data.ready')"
if [[ "$ready" != "true" ]]; then
  log "preflight not ready: $(printf '%s' "$preflight" | jq -c '.data.issues')"
  exit 1
fi
log "preflight ready in ${preflight_seconds}s (target <= 30s)"

# --- publish (CAP-01: 2,000-assignee expansion, <= 10s) ------------------------
start=$(python3 -c 'import time; print(time.perf_counter())')
api POST "/admin/exams/$EXAM_ID/publish" >/dev/null
publish_seconds=$(python3 -c "import time; print(f'{time.perf_counter() - $start:.3f}')")
log "published in ${publish_seconds}s (target <= 10s for assignee expansion)"

log ""
log "=== CAP-01 setup timings ==="
log "preflight_seconds=${preflight_seconds}"
log "publish_seconds=${publish_seconds}"
log "Verify the assignee row count matches exactly ${ASSIGNEE_COUNT}:"
log "  docker exec exam_system-postgres-1 psql -U exam -d exam_system -c \\"
log "    \"select count(*) from exam_assignments a join exam_published_versions v on v.id=a.published_version_id where v.exam_id='$EXAM_ID';\""

printf '%s\n' "$EXAM_ID"
