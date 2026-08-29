import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

const BASE = __ENV.BASE_URL || 'http://localhost:8088/api/v1';

export default function () {
  const loginRes = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({
      employeeNo: 'ADMIN001',
      password: 'Admin@123',
      clientType: 'adminWeb',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(loginRes, { 'login status 200': (r) => r.status === 200 });
  sleep(1);
}
