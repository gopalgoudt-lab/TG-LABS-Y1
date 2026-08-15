# Recommended production security headers

Configure these at the hosting/reverse-proxy layer:

- Strict-Transport-Security
- Content-Security-Policy
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy
- frame-ancestors / clickjacking protection

Start CSP in report-only mode if the application has not yet been audited for all required script/image/font/connect sources. Tighten it before production.
