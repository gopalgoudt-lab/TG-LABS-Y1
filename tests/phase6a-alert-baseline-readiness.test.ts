import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const doc=fs.readFileSync('PHASE-6A-ALERT-BASELINE.md','utf8');
test('launch alert baseline covers critical patient operations',()=>{for(const term of ['/api/health','Booking creation','Authentication abuse','Razorpay webhook','Report access/publication','Notification delivery'])assert.ok(doc.includes(term),term);});
test('alert baseline prohibits sensitive telemetry',()=>{assert.match(doc,/never patient report content/i);assert.match(doc,/Never log OTP values/i);assert.match(doc,/Hash or omit patient identifiers/i);assert.match(doc,/Do not attach request\/response bodies/i);});
test('operational readiness requires drills',()=>{assert.match(doc,/successful alert drill/i);assert.match(doc,/database recovery drill/i);});
