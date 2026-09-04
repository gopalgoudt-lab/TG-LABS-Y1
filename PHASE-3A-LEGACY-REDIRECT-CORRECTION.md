# Phase 3A legacy redirect correction

## Production finding

During strictly read-only Production verification after PR #37, `/contact.php` returned `403 Forbidden` instead of reaching the migrated `/contact-us` page.

## Correction

Add one explicit permanent internal redirect:

- `/contact.php` -> `/contact-us`

No additional `.php` legacy aliases were added because public search did not produce reliable evidence for other historical `.php` paths. This keeps the correction narrow and evidence-based.

## Safety boundaries

- no DNS changes
- no Production data or configuration changes
- no Prisma schema or migrations
- no manual deployment
- no payment processing
- no report publishing
- no OTP/message sending
- correction must be validated in Preview before any separate merge authorization
