// PERF-01: 500 employees hold an in-progress attempt and save an answer roughly every 20 seconds
// for 30 minutes. Targets (requirement 17.2): answer save P95 <= 1s, non-business failure rate
// <= 0.1%.
//
// The employee signs in once and keeps the session for the whole exam, exactly as a real client
// does, so login and paper retrieval are per-VU setup rather than part of the measured loop.
//
//   EXAM_ID=<id> k6 run scripts/load-test/perf01-sustained.js               # full 30 minutes
//   EXAM_ID=<id> DURATION=5m k6 run scripts/load-test/perf01-sustained.js   # shorter sample
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import {
  employeeNoForVu,
  getPaperItems,
  login,
  saveAnswer,
  startOrResumeAttempt,
} from './lib/capacity.js';

const VUS = Number(__ENV.VUS || 500);
const DURATION = __ENV.DURATION || '30m';
const SAVE_INTERVAL_SECONDS = Number(__ENV.SAVE_INTERVAL_SECONDS || 20);

const saveDuration = new Trend('answer_save_duration', true);
const saveFailures = new Rate('answer_save_failures');
const sessionFailures = new Rate('session_setup_failures');

export const options = {
  scenarios: {
    sustained: {
      executor: 'constant-vus',
      vus: VUS,
      duration: DURATION,
      gracefulStop: '60s',
    },
  },
  thresholds: {
    'answer_save_duration': ['p(95)<1000'],
    'answer_save_failures': ['rate<0.001'],
    'session_setup_failures': ['rate<0.001'],
  },
};

// Per-VU state: each VU gets its own module instance, so this is the employee's live session.
let session = null;
// Answer versions must strictly increase per item, so track what this VU has already written.
let versionByItem = {};

function openSession() {
  const token = login(employeeNoForVu());
  if (!token) {
    return null;
  }
  const { attemptId } = startOrResumeAttempt(token);
  if (!attemptId) {
    return null;
  }
  const { items } = getPaperItems(token, attemptId);
  if (items.length === 0) {
    return null;
  }
  return { token, attemptId, items };
}

export default function () {
  if (session === null) {
    session = openSession();
    const ready = check(session, { 'session established': (s) => s !== null });
    sessionFailures.add(!ready);
    if (!ready) {
      // Ran out of attempt allowance or failed to sign in; do not hammer the endpoint.
      sleep(SAVE_INTERVAL_SECONDS);
      return;
    }
  }

  const item = session.items[__ITER % session.items.length];
  const nextVersion = (versionByItem[item.itemId] || 0) + 1;
  const res = saveAnswer(session.token, session.attemptId, item.itemId, nextVersion);

  saveDuration.add(res.timings.duration);
  if (res.status === 200) {
    versionByItem[item.itemId] = nextVersion;
    check(res, { 'answer confirmed': (r) => r.json('data.saveStatus') === 'saved' });
    saveFailures.add(false);
  } else if (res.status === 409) {
    // Version conflict is a defined business outcome; resync by skipping ahead.
    versionByItem[item.itemId] = nextVersion;
    saveFailures.add(false);
  } else if (res.status === 401) {
    // Session expired mid-run: re-establish it on the next iteration.
    session = null;
    saveFailures.add(false);
  } else {
    saveFailures.add(true);
  }

  sleep(SAVE_INTERVAL_SECONDS);
}
