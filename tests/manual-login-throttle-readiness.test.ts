import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../app/api/manual/session/route.ts', import.meta.url), 'utf8');

test('private manual sign-in has an explicit attempt limiter', () => {
  assert.match(source, /checkThyrocareLoginRateLimit/);
  assert.match(source, /recordThyrocareLoginFailure/);
});

test('locked sign-in returns HTTP 429 with Retry-After', () => {
  assert.match(source, /status:\s*429/);
  assert.match(source, /Retry-After/);
});

test('successful sign-in clears the identity failure bucket', () => {
  assert.match(source, /resetThyrocareLoginFailures/);
});
