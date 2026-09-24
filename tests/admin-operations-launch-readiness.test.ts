import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const middleware=read('../middleware.ts');
const session=read('../app/api/admin/session/route.ts');
const booking=read('../app/api/admin/bookings/[id]/route.ts');
const tracking=read('../app/api/admin/tracking/route.ts');
const trackingPage=read('../app/admin/tracking/page.tsx');
const reports=read('../app/api/admin/reports/route.ts');
const workflow=read('./phase2d1-operational-workflow.test.ts');
const reportRegression=read('./phase3c-report-workflow-regression.test.ts');

test('middleware protects all admin pages and admin APIs with the signed admin session',()=>{
 assert.ok(middleware.includes("pathname==='/admin'||pathname.startsWith('/admin/')||pathname.startsWith('/api/admin/')"));
 assert.ok(middleware.includes('await validAdminSession(token)'));
 assert.ok(middleware.includes("NextResponse.json({error:'Admin authentication required.'},{status:401})"));
 assert.ok(middleware.includes("p.iss!=='tg-labs-admin'||p.aud!=='tg-labs-admin-web'||p.role!=='ADMIN'"));
 assert.ok(middleware.includes('p.exp*1000<Date.now()'));
});

test('admin OTP session is allow-listed, audited, rate-limited and secure-cookie backed',()=>{
 assert.ok(session.includes('verifyAdminRequest(request)'));
 assert.ok(session.includes('tooManyAttempts(ip)'));
 assert.ok(session.includes("'ADMIN_LOGIN_SUCCESS'"));
 assert.ok(session.includes("'ADMIN_LOGIN_FAILED'"));
 assert.ok(session.includes('httpOnly:true'));
 assert.ok(session.includes("sameSite:'lax'"));
 assert.ok(session.includes('maxAge:60*60*8'));
});

test('admin booking workflow blocks cancelled/completed edits and sequential workflow skips/regressions',()=>{
 assert.ok(booking.includes("existing.status==='CANCELLED'||existing.status==='COMPLETED'"));
 assert.ok(booking.includes("if(targetIndex<currentIndex)throw new Error('WORKFLOW_BACKWARD')"));
 assert.ok(booking.includes("if(targetIndex>currentIndex+1)throw new Error('WORKFLOW_SKIP')"));
 assert.ok(workflow.includes("canTechnicianTransition('TECHNICIAN_ASSIGNED', 'ON_THE_WAY'), false"));
});

test('admin booking edits retain authoritative existing collection and printed-report charges',()=>{
 assert.ok(booking.includes('existing.homeCollectionCharge||0'));
 assert.ok(booking.includes('existing.printedReportFee||0'));
 assert.ok(booking.includes('const totalAmount=diagnosticAmount+'));
});

test('live tracking exposes only active journey states and latest technician location',()=>{
 assert.ok(tracking.includes("b.\"workflowStatus\" IN ('ON_THE_WAY', 'REACHED_PATIENT', 'SAMPLE_COLLECTED')"));
 assert.ok(tracking.includes('ORDER BY b.\"id\", l.\"recordedAt\" DESC'));
 assert.ok(trackingPage.includes('setInterval(load,15000)'));
 assert.ok(trackingPage.includes('const fresh=age<=60'));
});

test('report publishing validates real PDFs, size and sample-received workflow gate',()=>{
 assert.ok(reports.includes("data:application/pdf;base64,"));
 assert.ok(reports.includes("toString('ascii') === '%PDF-'"));
 assert.ok(reports.includes('MAX_PDF_BYTES = 3 * 1024 * 1024'));
 assert.ok(reports.includes("'SAMPLE_RECEIVED_AT_LAB', 'PROCESSING', 'REPORT_READY', 'REPORT_DELIVERED'"));
});

test('partial/final report semantics, audit trail and non-blocking WhatsApp remain protected',()=>{
 assert.ok(reports.includes("z.enum(['PARTIAL', 'FULL'])"));
 assert.ok(reports.includes("'REPORT_READY'"));
 assert.ok(reports.includes("'PROCESSING'"));
 assert.ok(reports.includes("action: existing.reportData ? 'REPORT_REPLACED' : 'REPORT_PUBLISHED'"));
 assert.ok(reports.includes('Report published but WhatsApp notification failed'));
 assert.ok(reportRegression.includes('A partial report cannot replace a completed or delivered final report.'));
});
