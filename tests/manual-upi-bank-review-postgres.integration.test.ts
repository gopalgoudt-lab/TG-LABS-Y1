import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

if (process.env.MANUAL_UPI_ISOLATED_DB_TEST !== '1' ||
    !/^postgres(?:ql)?:\/\/[^@]+@(?:localhost|127\.0\.0\.1):5432\/manual_upi_test(?:\?|$)/.test(process.env.NEON_DATABASE_URL || ''))
  throw new Error('REQUIRES_DISPOSABLE_LOCALHOST_MANUAL_UPI_DATABASE');

const prisma = new PrismaClient();
const hash = (char: string) => char.repeat(64);
const receipt = { total: 5280, lines: [{ name: 'SYNTHETIC PROFILE', amount: 5280 }] };

async function fixture() {
  const patient = await prisma.patient.create({ data: { name: 'ISOLATED BANK REVIEW TEST', phone: 'test-' + randomUUID() } });
  const booking = await prisma.booking.create({ data: {
    patientId: patient.id, mode: 'CENTRE', collectionDate: new Date(),
    slot: 'TEST', paymentStatus: 'PAID', paymentMode: 'UPI',
    totalAmount: 5280, paymentReceiptSnapshot: receipt,
  } });
  return { patient, booking };
}
function review(bookingId: string, reference: string) {
  return {
    bookingId, originalReceiptHash: hash('a'), paymentReferenceHmac: reference,
    receivingAccountHmac: hash('b'), verifiedAmountPaise: 250000,
    currency: 'INR', statementEvidenceDigest: hash('c'),
    privateEvidenceObjectKey: 'manual-upi/synthetic/abcdefghijklmnop',
    verifiedByUid: 'accounts-staff', requestedByUid: 'requester',
    intendedApproverUid: 'owner', creditPostedAt: new Date('2026-10-10'),
    statementPeriodStart: new Date('2026-10-01'),
    statementPeriodEnd: new Date('2026-10-19'),
  };
}
async function cleanup(bookingIds: string[], patientIds: string[]) {
  await prisma.manualUpiBankStatementReview.deleteMany({ where: { bookingId: { in: bookingIds } } });
  await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
  await prisma.patient.deleteMany({ where: { id: { in: patientIds } } });
}

test('isolated database rejects same payment reference for two bookings', async () => {
  const a = await fixture(), b = await fixture();
  try {
    await prisma.manualUpiBankStatementReview.create({ data: review(a.booking.id, hash('d')) });
    await assert.rejects(
      prisma.manualUpiBankStatementReview.create({ data: review(b.booking.id, hash('d')) }),
      (e: any) => e?.code === 'P2002',
    );
    assert.equal(await prisma.manualUpiBankStatementReview.count({ where: { paymentReferenceHmac: hash('d') } }), 1);
  } finally { await cleanup([a.booking.id, b.booking.id], [a.patient.id, b.patient.id]); }
});

test('isolated database rejects second review for same booking', async () => {
  const a = await fixture();
  try {
    await prisma.manualUpiBankStatementReview.create({ data: review(a.booking.id, hash('e')) });
    await assert.rejects(
      prisma.manualUpiBankStatementReview.create({ data: review(a.booking.id, hash('f')) }),
      (e: any) => e?.code === 'P2002',
    );
    assert.equal(await prisma.manualUpiBankStatementReview.count({ where: { bookingId: a.booking.id } }), 1);
  } finally { await cleanup([a.booking.id], [a.patient.id]); }
});

test('concurrent same-reference inserts never produce two reviews', async () => {
  const a = await fixture(), b = await fixture();
  try {
    const outcomes = await Promise.allSettled([
      prisma.manualUpiBankStatementReview.create({ data: review(a.booking.id, hash('1')) }),
      prisma.manualUpiBankStatementReview.create({ data: review(b.booking.id, hash('1')) }),
    ]);
    assert.equal(outcomes.filter(x => x.status === 'fulfilled').length, 1);
    assert.equal(await prisma.manualUpiBankStatementReview.count({ where: { paymentReferenceHmac: hash('1') } }), 1);
  } finally { await cleanup([a.booking.id, b.booking.id], [a.patient.id, b.patient.id]); }
});

test('rolled-back verification transaction leaves no bank review', async () => {
  const a = await fixture();
  try {
    await assert.rejects(prisma.$transaction(async tx => {
      await tx.manualUpiBankStatementReview.create({ data: review(a.booking.id, hash('2')) });
      throw new Error('SYNTHETIC_AUDIT_FAILURE');
    }), /SYNTHETIC_AUDIT_FAILURE/);
    assert.equal(await prisma.manualUpiBankStatementReview.count({ where: { bookingId: a.booking.id } }), 0);
    const unchanged = await prisma.booking.findUniqueOrThrow({ where: { id: a.booking.id } });
    assert.equal(unchanged.totalAmount, 5280);
    assert.deepEqual(unchanged.paymentReceiptSnapshot, receipt);
  } finally { await cleanup([a.booking.id], [a.patient.id]); }
});

test.after(async () => { await prisma.$disconnect(); });
