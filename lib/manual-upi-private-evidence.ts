import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/** Server-only evidence identifiers. No statement contents, bank numbers,
 * UPI references or secrets should be written to logs or database columns.
 * This module performs no uploads, persistence, approvals or financial writes.
 */
export function evidenceHmac(value: string, secret: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 512)
    throw new Error('EVIDENCE_IDENTIFIER_INVALID');
  if (typeof secret !== 'string' || Buffer.byteLength(secret, 'utf8') < 32)
    throw new Error('EVIDENCE_HMAC_KEY_NOT_CONFIGURED');
  return createHmac('sha256', secret).update(value.trim(), 'utf8').digest('hex');
}

export function statementSha256(bytes: Uint8Array): string {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0)
    throw new Error('STATEMENT_BYTES_REQUIRED');
  return createHash('sha256').update(bytes).digest('hex');
}

export function matchingEvidenceDigest(expected: string, actual: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(expected) || !/^[a-f0-9]{64}$/i.test(actual)) return false;
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(actual, 'hex'));
}

export type PrivateEvidenceDescriptor = Readonly<{
  objectKey: string;
  digest: string;
  encryptedAtRest: true;
  accessAuditEnabled: true;
  privateAccess: true;
}>;

/** Fail closed: only server-confirmed vault metadata is eligible for later review.
 * The caller MUST obtain this descriptor from a trusted vault SDK, not a browser.
 */
export function assessPrivateEvidenceDescriptor(
  descriptor: PrivateEvidenceDescriptor | null,
): { eligible: boolean; blockers: string[] } {
  const blockers: string[] = [];
  if (!descriptor) return { eligible: false, blockers: ['PRIVATE_EVIDENCE_VAULT_UNAVAILABLE'] };
  if (!/^manual-upi\/[^/]+\/[a-zA-Z0-9_-]{16,128}$/.test(descriptor.objectKey))
    blockers.push('EVIDENCE_OBJECT_KEY_INVALID');
  if (!/^[a-f0-9]{64}$/i.test(descriptor.digest))
    blockers.push('EVIDENCE_DIGEST_INVALID');
  if (descriptor.encryptedAtRest !== true || descriptor.privateAccess !== true ||
      descriptor.accessAuditEnabled !== true)
    blockers.push('PRIVATE_EVIDENCE_SECURITY_REQUIRED');
  return { eligible: blockers.length === 0, blockers };
}
