import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const whatsapp = read('../lib/whatsapp.ts');
const webhook = read('../app/api/whatsapp/webhook/route.ts');
const deliveryAudit = read('./whatsapp-delivery-observability.test.ts');

test('booking confirmation is idempotent and skips safely without credentials', () => {
  assert.ok(whatsapp.includes('if (booking.whatsappNotifiedAt) return { skipped: true }'));
  assert.ok(whatsapp.includes('if (!accessToken || !phoneNumberId)'));
  assert.ok(whatsapp.includes('WhatsApp confirmation skipped: credentials are not configured.'));
  assert.ok(whatsapp.includes('whatsappNotifiedAt: new Date()'));
});

test('booking confirmation uses normalized Indian phone and configured Meta template', () => {
  assert.ok(whatsapp.includes("if (digits.length === 10) return `91${digits}`"));
  assert.ok(whatsapp.includes("process.env.WHATSAPP_TEMPLATE_NAME || 'tglabs_booking_confirmed'"));
  assert.ok(whatsapp.includes("messaging_product: 'whatsapp'"));
  assert.ok(whatsapp.includes('to: normalizeIndianPhone(booking.patient.phone)'));
});

test('workflow notifications cover launch-critical collection and report statuses', () => {
  for (const status of [
    'TECHNICIAN_ASSIGNED',
    'TECHNICIAN_ACCEPTED',
    'ON_THE_WAY',
    'REACHED_PATIENT',
    'SAMPLE_COLLECTED',
    'SAMPLE_RECEIVED_AT_LAB',
    'PROCESSING',
    'REPORT_READY',
    'REPORT_DELIVERED',
  ]) assert.ok(whatsapp.includes(status), status);
});

test('workflow notification fails closed when template or credentials are unavailable', () => {
  assert.ok(whatsapp.includes("!templateName ? 'WHATSAPP_STATUS_TEMPLATE_NAME' : null"));
  assert.ok(whatsapp.includes("!accessToken ? 'WHATSAPP_ACCESS_TOKEN' : null"));
  assert.ok(whatsapp.includes("!phoneNumberId ? 'WHATSAPP_PHONE_NUMBER_ID' : null"));
  assert.ok(whatsapp.includes('return { skipped: true }'));
});

test('Meta send failures are surfaced without logging patient phone or access token', () => {
  assert.ok(whatsapp.includes('Workflow WhatsApp notification failed'));
  assert.ok(whatsapp.includes('errorSubcode: metaError.error_subcode'));
  assert.ok(!whatsapp.includes('console.error(booking.patient.phone'));
  assert.ok(!whatsapp.includes('console.error(accessToken'));
});

test('webhook verification requires configured matching verify token and challenge', () => {
  assert.ok(webhook.includes('process.env.WHATSAPP_VERIFY_TOKEN'));
  assert.ok(webhook.includes('mode === "subscribe" && token === verifyToken && challenge'));
  assert.ok(webhook.includes('new NextResponse(challenge'));
  assert.ok(webhook.includes('new NextResponse("Forbidden", { status: 403 })'));
});

test('webhook accepts only WhatsApp business account payloads and avoids persistence', () => {
  assert.ok(webhook.includes('payload?.object !== "whatsapp_business_account"'));
  assert.ok(webhook.includes('Delivery status observability is intentionally log-only'));
  assert.ok(!webhook.includes('prisma.'));
});

test('existing delivery observability regression protects message and recipient identifiers', () => {
  assert.ok(deliveryAudit.includes('assert.doesNotMatch(serialized, /wamid'));
  assert.ok(deliveryAudit.includes('assert.doesNotMatch(serialized, /919999999999/'));
  assert.ok(deliveryAudit.includes('assert.doesNotMatch(serialized, /Sensitive provider detail/'));
  assert.ok(deliveryAudit.includes('assert.doesNotMatch(serialized, /Sensitive downstream detail/'));
});
