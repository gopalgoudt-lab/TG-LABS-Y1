import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const app =
  getApps()[0] ??
  initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });

export const adminAuth = getAuth(app);

export async function requirePatientPhone(request: Request) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) {
    throw new Error("UNAUTHENTICATED");
  }

  const token = header.slice(7);
  const decoded = await adminAuth.verifyIdToken(token);
  if (!decoded.phone_number) {
    throw new Error("PHONE_REQUIRED");
  }

  return decoded.phone_number;
}
