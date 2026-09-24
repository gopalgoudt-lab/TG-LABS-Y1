import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const reports=readFileSync(new URL('../app/api/patient/reports/route.ts',import.meta.url),'utf8');
const file=readFileSync(new URL('../app/api/patient/reports/[id]/file/route.ts',import.meta.url),'utf8');

test('patient report listing exposes Thyrocare manual report documents without file payloads',()=>{
 assert.match(reports,/manualPatientReports/);
 assert.match(reports,/reportDocuments/);
 assert.doesNotMatch(reports,/fileData:\s*doc\.fileData/);
 assert.match(reports,/createdByAdmin/);
 assert.match(reports,/adminNotes/);
});

test('patient-owned report file route supports a manual document id while preserving phone ownership',()=>{
 assert.match(file,/documentId/);
 assert.match(file,/manualPatientReport/);
 assert.match(file,/createdByAdmin/);
 assert.match(file,/adminNotes/);
 assert.match(file,/patient:\s*\{\s*phone\s*\}/);
});
