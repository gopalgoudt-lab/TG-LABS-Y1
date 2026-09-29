import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const middleware=fs.readFileSync('middleware.ts','utf8');
test('cookie API mutations have an explicit same-origin CSRF gate',()=>{assert.match(middleware,/MUTATING_METHODS/);assert.match(middleware,/sameOriginMutation/);assert.match(middleware,/Cross-origin request blocked/);assert.match(middleware,/sec-fetch-site/);assert.match(middleware,/request\.nextUrl\.origin/);});
test('patient bearer-token APIs are not broadly origin-blocked',()=>{assert.match(middleware,/pathname\.startsWith\('\/api\/admin\/'\)/);assert.doesNotMatch(middleware,/pathname\.startsWith\('\/api\/patient\/'\).*sameOriginMutation/);assert.doesNotMatch(middleware,/pathname==='\/api\/bookings'.*sameOriginMutation/);});
