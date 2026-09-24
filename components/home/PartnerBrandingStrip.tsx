'use client';

import { useEffect, useState } from 'react';

type PartnerBranding = {
  slug: string;
  name: string;
  logoData: string | null;
  logoMime: string | null;
};

type PreferredPartner = {
  slug: string;
  label: string;
  subtitle: string;
  className: string;
  fallbackLogo?: string;
};

const preferredPartners: PreferredPartner[] = [
  { slug: 'thyrocare', label: 'Thyrocare', subtitle: 'Franchisee (HYD73)', className: 'thyrocarePartner', fallbackLogo: '/partners/thyrocare.svg' },
  { slug: 'sagepath-labs', label: 'Sagepath Diagnostics', subtitle: 'Partner Lab', className: '', fallbackLogo: '/partners/sagepath-labs.svg' },
  { slug: 'tg-labs-partner', label: 'Metropolis', subtitle: 'Partner Lab', className: 'metropolisPartner' },
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
      {preferredPartners.map(({ slug, label, subtitle, className, fallbackLogo }) => {
        const partner = bySlug.get(slug);
        const logoSrc = partner?.logoData || fallbackLogo;
        return (
          <div className={`refPartnerItem partnerNamed ${className}`.trim()} key={slug}>
            {logoSrc ? (
              <img src={logoSrc} alt={`${label} logo`} />
            ) : (
              <span className="refPartnerWordmark" aria-label={`${label} logo`}>{label}</span>
            )}
            <span className="refPartnerDetails">
              <span>{label}</span>
              <small>{subtitle}</small>
              <a className="refPartnerBook" href={`/?partner=${encodeURIComponent(slug)}#catalog`} aria-label={`Book tests from ${label}`}>Book Tests</a>
            </span>
          </div>
        );
      })}
    </>
  );
}
