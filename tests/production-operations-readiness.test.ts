import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const health=read('../app/api/health/route.ts');
const healthDoc=read('../HEALTHCHECKS.md');
const slo=read('../MONITORING-SLO.md');
const rollback=read('../ROLLBACK-RUNBOOK.md');
const postLaunch=read('../POST-LAUNCH-MONITORING.md');
const analyticsContract=read('../ANALYTICS-EVENTS.md');
const middleware=read('../middleware.ts');

test('health endpoint checks database reachability and fails degraded with 503',()=>{
 assert.ok(health.includes('SELECT 1'));
 assert.ok(health.includes("status: healthy ? 'ok' : 'degraded'"));
 assert.ok(health.includes('{ status: healthy ? 200 : 503 }'));
 assert.equal(/DATABASE_URL|password|secret|patient/i.test(health),false);
});

test('health-check contract explicitly prohibits secrets and patient data',()=>{
 assert.ok(healthDoc.includes('database credentials'));
 assert.ok(healthDoc.includes('environment variables'));
 assert.ok(healthDoc.includes('patient data'));
 assert.ok(healthDoc.includes('stack traces'));
});

test('monitoring baseline covers availability and launch-critical operational failure signals',()=>{
 for(const marker of ['availability','4xx/5xx rate','database errors','booking success rate','payment success rate','webhook processing delay','report publication latency','notification delivery','authentication failure rate'])assert.ok(slo.includes(marker),marker);
 assert.ok(slo.includes('Do not send patient medical content, OTPs or secrets to monitoring systems.'));
});

test('rollback runbook preserves last-known-good, database-safe, payment-safe and report-incident procedures',()=>{
 for(const marker of ['last known-good deployment','Do not blindly reverse migrations in production','Reconcile against the payment provider','Prevent duplicate fulfillment','Review audit logs'])assert.ok(rollback.includes(marker),marker);
});

test('post-launch monitoring defines daily operational metrics and weekly funnel/reliability review',()=>{
 for(const marker of ['Completed bookings','Checkout abandonment','Payment success/failure','Technician completion rate','Report publication latency','4xx/5xx errors','Conversion funnel','Core Web Vitals'])assert.ok(postLaunch.includes(marker),marker);
 assert.ok(postLaunch.includes('Do not send patient medical information or secrets to analytics systems.'));
});

test('analytics event contract excludes medical, OTP and payment-secret content',()=>{
 for(const marker of ['checkout_completed','payment_success','booking_created','report_ready','notification_failed'])assert.ok(analyticsContract.includes(marker),marker);
 for(const marker of ['diagnoses','report contents','OTPs','payment secrets'])assert.ok(analyticsContract.includes(marker),marker);
});

test('production middleware applies security and no-store controls to private surfaces',()=>{
 for(const marker of ["X-Content-Type-Options','nosniff","X-Frame-Options','DENY","Referrer-Policy','strict-origin-when-cross-origin","Strict-Transport-Security","Cache-Control','no-store, max-age=0","X-Robots-Tag','noindex, nofollow, noarchive, nosnippet"])assert.ok(middleware.includes(marker),marker);
});
