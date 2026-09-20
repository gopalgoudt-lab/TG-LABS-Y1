import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

test('package profile accordion uses concise patient-facing controls and calculated badges', () => {
  const detail = fs.readFileSync('components/catalog/CatalogDetail.tsx', 'utf8');
  assert.match(detail, /\+ View tests/);
  assert.match(detail, /− Hide tests/);
  assert.match(detail, /className="calculatedBadge">Calculated/);
  assert.doesNotMatch(detail, />\(calculated\/report parameter\)</);
  assert.match(detail, /aria-expanded=\{isOpen\}/);
});
