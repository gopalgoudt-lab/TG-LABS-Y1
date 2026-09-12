'use client';
import { useState } from 'react';
import { readCatalogCart } from '@/lib/catalog-cart';
import PartnerOfferCard, { type PublicOffer } from './PartnerOfferCard';

type Product = {
  id: string;
  type: string;
  slug: string;
  name: string;
  aliases?: string[];
  description?: string | null;
  preparation?: string | null;
  fastingNeeded: boolean;
  fastingHours?: number | null;
  parameterCount?: number | null;
  sampleTypes: string[];
  categories?: { slug: string; name: string; description?: string | null }[];
  offers: PublicOffer[];
  tests?: { slug: string; name: string }[];
};

function fastingText(product: Product) {
  if (!product.fastingNeeded) return 'Fasting information not recorded; confirm before collection';
  return product.fastingHours ? `${product.fastingHours} hours fasting recorded` : 'Fasting required; confirm duration before collection';
}

export default function CatalogDetail({ product }: { product: Product }) {
  const [added, setAdded] = useState(false);

  function add(offer: PublicOffer, pincode: string) {
    const key = 'tglabs-cart';
    const cart = readCatalogCart(localStorage.getItem(key));
    const item = {
      productType: product.type,
      productIdentifier: product.id,
      productName: product.name,
      offerIdentifier: offer.offerId,
      partnerIdentifier: offer.partner.slug,
      partnerName: offer.partner.name,
      tat: offer.tat ?? null,
      mrp: offer.mrp ?? null,
      displayedPrice: offer.price,
      pincode,
    };
    localStorage.setItem(key, JSON.stringify([...cart.filter((x) => x.productIdentifier !== product.id), item]));
    setAdded(true);
    window.dispatchEvent(new Event('tglabs-cart-updated'));
  }

  const lowestPrice = product.offers.length ? Math.min(...product.offers.map((offer) => offer.price)) : null;

  return (
    <main className="testDetailPage">
      <nav className="testBreadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><span>Tests</span><span>›</span><span aria-current="page">{product.name}</span></nav>

      <header className="testHero">
        <div className="testHeroCopy">
          <div className="testEyebrow">Diagnostic test</div>
          <h1>{product.name}</h1>
          {product.aliases?.length ? <p className="testAliases">Also known as: {product.aliases.slice(0, 4).join(', ')}</p> : null}
          {product.categories?.length ? <div className="testCategories">{product.categories.map((category) => <a key={category.slug} href={`/categories/${category.slug}`}>{category.name}</a>)}</div> : null}
        </div>
        <aside className="testHeroPrice" aria-label="Booking summary">
          <span>Available from</span>
          <strong>{lowestPrice !== null ? `₹${lowestPrice}` : 'Check partner price'}</strong>
          <small>{product.offers.length} eligible lab partner{product.offers.length === 1 ? '' : 's'}</small>
          <a href="#lab-partners" className="testPrimaryCta">Compare labs &amp; book</a>
        </aside>
      </header>

      <section className="testOverviewCard">
        <div className="sectionHeading"><span>About this test</span><h2>What does {product.name} measure?</h2></div>
        <p className="testDescription">{product.description || 'A patient-friendly educational overview is being prepared for this test.'}</p>
        <p className="educationNotice">This overview is educational. Use the recorded preparation, sample and lab-partner details below for collection guidance, and confirm any missing information before collection.</p>
      </section>

      <section className="testQuickFacts" aria-label="Test preparation and sample details">
        <article><span>Sample required</span><strong>{product.sampleTypes.length ? product.sampleTypes.join(', ') : 'Sample information not recorded; confirm before collection'}</strong></article>
        <article><span>Fasting</span><strong>{fastingText(product)}</strong></article>
        <article><span>Preparation</span><strong>{product.preparation?.trim() || 'Preparation information not recorded; confirm before collection'}</strong></article>
        {product.parameterCount ? <article><span>Parameters</span><strong>{product.parameterCount}</strong></article> : null}
      </section>

      {product.tests?.length ? (
        <section className="testContentSection"><div className="sectionHeading"><span>Included tests</span><h2>What is included?</h2></div><ul className="includedTests">{product.tests.map((test) => <li key={test.slug}><a href={`/tests/${test.slug}`}>{test.name}</a></li>)}</ul></section>
      ) : null}

      <section id="lab-partners" className="testContentSection">
        <div className="sectionHeading"><span>Choose a laboratory</span><h2>Compare eligible lab partners</h2><p>Prices, report times and availability are shown from the catalog records for each eligible partner.</p></div>
        <div className="offerGrid">{product.offers.map((offer) => <PartnerOfferCard key={offer.offerId} offer={offer} type={product.type} slug={product.slug} sampleTypes={product.sampleTypes} onSelect={(pincode) => add(offer, pincode)} />)}</div>
        {added && <div className="cartSuccess" role="status">Added to cart. <a href="/cart">Open Cart</a> when you are ready to continue.</div>}
      </section>

      <section className="testSafetyNote"><strong>Important</strong><p>Preparation and specimen requirements can vary by test and laboratory. Follow the instructions shown for your selected partner and any advice from your healthcare professional.</p></section>
    </main>
  );
}
