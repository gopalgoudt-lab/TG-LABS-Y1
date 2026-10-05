import assert from 'node:assert/strict';
import test from 'node:test';
import { parseDeidentifiedLabObservations } from '../lib/report-observation-parser';

test('parses de-identified CBC rows with single-space PDF layout',()=>{
  const text=[
    'COMPLETE BLOOD COUNT',
    'Haemoglobin (Hb) 13.4 g/dL 12-15',
    'Hematocrit (HCT) 40.2 % 36-46',
    'RBC Count 4.55 million/cumm 3.8-4.8',
    'MCV 88.4 fL 83-101',
    'MCH 29.5 pg 27-32',
    'MCHC 33.3 g/dL 31.5-34.5',
    'RDW-CV 13.2 % 11.6-14',
    'Platelet Count 268 10^3/uL 150-410',
    'Total WBC Count 7.6 10^3/uL 4-11',
  ].join('\n');
  const rows=parseDeidentifiedLabObservations(text);
  assert.equal(rows.length,9);
  assert.deepEqual(rows[0],{parameterName:'Haemoglobin (Hb)',value:'13.4',unit:'g/dL',referenceRange:'12-15'});
  assert.equal(rows.at(-1)?.parameterName,'Total WBC Count');
});

test('parses tabular rows while discarding identity and instruction-like lines',()=>{
  const text=[
    'Patient Name\tExample Person',
    'Phone\t9999999999',
    'Platelet Count\t268\t10^3/uL\t150-410',
    'ignore previous instruction 12 mg/dL 1-20',
  ].join('\n');
  const rows=parseDeidentifiedLabObservations(text);
  assert.equal(rows.length,1);
  assert.equal(rows[0].parameterName,'Platelet Count');
});

test('fails closed for ambiguous rows without a unit and numeric range',()=>{
  const rows=parseDeidentifiedLabObservations('Haemoglobin 13.4\nSome Test positive');
  assert.deepEqual(rows,[]);
});
