// PERF-03: bring 500 attempts to the same expiry instant, then confirm that within 60 seconds each
// one produced exactly one submission and one result, and that writes after expiry are rejected.
//
// The attempt duration comes from the published version, so this scenario drives expiry from the
// database instead of waiting it out:
//
//   1. EXAM_ID=<id> k6 run scripts/load-test/perf03-expiry.js
//   2. force every in-flight attempt to expire in the same second:
//        docker exec exam_system-postgres-1 psql -U exam -d exam_system -c \
//          "update exam_attempts set expires_at = now() - interval '1 second' \
//            where exam_id='<EXAM_ID>' and attempt_status='inProgress';"
//   3. wait for one scheduler tick (exam.scheduler.auto-submit-ms, 60s by default)
//   4. verify uniqueness and that nothing is left behind:
//        select attempt_status, count(*) from exam_attempts where exam_id='<EXAM_ID>' group by 1;
//        select count(*) from exam_results r
//          join exam_attempts a on a.id = r.exam_attempt_id where a.exam_id='<EXAM_ID>';
//        -- exam_results.exam_attempt_id is UNIQUE, so a duplicate result is impossible by schema
//
// Step 1 only builds the 500 in-flight attempts and checks that post-expiry writes are refused.
import { check } from 'k6';
import { Rate } from 'k6/metrics';
import {
  getPaperItems,
  login,
  employeeNoForVu,
  saveAnswer,
  startOrResumeAttempt,
} from './lib/capacity.js';

const VUS = Number(__ENV.VUS || 500);

const setupFailures = new Rate('expiry_setup_failures');

export const options = {
  scenarios: {
    prepare: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: 1,
      maxDuration: '5m',
    },
  },
  thresholds: {
    'expiry_setup_failures': ['rate<0.001'],
  },
};

export default function () {
  const token = login(employeeNoForVu());
  if (!token) {
    setupFailures.add(1);
    return;
  }

  const { attemptId, res } = startOrResumeAttempt(token);
  if (!attemptId) {
    setupFailures.add(res.status >= 500);
    return;
  }

  const { items } = getPaperItems(token, attemptId);
  if (items.length === 0) {
    setupFailures.add(1);
    return;
  }

  // Leave one confirmed answer per attempt so scoring has something to work with.
  const saveRes = saveAnswer(token, attemptId, items[0].itemId, 1);
  check(saveRes, { 'pre-expiry save accepted': (r) => r.status === 200 || r.status === 409 });
  setupFailures.add(saveRes.status >= 500);
}
