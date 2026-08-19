import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { z } from 'zod';

export const runtime = 'nodejs';

const input = z.object({ phone: z.string().trim().regex(/^\+91[6-9]\d{9}$/, 'Enter a valid Indian mobile number') });

function client() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error('Twilio credentials are not configured');
  return twilio(sid, token);
}

export async function POST(request: Request) {
  try {
    const body = input.parse(await request.json());
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
    if (!serviceSid) throw new Error('TWILIO_VERIFY_SERVICE_SID is not configured');

    await client().verify.v2.services(serviceSid).verifications.create({ to: body.phone, channel: 'sms' });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : 'Unable to send OTP. Please try again.';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
