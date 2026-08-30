import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '15s',
};

const BASE = __ENV.BASE_URL || 'http://localhost:8088/api/v1';
const EXAM_ID = __ENV.EXAM_ID || 'exm_demo';

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export default function () {
  const loginRes = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({
      employeeNo: 'EXAM001',
      password: 'Admin@123',
      clientType: 'examWeb',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(loginRes, { 'login status 200': (r) => r.status === 200 });

  const token = loginRes.json('data.token');
  if (!token) {
    return;
  }

  const startRes = http.post(
    `${BASE}/exams/${EXAM_ID}/attempts`,
    null,
    {
      headers: {
        ...authHeaders(token),
        'Idempotency-Key': `${__VU}-${__ITER}-${Date.now()}`,
      },
    },
  );
  check(startRes, { 'start attempt status 200': (r) => r.status === 200 });

  const attemptId = startRes.json('data.attemptId');
  if (!attemptId) {
    return;
  }

  const paperRes = http.get(`${BASE}/attempts/${attemptId}/paper`, {
    headers: authHeaders(token),
  });
  check(paperRes, { 'paper status 200': (r) => r.status === 200 });

  const items = paperRes.json('data.items') || [];
  if (items.length === 0) {
    return;
  }

  const itemId = items[0].itemId;
  const saveRes = http.put(
    `${BASE}/attempts/${attemptId}/answers/${itemId}`,
    JSON.stringify({ answer: ['B'], answerVersion: 1 }),
    { headers: authHeaders(token) },
  );
  check(saveRes, {
    'save answer status 200': (r) => r.status === 200,
    'save answer confirmed': (r) => r.json('data.saveStatus') === 'saved',
  });

  sleep(1);
}
