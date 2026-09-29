import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const middleware=fs.readFileSync('middleware.ts','utf8');

test('cookie-authenticated API mutations use an explicit same-origin CSRF gate',()=>{
  assert.match(middleware,/MUTATING_METHODS/);
  assert.match(middleware,/sameOriginMutation/);
  assert.match(middleware,/Cross-origin request blocked/);
  assert.match(middleware,/sec-fetch-site/);
  assert.match(middleware,/request\.nextUrl\.origin/);
});

test('admin session mutation is protected instead of exempted',()=>{
  assert.match(middleware,/pathname==='\/api\/admin\/session'/);
  assert.doesNotMatch(middleware,/pathname!=='\/api\/admin\/session'/);
});

test('requests missing both Origin and Sec-Fetch-Site fail closed',()=>{
  assert.match(middleware,/!origin&&!site\)return false/);
});

test('patient bearer-token APIs are not broadly origin-blocked',()=>{
  assert.doesNotMatch(middleware,/pathname==='\/api\/bookings'.*sameOriginMutation/);
  assert.doesNotMatch(middleware,/pathname\.startsWith\('\/api\/patient\/'\).*sameOriginMutation/);
});
