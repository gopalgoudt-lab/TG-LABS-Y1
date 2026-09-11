'use client';

import { useEffect, useState } from 'react';

type PartnerBranding = {
  slug: string;
  name: string;
  logoData: string | null;
  logoMime: string | null;
};

const preferredPartners = [
  { slug: 'thyrocare', label: 'Thyrocare (HYD73)' },
  { slug: 'sagepath-labs', label: 'Sagepath Labs' },
  { slug: 'metropolis-labs', label: 'Metropolis Labs' },
];

export default function PartnerBrandingStrip() {
  const [partners, setPartners] = useState<PartnerBranding[]>([]);

  useEffect(() => {
    const slugs = preferredPartners.map((partner) => partner.slug).join(',');
    fetch(`/api/partner-branding?slugs=${encodeURIComponent(slugs)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload) => setPartners(Array.isArray(payload?.partners) ? payload.partners : []))
      .catch(() => setPartners([]));
  }, []);

  const bySlug = new Map(partners.map((partner) => [partner.slug, partner]));

  return (
    <>
      {preferredPartners.map(({ slug, label }) => {
        const partner = bySlug.get(slug);
        return (
          <div className="refPartnerItem refPartnerBrand" key={slug}>
            {partner?.logoData ? (
              <img className="refPartnerAdminLogo" src={partner.logoData} alt={`${label} logo`} />
            ) : (
              <span className="refPartnerLogoFallback" aria-hidden="true">{label.charAt(0)}</span>
            )}
            <span><b>{label}</b><small>Partner Lab</small></span>
          </div>
        );
      })}
    </>
  );
}
