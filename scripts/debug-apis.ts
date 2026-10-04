import 'dotenv/config';
import axios from 'axios';

const KEY = process.env.RAPIDAPI_KEY!;

async function probe(host: string, path: string, params: Record<string, string>) {
  try {
    const res = await axios.get(`https://${host}${path}`, {
      params,
      timeout: 10_000,
      headers: { 'x-rapidapi-key': KEY, 'x-rapidapi-host': host },
    });
    const body = JSON.stringify(res.data).slice(0, 300);
    console.log(`  ✓ ${host}${path} → ${res.status} → ${body}`);
    return res.data;
  } catch (e: any) {
    const status = e?.response?.status ?? 'ERR';
    const msg    = e?.response?.data ? JSON.stringify(e.response.data).slice(0, 200) : e.message;
    console.log(`  ✗ ${host}${path} → ${status} → ${msg}`);
    return null;
  }
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// For async POST endpoints
async function probePost(host: string, path: string, body: Record<string, string>) {
  try {
    const res = await axios.post(`https://${host}${path}`, body, {
      timeout: 10_000,
      headers: {
        'x-rapidapi-key': KEY,
        'x-rapidapi-host': host,
        'Content-Type': 'application/json',
      },
    });
    const out = JSON.stringify(res.data).slice(0, 400);
    console.log(`  ✓ POST ${host}${path} → ${res.status} → ${out}`);
    return res.data;
  } catch (e: any) {
    const status = e?.response?.status ?? 'ERR';
    const msg    = e?.response?.data ? JSON.stringify(e.response.data).slice(0, 200) : e.message;
    console.log(`  ✗ POST ${host}${path} → ${status} → ${msg}`);
    return null;
  }
}

async function probePostJson(host: string, path: string, body: object) {
  try {
    const res = await axios.post(`https://${host}${path}`, body, {
      timeout: 15_000,
      headers: {
        'x-rapidapi-key':  KEY,
        'x-rapidapi-host': host,
        'Content-Type':    'application/json',
      },
    });
    const out = JSON.stringify(res.data).slice(0, 400);
    console.log(`  ✓ POST ${path} → ${res.status} → ${out}`);
    return res.data;
  } catch (e: any) {
    const status = e?.response?.status ?? 'ERR';
    const msg    = typeof e?.response?.data === 'string'
      ? e.response.data.slice(0, 120)
      : JSON.stringify(e?.response?.data ?? e.message).slice(0, 200);
    console.log(`  ✗ POST ${path} → ${status} → ${msg}`);
    return null;
  }
}

const HOST       = 'quora-data-posts-questions-experts-search-results-data-provider.p.rapidapi.com';
const SEARCH_URL = 'https://www.quora.com/search?q=moving+to+California&type=post&time=year';
const BODY       = { record: 1, type: 'post', url: SEARCH_URL, callback: 'https://httpdump.io/example' };

async function main() {
  console.log('\n── Step 1: try POST endpoint path variants ─────────────\n');

  const POST_PATHS = [
    '/quora/start_job/',
    '/quora/start_job',
    '/start_job/',
    '/start_job',
    '/quora/create_job/',
    '/quora/create_job',
    '/create_job/',
    '/quora/jobs/',
    '/jobs/',
  ];

  let jobId = '';
  for (const path of POST_PATHS) {
    const res = await probePostJson(HOST, path, BODY);
    const id  = res?.id ?? res?.job_id ?? res?.task_id ?? '';
    if (id) {
      jobId = id;
      console.log(`\n  ✅ WORKING path: ${path}  |  Job ID: ${jobId}\n`);
      break;
    }
    await delay(800);
  }

  if (!jobId) {
    console.log('\n✗ Could not start a job. Check subscription / API docs.\n');
    process.exit(1);
  }

  console.log('── Step 2: poll GET results endpoint ───────────────────\n');
  await delay(5000);

  const GET_PATHS = [
    '/quora/get_job/', '/quora/get_job',
    '/quora/job_result/', '/quora/result/',
    '/quora/results/', '/quora/job/',
    '/get_job/', '/job_result/', '/result/',
  ];

  for (const path of GET_PATHS) {
    await probe(HOST, path, { id: jobId, job_id: jobId });
    await delay(1000);
  }

  console.log('\n── Done ────────────────────────────────────────────────\n');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
