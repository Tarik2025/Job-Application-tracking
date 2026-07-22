// Simple CI smoke tests that exercise key server endpoints.
// Exits with non-zero on failure so CI fails early.

const crypto = require('crypto');
const fetch = global.fetch || require('node-fetch');

const BASE = process.env.BASE_URL || 'http://localhost:3001';

function randEmail() {
  return `e2e+${Date.now()}@example.com`;
}

async function ok(res) {
  if (!res) throw new Error('no response');
  if (res.status < 200 || res.status >= 300) {
    const text = await res.text().catch(() => '');
    throw new Error(`unexpected status ${res.status}: ${text}`);
  }
  return res;
}

async function checkHealth() {
  const res = await fetch(`${BASE}/api/health`);
  await ok(res);
  const j = await res.json();
  if (!j || (!j.status && !j.ok)) throw new Error('health response invalid');
  console.log('health OK');
}

async function checkLists() {
  const colleges = await ok(await fetch(`${BASE}/api/colleges`));
  const collegesJson = await colleges.json();
  if (!Array.isArray(collegesJson)) throw new Error('colleges not array');
  console.log('colleges count', collegesJson.length);

  const stacks = await ok(await fetch(`${BASE}/api/stacks`));
  const stacksJson = await stacks.json();
  if (!Array.isArray(stacksJson)) throw new Error('stacks not array');
  console.log('stacks count', stacksJson.length);
}

async function checkAuthFlow() {
  const email = randEmail();
  const password = 'Test1234!';

  // Register
  const reg = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: 'E2E Tester' })
  });

  if (reg.status !== 200 && reg.status !== 201 && reg.status !== 204) {
    const body = await reg.text().catch(() => '');
    throw new Error(`register failed ${reg.status}: ${body}`);
  }
  console.log('register OK');

  // Login
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  await ok(login);
  const j = await login.json().catch(() => ({}));
  if (!j || !j.token) console.log('login did not return token (okay if app uses cookie-based auth)');
  console.log('login OK');
}

async function main() {
  try {
    console.log('Starting CI smoke tests against', BASE);
    await checkHealth();
    await checkLists();
    await checkAuthFlow();
    console.log('ALL TESTS PASSED');
    process.exit(0);
  } catch (err) {
    console.error('TEST FAILURE:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

main();
