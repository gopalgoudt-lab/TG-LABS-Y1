import { randomBytes } from 'node:crypto';
import { validateCiphertextVaultReceipt } from './manual-upi-ciphertext-vault-receipt';
import type { PrivateStatementCiphertextVault } from './manual-upi-ciphertext-vault-handoff';

/**
 * Candidate AWS S3 ciphertext-only adapter for isolated integration tests.
 * No AWS SDK, credential, or route is installed here. Caller-supplied client
 * MUST be an independently reviewed, server-only S3 client.
 */
export type S3PutObject = (request: Readonly<{
  Bucket: string;
  Key: string;
  Body: string;
  ContentType: 'application/json';
  ServerSideEncryption: 'aws:kms';
  SSEKMSKeyId: string;
  IfNoneMatch: '*';
}>) => Promise<unknown>;

export function createCandidateS3CiphertextVault(input: Readonly<{
  bucketName: string;
  kmsKeyArn: string;
  putObject: S3PutObject;
}>): PrivateStatementCiphertextVault {
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(input.bucketName) ||
      !/^arn:aws[a-z-]*:kms:[a-z0-9-]+:\d{12}:key\/[a-zA-Z0-9-]+$/.test(input.kmsKeyArn) ||
      typeof input.putObject !== 'function')
    throw new Error('CANDIDATE_S3_CONFIGURATION_INVALID');

  return {
    providerId: 'candidate-s3-not-security-approved',
    async putEncryptedStatement(payload) {
      if (!payload || typeof payload.bookingId !== 'string' ||
          !/^[a-zA-Z0-9_-]{1,128}$/.test(payload.bookingId) ||
          !/^[a-f0-9]{64}$/.test(payload.originalReceiptHash) ||
          !/^[a-f0-9]{64}$/.test(payload.ciphertextSha256) ||
          !payload.authenticatedVerifierUid?.trim() ||
          typeof payload.ciphertextJson !== 'string' ||
          payload.ciphertextJson.length > 15 * 1024 * 1024)
        throw new Error('CANDIDATE_S3_PAYLOAD_INVALID');
      const { createHash } = await import('node:crypto');
      if (createHash('sha256').update(payload.ciphertextJson).digest('hex') !== payload.ciphertextSha256)
        throw new Error('CANDIDATE_S3_DIGEST_MISMATCH');
      let envelope: unknown;
      try { envelope = JSON.parse(payload.ciphertextJson); }
      catch { throw new Error('CANDIDATE_S3_ENVELOPE_INVALID'); }
      if (!envelope || typeof envelope !== 'object' ||
          (envelope as { version?: unknown }).version !== 1 ||
          (envelope as { algorithm?: unknown }).algorithm !== 'aes-256-gcm')
        throw new Error('CANDIDATE_S3_ENVELOPE_INVALID');
      const key = `manual-upi/${payload.bookingId}/${randomBytes(24).toString('hex')}`;
      await input.putObject({
        Bucket: input.bucketName,
        Key: key,
        Body: payload.ciphertextJson,
        ContentType: 'application/json',
        ServerSideEncryption: 'aws:kms',
        SSEKMSKeyId: input.kmsKeyArn,
        IfNoneMatch: '*',
      });
      return validateCiphertextVaultReceipt(payload, {
        objectKey: key, ciphertextSha256: payload.ciphertextSha256,
      });
    },
  };
}
