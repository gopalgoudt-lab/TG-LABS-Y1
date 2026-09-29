import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const middleware=fs.readFileSync('middleware.ts','utf8');

test('CSP remains report-only during Phase 6A compatibility validation',()=>{
  assert.match(middleware,/Content-Security-Policy-Report-Only/);
  assert.doesNotMatch(middleware,/headers\.set\('Content-Security-Policy',/);
});

test('CSP denies dangerous defaults and framing',()=>{
  assert.match(middleware,/default-src 'self'/);
  assert.match(middleware,/object-src 'none'/);
  assert.match(middleware,/frame-ancestors 'none'/);
  assert.match(middleware,/base-uri 'self'/);
  assert.match(middleware,/form-action 'self'/);
});

test('CSP includes Firebase phone auth and both reCAPTCHA host families',()=>{
  assert.match(middleware,/https:\/\/www\.google\.com/);
  assert.match(middleware,/https:\/\/www\.gstatic\.com/);
  assert.match(middleware,/https:\/\/www\.recaptcha\.net/);
  assert.match(middleware,/https:\/\/\*\.googleapis\.com/);
  assert.match(middleware,/https:\/\/\*\.firebaseapp\.com/);
  assert.match(middleware,/https:\/\/securetoken\.googleapis\.com/);
  assert.match(middleware,/https:\/\/identitytoolkit\.googleapis\.com/);
});

test('report-only CSP is applied through the existing secure response helper',()=>{
  assert.match(middleware,/function secure[\s\S]*Content-Security-Policy-Report-Only/);
});
