import { timingSafeEqual } from 'node:crypto';

/** Validates metadata returned by a future reviewed ciphertext vault.
 * This is NOT proof that the provider stored the object, enforced access
 * control, scanned malware, or produced an immutable access audit.
 */
export function validateCiphertextVaultReceipt(
  expected: Readonly<{ ciphertextSha256: string }>,
  actual: Readonly<{ objectKey: string; ciphertextSha256: string }> | null,
): Readonly<{ objectKey: string; ciphertextSha256: string }> {
  if (!actual || typeof actual.objectKey !== 'string' ||
      actual.objectKey.length < 8 || actual.objectKey.length > 512 ||
      !/^[A-Za-z0-9][A-Za-z0-9/_-]*$/.test(actual.objectKey) ||
      actual.objectKey.includes('..') || actual.objectKey.includes('//') ||
      actual.objectKey.startsWith('/') ||
      !/^[a-f0-9]{64}$/.test(expected.ciphertextSha256) ||
      typeof actual.ciphertextSha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test(actual.ciphertextSha256))
    throw new Error('VAULT_RECEIPT_INVALID');
  const left = Buffer.from(expected.ciphertextSha256, 'hex');
  const right = Buffer.from(actual.ciphertextSha256, 'hex');
  if (!timingSafeEqual(left, right))
    throw new Error('VAULT_CIPHERTEXT_DIGEST_MISMATCH');
  return { objectKey: actual.objectKey, ciphertextSha256: actual.ciphertextSha256 };
}
