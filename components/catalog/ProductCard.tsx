'use client';

import Link from 'next/link';
import type { PublicOffer } from './PartnerOfferCard';
import ServiceabilityCheck from './ServiceabilityCheck';

export type PublicProduct = {
  type: 'TEST' | 'PROFILE' | 'PACKAGE';
  slug: string;
  name: string;
  description?: string | null;
  fastingNeeded: boolean;
  sampleTypes: string[];
  offers: PublicOffer[];
};

export default function ProductCard({ product }: { product: PublicProduct }) {
  const offer = product.offers[0];
  const base = product.type === 'TEST' ? 'tests' : product.type === 'PROFILE' ? 'profiles' : 'packages';

  function addToCart(pincode: string) {
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
      offerIdentifier: offer.offerId,
      partnerIdentifier: offer.partner.slug,
      displayedPrice: offer.price,
      pincode,
    };

    localStorage.setItem(
      key,
      JSON.stringify([
        ...cart.filter((x: any) => x?.productIdentifier !== product.slug),
        item,
      ]),
    );
    window.location.assign('/checkout');
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
          <ServiceabilityCheck
            type={product.type}
            slug={product.slug}
            offer={offer}
            onSupported={addToCart}
          />
        </>
      )}
      <Link href={`/${base}/${product.slug}`}>View details and partners</Link>
    </article>
  );
}
