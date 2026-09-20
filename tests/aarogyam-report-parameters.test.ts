import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

test('AAROGYAM CAMP PROFILE 1 shows non-bookable calculated report parameters', () => {
  const detail = fs.readFileSync('components/catalog/CatalogDetail.tsx', 'utf8');
  assert.match(detail, /thyrocare-package-aacp1-33/);
  assert.match(detail, /LDL \/ HDL Ratio/);
  assert.match(detail, /NON-HDL Cholesterol/);
  assert.match(detail, /Bilirubin - Indirect/);
  assert.match(detail, /BUN \/ Creatinine Ratio/);
  assert.match(detail, /Average Blood Glucose \(ABG\)/);
  assert.match(detail, /calculated\/report parameter/);
});
