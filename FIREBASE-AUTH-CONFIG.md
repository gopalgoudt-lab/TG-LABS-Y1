# Firebase phone authentication configuration

TG Labs uses the Firebase Web SDK for SMS OTP and verifies Firebase ID tokens on the server with Google's published signing keys. The application does not require a Firebase service-account private key for this flow.

## Required application variables

Configure these values separately for Preview and Production in Vercel. Use the Firebase Web App configuration values; do not commit real values to Git.

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` (optional for phone auth, retained for the Firebase app configuration)
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` (optional for phone auth, retained for the Firebase app configuration)
- `NEXT_PUBLIC_FIREBASE_APP_ID`

`NEXT_PUBLIC_FIREBASE_PROJECT_ID` is also the server-side issuer and audience trust anchor. Preview and Production must use a consistent Firebase Web configuration for each deployed environment.

## Firebase Console checklist

Before an OTP test, confirm all of the following without changing production settings unexpectedly:

1. Phone sign-in is enabled under Authentication providers.
2. Only approved TG Labs deployment domains are listed as Authorized Domains.
3. SMS region policy permits India and excludes unnecessary regions.
4. SMS quota/billing alerts and abuse monitoring are configured.
5. Controlled testing uses an explicitly authorized Firebase test phone number where possible.

## Identity policy

Patient and OTP-recovery authorization accepts only a Firebase `phone_number` claim in strict Indian mobile E.164 form: `+91` followed by a valid 10-digit Indian mobile number beginning with 6–9. The server rejects foreign country codes, missing claims, local-only numbers, formatting characters and malformed values before deriving the 10-digit database phone.

Never derive an authenticated identity by taking the final 10 digits of an arbitrary verified phone number.

## Controlled-test stop gate

Loading the sign-in page and testing missing/invalid bearer-token failures do not send SMS. Calling Firebase `signInWithPhoneNumber` does send or simulate an OTP and requires explicit authorization for the exact test number before proceeding.
