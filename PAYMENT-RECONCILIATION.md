# TG Labs V6 — Payment Reconciliation

Daily:
1. Compare TG Labs paid orders with provider settlement/event data.
2. Identify unmatched payments.
3. Identify orders marked paid without a verified provider event.
4. Identify duplicate events.
5. Resolve exceptions through an approved finance workflow.

Rules:
- Never mark a payment successful based only on browser state.
- Preserve payment-event IDs and timestamps.
- Keep reconciliation/audit records.
- Refund through the approved payment workflow.
- Escalate ambiguous payment states before fulfillment.
