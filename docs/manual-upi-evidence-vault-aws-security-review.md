# TG LABS — manual UPI evidence vault AWS deployment review (NOT APPLIED)

This document is a **review-only** template for an isolated AWS account and test bucket. It does not provision resources or grant permissions. PR #306 remains Draft; financial writes, real statement uploads, discounts and receipt correction are disabled.

## Required AWS controls before any live integration

1. Use a dedicated **private** S3 bucket in the selected AWS region, with all four S3 Block Public Access flags enabled at both bucket and account level; Bucket owner enforced; ACLs disabled; TLS-only bucket policy; bucket versioning and a documented retention/deletion policy.
2. Use a customer-managed symmetric AWS KMS key in the same region. Restrict `kms:Encrypt`/`kms:GenerateDataKey` to the evidence-writer service role through S3 encryption context and `kms:ViaService`. Keep `kms:Decrypt` separate, authorized only for a reviewed Accounts Staff retrieval workflow. Enable key rotation and define key-recovery procedure.
3. Grant the writer role **only** `s3:PutObject` on `arn:aws:s3:::<TEST_BUCKET>/manual-upi/*`; do not grant `s3:GetObject`, `s3:DeleteObject`, `s3:ListBucket`, `s3:PutBucketPolicy`, or wildcard S3 permissions. Use condition keys requiring SSE-KMS and the exact customer-managed key. Deny insecure transport in bucket policy. Explicitly verify no public or cross-account access via IAM Access Analyzer.
4. Enable CloudTrail **S3 object-level data events** for the prefix, route to an access-restricted audit destination with defined retention, and test detection of unauthorized reads and denied writes. Do not log plaintext bank data, UPI references, or full ciphertext.
5. Introduce malware scanning with a **quarantine / clean-only** release workflow. Do not mark a PDF safe merely because it begins with `%PDF-`. Ensure scanner access does not bypass KMS restrictions. Reject any object without verifiable clean scan evidence.
6. Enforce independent Accounts Staff authentication, role checks, separate discount approval, rate limits, immutable approval audit and provider-side read-access audit. Confirm retention and privacy compliance before uploading real customer documents.
7. Provision and review via a separate infrastructure PR, not by putting AWS keys or customer statements in GitHub, screenshots, Vercel Preview, or CI. Use short-lived role credentials, never static access keys.

## Isolation and verification

- Use synthetic PDF fixtures only. Do not create real bank evidence through the candidate adapter.
- Independently inspect actual S3 bucket policy, IAM role policy, KMS key policy, CloudTrail object event delivery, malware-scan enforcement, and retention behavior. Code-level flags cannot attest to AWS configuration.
- Test access denial for public/anonymous principals, other service roles, the application patient role, and the writer role attempting to read/delete. Test writer-only encrypted create, wrong KMS key rejection, and failed scan quarantine.
- Document reviewer identity, test evidence and rollback plan. A reviewer must explicitly approve infrastructure before any integration is connected.
- Do not enable financial adjustment APIs merely because evidence storage passes review.

**Current state:** no AWS bucket, IAM policy, KMS key, malware scanner or production storage credentials are created by this file.
