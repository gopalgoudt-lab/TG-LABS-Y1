-- Development/test only. Do not deploy to Production until the financial
-- authorization workflow, existing data, and migration sequence are reviewed.
-- Strengthen the original approval constraint without rewriting migration history.
ALTER TABLE "ManualUpiCorrectionApproval"
  DROP CONSTRAINT "ManualUpiCorrectionApproval_independent_actors_check";

ALTER TABLE "ManualUpiCorrectionApproval"
  ADD CONSTRAINT "ManualUpiCorrectionApproval_independent_actors_check"
  CHECK (
    "requestedByUid" <> "paymentVerifiedByUid"
    AND "requestedByUid" <> "approvedByUid"
    AND "paymentVerifiedByUid" <> "approvedByUid"
    AND "discountAmount" >= 0
    AND "verifiedPaidAmount" > 0
  );
