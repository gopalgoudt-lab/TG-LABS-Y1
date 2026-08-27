import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

export type FirebasePatientIdentity = {
  uid: string;
  phone: string;
  databasePhone: string;
};

const INDIAN_FIREBASE_PHONE = /^\+91([6-9]\d{9})$/;

export function indianFirebasePhoneToDatabase(phone: unknown) {
  if (typeof phone !== 'string') throw new Error('PHONE_IDENTITY_REQUIRED');
  const match = INDIAN_FIREBASE_PHONE.exec(phone);
  if (!match) throw new Error('INDIAN_PHONE_IDENTITY_REQUIRED');
  return match[1];
}

export function normalizeIndianDatabasePhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (/^[6-9]\d{9}$/.test(digits)) return digits;
  if (/^91[6-9]\d{9}$/.test(digits)) return digits.slice(2);
  return '';
}

export function validateFirebaseTokenClaims(
  payload: JWTPayload,
  projectId: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): FirebasePatientIdentity {
  if (!projectId) throw new Error('FIREBASE_PROJECT_NOT_CONFIGURED');
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('INVALID_FIREBASE_ISSUER');
  if (payload.aud !== projectId) throw new Error('INVALID_FIREBASE_AUDIENCE');
  if (typeof payload.exp !== 'number' || payload.exp <= nowSeconds) throw new Error('FIREBASE_TOKEN_EXPIRED');

  const uid = typeof payload.sub === 'string' ? payload.sub : '';
  if (!uid || uid.length > 128) throw new Error('INVALID_FIREBASE_SUBJECT');

  const phone = typeof payload.phone_number === 'string' ? payload.phone_number : '';
  const databasePhone = indianFirebasePhoneToDatabase(phone);
  return { uid, phone, databasePhone };
}

export async function verifyFirebaseIdToken(token: string): Promise<FirebasePatientIdentity> {
  if (!token) throw new Error('UNAUTHENTICATED');

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
  if (!projectId) throw new Error('FIREBASE_PROJECT_NOT_CONFIGURED');

  const { payload } = await jwtVerify(token, FIREBASE_JWKS, {
    algorithms: ['RS256'],
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
  });
  return validateFirebaseTokenClaims(payload, projectId);
}

export async function verifyFirebasePatientRequest(request: Request): Promise<FirebasePatientIdentity> {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    throw new Error('UNAUTHENTICATED');
  }

  const token = authorization.slice(7).trim();
  if (!token) throw new Error('UNAUTHENTICATED');

  return verifyFirebaseIdToken(token);
}
