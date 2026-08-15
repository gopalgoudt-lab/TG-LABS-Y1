# TG Labs V6 — Analytics Event Contract

Recommended non-sensitive events:

- `page_view`
- `test_search`
- `test_view`
- `add_to_cart`
- `checkout_started`
- `checkout_completed`
- `payment_success`
- `payment_failed`
- `booking_created`
- `collection_completed`
- `report_ready`
- `notification_sent`
- `notification_failed`

Avoid sending:
- diagnoses
- report contents
- OTPs
- payment secrets
- unnecessary patient identifiers

Use an internal anonymous/session identifier where possible.
