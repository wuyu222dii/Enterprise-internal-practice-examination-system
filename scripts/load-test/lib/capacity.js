// Shared helpers for the PERF-01..04 scenarios. Every scenario runs against the CAP-01 fixture
// created by seed-capacity.sql + setup-capacity-exam.sh.
import http from 'k6/http';

export const BASE = __ENV.BASE_URL || 'http://localhost:8088/api/v1';
export const EXAM_ID = __ENV.EXAM_ID || '';
export const CAPACITY_PASSWORD = __ENV.CAPACITY_PASSWORD || 'Admin@123';

if (!EXAM_ID) {
  throw new Error('EXAM_ID is required; run scripts/load-test/setup-capacity-exam.sh first');
}

export function jsonHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export function idempotencyHeaders(token) {
  return {
    ...jsonHeaders(token),
    'Idempotency-Key': `${__VU}-${__ITER}-${Date.now()}`,
  };
}

// Employee numbers CAP00001..CAP05000 map to emp_cap_1..emp_cap_5000.
export function employeeNo(index) {
  return `CAP${String(index).padStart(5, '0')}`;
}

// Assignees of the capacity exam are emp_cap_1..emp_cap_2000.
export const ASSIGNEE_COUNT = Number(__ENV.ASSIGNEE_COUNT || 2000);

// Stable one-VU-to-one-employee mapping so concurrent VUs never share an attempt.
export function employeeNoForVu() {
  return employeeNo(((__VU - 1) % ASSIGNEE_COUNT) + 1);
}

export function login(no, password = CAPACITY_PASSWORD) {
  const res = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({ employeeNo: no, password, clientType: 'examWeb' }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' } },
  );
  return res.status === 200 ? res.json('data.token') : null;
}

export function loginAdmin() {
  for (const password of [__ENV.ADMIN_PASSWORD || 'Admin@12345', 'Admin@123']) {
    const res = http.post(
      `${BASE}/auth/login`,
      JSON.stringify({ employeeNo: 'ADMIN001', password, clientType: 'adminWeb' }),
      { headers: { 'Content-Type': 'application/json' }, tags: { name: 'adminLogin' } },
    );
    if (res.status === 200) {
      return res.json('data.token');
    }
  }
  return null;
}

/**
 * Returns the employee's in-flight attempt, starting one when needed. Concurrent or repeated start
 * requests must return the same attempt (ATT-01), which is why 409/200 are both acceptable here.
 */
export function startOrResumeAttempt(token) {
  const active = http.get(`${BASE}/exams/${EXAM_ID}/active-attempt`, {
    headers: jsonHeaders(token),
    tags: { name: 'activeAttempt' },
  });
  if (active.status === 200) {
    const attemptId = active.json('data.attemptId');
    if (attemptId) {
      return { attemptId, res: active, resumed: true };
    }
  }

  const res = http.post(`${BASE}/exams/${EXAM_ID}/attempts`, null, {
    headers: idempotencyHeaders(token),
    tags: { name: 'startAttempt' },
  });
  return { attemptId: res.status === 200 ? res.json('data.attemptId') : null, res, resumed: false };
}

export function getPaperItems(token, attemptId) {
  const res = http.get(`${BASE}/attempts/${attemptId}/paper`, {
    headers: jsonHeaders(token),
    tags: { name: 'paper' },
  });
  return { items: res.status === 200 ? res.json('data.items') || [] : [], res };
}

export function saveAnswer(token, attemptId, itemId, answerVersion) {
  return http.put(
    `${BASE}/attempts/${attemptId}/answers/${itemId}`,
    JSON.stringify({ answer: ['B'], answerVersion }),
    { headers: jsonHeaders(token), tags: { name: 'saveAnswer' } },
  );
}

export function submitAttempt(token, attemptId, reason = 'manual') {
  return http.post(
    `${BASE}/attempts/${attemptId}/submit`,
    JSON.stringify({ reason }),
    { headers: idempotencyHeaders(token), tags: { name: 'submit' } },
  );
}
