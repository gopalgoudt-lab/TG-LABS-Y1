import assert from 'node:assert/strict';
import test from 'node:test';
import { retrySerializableBooking } from '../lib/booking-transaction-retry';

test('retries a serialization conflict and returns the successful booking', async () => {
  let attempts = 0;
  const booking = await retrySerializableBooking(async () => {
    attempts += 1;
    if (attempts === 1) throw { code: 'P2034' };
    return { id: 'booking-1' };
  });

  assert.deepEqual(booking, { id: 'booking-1' });
  assert.equal(attempts, 2);
});

test('does not retry a uniqueness error so duplicate booking recovery can handle it', async () => {
  let attempts = 0;
  const error = { code: 'P2002' };
  await assert.rejects(retrySerializableBooking(async () => {
    attempts += 1;
    throw error;
  }), (received) => received === error);
  assert.equal(attempts, 1);
});

test('stops after three serialization conflicts', async () => {
  let attempts = 0;
  const error = { code: 'P2034' };
  await assert.rejects(retrySerializableBooking(async () => {
    attempts += 1;
    throw error;
  }), (received) => received === error);
  assert.equal(attempts, 3);
});
