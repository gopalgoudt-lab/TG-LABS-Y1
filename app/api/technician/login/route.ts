import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createTechnicianSession, verifyPin } from '@/lib/technician-auth';

export const dynamic = 'force-dynamic';

const schema = z.object({
  identity: z.string().trim().min(3).max(120),
  pin: z.string().regex(/^[0-9]{4,6}$/),
});

export async function POST(request: Request) {
  try {
    const { identity, pin } = schema.parse(await request.json());
    const normalized = identity.toLowerCase();
    const technician = await prisma.technician.findFirst({
      where: {
        active: true,
        OR: [
          { phone: identity.replace(/\D/g, '') },
          { employeeCode: { equals: identity, mode: 'insensitive' } },
          { email: { equals: normalized, mode: 'insensitive' } },
        ],
      },
    });
    if (!technician || !verifyPin(pin, technician.loginPinHash)) {
      return NextResponse.json({ error: 'Invalid technician login details.' }, { status: 401 });
    }
    await createTechnicianSession(technician.id);
    return NextResponse.json({ technician: { id: technician.id, name: technician.name, phone: technician.phone, employeeCode: technician.employeeCode } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Enter your mobile/employee code and 4–6 digit PIN.' }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: 'Unable to sign in.' }, { status: 500 });
  }
}
