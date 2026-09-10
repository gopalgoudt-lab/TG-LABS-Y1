import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Online payments are temporarily unavailable. Please pay by cash or UPI at sample collection.',
      code: 'RAZORPAY_TEMPORARILY_DISABLED',
    },
    { status: 503 },
  );
}
