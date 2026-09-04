import assert from 'node:assert/strict';
import test from 'node:test';
import { canChangeTechnicianAssignment, canTechnicianTransition, technicianTimestamp } from '../lib/phase2d1-workflow';

test('technician workflow permits only sequential forward transitions', () => {
  assert.equal(canTechnicianTransition('TECHNICIAN_ASSIGNED', 'TECHNICIAN_ACCEPTED'), true);
  assert.equal(canTechnicianTransition('TECHNICIAN_ACCEPTED', 'ON_THE_WAY'), true);
  assert.equal(canTechnicianTransition('ON_THE_WAY', 'REACHED_PATIENT'), true);
  assert.equal(canTechnicianTransition('REACHED_PATIENT', 'SAMPLE_COLLECTED'), true);
  assert.equal(canTechnicianTransition('SAMPLE_COLLECTED', 'SAMPLE_RECEIVED_AT_LAB'), true);
});

test('technician workflow blocks skipping and regression', () => {
  assert.equal(canTechnicianTransition('TECHNICIAN_ASSIGNED', 'ON_THE_WAY'), false);
  assert.equal(canTechnicianTransition('SAMPLE_COLLECTED', 'REACHED_PATIENT'), false);
  assert.equal(canTechnicianTransition('BOOKING_CREATED', 'TECHNICIAN_ACCEPTED'), false);
});

test('same status is idempotent', () => {
  assert.equal(canTechnicianTransition('ON_THE_WAY', 'ON_THE_WAY'), true);
});

test('assignment changes lock once fulfilment starts', () => {
  assert.equal(canChangeTechnicianAssignment('BOOKING_CREATED'), true);
  assert.equal(canChangeTechnicianAssignment('BOOKING_CONFIRMED'), true);
  assert.equal(canChangeTechnicianAssignment('TECHNICIAN_ASSIGNED'), true);
  assert.equal(canChangeTechnicianAssignment('TECHNICIAN_ACCEPTED'), false);
  assert.equal(canChangeTechnicianAssignment('SAMPLE_COLLECTED'), false);
});

test('workflow timestamps map to the correct milestone only', () => {
  const now = new Date('2026-09-03T00:00:00.000Z');
  assert.deepEqual(technicianTimestamp('TECHNICIAN_ACCEPTED', now), { technicianAcceptedAt: now });
  assert.deepEqual(technicianTimestamp('SAMPLE_COLLECTED', now), { sampleCollectedAt: now });
  assert.deepEqual(technicianTimestamp('SAMPLE_RECEIVED_AT_LAB', now), { sampleReceivedAt: now });
  assert.deepEqual(technicianTimestamp('TECHNICIAN_ASSIGNED', now), {});
});
