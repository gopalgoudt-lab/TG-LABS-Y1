import { assessPrivateEvidenceDescriptor, type PrivateEvidenceDescriptor } from './manual-upi-private-evidence';

/** Integration boundary for an authenticated, encrypted private statement vault.
 * No provider is installed by default. Never pass browser-supplied descriptors.
 * No production write route may invoke this contract until a reviewed provider,
 * access audit, retention controls and malware scanning are implemented.
 */
export interface ManualUpiPrivateEvidenceVault {
  readonly providerId: string;
  storeStatement(input: Readonly<{
    bookingId: string;
    originalReceiptHash: string;
    bytes: Uint8Array;
    contentType: 'application/pdf';
    authenticatedVerifierUid: string;
  }>): Promise<PrivateEvidenceDescriptor>;
}

export type VaultPreflight = Readonly<{
  available: boolean;
  blockers: readonly string[];
}>;

export function assessVaultInstallation(vault: ManualUpiPrivateEvidenceVault | null): VaultPreflight {
  if (!vault || !vault.providerId?.trim() || typeof vault.storeStatement !== 'function')
    return { available: false, blockers: ['TRUSTED_PRIVATE_EVIDENCE_VAULT_NOT_INSTALLED'] };
  // An installed interface alone cannot prove security, permissions or audit.
  return { available: false, blockers: ['VAULT_PROVIDER_SECURITY_REVIEW_REQUIRED'] };
}

/** Metadata validation only; does not attest to actual encryption or storage.
 * Only use after the provider itself has passed independent security review.
 */
export function assessVaultResult(descriptor: PrivateEvidenceDescriptor | null) {
  return assessPrivateEvidenceDescriptor(descriptor);
}
