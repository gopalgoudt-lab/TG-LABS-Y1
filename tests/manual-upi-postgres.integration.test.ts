import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID, createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { applyApprovedManualUpiAdjustment } from '../lib/manual-upi-atomic-adjustment';

if (!process.env.MANUAL_UPI_ISOLATED_DB_TEST || !process.env.NEON_DATABASE_URL?.includes('localhost'))
  throw new Error('Integration tests require explicit opt-in and a localhost isolated PostgreSQL database');

const prisma = new PrismaClient();
const receipt = { total: 5280, lines: [{ name: 'AAROGYAM CAMP PROFILE 3', amount: 5280 }] };


async function fixture() {
  const id = randomUUID();
  const patient = await prisma.patient.create({ data: { name: 'ISOLATED TEST ONLY', phone: 'test-' + id } });
  const booking = await prisma.booking.create({ data: {
    patientId: patient.id, mode: 'CENTRE', collectionDate: new Date(), slot: 'TEST',
    paymentStatus: 'PAID', paymentMode: 'UPI', totalAmount: 5280,
    paymentReceiptSnapshot: receipt,
  } });
 const savedBooking = await prisma.booking.findUniqueOrThrow({
  where: { id: booking.id },
  select: { paymentReceiptSnapshot: true },
});

const hash = createHash('sha256')
  .update(JSON.stringify(savedBooking.paymentReceiptSnapshot))
  .digest('hex');

await prisma.manualUpiCorrectionApproval.create({ data: {
    bookingId: booking.id, originalReceiptHash: hash, phonePeReferenceHash: 'test-hash',
    bankCreditEvidenceRef: 'test-evidence', paymentVerifiedByUid: 'verifier',
    requestedByUid: 'requester', approvedByUid: 'approver', discountAmount: 2780,
    verifiedPaidAmount: 2500, approvalReason: 'Isolated test approval',
    paymentVerifiedAt: new Date(), approvedAt: new Date(),
  } });
  return { booking, patient, hash };
}
function command(id: string, key: string, hash: string) {
  return {
    bookingId: id,
    correctionKey: key,
    approvedByUid: 'approver',
    approvedByPhone: 'test-admin',
    expectedOriginalGrossAmount: 5280,
    expectedOriginalReceiptHash: hash,
  };
}
async function cleanup(bookingId: string, patientId: string) {
  await prisma.bookingFinancialAdjustment.deleteMany({ where: { bookingId } });
  await prisma.manualUpiCorrectionApproval.deleteMany({ where: { bookingId } });
  await prisma.booking.delete({ where: { id: bookingId } });
  await prisma.patient.delete({ where: { id: patientId } });
}

test('isolated PostgreSQL: committed correction is idempotent, receipt remains frozen', async () => {
  const { booking, patient, hash } = await fixture();
  try {
    const key = randomUUID();
    const first = await applyApprovedManualUpiAdjustment(prisma, command(booking.id, key, hash));
   const again = await applyApprovedManualUpiAdjustment(prisma, command(booking.id, key, hash));
    assert.equal(first.unchanged, false);
    assert.equal(again.unchanged, true);
    assert.equal(first.adjustmentId, again.adjustmentId);
    assert.equal(await prisma.bookingFinancialAdjustment.count({ where: { bookingId: booking.id } }), 1);
    const current = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    assert.equal(current.totalAmount, 5280);
    assert.deepEqual(current.paymentReceiptSnapshot, receipt);
    const audit = await prisma.adminAuditLog.findMany({ where: { entityId: booking.id, action: 'MANUAL_UPI_FINANCIAL_CORRECTION' } });
    assert.equal(audit.length, 1);
  } finally {
    await prisma.adminAuditLog.deleteMany({ where: { entityId: booking.id, action: 'MANUAL_UPI_FINANCIAL_CORRECTION' } });
    await cleanup(booking.id, patient.id);
  }
});

test('isolated PostgreSQL: audit insertion failure rolls back financial adjustment', async () => {
  const { booking, patient, hash } = await fixture();
  const proxy = new Proxy(prisma, {
    get(target, property, receiver) {
      if (property === '$transaction') return async (callback: (tx: unknown) => Promise<unknown>, options: unknown) =>
        target.$transaction(async tx => callback(new Proxy(tx, {
          get(transaction, key) {
            if (key === 'adminAuditLog') return { create: async () => { throw new Error('FORCED_AUDIT_FAILURE'); } };
            return Reflect.get(transaction, key);
          },
        })), options as never);
      return Reflect.get(target, property, receiver);
    },
  });
  try {
   await assert.rejects(
  applyApprovedManualUpiAdjustment(
    proxy as PrismaClient,
    command(booking.id, randomUUID(), hash)
  ),
  /FORCED_AUDIT_FAILURE/
);
    assert.equal(await prisma.bookingFinancialAdjustment.count({ where: { bookingId: booking.id } }), 0);
  } finally {
    await cleanup(booking.id, patient.id);
  }
});


async function assertConcurrentCorrectionInvariant(sameKey: boolean) {
  const { booking, patient, hash } = await fixture();
  try {
    const firstKey = randomUUID();
    const secondKey = sameKey ? firstKey : randomUUID();
    const outcomes = await Promise.allSettled([
      applyApprovedManualUpiAdjustment(prisma, command(booking.id, firstKey, hash)),
      applyApprovedManualUpiAdjustment(prisma, command(booking.id, secondKey, hash)),
    ]);

    // A serialization conflict is permitted to fail closed; no second write is permitted.
    assert.ok(outcomes.some(result => result.status === 'fulfilled'),
      'at least one concurrent correction must commit');
    const adjustments = await prisma.bookingFinancialAdjustment.findMany({
      where: { bookingId: booking.id },
    });
    assert.equal(adjustments.length, 1, 'exactly one adjustment per booking');
    assert.ok([firstKey, secondKey].includes(adjustments[0].correctionKey));
    const audits = await prisma.adminAuditLog.findMany({
      where: { entityId: booking.id, action: 'MANUAL_UPI_FINANCIAL_CORRECTION' },
    });
    assert.equal(audits.length, 1, 'exactly one corresponding audit record');
    const current = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    assert.equal(current.totalAmount, 5280);
    assert.deepEqual(current.paymentReceiptSnapshot, receipt);
    assert.equal(adjustments[0].verifiedPaidAmount, 2500);
    assert.equal(adjustments[0].correctedNetAmount, 2500);

    for (const result of outcomes) {
      if (result.status === 'fulfilled') {
        assert.equal(result.value.adjustmentId, adjustments[0].id);
        if (!sameKey) assert.equal(result.value.unchanged, false);
      } else {
        // Prisma may surface serialization conflicts (P2034) or uniqueness
        // violations (P2002) rather than transparently retrying.
        const error = result.reason as { code?: string; message?: string };
        assert.ok(
          ['P2034', 'P2002'].includes(error?.code ?? '') ||
          (sameKey ? false : error?.message === 'BOOKING_ALREADY_ADJUSTED'),
          'unexpected concurrent correction failure: ' + String(error?.message),
        );
      }
    }
  } finally {
    await prisma.adminAuditLog.deleteMany({
      where: { entityId: booking.id, action: 'MANUAL_UPI_FINANCIAL_CORRECTION' },
    });
    await cleanup(booking.id, patient.id);
  }
}

test('isolated PostgreSQL: simultaneous same-key corrections create one adjustment and audit', async () => {
  await assertConcurrentCorrectionInvariant(true);
});

test('isolated PostgreSQL: simultaneous different-key corrections cannot double-adjust booking', async () => {
  await assertConcurrentCorrectionInvariant(false);
});

test.after(async () => { await prisma.$disconnect(); });
