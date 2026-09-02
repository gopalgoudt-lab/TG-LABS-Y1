'use client';
import ServiceabilityCheck from './ServiceabilityCheck';

export type PublicOffer = {
  offerId: string;
  partner: { slug: string; name: string; accreditation?: string | null };
  price: number;
  mrp?: number | null;
  discountPercent: number;
  availability: string;
  tat?: string | null;
};

type PartnerOfferCardProps = {
  offer: PublicOffer;
  type: string;
  slug: string;
  sampleTypes: string[];
  onSelect?: (pincode: string) => void;
};

export default function PartnerOfferCard({
  offer,
  type,
  slug,
  sampleTypes,
  onSelect,
}: PartnerOfferCardProps) {
  const sampleForAnalysis = sampleTypes.join(', ') || 'Confirm with the collection team';

  return (
    <section className="offerCard">
      <div>
        <strong>{offer.partner.name}</strong>
        {offer.partner.accreditation && (
          <span className="verified">Verified: {offer.partner.accreditation}</span>
        )}
      </div>
      <div className="offerPrice">
        {offer.mrp && <del>₹{offer.mrp}</del>}
        <b>₹{offer.price}</b>
        {offer.discountPercent > 0 && <span>{offer.discountPercent}% off</span>}
      </div>
      <div className="offerSample">
        <strong>Sample for analysis &amp; required volume</strong>
        <span>{sampleForAnalysis}</span>
      </div>
      <ServiceabilityCheck
        type={type}
        slug={slug}
        offer={offer}
        onSupported={onSelect}
      />
    </section>
  );
}
