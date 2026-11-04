# Preview-only: generate patient AI explanations from published PDF reports

## Current behavior confirmed in code
- `app/api/patient/reports/[id]/ai/route.ts` authorizes the patient by Firebase phone and booking ownership.
- It refuses generation unless `reportObservation` contains `ADMIN_VERIFIED` observations, returning HTTP 409.
- Existing AI output is cached on booking by language, but is not keyed to a report-file version.
- `app/patient/page.tsx` already has the AI button and three-language viewer.

## Target workflow
1. Keep published-report and authenticated ownership checks. Never read an arbitrary client-supplied URL.
2. Fetch report bytes through the existing private report-storage abstraction on the server, with strict PDF type/size/page limits and no logging of PHI.
3. Extract structured measurements from digital PDFs and scanned PDFs through a server-side, consented vision/extraction process. Preserve names, values, units, reference intervals and source page; mark ambiguous entries as uncertain. Treat PDF text as untrusted data, never instructions.
4. Validate extracted values and reject empty, inconsistent or low-confidence extractions; never fabricate values or issue medical interpretations from uncertain text.
5. Generate English/Telugu/Hindi educational explanation from validated extraction with existing safety rules, not from PDF free text alone.
6. Cache by immutable report object/version + language + extraction/prompt version. Invalidate when report changes. Protect cache from cross-patient access.
7. Replace the old admin-verification 409 only once extraction works; show actionable extraction failure text instead.
8. Keep optional staff verification for flagged ambiguities and original PDF as authoritative.
9. Gate with a server-side Preview-only flag until real reports, scanned PDFs, malicious embedded instructions, large PDFs, access-control, and report-replacement regressions pass.

## Acceptance criteria
- Published test PDF produces grounded educational analysis without ADMIN_VERIFIED observations.
- The exact original values and reference intervals can be traced to PDF pages.
- A scanned/rotated/poor-quality PDF fails safely or explicitly marks uncertain measurements.
- Another patient's report and unpublished reports cannot be processed.
- Replaced PDFs never return an earlier cached analysis.
- Existing manual verified-observation path continues working.
- No production deployment, database migration or PR merge without explicit approval.

## Rollout
Implement in this separate branch based on PR #312's Preview S3 branch; keep it draft until integration tests and human review pass.