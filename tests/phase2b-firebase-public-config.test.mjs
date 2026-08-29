import assert from 'node:assert/strict';
import test from 'node:test';
import { phase2bFirebasePublicConfig } from './phase2b-firebase-public-config.mjs';

const valid = Object.freeze({
  PHASE2B_FIREBASE_PUBLIC_API_KEY: 'public-api-key',
  PHASE2B_FIREBASE_PUBLIC_AUTH_DOMAIN: 'phase2b-test.firebaseapp.com',
  PHASE2B_FIREBASE_PUBLIC_PROJECT_ID: 'phase2b-test',
  PHASE2B_FIREBASE_PUBLIC_APP_ID: 'public-app-id',
});

test('returns the complete validated public Firebase configuration', () => {
  assert.deepEqual(phase2bFirebasePublicConfig(valid), {
    apiKey: 'public-api-key',
    authDomain: 'phase2b-test.firebaseapp.com',
    projectId: 'phase2b-test',
    appId: 'public-app-id',
  });
});

for (const name of Object.keys(valid)) {
  test(`fails closed when ${name} is missing`, () => {
    const environment = { ...valid };
    delete environment[name];
    assert.throws(() => phase2bFirebasePublicConfig(environment), new RegExp(name));
  });
}

test('rejects an invalid project ID', () => {
  assert.throws(
    () => phase2bFirebasePublicConfig({ ...valid, PHASE2B_FIREBASE_PUBLIC_PROJECT_ID: 'Invalid_Project' }),
    /project ID is invalid/,
  );
});

test('rejects an auth domain for another Firebase project', () => {
  assert.throws(
    () => phase2bFirebasePublicConfig({ ...valid, PHASE2B_FIREBASE_PUBLIC_AUTH_DOMAIN: 'other-project.firebaseapp.com' }),
    /auth domain does not match/,
  );
});
