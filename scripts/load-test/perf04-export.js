// PERF-04: trigger the dual-worksheet export at capacity and time it end to end.
// Target (requirement 17.2): 2,000 employees x 10 attempts completes within 5 minutes, with the
// summary sheet holding one row per assignee and the detail sheet one row per attempt (REP-02).
//
// EXAM_ID=<id> k6 run scripts/load-test/perf04-export.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { BASE, EXAM_ID, jsonHeaders, loginAdmin } from './lib/capacity.js';

const TIMEOUT_SECONDS = Number(__ENV.EXPORT_TIMEOUT_SECONDS || 300);

const exportDuration = new Trend('export_total_duration_ms', true);
const downloadDuration = new Trend('export_download_duration_ms', true);

export const options = {
  scenarios: {
    export: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: `${TIMEOUT_SECONDS + 120}s`,
    },
  },
  thresholds: {
    'export_total_duration_ms': [`p(100)<${TIMEOUT_SECONDS * 1000}`],
  },
};

export default function () {
  const token = loginAdmin();
  if (!check(token, { 'admin logged in': (t) => Boolean(t) })) {
    return;
  }
  const headers = jsonHeaders(token);

  const started = Date.now();
  const createRes = http.post(`${BASE}/admin/exams/${EXAM_ID}/exports`, null, {
    headers,
    tags: { name: 'createExport' },
  });
  if (!check(createRes, { 'export accepted': (r) => r.status === 202 })) {
    return;
  }
  const jobId = createRes.json('data.jobId');

  let status = 'pending';
  for (let elapsed = 0; elapsed < TIMEOUT_SECONDS; elapsed += 2) {
    const jobRes = http.get(`${BASE}/admin/exports/${jobId}`, {
      headers,
      tags: { name: 'pollExport' },
    });
    status = jobRes.json('data.status');
    if (status === 'completed' || status === 'failed') {
      break;
    }
    sleep(2);
  }
  exportDuration.add(Date.now() - started);

  if (!check(status, { 'export completed': (s) => s === 'completed' })) {
    console.error(`export job ${jobId} ended as ${status}`);
    return;
  }

  const downloadRes = http.get(`${BASE}/admin/exports/${jobId}/download`, {
    headers,
    tags: { name: 'downloadExport' },
    responseType: 'binary',
  });
  downloadDuration.add(downloadRes.timings.duration);
  check(downloadRes, {
    'download 200': (r) => r.status === 200,
    'download is a workbook': (r) => r.body.byteLength > 0,
  });

  console.log(
    `export ${jobId} completed in ${((Date.now() - started) / 1000).toFixed(1)}s, ` +
      `${downloadRes.body.byteLength} bytes`,
  );
  console.log(
    'verify row counts: unzip the workbook and compare 官方成绩汇总 rows to the assignee count ' +
      'and 全部尝试明细 rows to select count(*) from exam_attempts where exam_id = the exam under test',
  );
}
