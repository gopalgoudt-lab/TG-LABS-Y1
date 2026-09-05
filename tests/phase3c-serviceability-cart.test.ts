import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseCatalogCart } from '../lib/catalog-cart';

const productCardSource = readFileSync(new URL('../components/catalog/ProductCard.tsx', import.meta.url), 'utf8');
const catalogDetailSource = readFileSync(new URL('../components/catalog/CatalogDetail.tsx', import.meta.url), 'utf8');
const cartPageSource = readFileSync(new URL('../app/cart/page.tsx', import.meta.url), 'utf8');

const validItem = {
  productType: 'TEST' as const,
  productIdentifier: 'sagepath-test-hg011',
  productName: 'Complete Blood Count (CBC) - 3 Part',
  offerIdentifier: 'sagepath-test-offer-hg011',
  partnerIdentifier: 'sagepath-labs',
  partnerName: 'Sagepath Labs',
  tat: '11:00/18:00',
  mrp: 250,
  displayedPrice: 250,
  pincode: '500061',
};

test('cart parser keeps valid items when stale historical entries are present', () => {
  const parsed = parseCatalogCart([
    { productIdentifier: 'legacy-only-entry' },
    validItem,
  ]);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].productIdentifier, validItem.productIdentifier);
  assert.equal(parsed[0].displayedPrice, 250);
});

test('cart parser rejects non-array storage safely', () => {
  assert.deepEqual(parseCatalogCart({ bad: true }), []);
  assert.deepEqual(parseCatalogCart(null), []);
});

test('catalog and detail additions sanitize stored cart before appending', () => {
  for (const source of [productCardSource, catalogDetailSource]) {
    assert.ok(source.includes("readCatalogCart(localStorage.getItem(key))"));
    assert.ok(source.includes('productIdentifier: product.id'));
    assert.ok(source.includes('productName: product.name'));
    assert.ok(source.includes('partnerName: offer.partner.name'));
  }
});

test('cart page reads the same tglabs-cart browser key', () => {
  assert.ok(cartPageSource.includes("readCatalogCart(localStorage.getItem('tglabs-cart'))"));
  assert.ok(cartPageSource.includes('Proceed to booking'));
});
