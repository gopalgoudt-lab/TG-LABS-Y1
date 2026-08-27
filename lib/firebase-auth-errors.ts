const SAFE_FIREBASE_MESSAGES: Record<string, string> = {
  'auth/invalid-phone-number': 'Enter a valid 10-digit Indian mobile number.',
  'auth/missing-phone-number': 'Enter your mobile number.',
  'auth/invalid-verification-code': 'The OTP is incorrect. Check the 6-digit code and try again.',
  'auth/code-expired': 'This OTP has expired. Request a new OTP and try again.',
  'auth/missing-verification-code': 'Enter the 6-digit OTP.',
  'auth/too-many-requests': 'Too many attempts were made. Please wait before trying again.',
  'auth/quota-exceeded': 'SMS verification is temporarily unavailable. Please try again later.',
  'auth/captcha-check-failed': 'Security verification failed. Refresh the page and try again.',
  'auth/network-request-failed': 'A network error interrupted verification. Check your connection and try again.',
  'auth/operation-not-allowed': 'Phone sign-in is temporarily unavailable. Please contact TG Labs support.',
  'auth/unauthorized-domain': 'Secure sign-in is not available on this domain.',
  'auth/web-storage-unsupported': 'This browser cannot keep a secure sign-in session. Enable browser storage and try again.',
};

function firebaseErrorCode(error: unknown) {
  if (!error || typeof error !== 'object' || !('code' in error)) return '';
  return typeof error.code === 'string' ? error.code : '';
}

export function firebaseAuthErrorMessage(error: unknown, fallback: string) {
  return SAFE_FIREBASE_MESSAGES[firebaseErrorCode(error)] || fallback;
}
