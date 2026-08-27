import assert from 'node:assert/strict';
import test from 'node:test';
import { indianFirebasePhoneToDatabase, validateFirebaseTokenClaims } from '../lib/firebase-server';
import { firebaseAuthErrorMessage } from '../lib/firebase-auth-errors';

const projectId = 'tg-labs-auth-test';
const now = 2_000_000_000;

function claims(overrides: Record<string, unknown> = {}) {
  return {
    iss: `https://securetoken.google.com/${projectId}`,
    aud: projectId,
    sub: 'firebase-test-user',
    exp: now + 3600,
    iat: now - 10,
    phone_number: '+919876543210',
    ...overrides,
  };
}

test('accepts a strict Indian Firebase E.164 mobile identity', () => {
  const identity = validateFirebaseTokenClaims(claims(), projectId, now);
  assert.deepEqual(identity, {
    uid: 'firebase-test-user',
    phone: '+919876543210',
    databasePhone: '9876543210',
  });
});

test('rejects foreign numbers even when their final 10 digits collide', () => {
  assert.throws(() => indianFirebasePhoneToDatabase('+449876543210'), /INDIAN_PHONE_IDENTITY_REQUIRED/);
  assert.throws(
    () => validateFirebaseTokenClaims(claims({ phone_number: '+449876543210' }), projectId, now),
    /INDIAN_PHONE_IDENTITY_REQUIRED/,
  );
});

test('rejects missing and malformed phone claims', () => {
  for (const phone_number of [undefined, '', '9876543210', '+91 9876543210', '+915876543210', '+91987654321']) {
    assert.throws(
      () => validateFirebaseTokenClaims(claims({ phone_number }), projectId, now),
      /PHONE_IDENTITY_REQUIRED|INDIAN_PHONE_IDENTITY_REQUIRED/,
    );
  }
});

test('rejects an incorrect Firebase issuer', () => {
  assert.throws(
    () => validateFirebaseTokenClaims(claims({ iss: 'https://securetoken.google.com/other-project' }), projectId, now),
    /INVALID_FIREBASE_ISSUER/,
  );
});

test('rejects an incorrect Firebase audience', () => {
  assert.throws(
    () => validateFirebaseTokenClaims(claims({ aud: 'other-project' }), projectId, now),
    /INVALID_FIREBASE_AUDIENCE/,
  );
});

test('rejects expired and missing expiry claims', () => {
  assert.throws(
    () => validateFirebaseTokenClaims(claims({ exp: now }), projectId, now),
    /FIREBASE_TOKEN_EXPIRED/,
  );
  assert.throws(
    () => validateFirebaseTokenClaims(claims({ exp: undefined }), projectId, now),
    /FIREBASE_TOKEN_EXPIRED/,
  );
});

test('rejects missing or oversized Firebase subjects', () => {
  assert.throws(() => validateFirebaseTokenClaims(claims({ sub: '' }), projectId, now), /INVALID_FIREBASE_SUBJECT/);
  assert.throws(
    () => validateFirebaseTokenClaims(claims({ sub: 'x'.repeat(129) }), projectId, now),
    /INVALID_FIREBASE_SUBJECT/,
  );
});

test('maps Firebase failures to safe user-facing messages without exposing raw details', () => {
  assert.equal(
    firebaseAuthErrorMessage({ code: 'auth/invalid-verification-code', message: 'raw provider detail' }, 'fallback'),
    'The OTP is incorrect. Check the 6-digit code and try again.',
  );
  assert.equal(
    firebaseAuthErrorMessage(new Error('sensitive internal detail'), 'Safe fallback.'),
    'Safe fallback.',
  );
});
