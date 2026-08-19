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
    include: { patient: true, items: { include: { test: true } } },
  });
  return NextResponse.json({ technician: session.technician, bookings });
}
