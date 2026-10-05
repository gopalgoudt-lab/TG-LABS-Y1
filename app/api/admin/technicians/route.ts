import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminFromRequest } from '@/lib/admin-audit';
import { adminAuthError } from '@/lib/admin-auth';
import { hashPin } from '@/lib/technician-auth';

export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().regex(/^[0-9]{10}$/),
  email: z.string().trim().email().max(200).optional().or(z.literal('')),
  employeeCode: z.string().trim().max(40).optional().or(z.literal('')),
  pincodes: z.array(z.string().regex(/^[1-9][0-9]{5}$/)).max(50).default([]),
  active: z.boolean().default(true),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
  loginPin: z.string().regex(/^[0-9]{4,6}$/),
});

export async function GET(request: Request) {
  try { await adminFromRequest(request); } catch (error) { const auth = adminAuthError(error); return NextResponse.json({ error: auth.error }, { status: auth.status }); }
  const technicians = await prisma.technician.findMany({
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      employeeCode: true,
      pincodes: true,
      active: true,
      notes: true,
    },
  });
  return NextResponse.json({ technicians });
}

export async function POST(request: Request) {
  try {
    await adminFromRequest(request);
    const b = schema.parse(await request.json());
    const technician = await prisma.technician.create({
      data: {
        name: b.name,
        phone: b.phone,
        email: b.email || null,
        employeeCode: b.employeeCode || null,
        pincodes: b.pincodes,
        active: b.active,
        notes: b.notes || null,
        loginPinHash: hashPin(b.loginPin),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        employeeCode: true,
        pincodes: true,
        active: true,
        notes: true,
      },
    });
    return NextResponse.json({ technician }, { status: 201 });
  } catch (error) {
    const auth = adminAuthError(error); if (auth.status !== 401 || error instanceof Error && error.message.startsWith('ADMIN_')) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Please check technician details.', fields: error.flatten().fieldErrors }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: 'Unable to create technician.' }, { status: 500 });
  }
}
