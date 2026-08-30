// Unmeasured setup step: bring N employees to "in-progress attempt with every answer confirmed".
// PERF-02's submit burst and PERF-03's simultaneous expiry both need that state, and building it
// costs one request per paper item, which must not be counted inside a measured 60-second window.
//
// EXAM_ID=<id> COUNT=500 k6 run scripts/load-test/prepare-attempts.js
import { check } from 'k6';
import exec from 'k6/execution';
import {
  ASSIGNEE_COUNT,
  employeeNo,
  getPaperItems,
  login,
  saveAnswer,
  startOrResumeAttempt,
} from './lib/capacity.js';

const COUNT = Number(__ENV.COUNT || 500);
const CONCURRENCY = Number(__ENV.CONCURRENCY || 50);

export const options = {
  scenarios: {
    prepare: {
      executor: 'shared-iterations',
      vus: CONCURRENCY,
      iterations: COUNT,
      maxDuration: '30m',
    },
  },
};

export default function () {
  const index = (exec.scenario.iterationInTest % ASSIGNEE_COUNT) + 1;
  const token = login(employeeNo(index));
  if (!check(token, { 'logged in': (t) => Boolean(t) })) {
    return;
  }

  const { attemptId } = startOrResumeAttempt(token);
  if (!check(attemptId, { 'attempt available': (a) => Boolean(a) })) {
    return;
  }

  const { items } = getPaperItems(token, attemptId);
  let confirmed = 0;
  for (const item of items) {
    // 409 means this item was already confirmed by an earlier preparation run.
    const res = saveAnswer(token, attemptId, item.itemId, 1);
    if (res.status === 200 || res.status === 409) {
      confirmed++;
    }
  }
  check(confirmed, { 'all items confirmed': (c) => c === items.length });
}
