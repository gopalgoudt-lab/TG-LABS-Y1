import { strict as assert } from 'node:assert';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import { encryptStatement, decryptStatement } from '../lib/manual-upi-statement-encryption';

const key = randomBytes(32);
const receipt = 'a'.repeat(64);
const data = new TextEncoder().encode('SYNTHETIC BANK STATEMENT - NO REAL CUSTOMER DATA');

test('encrypted statement round trips only with correct booking and receipt', () => {
  const envelope = encryptStatement(data, key, 'booking-one', receipt);
  assert.deepEqual(decryptStatement(envelope, key, 'booking-one', receipt), Buffer.from(data));
  assert.notEqual(envelope.ciphertext, Buffer.from(data).toString('base64'));
});
test('fresh nonces produce different ciphertext', () => {
  const a = encryptStatement(data, key, 'booking-one', receipt);
  const b = encryptStatement(data, key, 'booking-one', receipt);
  assert.notEqual(a.nonce, b.nonce);
  assert.notEqual(a.ciphertext, b.ciphertext);
});
test('wrong booking or receipt cannot decrypt', () => {
  const envelope = encryptStatement(data, key, 'booking-one', receipt);
  assert.throws(() => decryptStatement(envelope, key, 'booking-two', receipt));
  assert.throws(() => decryptStatement(envelope, key, 'booking-one', 'b'.repeat(64)));
});
test('wrong key and tampered authentication tag cannot decrypt', () => {
  const envelope = encryptStatement(data, key, 'booking-one', receipt);
  assert.throws(() => decryptStatement(envelope, randomBytes(32), 'booking-one', receipt));
  assert.throws(() => decryptStatement({ ...envelope, tag: Buffer.alloc(16).toString('base64') }, key, 'booking-one', receipt));
});
test('weak key and empty statement fail closed', () => {
  assert.throws(() => encryptStatement(data, new Uint8Array(8), 'booking-one', receipt), /KEY_INVALID/);
  assert.throws(() => encryptStatement(new Uint8Array(), key, 'booking-one', receipt), /SIZE_INVALID/);
});
