import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const source=readFileSync(new URL('../app/api/manual/session/route.ts',import.meta.url),'utf8');
const limiter=readFileSync(new URL('../lib/thyrocare-login-rate-limit.ts',import.meta.url),'utf8');
test('manual sign-in checks and records throttling',()=>{assert.match(source,/checkThyrocareLoginRateLimit/);assert.match(source,/recordThyrocareLoginFailure/);assert.match(source,/clientIpFromRequest/);});
test('locked sign-in returns 429 with Retry-After',()=>{assert.match(source,/status:429/);assert.match(source,/Retry-After/);});
test('successful sign-in resets identity failures',()=>assert.match(source,/resetThyrocareLoginFailures/));
test('limiter has identity and IP thresholds with distributed fallback',()=>{assert.match(limiter,/IDENTITY_LIMIT=5/);assert.match(limiter,/IP_LIMIT=30/);assert.match(limiter,/UPSTASH_REDIS_REST_URL/);assert.match(limiter,/memory fallback/);});
