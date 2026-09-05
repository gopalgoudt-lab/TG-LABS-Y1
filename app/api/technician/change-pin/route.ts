import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getTechnicianSession, hashPin, verifyPin } from '@/lib/technician-auth';

export const dynamic = 'force-dynamic';

const schema = z.object({
  currentPin: z.string().regex(/^[0-9]{4,6}$/),
  newPin: z.string().regex(/^[0-9]{4,6}$/),
}).refine(value => value.currentPin !== value.newPin, {
  message: 'New PIN must be different from the current PIN.',
  path: ['newPin'],
});

export async function PATCH(request: Request) {
  try {
    const session = await getTechnicianSession();
    if (!session) return NextResponse.json({ error: 'Technician authentication required.' }, { status: 401 });
    const { currentPin, newPin } = schema.parse(await request.json());

    const technician = await prisma.technician.findUnique({ where: { id: session.technicianId } });
    if (!technician || !verifyPin(currentPin, technician.loginPinHash)) {
      return NextResponse.json({ error: 'Current PIN is incorrect.' }, { status: 401 });
    }

    await prisma.$transaction(async tx => {
      await tx.technician.update({ where: { id: technician.id }, data: { loginPinHash: hashPin(newPin) } });
      await tx.technicianSession.deleteMany({ where: { technicianId: technician.id, id: { not: session.id } } });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const first = error.issues[0]?.message;
      return NextResponse.json({ error: first || 'Enter a valid 4–6 digit PIN.' }, { status: 400 });
    }
    console.error('Technician PIN change failed', error);
    return NextResponse.json({ error: 'Unable to change PIN.' }, { status: 500 });
  }
}
