// PERF-02: 500 employees open their paper within 60 seconds, and 500 employees submit within 60
// seconds. Target: start and submit P95 <= 3s, with no duplicate attempt, paper or scoring
// (ATT-01 / SUB-01).
//
// The two bursts are measured separately because confirming a 100-question paper costs 100
// requests, which belongs to sustained answering (PERF-01) rather than to either burst window.
//
//   # open burst on fresh attempts
//   EXAM_ID=<id> PHASE=open k6 run scripts/load-test/perf02-burst.js
//
//   # submit burst: build fully answered attempts first, then measure only the submits
//   EXAM_ID=<id> COUNT=500 k6 run scripts/load-test/prepare-attempts.js
//   EXAM_ID=<id> PHASE=submit k6 run scripts/load-test/perf02-burst.js
//
// Afterwards, confirm no employee holds two in-flight attempts:
//   select employee_id, count(*) from exam_attempts
//    where exam_id = '<EXAM_ID>' and attempt_status in ('inProgress','submitting')
//    group by employee_id having count(*) > 1;
import { check } from 'k6';
import exec from 'k6/execution';
import { Rate, Trend } from 'k6/metrics';
import {
  ASSIGNEE_COUNT,
  employeeNo,
  login,
  startOrResumeAttempt,
  submitAttempt,
} from './lib/capacity.js';

const RATE = Number(__ENV.RATE || 500);
const PHASE = __ENV.PHASE || 'open';

if (PHASE !== 'open' && PHASE !== 'submit') {
  throw new Error(`PHASE must be "open" or "submit", got "${PHASE}"`);
}

const startDuration = new Trend('attempt_start_duration', true);
const submitDuration = new Trend('attempt_submit_duration', true);
const burstFailures = new Rate('burst_failures');

export const options = {
  scenarios: {
    burst: {
      // "500 employees within 60 seconds" is an arrival rate, not 500 simultaneous connections.
      executor: 'constant-arrival-rate',
      rate: RATE,
      timeUnit: '60s',
      duration: '60s',
      preAllocatedVUs: Number(__ENV.PRE_ALLOCATED_VUS || 120),
      maxVUs: Number(__ENV.MAX_VUS || 500),
    },
  },
  thresholds: {
    'attempt_start_duration': ['p(95)<3000'],
    'attempt_submit_duration': ['p(95)<3000'],
    'burst_failures': ['rate<0.001'],
  },
};

export default function () {
  // VUs are recycled, so the unique iteration index is what maps one employee to one attempt.
  const token = login(employeeNo((exec.scenario.iterationInTest % ASSIGNEE_COUNT) + 1));
  if (!token) {
    burstFailures.add(1);
    return;
  }

  const { attemptId, res: startRes, resumed } = startOrResumeAttempt(token);
  if (!resumed) {
    startDuration.add(startRes.timings.duration);
  }
  if (!check(attemptId, { 'attempt available': (a) => Boolean(a) })) {
    burstFailures.add(startRes.status >= 500);
    return;
  }

  if (PHASE === 'open') {
    burstFailures.add(false);
    return;
  }

  const submitRes = submitAttempt(token, attemptId);
  submitDuration.add(submitRes.timings.duration);
  const submitted = check(submitRes, { 'submit accepted': (r) => r.status === 200 });
  burstFailures.add(!submitted && submitRes.status >= 500);
}
