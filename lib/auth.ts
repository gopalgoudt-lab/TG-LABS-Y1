import { SignJWT, jwtVerify } from 'jose';

const COOKIE_NAME = 'tglabs_session';
const encoder = new TextEncoder();

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error('AUTH_SECRET is not configured');
  return encoder.encode(value);
}

export type PatientSession = { patientId: string; phone: string; role: 'PATIENT' };

export async function createPatientSession(payload: PatientSession) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret());
}

export async function verifyPatientSession(token: string) {
  const { payload } = await jwtVerify(token, secret());
  if (payload.role !== 'PATIENT' || typeof payload.patientId !== 'string' || typeof payload.phone !== 'string') {
    throw new Error('Invalid session');
  }
  return payload as unknown as PatientSession;
}

export const sessionCookie = {
  name: COOKIE_NAME,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  },
};
