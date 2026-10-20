import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/** AES-256-GCM envelope for private statement bytes.
 * Caller must supply a 32-byte key from a managed KMS and store ciphertext
 * only in a private audited vault. This module does NOT upload or persist data.
 * A unique nonce is generated for every encryption. Booking/receipt identity
 * is authenticated as AAD so ciphertext cannot be moved between bookings.
 */
export type StatementEnvelope = Readonly<{
  version: 1;
  algorithm: 'aes-256-gcm';
  nonce: string;
  ciphertext: string;
  tag: string;
}>;

function requireKey(key: Uint8Array): Buffer {
  if (!(key instanceof Uint8Array) || key.byteLength !== 32)
    throw new Error('STATEMENT_ENCRYPTION_KEY_INVALID');
  return Buffer.from(key);
}
function aad(bookingId: string, receiptHash: string): Buffer {
  if (!bookingId || !/^[a-f0-9]{64}$/i.test(receiptHash))
    throw new Error('STATEMENT_ENCRYPTION_CONTEXT_INVALID');
  return Buffer.from(JSON.stringify([bookingId, receiptHash]), 'utf8');
}
export function encryptStatement(
  bytes: Uint8Array, key: Uint8Array, bookingId: string, receiptHash: string,
): StatementEnvelope {
  const k = requireKey(key);
  const context = aad(bookingId, receiptHash);
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0 || bytes.byteLength > 10 * 1024 * 1024)
    throw new Error('STATEMENT_SIZE_INVALID');
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', k, nonce);
  cipher.setAAD(context);
  const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return { version: 1, algorithm: 'aes-256-gcm', nonce: nonce.toString('base64'),
    ciphertext: ciphertext.toString('base64'), tag: cipher.getAuthTag().toString('base64') };
}
export function decryptStatement(
  envelope: StatementEnvelope, key: Uint8Array, bookingId: string, receiptHash: string,
): Buffer {
  const k = requireKey(key);
  const context = aad(bookingId, receiptHash);
  if (envelope?.version !== 1 || envelope.algorithm !== 'aes-256-gcm')
    throw new Error('STATEMENT_ENVELOPE_UNSUPPORTED');
  const nonce = Buffer.from(envelope.nonce, 'base64');
  const tag = Buffer.from(envelope.tag, 'base64');
  if (nonce.length !== 12 || tag.length !== 16)
    throw new Error('STATEMENT_ENVELOPE_INVALID');
  const decipher = createDecipheriv('aes-256-gcm', k, nonce);
  decipher.setAAD(context);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()]);
}
