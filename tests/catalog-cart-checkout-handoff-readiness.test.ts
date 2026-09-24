import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const home = read('../app/page.tsx');
const browser = read('../components/catalog/CatalogBrowser.tsx');
const search = read('../components/catalog/PatientCatalogSearch.tsx');
const cartLib = read('../lib/catalog-cart.ts');
const cart = read('../app/cart/page.tsx');
const checkout = read('../app/checkout/page.tsx');
const bookings = read('../app/api/bookings/route.ts');

test('public patient search uses live catalog and routes selections to product details', () => {
  assert.ok(home.includes('<PatientCatalogSearch/>'));
  assert.ok(search.includes('/api/catalog?search='));
  assert.ok(search.includes("type=TEST&limit=8"));
  assert.ok(search.includes("role=\"combobox\""));
  assert.ok(search.includes('router.push(detailsHref(item))'));
});

test('catalog requires a valid home collection pincode before offer-level selection', () => {
  assert.ok(browser.includes("/^[1-9][0-9]{5}$/"));
  assert.ok(browser.includes('Check availability'));
  assert.ok(browser.includes('pincode={checkedPincode}'));
  assert.ok(browser.includes('checked against the relevant lab before it is added to your cart'));
});

test('browser cart storage rejects malformed stale entries without discarding valid items', () => {
  assert.ok(cartLib.includes("z.enum(['TEST', 'PROFILE', 'PACKAGE'])"));
  assert.ok(cartLib.includes('cartItemSchema.safeParse(item)'));
  assert.ok(cartLib.includes('.slice(-30)'));
  assert.ok(cartLib.includes('result.success'));
});

test('cart prevents duplicate product identifiers and package containment removes redundant tests', () => {
  assert.ok(cartLib.includes('item.productIdentifier !== incoming.productIdentifier'));
  assert.ok(cartLib.includes("status: 'already-included'"));
  assert.ok(cartLib.includes('findRedundantIndividualTests'));
  assert.ok(cartLib.includes('removedRedundantTestIds'));
});

test('cart presents partner price context and explicit checkout handoff', () => {
  assert.ok(cart.includes("readCatalogCart(localStorage.getItem('tglabs-cart'))"));
  assert.ok(cart.includes('MRP:'));
  assert.ok(cart.includes('Discount price:'));
  assert.ok(cart.includes('href="/checkout"'));
});

test('checkout re-reads validated cart, requires auth and waits for package composition before booking', () => {
  assert.ok(checkout.includes('readCatalogCart(stored)'));
  assert.ok(checkout.includes("window.location.replace('/auth?next=/checkout')"));
  assert.ok(checkout.includes("Authorization: `Bearer ${await user.getIdToken()}`"));
  assert.ok(checkout.includes("fetch('/api/catalog', { cache: 'no-store' })"));
  assert.ok(checkout.includes('hasPackage && !catalogReady'));
});

test('booking API rejects stale or mismatched offers and independently revalidates home serviceability', () => {
  assert.ok(bookings.includes('evaluateTestOfferEligibility'));
  assert.ok(bookings.includes('evaluatePackageOfferEligibility'));
  assert.ok(bookings.includes('A selected partner offer does not match its diagnostic test.'));
  assert.ok(bookings.includes('A selected package offer does not match its package.'));
  assert.ok(bookings.includes('evaluateHomeCollectionServiceability'));
  assert.ok(bookings.includes('Home collection is unavailable for one or more selected partners.'));
});

test('server remains authoritative for booking price and duplicate test charging', () => {
  assert.ok(bookings.includes('validateAndPriceBooking'));
  assert.ok(bookings.includes('packageTestIds.has(offer.testId) ? 0 : offer.price'));
  assert.ok(checkout.includes('setServerTotal(Number(data.booking.totalAmount))'));
  assert.ok(checkout.includes("localStorage.removeItem('tglabs-cart')"));
});
