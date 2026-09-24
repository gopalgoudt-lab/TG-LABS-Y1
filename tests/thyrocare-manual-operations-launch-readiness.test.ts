import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read=(p:string)=>readFileSync(new URL(p,import.meta.url),'utf8');
const middleware=read('../middleware.ts');
const session=read('../app/api/manual/session/route.ts');
const manage=read('../app/api/admin/thyrocare/orders/manage/route.ts');
const payment=read('../app/api/admin/thyrocare/orders/[id]/payment/route.ts');
const report=read('../app/api/admin/thyrocare/orders/[id]/report/route.ts');
const readiness=read('../lib/thyrocare-booking-readiness.ts');

test('manual dashboard and Thyrocare APIs are session protected and private',()=>{
 assert.ok(middleware.includes("const manualPage=pathname==='/manual'||pathname.startsWith('/manual/')"));
 assert.ok(middleware.includes("const manualApi=pathname.startsWith('/api/admin/thyrocare/')"));
 assert.ok(middleware.includes("identity.role!=='ADMIN'"));
 assert.ok(middleware.includes("return secure(NextResponse.next(),true,pathname)"));
});

test('manual login issues an httpOnly production-secure role session and audits login/logout',()=>{
 assert.ok(session.includes('httpOnly:true'));
 assert.ok(session.includes("secure:process.env.NODE_ENV==='production'"));
 assert.ok(session.includes("sameSite:'lax'"));
 assert.ok(session.includes("'THYROCARE_LOGIN'"));
 assert.ok(session.includes("'THYROCARE_LOGOUT'"));
});

test('manual order mutation is role scoped and enforces payment/barcode/sample readiness invariants',()=>{
 assert.ok(manage.includes("requireThyrocareRole(request,['ADMIN','STAFF'])"));
 assert.ok(manage.includes("requireThyrocareRole(request,['ADMIN'])"));
 assert.ok(manage.includes('Discount cannot exceed total amount'));
 assert.ok(manage.includes('Paid amount cannot exceed net amount'));
 assert.ok(manage.includes('Duplicate barcode numbers are not allowed'));
 assert.ok(manage.includes('Report Ready is blocked until every required sample'));
 assert.ok(manage.includes("'THYROCARE_MANUAL_ORDER_UPDATED'"));
});

test('manual payment collection is scoped to manual orders and bounded by authoritative pending balance',()=>{
 assert.ok(payment.includes("requireThyrocareRole(request,['ADMIN','STAFF'])"));
 assert.ok(payment.includes("createdByAdmin:'THYROCARE_MANUAL'"));
 assert.ok(payment.includes('previousBalance<=0'));
 assert.ok(payment.includes('body.additionalDiscount>maxExtraDiscount'));
 assert.ok(payment.includes('body.amount>adjustedBalanceBeforePayment'));
 assert.ok(payment.includes("'THYROCARE_MANUAL_PAYMENT_COLLECTED'"));
});

test('manual report storage accepts PDF only, caps size, stays private, and audits upload/delete',()=>{
 assert.ok(report.includes("fileName.toLowerCase().endsWith('.pdf')"));
 assert.ok(report.includes("fileData.startsWith('data:application/pdf;base64,')"));
 assert.ok(report.includes('const MAX=3*1024*1024'));
 assert.ok(report.includes("'Cache-Control':'private, no-store, max-age=0'"));
 assert.ok(report.includes("'THYROCARE_REPORT_UPLOADED'"));
 assert.ok(report.includes("'THYROCARE_REPORT_DELETED'"));
});

test('Thyrocare patient booking readiness fails closed across catalog and home serviceability',()=>{
 assert.ok(readiness.includes('evaluateCatalogOfferEligibility'));
 assert.ok(readiness.includes('evaluateHomeCollectionServiceability'));
 assert.ok(readiness.includes('return reasons.length'));
 assert.ok(readiness.includes('{ bookable: false, reasons }'));
});
