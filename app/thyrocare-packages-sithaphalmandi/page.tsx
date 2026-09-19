import SithaphalmandiLanding, { localMetadata } from '@/components/SithaphalmandiLanding';
import { prisma } from '@/lib/prisma';
import { displayableOffers, publicOfferSelect } from '@/lib/catalog-data';
import { evaluateCatalogOfferEligibility } from '@/lib/catalog-eligibility';

export const dynamic = 'force-dynamic';
export const metadata = localMetadata('thyrocare-packages-sithaphalmandi', 'Thyrocare Packages in Sithaphalmandi', 'Explore currently displayable Thyrocare packages through TG Labs and enquire with the Sithaphalmandi centre. Review current prices, preparation and collection eligibility.');

async function loadPackages() {
  const products = await prisma.diagnosticPackage.findMany({
    where: { active: true, partnerOffers: { some: { partner: { slug: 'thyrocare' } } } },
    select: { id: true, slug: true, name: true, active: true, packageType: true, preparation: true, fastingNeeded: true, fastingHours: true, sampleTypes: true, partnerOffers: { select: publicOfferSelect } },
    orderBy: { name: 'asc' },
  });
  const now = new Date();
  return products.flatMap(product => displayableOffers(product, now)
    .filter(offer => offer.partner.slug === 'thyrocare')
    .map(offer => ({ product, offer, eligible: evaluateCatalogOfferEligibility(product, offer, offer.partner, now).bookable })));
}

export default async function PackagesPage() {
  let listings: Awaited<ReturnType<typeof loadPackages>> | null;
  try { listings = await loadPackages(); } catch { listings = null; }
  return <SithaphalmandiLanding slug="thyrocare-packages-sithaphalmandi" title="Thyrocare Packages in Sithaphalmandi" intro="Compare the Thyrocare package and profile offers currently displayable in the TG Labs catalog. Contact the Sithaphalmandi centre to discuss local collection arrangements and confirm the details for your chosen package.">
    <section><h2>Current catalog listings</h2><p>Prices below are TG Labs catalog prices for the named Thyrocare offer. Confirm the complete amount, including any collection charge, before booking. A displayed offer does not guarantee availability at your pincode.</p>
      {listings === null ? <p role="status">Package listings are temporarily unavailable. Please contact the centre for current information.</p> : listings.length === 0 ? <p role="status">No Thyrocare packages currently meet the catalog’s display requirements. Contact the centre to enquire about current options; prices and availability must be confirmed.</p> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,280px),1fr))', gap: 18 }}>
        {listings.map(({ product, offer, eligible }) => <article key={`${product.id}-${offer.id}`} style={{ background: '#fff', border: '1px solid #dce9e4', borderRadius: 16, padding: 22 }}>
          <h3>{product.name}</h3><p><strong>Thyrocare · ₹{offer.price.toLocaleString('en-IN')}</strong></p>
          <p>{eligible ? 'Check pincode and slot eligibility on the package detail page.' : 'Display only — online booking is not currently enabled for this offer.'}</p>
          <p><strong>Report time:</strong> {offer.tat}</p>
          <p><strong>Sample:</strong> {product.sampleTypes.join(', ') || 'Confirm with the centre'}</p>
          <p><strong>Preparation:</strong> {product.preparation || 'Confirm the package-specific instructions with the centre.'}</p>
          {product.fastingNeeded ? <p><strong>Fasting:</strong> {product.fastingHours ? `${product.fastingHours} hours, as listed in the catalog. Confirm instructions before collection.` : 'Required; confirm the duration with the laboratory.'}</p> : null}
          <a href={`/${product.packageType === 'PROFILE' ? 'profiles' : 'packages'}/${encodeURIComponent(product.slug)}`}>View included tests and partner details →</a>
        </article>)}
      </div>}
    </section>
    <section><h2>Compare what is included</h2><p>Check the named investigations, preparation instructions, processing laboratory and expected report time. A larger parameter count does not by itself tell you which package suits your needs. Ask your clinician which tests are appropriate.</p><p>Package names, prices and included tests can change. This page does not advertise an unverified discount or promise a fixed collection slot.</p></section>
    <section><h2>Plan your collection</h2><p><a href="/home-blood-test-sithaphalmandi">Enquire about home collection in Sithaphalmandi →</a></p><p><a href="/thyrocare-sithaphalmandi">Centre directions and contact details →</a></p></section>
  </SithaphalmandiLanding>;
}
