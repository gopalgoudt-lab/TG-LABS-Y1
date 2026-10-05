import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTechnicianSession } from '@/lib/technician-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getTechnicianSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const bookings = await prisma.booking.findMany({
    where: { technicianId: session.technicianId, status: { not: 'CANCELLED' } },
    orderBy: [{ collectionDate: 'asc' }, { slot: 'asc' }],
    select: {
      id: true,
      workflowStatus: true,
      collectionDate: true,
      slot: true,
      address: true,
      pincode: true,
      paymentStatus: true,
      paymentMode: true,
      totalAmount: true,
      technicianNotes: true,
      doctorName: true,
      printedReport: true,
      printedReportFee: true,
      patient: { select: { name: true, phone: true, email: true, age: true, gender: true } },
      items: {
        select: {
          price: true,
          test: { select: { name: true, sampleTypes: true, sampleTypeOther: true, fastingNeeded: true, tat: true } },
        },
      },
    },
  });
  return NextResponse.json({ technician: session.technician, bookings });
}
