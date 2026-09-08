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
  __resetTechnicianLoginRateLimitForTests();
});

test('locks an identity after five failed PIN attempts for fifteen minutes', () => {
  const now = 1_000_000;
  for (let i = 0; i < technicianLoginRateLimitPolicy.identityFailureLimit - 1; i += 1) {
    const result = recordTechnicianLoginFailure('TECH-001', '203.0.113.10', now + i);
    assert.equal(result.locked, false);
  }

  const locked = recordTechnicianLoginFailure('TECH-001', '203.0.113.10', now + 10);
  assert.equal(locked.locked, true);
  assert.ok(locked.retryAfterSeconds > 0);
  assert.equal(checkTechnicianLoginRateLimit('TECH-001', '203.0.113.10', now + 11).allowed, false);

  const afterLock = now + technicianLoginRateLimitPolicy.lockMs + 20;
  assert.equal(checkTechnicianLoginRateLimit('TECH-001', '203.0.113.10', afterLock).allowed, true);
});

test('successful login reset clears the identity failure bucket', () => {
  const now = 2_000_000;
  for (let i = 0; i < 4; i += 1) recordTechnicianLoginFailure('TECH-002', '203.0.113.11', now + i);
  resetTechnicianLoginFailures('TECH-002');
  assert.equal(checkTechnicianLoginRateLimit('TECH-002', '203.0.113.11', now + 10).allowed, true);
});

test('IP throttling limits broad credential spraying', () => {
  const now = 3_000_000;
  for (let i = 0; i < technicianLoginRateLimitPolicy.ipFailureLimit - 1; i += 1) {
    recordTechnicianLoginFailure(`TECH-${i}`, '203.0.113.12', now + i);
  }
  const final = recordTechnicianLoginFailure('TECH-LAST', '203.0.113.12', now + 100);
  assert.equal(final.locked, true);
  assert.equal(checkTechnicianLoginRateLimit('TECH-NEW', '203.0.113.12', now + 101).allowed, false);
});

test('uses the first forwarded address as the client IP key', () => {
  const request = new Request('https://example.test/api/technician/login', {
    headers: { 'x-forwarded-for': '203.0.113.20, 10.0.0.1' },
  });
  assert.equal(clientIpFromRequest(request), '203.0.113.20');
});

test('technician login route uses generic auth errors, throttling and Retry-After', () => {
  const route = readFileSync(new URL('../app/api/technician/login/route.ts', import.meta.url), 'utf8');
  assert.ok(route.includes("const GENERIC_ERROR = 'Invalid technician login details.'"));
  assert.ok(route.includes('checkTechnicianLoginRateLimit'));
  assert.ok(route.includes('recordTechnicianLoginFailure'));
  assert.ok(route.includes('resetTechnicianLoginFailures'));
  assert.ok(route.includes("'Retry-After'"));
  assert.ok(route.includes('status: 429'));
});
