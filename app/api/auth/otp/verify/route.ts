import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { z } from 'zod';
import { prisma } from '../../../../../lib/prisma';
import { createPatientSession, sessionCookie } from '../../../../../lib/auth';

export const runtime = 'nodejs';

const input = z.object({
  phone: z.string().trim().regex(/^\+91[6-9]\d{9}$/),
  code: z.string().trim().regex(/^\d{4,10}$/),
});

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

    const check = await client().verify.v2.services(serviceSid).verificationChecks.create({ to: body.phone, code: body.code });
    if (check.status !== 'approved') {
      return NextResponse.json({ ok: false, error: 'Incorrect or expired OTP.' }, { status: 401 });
    }

    const patient = await prisma.patient.upsert({
      where: { phone: body.phone },
      update: {},
      create: { phone: body.phone, name: 'TG Labs Patient' },
    });

    const token = await createPatientSession({ patientId: patient.id, phone: patient.phone, role: 'PATIENT' });
    const response = NextResponse.json({ ok: true, redirect: '/patient' });
    response.cookies.set(sessionCookie.name, token, sessionCookie.options);
    return response;
  } catch {
    return NextResponse.json({ ok: false, error: 'Unable to verify OTP. Please try again.' }, { status: 400 });
  }
}
