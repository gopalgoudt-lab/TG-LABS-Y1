import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID, createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { applyApprovedManualUpiAdjustment } from '../lib/manual-upi-atomic-adjustment';

if (!process.env.MANUAL_UPI_ISOLATED_DB_TEST || !process.env.NEON_DATABASE_URL?.includes('localhost'))
  throw new Error('Integration tests require explicit opt-in and a localhost isolated PostgreSQL database');

const prisma = new PrismaClient();
const receipt = { total: 5280, lines: [{ name: 'AAROGYAM CAMP PROFILE 3', amount: 5280 }] };
const hash = createHash('sha256').update(JSON.stringify(receipt)).digest('hex');

async function fixture() {
  const id = randomUUID();
  const patient = await prisma.patient.create({ data: { name: 'ISOLATED TEST ONLY', phone: 'test-' + id } });
  const booking = await prisma.booking.create({ data: {
    patientId: patient.id, mode: 'CENTRE', collectionDate: new Date(), slot: 'TEST',
    paymentStatus: 'PAID', paymentMode: 'UPI', totalAmount: 5280,
    paymentReceiptSnapshot: receipt,
  } });
  await prisma.manualUpiCorrectionApproval.create({ data: {
    bookingId: booking.id, originalReceiptHash: hash, phonePeReferenceHash: 'test-hash',
    bankCreditEvidenceRef: 'test-evidence', paymentVerifiedByUid: 'verifier',
    requestedByUid: 'requester', approvedByUid: 'approver', discountAmount: 2780,
    verifiedPaidAmount: 2500, approvalReason: 'Isolated test approval',
    paymentVerifiedAt: new Date(), approvedAt: new Date(),
  } });
  return { booking, patient };
}
function command(id: string, key: string) {
  return { bookingId: id, correctionKey: key, approvedByUid: 'approver',
    approvedByPhone: 'test-admin', expectedOriginalGrossAmount: 5280,
    expectedOriginalReceiptHash: hash };
}
async function cleanup(bookingId: string, patientId: string) {
  await prisma.bookingFinancialAdjustment.deleteMany({ where: { bookingId } });
  await prisma.manualUpiCorrectionApproval.deleteMany({ where: { bookingId } });
  await prisma.booking.delete({ where: { id: bookingId } });
  await prisma.patient.delete({ where: { id: patientId } });
}

test('isolated PostgreSQL: committed correction is idempotent, receipt remains frozen', async () => {
  const { booking, patient } = await fixture();
  try {
    const key = randomUUID();
    const first = await applyApprovedManualUpiAdjustment(prisma, command(booking.id, key));
    const again = await applyApprovedManualUpiAdjustment(prisma, command(booking.id, key));
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
  const { booking, patient } = await fixture();
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
    await assert.rejects(applyApprovedManualUpiAdjustment(proxy as PrismaClient, command(booking.id, randomUUID())), /FORCED_AUDIT_FAILURE/);
    assert.equal(await prisma.bookingFinancialAdjustment.count({ where: { bookingId: booking.id } }), 0);
  } finally {
    await cleanup(booking.id, patient.id);
  }
});

test.after(async () => { await prisma.$disconnect(); });
