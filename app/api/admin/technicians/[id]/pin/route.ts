import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminFromRequest, writeAdminAudit } from '@/lib/admin-audit';
import { hashPin } from '@/lib/technician-auth';

export const dynamic = 'force-dynamic';

const schema = z.object({ pin: z.string().regex(/^[0-9]{4,6}$/) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await adminFromRequest(request);
    const { id } = await params;
    const { pin } = schema.parse(await request.json());
    const technician = await prisma.technician.findUnique({ where: { id } });
    if (!technician) return NextResponse.json({ error: 'Technician not found.' }, { status: 404 });

    await prisma.$transaction(async tx => {
      await tx.technician.update({ where: { id }, data: { loginPinHash: hashPin(pin) } });
      await tx.technicianSession.deleteMany({ where: { technicianId: id } });
    });

    await writeAdminAudit(request, {
      action: 'TECHNICIAN_PIN_RESET',
      entityType: 'Technician',
      entityId: id,
      summary: `Reset login PIN for technician ${technician.name}`,
      metadata: { actorRole: admin.role, actorSource: 'TG_LABS_ADMIN', employeeCode: technician.employeeCode || null },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'UNAUTHENTICATED' || message.startsWith('ADMIN_')) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Enter a 4–6 digit PIN.' }, { status: 400 });
    console.error('Technician PIN reset failed', error);
    return NextResponse.json({ error: 'Unable to reset technician PIN.' }, { status: 500 });
  }
}
