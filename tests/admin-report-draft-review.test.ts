import assert from 'node:assert/strict';import test from 'node:test';import { readFileSync } from 'node:fs';
const editor=readFileSync(new URL('../components/admin/ReportObservationsEditor.tsx',import.meta.url),'utf8');
test('structured observations require explicit review before verified save',()=>{assert.ok(editor.includes('Review draft'));assert.ok(editor.includes('if(!reviewing)'));assert.ok(editor.includes('I verified these results — Save'));});
test('admin is warned that verification makes observations AI eligible',()=>{assert.ok(editor.includes('make them eligible for the patient AI Report'));assert.ok(editor.includes('Compare every parameter, result, unit, reference range and flag'));});
test('draft is described as browser-only and not AI eligible',()=>{assert.ok(editor.includes('Unsaved draft rows stay only in this browser page and are not AI-eligible'));});
