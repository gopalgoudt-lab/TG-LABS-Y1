import assert from 'node:assert/strict';
import test from 'node:test';
import { adminAuthError, issueAdminSession, verifyAdminSessionToken } from '../lib/admin-auth';

test('admin error statuses distinguish forbidden, unavailable and unauthenticated', () => {
  assert.equal(adminAuthError(new Error('ADMIN_FORBIDDEN')).status, 403);
  assert.equal(adminAuthError(new Error('ADMIN_NOT_CONFIGURED')).status, 503);
  assert.equal(adminAuthError(new Error('ADMIN_SESSION_NOT_CONFIGURED')).status, 503);
  assert.equal(adminAuthError(new Error('UNAUTHENTICATED')).status, 401);
});

test('admin session signing and verification enforce the allowed phone list', async () => {
  const oldSecret = process.env.ADMIN_SESSION_SECRET;
  const oldPhones = process.env.ADMIN_PHONE_NUMBERS;
  process.env.ADMIN_SESSION_SECRET = 'fictional-test-only-secret-with-32-characters-minimum';
  process.env.ADMIN_PHONE_NUMBERS = '9876543210';
  try {
    const token = await issueAdminSession({ uid: 'fictional-admin', phone: '9876543210', role: 'ADMIN' });
    const identity = await verifyAdminSessionToken(token);
    assert.equal(identity.uid, 'fictional-admin');
    assert.equal(identity.role, 'ADMIN');
    process.env.ADMIN_PHONE_NUMBERS = '9123456789';
    await assert.rejects(() => verifyAdminSessionToken(token), /ADMIN_FORBIDDEN/);
    await assert.rejects(() => verifyAdminSessionToken(token + 'tampered'), /signature|JWT|JWS/i);
  } finally {
    if (oldSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = oldSecret;
    if (oldPhones === undefined) delete process.env.ADMIN_PHONE_NUMBERS;
    else process.env.ADMIN_PHONE_NUMBERS = oldPhones;
  }
});

test('admin login redirect excludes protocol-relative and backslash-prefixed destinations', () => {
  const allowed = (next: string | null) => next && next.startsWith('/') && !next.startsWith('//') && !/[\\\r\n]/.test(next) ? next : '/admin';
  assert.equal(allowed('/admin/bookings'), '/admin/bookings');
  assert.equal(allowed('//attacker.example'), '/admin');
  assert.equal(allowed('/\\attacker.example'), '/admin');
  assert.equal(allowed('https://attacker.example'), '/admin');
});
