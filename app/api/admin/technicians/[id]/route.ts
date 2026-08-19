import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPin } from '@/lib/technician-auth';

export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().regex(/^[0-9]{10}$/),
  email: z.string().trim().email().max(200).optional().or(z.literal('')),
  employeeCode: z.string().trim().max(40).optional().or(z.literal('')),
  pincodes: z.array(z.string().regex(/^[1-9][0-9]{5}$/)).max(50).default([]),
  active: z.boolean(),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
  loginPin: z.string().regex(/^[0-9]{4,6}$/).optional().or(z.literal('')),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const b = schema.parse(await request.json());
    const technician = await prisma.technician.update({
      where: { id },
      data: {
        name: b.name,
        phone: b.phone,
        email: b.email || null,
        employeeCode: b.employeeCode || null,
        pincodes: b.pincodes,
        active: b.active,
        notes: b.notes || null,
        ...(b.loginPin ? { loginPinHash: hashPin(b.loginPin) } : {}),
      },
    });
    return NextResponse.json({ technician });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Please check technician details.', fields: error.flatten().fieldErrors }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: 'Unable to update technician.' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const technician = await prisma.technician.update({ where: { id }, data: { active: false } });
    await prisma.technicianSession.deleteMany({ where: { technicianId: id } });
    return NextResponse.json({ technician });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to deactivate technician.' }, { status: 500 });
  }
}
