import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const insights=fs.readFileSync('components/RoleDashboardInsights.tsx','utf8');
const page=fs.readFileSync('app/technician/jobs/[id]/page.tsx','utf8');
const api=fs.readFileSync('app/api/technician/jobs/[id]/route.ts','utf8');
test('technician View opens dedicated assignment detail',()=>{assert.match(insights,/href=\{\x60\/technician\/jobs\/\$\{j\.id\}\x60\}>View/);assert.match(page,/\/api\/technician\/jobs\/.*id/);});
test('detail API remains scoped to signed-in technician',()=>{assert.match(api,/getTechnicianSession/);assert.match(api,/technicianId: session\.technicianId/);});
test('detail page uses existing guarded workflow API',()=>{assert.match(page,/\/workflow/);assert.match(page,/method:'PATCH'/);assert.match(page,/TECHNICIAN_ACCEPTED/);assert.match(page,/SAMPLE_RECEIVED_AT_LAB/);});
