import { createHash } from 'node:crypto';
import type { PreparedBankStatement } from './manual-upi-bank-statement-vault-preparation';

/**
 * Private ciphertext-only storage integration contract.
 * No provider implementation, network access or financial write is installed.
 * The caller must independently verify staff authorization, malware scanning,
 * encryption key provenance, retention and vault access audit.
 */
export interface PrivateStatementCiphertextVault {
  readonly providerId: string;
  putEncryptedStatement(input: Readonly<{
    bookingId: string;
    originalReceiptHash: string;
    ciphertextJson: string;
    ciphertextSha256: string;
    authenticatedVerifierUid: string;
  }>): Promise<Readonly<{ objectKey: string; ciphertextSha256: string }>>;
}

export function prepareCiphertextVaultPayload(
  statement: PreparedBankStatement,
  authenticatedVerifierUid: string,
): Readonly<{
  bookingId: string;
  originalReceiptHash: string;
  ciphertextJson: string;
  ciphertextSha256: string;
  authenticatedVerifierUid: string;
}> {
  if (typeof authenticatedVerifierUid !== 'string' ||
      !authenticatedVerifierUid.trim() ||
      authenticatedVerifierUid !== authenticatedVerifierUid.trim())
    throw new Error('VAULT_AUTHENTICATED_VERIFIER_REQUIRED');
  if (!statement || !/^[a-f0-9]{64}$/i.test(statement.plaintextSha256))
    throw new Error('VAULT_PREPARED_STATEMENT_REQUIRED');
  if (statement.envelope?.version !== 1 || statement.envelope.algorithm !== 'aes-256-gcm')
    throw new Error('VAULT_ENCRYPTION_REQUIRED');
  const ciphertextJson = JSON.stringify(statement.envelope);
  return {
    bookingId: statement.bookingId,
    originalReceiptHash: statement.originalReceiptHash,
    ciphertextJson,
    ciphertextSha256: createHash('sha256').update(ciphertextJson).digest('hex'),
    authenticatedVerifierUid,
  };
}

/** An arbitrary provider instance is NOT proof of independent security review. */
export function assessCiphertextVaultActivation(
  _vault: PrivateStatementCiphertextVault | null,
): Readonly<{ enabled: false; blockers: readonly string[] }> {
  return {
    enabled: false,
    blockers: [
      'TRUSTED_KMS_AND_VAULT_PROVIDER_NOT_REVIEWED',
      'MALWARE_SCANNING_AND_ACCESS_AUDIT_NOT_ATTESTED',
      'RETENTION_AND_AUTHORIZATION_NOT_APPROVED',
      'FINANCIAL_WRITES_DISABLED',
    ],
  };
}
