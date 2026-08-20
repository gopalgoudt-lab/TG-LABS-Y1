import { createRemoteJWKSet, jwtVerify } from 'jose';

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

export type FirebasePatientIdentity = {
  uid: string;
  phone: string;
};

export async function verifyFirebasePatientRequest(request: Request): Promise<FirebasePatientIdentity> {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    throw new Error('UNAUTHENTICATED');
  }

  const token = authorization.slice(7).trim();
  if (!token) throw new Error('UNAUTHENTICATED');

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('FIREBASE_PROJECT_NOT_CONFIGURED');

  const { payload } = await jwtVerify(token, FIREBASE_JWKS, {
    algorithms: ['RS256'],
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
  });

  const phone = typeof payload.phone_number === 'string' ? payload.phone_number : '';
  const uid = typeof payload.sub === 'string' ? payload.sub : '';
  if (!phone || !uid) throw new Error('PHONE_IDENTITY_REQUIRED');

  return { uid, phone };
}

export function patientPhoneFromFirebase(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits.slice(-10);
}
