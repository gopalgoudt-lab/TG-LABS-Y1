'use client';
import PartnerOfferCard, { type PublicOffer } from './PartnerOfferCard';

type Product = {
  type: string;
  slug: string;
  name: string;
  description?: string | null;
  preparation?: string | null;
  sampleTypes: string[];
  offers: PublicOffer[];
  tests?: { slug: string; name: string }[];
};

export default function CatalogDetail({ product }: { product: Product }) {
  function add(offer: PublicOffer, pincode: string) {
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
    <main className="catalogDetail">
      <a href="/">← Back to catalog</a>
      <span className="productType">{product.type}</span>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      {product.preparation && (
        <section>
          <h2>Preparation</h2>
          <p>{product.preparation}</p>
        </section>
      )}
      {product.tests?.length ? (
        <section>
          <h2>Included tests</h2>
          <ul>
            {product.tests.map((test) => (
              <li key={test.slug}>{test.name}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <section>
        <h2>Compare eligible partner offers</h2>
        <div className="offerGrid">
          {product.offers.map((offer) => (
            <PartnerOfferCard
              key={offer.offerId}
              offer={offer}
              type={product.type}
              slug={product.slug}
              sampleTypes={product.sampleTypes}
              onSelect={(pincode) => add(offer, pincode)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
