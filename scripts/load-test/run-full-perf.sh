#!/usr/bin/env bash
# Full PERF-01~03 on a dedicated load-test machine.
# Defaults match the acceptance bar: 500 VUs, PERF-01 duration 30 minutes.
# Do NOT copy laptop sample numbers into docs/06-测试验收/验收追踪.md.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

VUS="${VUS:-500}"
DURATION="${DURATION:-30m}"
RATE="${RATE:-500}"

if ! command -v k6 >/dev/null 2>&1; then
  echo "k6 is required. Install from https://k6.io/" >&2
  exit 1
fi

if [[ -z "${EXAM_ID:-}" ]]; then
  echo "EXAM_ID is required." >&2
  echo "Create one with: EXAM_ID=\$(scripts/load-test/setup-capacity-exam.sh | tail -1)" >&2
  exit 1
fi

echo "PERF full run EXAM_ID=$EXAM_ID VUS=$VUS DURATION=$DURATION RATE=$RATE"
echo "Record P50/P95/P99 into docs/06-测试验收/验收追踪.md. Sampling does not satisfy PERF-01~03."

EXAM_ID="$EXAM_ID" VUS="$VUS" DURATION="$DURATION" k6 run scripts/load-test/perf01-sustained.js

EXAM_ID="$EXAM_ID" RATE="$RATE" PHASE=open k6 run scripts/load-test/perf02-burst.js
if [[ "${SKIP_SUBMIT:-}" != "1" ]]; then
  EXAM_ID="$EXAM_ID" COUNT="$VUS" k6 run scripts/load-test/prepare-attempts.js
  EXAM_ID="$EXAM_ID" RATE="$RATE" PHASE=submit k6 run scripts/load-test/perf02-burst.js
fi

EXAM_ID="$EXAM_ID" VUS="$VUS" k6 run scripts/load-test/perf03-expiry.js

echo "PERF-01~03 scripts finished. Fill the empty full-run table in 验收追踪.md; do not reuse sample rows."
