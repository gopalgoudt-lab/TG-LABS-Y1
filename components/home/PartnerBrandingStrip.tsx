'use client';

import { useEffect, useState } from 'react';

type PartnerBranding = {
  slug: string;
  name: string;
  logoData: string | null;
  logoMime: string | null;
};

const preferredPartners = [
  { slug: 'thyrocare', label: 'Thyrocare', suffix: '(HYD73)', className: 'thyrocarePartner' },
  { slug: 'sagepath-labs', label: 'Sagepath Diagnostics', suffix: '', className: '' },
  { slug: 'tg-labs-partner', label: 'Metropolis', suffix: '', className: 'metropolisPartner' },
];

export default function PartnerBrandingStrip() {
  const [partners, setPartners] = useState<PartnerBranding[]>([]);

  useEffect(() => {
    const slugs = preferredPartners.map((partner) => partner.slug).join(',');
    fetch(`/api/partner-branding?slugs=${encodeURIComponent(slugs)}`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload) => setPartners(Array.isArray(payload?.partners) ? payload.partners : []))
      .catch(() => setPartners([]));
  }, []);

  const bySlug = new Map(partners.map((partner) => [partner.slug, partner]));

  return (
    <>
      {preferredPartners.map(({ slug, label, suffix, className }) => {
        const partner = bySlug.get(slug);
        return (
          <div className={`refPartnerItem partnerNamed ${className}`.trim()} key={slug}>
            {partner?.logoData ? <img src={partner.logoData} alt={`${label} logo`} /> : <span className="refPartnerLogoFallback" aria-hidden="true">{label.charAt(0)}</span>}
            <span className="refPartnerDetails">
              <span>{label} {suffix && <strong>{suffix}</strong>}</span>
              <small>Partner Lab</small>
              <a className="refPartnerBook" href={`/?partner=${encodeURIComponent(slug)}#catalog`} aria-label={`Book tests from ${label}`}>Book Tests</a>
            </span>
          </div>
        );
      })}
    </>
  );
}
