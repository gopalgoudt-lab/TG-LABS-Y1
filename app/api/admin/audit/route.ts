import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminFromRequest } from '@/lib/admin-audit';
import { adminAuthError } from '@/lib/admin-auth';

export const dynamic='force-dynamic';
export async function GET(request:Request){try{await adminFromRequest(request)}catch(error){const auth=adminAuthError(error);return NextResponse.json({error:auth.error},{status:auth.status})}const logs=await prisma.adminAuditLog.findMany({orderBy:{createdAt:'desc'},take:250});return NextResponse.json({logs})}
