import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminAuthError } from '@/lib/admin-auth';
import { adminFromRequest, writeAdminAudit } from '@/lib/admin-audit';

export const dynamic = 'force-dynamic';

type SnapshotLine = { name?: unknown; amount?: unknown };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await adminFromRequest(request);
    const { id } = await params;
    const existing = await prisma.booking.findUnique({
      where: { id },
      include: { items: { include: { test: { select: { name: true } } } }, packages: { include: { package: { select: { name: true } } } } },
    });
    if (!existing) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    if (existing.paymentStatus !== 'PAID') return NextResponse.json({ error: 'Only paid bookings can be reconciled from frozen payment evidence.' }, { status: 409 });

    const snapshot = existing.paymentReceiptSnapshot;
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return NextResponse.json({ error: 'A frozen payment receipt snapshot is required.' }, { status: 409 });
    const record = snapshot as Record<string, unknown>;
    const snapshotTotal = Number(record.total);
    const lines = Array.isArray(record.lines) ? record.lines as SnapshotLine[] : [];
    if (!Number.isFinite(snapshotTotal) || snapshotTotal <= 0 || lines.length === 0) return NextResponse.json({ error: 'Frozen payment evidence is incomplete.' }, { status: 409 });

    const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
    const expected = new Map<string, number>();
    for (const item of existing.items) expected.set(normalize(item.test.name), Number(item.price));
    for (const item of existing.packages) expected.set(normalize(item.package.name), Number(item.price));
    if (existing.homeCollectionCharge > 0) expected.set(normalize('Home Collection Charges'), Number(existing.homeCollectionCharge));
    if (existing.printedReportFee > 0) expected.set(normalize('Printed Report Charges'), Number(existing.printedReportFee));

    const frozen = new Map<string, number>();
    for (const line of lines) {
      const name = normalize(line.name), amount = Number(line.amount);
      if (!name || !Number.isFinite(amount)) return NextResponse.json({ error: 'Frozen payment line items are invalid.' }, { status: 409 });
      frozen.set(name, amount);
    }
    const sameEvidence = expected.size === frozen.size && [...expected].every(([name, amount]) => frozen.get(name) === amount);
    if (!sameEvidence) return NextResponse.json({ error: 'Current booking composition does not exactly match the frozen paid receipt. Manual incident review is required.' }, { status: 409 });

    const calculatedTotal = [...expected.values()].reduce((sum, amount) => sum + amount, 0);
    if (calculatedTotal !== snapshotTotal) return NextResponse.json({ error: 'Frozen receipt lines do not add up to the frozen total.' }, { status: 409 });
    if (Number(existing.totalAmount) === snapshotTotal) return NextResponse.json({ success: true, unchanged: true, totalAmount: existing.totalAmount });

    const previousTotal = Number(existing.totalAmount);
    const booking = await prisma.booking.update({ where: { id }, data: { totalAmount: snapshotTotal }, select: { id: true, totalAmount: true, paymentStatus: true, workflowStatus: true } });
    await writeAdminAudit(request, {
      action: 'PAID_BOOKING_RECONCILED',
      entityType: 'Booking',
      entityId: id,
      summary: 'Reconciled paid booking total from frozen receipt evidence',
      metadata: { previousTotal, reconciledTotal: snapshotTotal, evidence: 'paymentReceiptSnapshot', snapshotVersion: record.version ?? null },
    });
    return NextResponse.json({ success: true, booking });
  } catch (error) {
    const auth = adminAuthError(error);
    if (auth.status !== 401 || error instanceof Error && error.message.includes('ADMIN')) return NextResponse.json({ error: auth.error }, { status: auth.status });
    console.error('POST paid booking reconciliation failed', error);
    return NextResponse.json({ error: 'Unable to reconcile paid booking.' }, { status: 500 });
  }
}
