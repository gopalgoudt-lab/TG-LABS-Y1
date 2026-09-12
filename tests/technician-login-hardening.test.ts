import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  __resetTechnicianLoginRateLimitForTests,
  checkTechnicianLoginRateLimit,
  clientIpFromRequest,
  recordTechnicianLoginFailure,
  resetTechnicianLoginFailures,
  technicianLoginRateLimitPolicy,
} from '../lib/technician-login-rate-limit';

test.beforeEach(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  __resetTechnicianLoginRateLimitForTests();
});

test('locks an identity after five failed PIN attempts for fifteen minutes', async () => {
  const now = 1_000_000;
  for (let i = 0; i < technicianLoginRateLimitPolicy.identityFailureLimit - 1; i += 1) {
    const result = await recordTechnicianLoginFailure('TECH-001', '203.0.113.10', now + i);
    assert.equal(result.locked, false);
    assert.equal(result.backend, 'memory');
  }

  const locked = await recordTechnicianLoginFailure('TECH-001', '203.0.113.10', now + 10);
  assert.equal(locked.locked, true);
  assert.ok(locked.retryAfterSeconds > 0);
  assert.equal((await checkTechnicianLoginRateLimit('TECH-001', '203.0.113.10', now + 11)).allowed, false);

  const afterLock = now + technicianLoginRateLimitPolicy.lockMs + 20;
  assert.equal((await checkTechnicianLoginRateLimit('TECH-001', '203.0.113.10', afterLock)).allowed, true);
});

test('successful login reset clears the identity failure bucket', async () => {
  const now = 2_000_000;
  for (let i = 0; i < 4; i += 1) await recordTechnicianLoginFailure('TECH-002', '203.0.113.11', now + i);
  await resetTechnicianLoginFailures('TECH-002');
  assert.equal((await checkTechnicianLoginRateLimit('TECH-002', '203.0.113.11', now + 10)).allowed, true);
});

test('IP throttling limits broad credential spraying', async () => {
  const now = 3_000_000;
  for (let i = 0; i < technicianLoginRateLimitPolicy.ipFailureLimit - 1; i += 1) {
    await recordTechnicianLoginFailure(`TECH-${i}`, '203.0.113.12', now + i);
  }
  const final = await recordTechnicianLoginFailure('TECH-LAST', '203.0.113.12', now + 100);
  assert.equal(final.locked, true);
  assert.equal((await checkTechnicianLoginRateLimit('TECH-NEW', '203.0.113.12', now + 101)).allowed, false);
});

test('uses the first forwarded address as the client IP key', () => {
  const request = new Request('https://example.test/api/technician/login', {
    headers: { 'x-forwarded-for': '203.0.113.20, 10.0.0.1' },
  });
  assert.equal(clientIpFromRequest(request), '203.0.113.20');
});

test('distributed backend hashes identifiers and enforces the shared identity limit', async () => {
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.test';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  const originalFetch = global.fetch;
  let identityCount = 4;
  let ipCount = 0;
  let capturedBody = '';

  global.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    capturedBody = String(init?.body ?? '');
    identityCount += 1;
    ipCount += 1;
    return new Response(JSON.stringify([
      { result: identityCount }, { result: 1 }, { result: 900 },
      { result: ipCount }, { result: 1 }, { result: 900 },
    ]), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;

  try {
    const result = await recordTechnicianLoginFailure('TECH-PRIVATE-001', '203.0.113.55');
    assert.equal(result.backend, 'distributed');
    assert.equal(result.locked, true);
    assert.ok(result.retryAfterSeconds > 0);
    assert.equal(capturedBody.includes('TECH-PRIVATE-001'), false);
    assert.equal(capturedBody.includes('203.0.113.55'), false);
  } finally {
    global.fetch = originalFetch;
  }
});

test('falls back to memory when the configured distributed backend is unavailable', async () => {
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.test';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  const originalFetch = global.fetch;
  global.fetch = (async () => { throw new Error('backend unavailable'); }) as typeof fetch;

  try {
    const result = await recordTechnicianLoginFailure('TECH-FALLBACK', '203.0.113.56', 4_000_000);
    assert.equal(result.backend, 'memory');
    assert.equal(result.locked, false);
  } finally {
    global.fetch = originalFetch;
  }
});

test('technician login route uses generic auth errors, awaited throttling and Retry-After', () => {
  const route = readFileSync(new URL('../app/api/technician/login/route.ts', import.meta.url), 'utf8');
  const limiter = readFileSync(new URL('../lib/technician-login-rate-limit.ts', import.meta.url), 'utf8');
  assert.ok(route.includes("const GENERIC_ERROR = 'Invalid technician login details.'"));
  assert.ok(route.includes('await checkTechnicianLoginRateLimit'));
  assert.ok(route.includes('await recordTechnicianLoginFailure'));
  assert.ok(route.includes('await resetTechnicianLoginFailures'));
  assert.ok(route.includes("'Retry-After'"));
  assert.ok(route.includes('status: 429'));
  assert.ok(limiter.includes('UPSTASH_REDIS_REST_URL'));
  assert.ok(limiter.includes('UPSTASH_REDIS_REST_TOKEN'));
  assert.ok(limiter.includes("backend: 'distributed'"));
});
