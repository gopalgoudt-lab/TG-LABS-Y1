import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTechnicianSession } from '@/lib/technician-auth';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getTechnicianSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const booking = await prisma.booking.findFirst({
    where: { id, technicianId: session.technicianId, status: { not: 'CANCELLED' } },
    include: { patient: true, items: { include: { test: true } } },
  });
  if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  return NextResponse.json({ technician: session.technician, booking });
}
