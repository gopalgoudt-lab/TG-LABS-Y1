import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { applyApprovedManualUpiAdjustment } from '../lib/manual-upi-atomic-adjustment';

const receipt = { total: 5280, lines: [{ name: 'AAROGYAM CAMP PROFILE 3', amount: 5280 }] };
const receiptHash = createHash('sha256').update(JSON.stringify(receipt)).digest('hex');
const command = {
  bookingId: 'booking-1', correctionKey: 'correction-1',
  approvedByUid: 'approver-2', approvedByPhone: 'test-admin',
  expectedOriginalGrossAmount: 5280, expectedOriginalReceiptHash: receiptHash,
};
const approval = {
  id: 'approval-1', bookingId: 'booking-1', approvedByUid: 'approver-2',
  requestedByUid: 'requester-1', paymentVerifiedByUid: 'verifier-3',
  originalReceiptHash: receiptHash, discountAmount: 2780, verifiedPaidAmount: 2500,
  phonePeReferenceHash: 'hashed-phonepe-reference',
  bankCreditEvidenceRef: 'private-bank-evidence',
  approvalReason: 'Verified manual UPI discount correction',
  approvedAt: new Date('2026-10-09T12:00:00.000Z'),
};
type Adjustment = { id: string; bookingId: string; correctionKey: string };
function fakeDatabase(options: { approved?: boolean; failAudit?: boolean; existing?: Adjustment } = {}) {
  const writes: { adjustment?: Record<string, unknown>; audit?: Record<string, unknown> } = {};
  const tx = {
    booking: { findUnique: async () => ({ id: 'booking-1', paymentStatus: 'PAID', totalAmount: 5280, paymentReceiptSnapshot: receipt }) },
    manualUpiCorrectionApproval: { findUnique: async () => options.approved === false ? null : approval },
    bookingFinancialAdjustment: {
      findUnique: async () => options.existing ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        writes.adjustment = data;
        return { id: 'adjustment-1', ...data };
      },
    },
    adminAuditLog: { create: async ({ data }: { data: Record<string, unknown> }) => {
      if (options.failAudit) throw new Error('AUDIT_WRITE_FAILED');
      writes.audit = data;
      return { id: 'audit-1' };
    } },
  };
  const db = {
    $transaction: async (fn: (transaction: any) => Promise<unknown>) => fn(tx),
  };
  return { db, writes };
}

test('creates adjustment and audit with the verified ₹5280/₹2780/₹2500 amounts', async () => {
  const { db, writes } = fakeDatabase();
  const result = await applyApprovedManualUpiAdjustment(db as never, command);
  assert.deepEqual(result, { adjustmentId: 'adjustment-1', unchanged: false });
  assert.equal(writes.adjustment?.discountAmount, 2780);
  assert.equal(writes.adjustment?.correctedNetAmount, 2500);
  assert.equal(writes.audit?.action, 'MANUAL_UPI_FINANCIAL_CORRECTION');
});

test('rejects missing trusted approval without creating adjustment', async () => {
  const { db, writes } = fakeDatabase({ approved: false });
  await assert.rejects(applyApprovedManualUpiAdjustment(db as never, command), /TRUSTED_APPROVAL_REQUIRED/);
  assert.equal(writes.adjustment, undefined);
});

test('same correction key returns unchanged; a different key is blocked', async () => {
  const existing = { id: 'adjustment-existing', bookingId: 'booking-1', correctionKey: 'correction-1' };
  const { db, writes } = fakeDatabase({ existing });
  assert.deepEqual(await applyApprovedManualUpiAdjustment(db as never, command),
    { adjustmentId: 'adjustment-existing', unchanged: true });
  await assert.rejects(
    applyApprovedManualUpiAdjustment(db as never, { ...command, correctionKey: 'different' }),
    /BOOKING_ALREADY_ADJUSTED/,
  );
  assert.equal(writes.audit, undefined);
});

test('propagates audit failure; actual rollback requires PostgreSQL integration test', async () => {
  const { db } = fakeDatabase({ failAudit: true });
  await assert.rejects(applyApprovedManualUpiAdjustment(db as never, command), /AUDIT_WRITE_FAILED/);
});
