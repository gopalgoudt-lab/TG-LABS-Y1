import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const assignment = read('../app/api/admin/bookings/[id]/technician/route.ts');
const jobs = read('../app/api/technician/jobs/route.ts');
const workflow = read('../app/api/technician/jobs/[id]/workflow/route.ts');
const location = read('../app/api/technician/jobs/[id]/location/route.ts');
const jobPage = read('../app/technician/jobs/[id]/page.tsx');
const auth = read('../lib/technician-auth.ts');

test('admin assignment is authenticated, home-only and respects technician service pincodes', () => {
  assert.ok(assignment.includes('adminFromRequest(request)'));
  assert.ok(assignment.includes("existing.mode !== 'HOME'"));
  assert.ok(assignment.includes('technician.pincodes.includes(existing.pincode)'));
  assert.ok(assignment.includes('canChangeTechnicianAssignment(existing.workflowStatus)'));
});

test('technician assignment changes are auditable and reset fulfilment timestamps safely', () => {
  assert.ok(assignment.includes('adminAuditLog.create'));
  assert.ok(assignment.includes("action: technician ? 'TECHNICIAN_ASSIGNED' : 'TECHNICIAN_UNASSIGNED'"));
  assert.ok(assignment.includes('technicianAcceptedAt: null'));
  assert.ok(assignment.includes('sampleCollectedAt: null'));
});

test('technician jobs are session-scoped to the assigned technician', () => {
  assert.ok(jobs.includes('getTechnicianSession()'));
  assert.ok(jobs.includes('technicianId: session.technicianId'));
  assert.ok(jobs.includes("status: { not: 'CANCELLED' }"));
});

test('workflow updates require ownership and valid ordered transitions', () => {
  assert.ok(workflow.includes('technicianId: session.technicianId'));
  assert.ok(workflow.includes('canTechnicianTransition(existing.workflowStatus, body.status)'));
  assert.ok(workflow.includes("existing.status === 'CANCELLED' || existing.status === 'COMPLETED'"));
  assert.ok(workflow.includes('technicianTimestamp(body.status, now)'));
});

test('technician workflow changes are audited and patient notifications cannot roll back the workflow', () => {
  assert.ok(workflow.includes("action: 'TECHNICIAN_WORKFLOW_UPDATED'"));
  assert.ok(workflow.includes('await sendWorkflowStatusWhatsApp(booking)'));
  assert.ok(workflow.includes("Technician workflow updated but WhatsApp notification failed"));
});

test('live location is technician-owned and limited to an active collection journey', () => {
  assert.ok(location.includes('technicianId: session.technicianId'));
  assert.ok(location.includes("new Set(['ON_THE_WAY', 'REACHED_PATIENT', 'SAMPLE_COLLECTED'])"));
  assert.ok(location.includes('Location tracking is only allowed during an active collection journey.'));
  assert.ok(location.includes('< 12000'));
});

test('technician job page exposes collection-critical details and advances one workflow step at a time', () => {
  assert.ok(jobPage.includes('<b>Sample Type:</b>'));
  assert.ok(jobPage.includes('<b>Fasting:</b>'));
  assert.ok(jobPage.includes('<b>Address:</b>'));
  assert.ok(jobPage.includes('<b>Payment:</b>'));
  assert.ok(jobPage.includes("const next=steps[i+1]"));
});

test('technician sessions use random tokens, hashed storage and secure production cookies', () => {
  assert.ok(auth.includes("crypto.randomBytes(32).toString('hex')"));
  assert.ok(auth.includes("crypto.createHash('sha256')"));
  assert.ok(auth.includes("httpOnly: true"));
  assert.ok(auth.includes("secure: process.env.NODE_ENV === 'production'"));
  assert.ok(auth.includes("sameSite: 'lax'"));
  assert.ok(auth.includes('session.expiresAt <= new Date()'));
});
