import { createHash } from 'node:crypto';
import { encryptStatement, type StatementEnvelope } from './manual-upi-statement-encryption';

/** Preparation only: never uploads, records verification, or alters money. */
export type PreparedBankStatement = Readonly<{
  envelope: StatementEnvelope;
  plaintextSha256: string;
  plaintextBytes: number;
  bookingId: string;
  originalReceiptHash: string;
}>;

/** Caller must use a trusted server-side KMS key and a malware-scanned PDF.
 * This helper does not validate a real bank credit, perform a virus scan,
 * authorize a staff member, or install an evidence vault.
 */
export function prepareBankStatementForPrivateVault(input: Readonly<{
  bookingId: string;
  originalReceiptHash: string;
  verifiedServerSidePdfBytes: Uint8Array;
  managedEncryptionKey: Uint8Array;
}>): PreparedBankStatement {
  const bytes = input.verifiedServerSidePdfBytes;
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 5 ||
      Buffer.from(bytes.subarray(0, 5)).toString('ascii') !== '%PDF-')
    throw new Error('BANK_STATEMENT_PDF_SIGNATURE_INVALID');
  const envelope = encryptStatement(
    bytes, input.managedEncryptionKey, input.bookingId, input.originalReceiptHash,
  );
  return {
    envelope,
    plaintextSha256: createHash('sha256').update(bytes).digest('hex'),
    plaintextBytes: bytes.byteLength,
    bookingId: input.bookingId,
    originalReceiptHash: input.originalReceiptHash,
  };
}
