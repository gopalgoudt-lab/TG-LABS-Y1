import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const bookings = fs.readFileSync('app/api/patient/bookings/route.ts', 'utf8');
const reports = fs.readFileSync('app/api/patient/reports/route.ts', 'utf8');
const patientPage = fs.readFileSync('app/patient/page.tsx', 'utf8');

for (const [name, source] of [['bookings', bookings], ['reports', reports]] as const) {
  test(`patient ${name} API preserves 401 for genuine authentication failures`, () => {
    assert.match(source, /authenticationErrors\.has\(message\) \? 401 : 503/);
    for (const authError of [
      'UNAUTHENTICATED',
      'INVALID_FIREBASE_TOKEN',
      'FIREBASE_TOKEN_EXPIRED',
      'INVALID_FIREBASE_ISSUER',
      'INVALID_FIREBASE_AUDIENCE',
      'INVALID_FIREBASE_SUBJECT',
      'PHONE_IDENTITY_REQUIRED',
      'INDIAN_PHONE_IDENTITY_REQUIRED',
    ]) {
      assert.match(source, new RegExp(`['"]${authError}['"]`));
    }
    assert.match(source, /'Please sign in again\.'/);
  });

  test(`patient ${name} API maps non-auth failures such as database outages to 503`, () => {
    assert.match(source, /authenticationErrors\.has\(message\) \? 401 : 503/);
    assert.match(source, /'Patient services are temporarily unavailable\. Please try again shortly\.'/);
  });
}

test('patient dashboard signs out only on 401 and keeps session for 503 service failures', () => {
  assert.match(patientPage, /if \(br\.status === 401 \|\| rr\.status === 401\) \{/);
  assert.match(patientPage, /await signOut\(auth\);/);
  assert.match(patientPage, /if \(!br\.ok \|\| !rr\.ok\) throw new Error\('Unable to load your TG Labs account right now\.'\);/);
  assert.doesNotMatch(patientPage, /status === 503[^\n]*signOut/);
});
