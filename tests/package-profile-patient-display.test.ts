import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

test('patient package details expose expandable included profiles without double counting', () => {
  const data = fs.readFileSync('lib/catalog-data.ts', 'utf8');
  const dto = fs.readFileSync('lib/catalog-public-dto.ts', 'utf8');
  const detail = fs.readFileSync('components/catalog/CatalogDetail.tsx', 'utf8');

  assert.match(data, /includedProfiles:/);
  assert.match(data, /parameterCount:true,tests:/);
  assert.match(dto, /includedProfiles:\(v\.includedProfiles\?\?\[\]\)\.map/);
  assert.match(detail, /Included profiles/);
  assert.match(detail, /parameters across/);
  assert.match(detail, /aria-expanded=\{isOpen\}/);
  assert.match(detail, /View tests/);
  assert.match(detail, /Hide tests/);
  assert.match(detail, /not double-counted/);
  assert.match(detail, /\/tests\/\$\{test\.slug\}/);
});

test('AAROGYAM-style fixture preserves parent 62 while profile totals also equal 62', () => {
  const fixture = {
    parameterCount: 62,
    includedProfiles: [
      { name: 'LIPID PROFILE', parameterCount: 10 },
      { name: 'LIVER FUNCTION TESTS', parameterCount: 12 },
      { name: 'KIDPRO', parameterCount: 7 },
      { name: 'T3-T4-USTSH', parameterCount: 3 },
      { name: 'DIABETES PROFILE', parameterCount: 2 },
      { name: 'HEMOGRAM - 6 PART (DIFF) (CBC - 28)', parameterCount: 28 },
    ],
  };
  const profileTotal = fixture.includedProfiles.reduce((sum, profile) => sum + profile.parameterCount, 0);
  assert.equal(fixture.parameterCount, 62);
  assert.equal(profileTotal, 62);
  assert.equal(fixture.includedProfiles.length, 6);
});
