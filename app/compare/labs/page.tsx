import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';
import { isCatalogOfferDisplayable } from '@/lib/catalog-eligibility';
import { buildProvisionalComparisonRows, type ProvisionalComparisonCandidate } from '@/lib/provisional-test-comparison';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function loadComparisonRows() {
  const now = new Date();
  const offers = await prisma.testPartnerOffer.findMany({
    where: { active: true, availability: 'AVAILABLE', partner: { slug: { in: ['sagepath-labs', 'thyrocare'] }, active: true, displayEnabled: true }, test: { active: true } },
    select: {
      id: true, price: true, mrp: true, availability: true, tat: true, active: true, sourceReference: true, lastVerifiedAt: true, effectiveFrom: true, effectiveTo: true,
      partner: { select: { slug: true, name: true, active: true, bookingEnabled: true, operationalEnabled: true, displayEnabled: true } },
      test: { select: { slug: true, name: true, sampleTypes: true, active: true } },
    },
  });

  const candidates = offers.flatMap((offer) => {
    if (!isCatalogOfferDisplayable(offer.test, offer, offer.partner, now)) return [];
    if (offer.partner.slug !== 'sagepath-labs' && offer.partner.slug !== 'thyrocare') return [];
    return [{ offerId: offer.id, productSlug: offer.test.slug, productName: offer.test.name, sampleTypes: offer.test.sampleTypes, partnerSlug: offer.partner.slug, partnerName: offer.partner.name, price: offer.price, mrp: offer.mrp } satisfies ProvisionalComparisonCandidate];
  });

  return buildProvisionalComparisonRows(candidates);
}

function LabPrice({ candidate, pending }: { candidate: ProvisionalComparisonCandidate; pending?: boolean }) {
  return <section className="provisionalLabOffer"><strong>{candidate.partnerName}</strong><div className="offerPrice">{candidate.mrp && candidate.mrp > candidate.price ? <del>₹{candidate.mrp}</del> : null}<b>₹{candidate.price}</b></div><span className={pending ? 'pendingMetadata' : 'verifiedMetadata'}>{pending ? 'Sample, required volume, method and TAT pending update' : candidate.sampleTypes.join(', ') || 'Sample details pending confirmation'}</span><Link href={`/tests/${candidate.productSlug}`}>View separate lab listing</Link></section>;
}

export default async function LabComparisonPage() {
  let rows;
  try { rows = await loadComparisonRows(); }
  catch { console.error('Provisional lab comparison query failed'); rows = null; }

  return <main className="catalogHome provisionalComparisonPage"><header className="catalogHeader"><BrandLogo/><nav aria-label="Catalog navigation"><Link href="/">Catalog</Link><Link href="/?partner=sagepath-labs">Sagepath</Link><Link href="/?partner=thyrocare">Thyrocare</Link></nav></header><section className="catalogHero"><span className="kicker">PROVISIONAL DISPLAY-ONLY COMPARISON</span><h1>Compare matching Sagepath and Thyrocare test prices.</h1><p>These rows are matched only by normalized test name. They do not confirm clinical equivalence. Thyrocare booking remains disabled while clinical and operational details are pending.</p></section>{rows === null ? <div className="catalogState" role="status">Comparison is temporarily unavailable.</div> : rows.length === 0 ? <div className="catalogState" role="status">No exact name matches are currently available.</div> : <section aria-labelledby="comparison-results"><div className="provisionalComparisonHeading"><h2 id="comparison-results">{rows.length} provisional exact-name matches</h2><p>Prices are shown for information only. Booking is unavailable from this page.</p></div><div className="provisionalComparisonList">{rows.map((row)=><article className="provisionalComparisonCard" key={row.key}><header><span className="productType">NAME MATCH</span><h3>{row.displayName}</h3><small>{row.matchBasis}</small></header><div className="provisionalOfferGrid"><LabPrice candidate={row.sagepath}/><LabPrice candidate={row.thyrocare} pending/></div></article>)}</div></section>}</main>;
}
