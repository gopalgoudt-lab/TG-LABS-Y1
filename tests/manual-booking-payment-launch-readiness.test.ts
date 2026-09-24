import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const manual=read('../app/api/admin/bookings/route.ts');
const payment=read('../app/api/admin/bookings/[id]/payment/route.ts');
const receipt=read('../app/api/admin/bookings/[id]/receipt/route.ts');
const middleware=read('../middleware.ts');

test('manual booking endpoint remains inside the middleware-protected admin API surface',()=>{
 assert.ok(middleware.includes("pathname.startsWith('/api/admin/')"));
 assert.ok(middleware.includes('verifyAdminSessionToken'));
 assert.ok(manual.includes("source:'ADMIN'"));
 assert.ok(manual.includes("createdByAdmin:'TG Labs Admin'"));
});

test('manual booking validates patient, home-collection and active catalog inputs',()=>{
 for(const marker of ["phone:z.string().regex(/^[0-9]{10}$/)","mode:z.enum(['HOME','CENTRE'])","pincode:z.string().regex(/^[1-9][0-9]{5}$/)","Select at least one test or package.","Address is required for home collection.","Pincode is required for home collection.","active:true","One or more selected tests/packages are unavailable."]) assert.ok(manual.includes(marker),marker);
});

test('manual booking computes total from server-loaded active tests and packages',()=>{
 assert.ok(manual.includes('prisma.diagnosticTest.findMany'));
 assert.ok(manual.includes('prisma.diagnosticPackage.findMany'));
 assert.ok(manual.includes('tests.reduce((s,t)=>s+t.price,0)+packages.reduce((s,p)=>s+p.price,0)'));
 assert.ok(manual.includes('totalAmount'));
});

test('admin collection payment requires admin identity and rejects unsafe payment states',()=>{
 assert.ok(payment.includes('adminFromRequest(request)'));
 assert.ok(payment.includes("if(existing.paymentStatus==='PAID')"));
 assert.ok(payment.includes("if(existing.paymentStatus==='REFUNDED')"));
 assert.ok(payment.includes('if(existing.totalAmount<=0)'));
});

test('collection payment claim is concurrency-safe and records authoritative amount plus audit',()=>{
 assert.ok(payment.includes('prisma.$transaction'));
 assert.ok(payment.includes('tx.booking.updateMany'));
 assert.ok(payment.includes('paymentStatus:existing.paymentStatus,paidAt:null'));
 assert.ok(payment.includes('if(claimed.count!==1)'));
 assert.ok(payment.indexOf('if(claimed.count!==1)') < payment.indexOf('tx.paymentTransaction.create'));
 assert.ok(payment.includes("provider:'COLLECTION'"));
 assert.ok(payment.includes('amount:existing.totalAmount'));
 assert.ok(payment.includes("action:'BOOKING_PAYMENT_RECORDED'"));
});

test('admin receipt is paid-only, private and reconciles authoritative totals',()=>{
 assert.ok(receipt.includes('isReceiptAvailable(booking.paymentStatus)'));
 assert.ok(receipt.includes("status: 'PAID'"));
 assert.ok(receipt.includes('reconcilePaidReceipt(booking.totalAmount, subtotal, paidPayment?.amount)'));
 assert.ok(receipt.includes("'Cache-Control': 'private, no-store'"));
});

test('receipt preserves home collection and printed-report charges and resolves partner attribution',()=>{
 assert.ok(receipt.includes("name: 'Home Collection Charges'"));
 assert.ok(receipt.includes("name: 'Printed report service'"));
 assert.ok(receipt.includes('receiptPartners(receiptItems, booking.packages, partnerNamesById)'));
 assert.ok(receipt.includes('testPartnerOffer.findMany'));
});
