import { NextResponse } from 'next/server';
import { clearTechnicianSession } from '@/lib/technician-auth';

export async function POST() {
  await clearTechnicianSession();
  return NextResponse.json({ ok: true });
}
