import assert from 'node:assert/strict';import test from 'node:test';import { readFileSync } from 'node:fs';
const list=readFileSync(new URL('../app/api/technician/jobs/route.ts',import.meta.url),'utf8');
const job=readFileSync(new URL('../app/api/technician/jobs/[id]/route.ts',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../app/api/technician/jobs/[id]/workflow/route.ts',import.meta.url),'utf8');
const location=readFileSync(new URL('../app/api/technician/jobs/[id]/location/route.ts',import.meta.url),'utf8');
test('technician job list is scoped to session technician',()=>{assert.ok(list.includes('getTechnicianSession()'));assert.ok(list.includes('technicianId: session.technicianId'));});
test('technician cannot fetch another technician job by id',()=>{assert.ok(job.includes('getTechnicianSession()'));assert.ok(job.includes('where: { id, technicianId: session.technicianId'));});
test('workflow mutation requires assigned technician and transition guard',()=>{assert.ok(workflow.includes('where: { id, technicianId: session.technicianId }'));assert.ok(workflow.includes('canTechnicianTransition(existing.workflowStatus, body.status)'));});
test('location mutation requires assigned technician and active journey',()=>{assert.ok(location.includes('technicianId: session.technicianId'));assert.ok(location.includes('TRACKING_STATUSES.has(booking.workflowStatus)'));});
