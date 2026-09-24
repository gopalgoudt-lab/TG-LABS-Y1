import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read=(p:string)=>readFileSync(new URL(p,import.meta.url),'utf8');
const create=read('../app/api/admin/accounts-logistics/payables/route.ts');
const update=read('../app/api/admin/accounts-logistics/payables/[id]/route.ts');
const dashboard=read('../app/api/admin/accounts-logistics/route.ts');
const middleware=read('../middleware.ts');

test('partner payable APIs remain under protected admin surface and mutations require admin identity',()=>{
 assert.ok(middleware.includes("pathname.startsWith('/api/admin/')"));
 assert.ok(create.includes('adminFromRequest(request)'));
 assert.ok(update.includes('adminFromRequest(request)'));
});

test('payable creation derives partner identity from the booking and audits atomically',()=>{
 assert.ok(create.includes("Partner is not recorded on this booking."));
 assert.ok(create.includes("Booking partner name is unavailable; payable cannot be created safely."));
 assert.ok(create.includes('const partnerName=partner.partnerName'));
 assert.ok(!create.includes('partnerName:z.'));
 assert.ok(create.includes('prisma.$transaction'));
 assert.ok(create.includes('tx.partnerPayable.create'));
 assert.ok(create.includes('tx.adminAuditLog.create'));
 assert.ok(create.includes("action:'PARTNER_PAYABLE_CREATE'"));
});

test('payable update enforces amount, invoice and lifecycle integrity',()=>{
 for(const marker of ['Paid amount cannot exceed payable amount.','PAID requires the full payable amount.','PARTIALLY_PAID requires an amount greater than zero and below the payable amount.','Invoice number is required before approval or payment.','Invalid payable status transition:']) assert.ok(update.includes(marker),marker);
 assert.ok(update.includes("PAID:[],VOID:[]"));
 assert.ok(!update.includes('partnerPayable.delete'));
});

test('payable update and financial audit are one transaction with settlement evidence',()=>{
 assert.ok(update.includes('prisma.$transaction'));
 assert.ok(update.includes('tx.partnerPayable.update'));
 assert.ok(update.includes('tx.adminAuditLog.create'));
 assert.ok(update.includes("action:'PARTNER_PAYABLE_UPDATE'"));
 for(const marker of ['fromPaidAmount','toPaidAmount','fromInvoiceNumber','toInvoiceNumber','fromInvoiceDate','toInvoiceDate','fromSettledAt','toSettledAt']) assert.ok(update.includes(marker),marker);
});

test('accounts dashboard reconciliation is read-only and based on stored payment evidence',()=>{
 assert.ok(dashboard.includes('export async function GET'));
 assert.ok(!/export async function (POST|PATCH|PUT|DELETE)/.test(dashboard));
 assert.ok(dashboard.includes('paymentTransaction.findMany'));
 assert.ok(dashboard.includes('razorpayWebhookEvent.findMany'));
 assert.ok(dashboard.includes('signatureVerified'));
 assert.ok(dashboard.includes('processedAt&&!w.processingError'));
});

test('dashboard surfaces payment exceptions and partner settlement totals without mutating finance',()=>{
 assert.ok(dashboard.includes("Paid online booking has no verified payment transaction or processed webhook match"));
 assert.ok(dashboard.includes("Verified paid transaction exists but booking is not marked paid"));
 assert.ok(dashboard.includes("Payment transaction amount differs from booking total"));
 for(const marker of ['partnerPayable:','partnerPaid:','partnerOutstanding:','partnerSettlementTracking:true']) assert.ok(dashboard.includes(marker),marker);
 assert.ok(!/partnerPayable\.(create|update|delete|upsert)/.test(dashboard));
});
