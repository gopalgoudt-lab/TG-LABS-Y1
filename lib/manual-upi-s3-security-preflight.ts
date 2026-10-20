/** Static configuration preflight only. No S3 SDK, credentials, network or writes. */
export type PrivateS3SecuritySettings = Readonly<{
  bucketName: string;
  region: string;
  blockPublicAccess: boolean;
  objectOwnershipBucketOwnerEnforced: boolean;
  enforceTls: boolean;
  serverSideEncryption: 'aws:kms' | 'AES256' | 'none';
  kmsKeyArn?: string;
  objectDataEventsEnabled: boolean;
  versioningEnabled: boolean;
  retentionPolicyApproved: boolean;
  malwareScanGateEnabled: boolean;
  independentAccountsStaffPolicyApproved: boolean;
}>;

export function assessPrivateS3SecuritySettings(
  settings: PrivateS3SecuritySettings | null,
): Readonly<{ readyForSecurityReview: boolean; blockers: readonly string[]; storageWritesEnabled: false }> {
  const blockers: string[] = [];
  if (!settings || !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(settings.bucketName) ||
      !/^[a-z]{2}(?:-gov)?-[a-z]+-\d$/.test(settings.region))
    blockers.push('PRIVATE_BUCKET_IDENTITY_INVALID');
  if (!settings?.blockPublicAccess || !settings?.objectOwnershipBucketOwnerEnforced)
    blockers.push('PRIVATE_BUCKET_PUBLIC_ACCESS_NOT_BLOCKED');
  if (!settings?.enforceTls) blockers.push('PRIVATE_BUCKET_TLS_NOT_ENFORCED');
  if (settings?.serverSideEncryption !== 'aws:kms' ||
      !/^arn:aws[a-z-]*:kms:[a-z0-9-]+:\d{12}:key\/[a-zA-Z0-9-]+$/.test(settings.kmsKeyArn ?? ''))
    blockers.push('PRIVATE_BUCKET_CUSTOMER_KMS_NOT_CONFIGURED');
  if (!settings?.objectDataEventsEnabled) blockers.push('PRIVATE_BUCKET_OBJECT_AUDIT_NOT_ENABLED');
  if (!settings?.versioningEnabled) blockers.push('PRIVATE_BUCKET_VERSIONING_NOT_ENABLED');
  if (!settings?.retentionPolicyApproved) blockers.push('PRIVATE_BUCKET_RETENTION_NOT_APPROVED');
  if (!settings?.malwareScanGateEnabled) blockers.push('PRIVATE_BUCKET_MALWARE_GATE_NOT_ENABLED');
  if (!settings?.independentAccountsStaffPolicyApproved)
    blockers.push('PRIVATE_BUCKET_STAFF_ACCESS_NOT_APPROVED');
  // Configuration assertions are untrusted until independently verified against
  // the provider's actual policy, KMS permissions, event logs and malware workflow.
  return { readyForSecurityReview: blockers.length === 0, blockers, storageWritesEnabled: false };
}
