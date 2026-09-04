import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const serviceabilitySource = readFileSync(new URL('../components/catalog/ServiceabilityCheck.tsx', import.meta.url), 'utf8');
const productCardSource = readFileSync(new URL('../components/catalog/ProductCard.tsx', import.meta.url), 'utf8');

test('serviceability success exposes an explicit Add to Cart action', () => {
  assert.ok(serviceabilitySource.includes("setSupportedPin(pin);"));
  assert.ok(serviceabilitySource.includes('Add to Cart'));
  assert.ok(serviceabilitySource.includes("supportedPin === pin && onSupported"));
});

test('checking serviceability does not automatically add or navigate', () => {
  const checkStart = serviceabilitySource.indexOf('async function check()');
  const updatePinStart = serviceabilitySource.indexOf('function updatePin');
  const checkBody = serviceabilitySource.slice(checkStart, updatePinStart);
  assert.ok(!checkBody.includes('onSupported?.(pin)'));
  assert.ok(!checkBody.includes('onSupported(pin)'));
});

test('changing the pincode clears prior serviceability approval', () => {
  assert.ok(serviceabilitySource.includes('setSupportedPin(null);'));
  assert.ok(serviceabilitySource.includes("setStatus('');"));
});

test('homepage product cards support serviceability-gated Add to Cart', () => {
  assert.ok(productCardSource.includes("import ServiceabilityCheck from './ServiceabilityCheck';"));
  assert.ok(productCardSource.includes('onSupported={addToCart}'));
  assert.ok(productCardSource.includes("localStorage.setItem("));
  assert.ok(productCardSource.includes("window.location.assign('/checkout')"));
  assert.ok(productCardSource.includes('View details and partners'));
});
