import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createTechnicianSession, verifyPin } from '@/lib/technician-auth';
import {
  checkTechnicianLoginRateLimit,
  clientIpFromRequest,
  recordTechnicianLoginFailure,
  resetTechnicianLoginFailures,
} from '@/lib/technician-login-rate-limit';

export const dynamic = 'force-dynamic';

const schema = z.object({
  identity: z.string().trim().min(3).max(120),
  pin: z.string().regex(/^[0-9]{4,6}$/),
});

const GENERIC_ERROR = 'Invalid technician login details.';
const RATE_LIMIT_ERROR = 'Too many login attempts. Please try again later.';

function rateLimited(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: RATE_LIMIT_ERROR },
    { status: 429, headers: { 'Retry-After': String(Math.max(1, retryAfterSeconds)) } },
  );
}

async function slowFailedAttempt() {
  await new Promise((resolve) => setTimeout(resolve, 250));
}

export async function POST(request: Request) {
  const ip = clientIpFromRequest(request);
  let identityForLimit = 'invalid-request';

  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      const failure = await recordTechnicianLoginFailure(identityForLimit, ip);
      await slowFailedAttempt();
      if (failure.locked) return rateLimited(failure.retryAfterSeconds);
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    const { identity, pin } = parsed.data;
    identityForLimit = identity;
    const limit = await checkTechnicianLoginRateLimit(identity, ip);
    if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);

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
      const failure = await recordTechnicianLoginFailure(identity, ip);
      await slowFailedAttempt();
      if (failure.locked) return rateLimited(failure.retryAfterSeconds);
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    await resetTechnicianLoginFailures(identity);
    await createTechnicianSession(technician.id);
    return NextResponse.json({
      technician: {
        id: technician.id,
        name: technician.name,
        phone: technician.phone,
        employeeCode: technician.employeeCode,
      },
    });
  } catch (error) {
    console.error('Technician login failed unexpectedly.', error);
    return NextResponse.json({ error: 'Unable to sign in.' }, { status: 500 });
  }
}
