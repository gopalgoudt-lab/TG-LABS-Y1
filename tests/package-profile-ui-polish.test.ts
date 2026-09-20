import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

test('patient package profile accordion has responsive card styling', () => {
  const css = fs.readFileSync('app/globals.css', 'utf8');
  assert.match(css, /\.includedProfiles\{display:grid;gap:12px/);
  assert.match(css, /\.includedProfile\{overflow:hidden;border:1px/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.calculatedBadge\{display:inline-flex/);
  assert.match(css, /@media\(max-width:640px\).*\.includedProfile \.includedTests\{grid-template-columns:1fr\}/s);
});
