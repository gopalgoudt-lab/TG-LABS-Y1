import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const limiter = readFileSync(new URL('../lib/public-api-rate-limit.ts', import.meta.url), 'utf8');
const booking = readFileSync(new URL('../app/api/bookings/route.ts', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('../app/api/catalog/route.ts', import.meta.url), 'utf8');
const serviceability = readFileSync(new URL('../app/api/serviceability/route.ts', import.meta.url), 'utf8');

test('public IP identity uses Vercel forwarding metadata instead of caller supplied x-forwarded-for', () => {
  assert.match(limiter, /x-vercel-forwarded-for/);
  assert.doesNotMatch(limiter, /x-forwarded-for/);
});

test('configured distributed limiter fails closed if backend is unavailable', () => {
  assert.match(limiter, /backendUnavailable: true/);
  assert.match(limiter, /status: unavailable \? 503 : 429/);
});

test('booking limit is authenticated and keyed by Firebase uid', () => {
  assert.ok(booking.indexOf('verifyFirebasePatientRequest(request)') < booking.indexOf("enforceApiRateLimit(request, 'booking', identity.uid"));
  assert.match(booking, /limit: 10, windowSeconds: 60/);
});

test('catalog and serviceability have bounded public request limits', () => {
  assert.match(catalog, /limit:120,windowSeconds:60/);
  assert.match(serviceability, /limit:60,windowSeconds:60/);
});

test('rate limit responses are non-cacheable and include Retry-After', () => {
  assert.match(limiter, /'Retry-After'/);
  assert.match(limiter, /'Cache-Control': 'no-store'/);
});


import { enforceApiRateLimit, rateLimitResponse } from '../lib/public-api-rate-limit';

test('distributed limiter permits requests below the configured limit', async () => {
  const fetchFn = async () => new Response(JSON.stringify([{ result: 1 }, { result: 1 }, { result: 60 }]), { status: 200 });
  const result = await enforceApiRateLimit(new Request('https://example.test'), 'test', 'patient-a', { limit: 10, windowSeconds: 60 }, {
    redis: { url: 'https://redis.example.test', token: 'test-token' },
    fetchFn: fetchFn as typeof fetch,
  });
  assert.equal(result.allowed, true);
  assert.equal(result.backendUnavailable, undefined);
});

test('distributed limiter returns 429 after the configured limit', async () => {
  const fetchFn = async () => new Response(JSON.stringify([{ result: 11 }, { result: 1 }, { result: 42 }]), { status: 200 });
  const result = await enforceApiRateLimit(new Request('https://example.test'), 'test', 'patient-b', { limit: 10, windowSeconds: 60 }, {
    redis: { url: 'https://redis.example.test', token: 'test-token' },
    fetchFn: fetchFn as typeof fetch,
  });
  const response = rateLimitResponse(result);
  assert.equal(result.allowed, false);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '42');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('configured distributed limiter fails closed with 503 on backend outage', async () => {
  const fetchFn = async () => { throw new Error('network unavailable'); };
  const result = await enforceApiRateLimit(new Request('https://example.test'), 'test', 'patient-c', { limit: 10, windowSeconds: 60 }, {
    redis: { url: 'https://redis.example.test', token: 'test-token' },
    fetchFn: fetchFn as typeof fetch,
  });
  const response = rateLimitResponse(result);
  assert.equal(result.allowed, false);
  assert.equal(result.backendUnavailable, true);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('Retry-After'), '5');
});
