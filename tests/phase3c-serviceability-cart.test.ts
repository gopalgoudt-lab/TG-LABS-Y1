import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../components/catalog/ServiceabilityCheck.tsx', import.meta.url), 'utf8');

test('serviceability success exposes an explicit Add to Cart action', () => {
  assert.ok(source.includes("setSupportedPin(pin);"));
  assert.ok(source.includes('Add to Cart'));
  assert.ok(source.includes("supportedPin === pin && onSupported"));
});

test('checking serviceability does not automatically add or navigate', () => {
  const checkStart = source.indexOf('async function check()');
  const updatePinStart = source.indexOf('function updatePin');
  const checkBody = source.slice(checkStart, updatePinStart);
  assert.ok(!checkBody.includes('onSupported?.(pin)'));
  assert.ok(!checkBody.includes('onSupported(pin)'));
});

test('changing the pincode clears prior serviceability approval', () => {
  assert.ok(source.includes('setSupportedPin(null);'));
  assert.ok(source.includes("setStatus('');"));
});
