import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic='force-dynamic';
export async function GET(){const logs=await prisma.adminAuditLog.findMany({orderBy:{createdAt:'desc'},take:250});return NextResponse.json({logs})}
