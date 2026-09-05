'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { PublicOffer } from './PartnerOfferCard';

export type PublicProduct = {
  type: 'TEST' | 'PROFILE' | 'PACKAGE';
  slug: string;
  name: string;
  description?: string | null;
  fastingNeeded: boolean;
  sampleTypes: string[];
  offers: PublicOffer[];
};

export default function ProductCard({ product, pincode }: { product: PublicProduct; pincode: string }) {
  const offer = product.offers[0];
  const base = product.type === 'TEST' ? 'tests' : product.type === 'PROFILE' ? 'profiles' : 'packages';
  const [added, setAdded] = useState(false);
  const [status, setStatus] = useState('');
  const [checking, setChecking] = useState(false);

  function persistToCart(pin: string) {
    if (!offer) return;
    const key = 'tglabs-cart';
    let cart: unknown[] = [];
    try {
      const value = JSON.parse(localStorage.getItem(key) ?? '[]');
      if (Array.isArray(value)) cart = value;
    } catch {}

    const item = {
      productType: product.type,
      productIdentifier: product.slug,
      productName: product.name,
      offerIdentifier: offer.offerId,
      partnerIdentifier: offer.partner.slug,
      partnerName: offer.partner.name,
      tat: offer.tat ?? null,
      displayedPrice: offer.price,
      pincode: pin,
    };

    localStorage.setItem(
      key,
      JSON.stringify([
        ...cart.filter((x: any) => x?.productIdentifier !== product.slug),
        item,
      ]),
    );
    setAdded(true);
    setStatus('Home collection is available. Added to cart.');
    window.dispatchEvent(new Event('tglabs-cart-updated'));
  }

  async function addToCart() {
    setAdded(false);
    if (!offer) return;
    if (!/^[1-9][0-9]{5}$/.test(pincode)) {
      setStatus('Enter your 6-digit pincode above first.');
      return;
    }

    setChecking(true);
    setStatus('Checking home collection…');
    try {
      const query = new URLSearchParams({
        pincode,
        partner: offer.partner.slug,
        offer: offer.offerId,
        type: product.type,
        product: product.slug,
      });
      const response = await fetch(`/api/serviceability?${query}`);
      const data = await response.json();
      if (data.supported) persistToCart(pincode);
      else setStatus('Home collection is not available for this selection.');
    } catch {
      setStatus('Unable to check serviceability right now.');
    } finally {
      setChecking(false);
    }
  }

  return (
    <article className="productCard">
      <span className="productType">{product.type}</span>
      <h2>{product.name}</h2>
      <p>{product.description ?? 'View preparation, partner options and current availability.'}</p>
      <div className="productMeta">
        <span>{product.fastingNeeded ? 'Fasting required' : 'No fasting indicated'}</span>
        <span>{product.sampleTypes.join(', ') || 'Sample details on request'}</span>
      </div>
      {offer && (
        <>
          <p className="fromPrice">From <b>₹{offer.price}</b> • {offer.partner.name}</p>
          <button type="button" className="btn primary" onClick={addToCart} disabled={checking}>
            {checking ? 'Checking…' : added ? 'Added to Cart' : 'Add to Cart'}
          </button>
          {status && <p className="cartAddedNotice" role="status">{status}</p>}
        </>
      )}
      <Link href={`/${base}/${product.slug}`}>View details and partners</Link>
    </article>
  );
}
