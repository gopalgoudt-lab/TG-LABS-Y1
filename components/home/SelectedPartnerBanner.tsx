'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type PartnerBranding = {
  slug: string;
  name: string;
  logoData: string | null;
};

const partnerMap: Record<string, { brandingSlug: string; label: string }> = {
  thyrocare: { brandingSlug: 'thyrocare', label: 'Thyrocare (HYD73)' },
  'sagepath-labs': { brandingSlug: 'sagepath-labs', label: 'Sagepath Diagnostics' },
  'tg-labs-partner': { brandingSlug: 'tg-labs-partner', label: 'Metropolis' },
};

export default function SelectedPartnerBanner() {
  const params = useSearchParams();
  const partnerParam = params.get('partner') ?? '';
  const selected = useMemo(() => partnerMap[partnerParam] ?? null, [partnerParam]);
  const [branding, setBranding] = useState<PartnerBranding | null>(null);

  useEffect(() => {
    setBranding(null);
    if (!selected) return;
    fetch(`/api/partner-branding?slugs=${encodeURIComponent(selected.brandingSlug)}`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload) => {
        const item = Array.isArray(payload?.partners) ? payload.partners[0] : null;
        setBranding(item ?? null);
      })
      .catch(() => setBranding(null));
  }, [selected]);

  if (!selected) return null;

  return (
    <div className="refSelectedPartner" role="status" aria-label={`Selected laboratory: ${selected.label}`}>
      <div className="refSelectedPartnerIdentity">
        {branding?.logoData ? (
          <img src={branding.logoData} alt={`${selected.label} logo`} />
        ) : (
          <span className="refSelectedPartnerFallback" aria-hidden="true">{selected.label.charAt(0)}</span>
        )}
        <div>
          <small>LAB-SPECIFIC BOOKING</small>
          <strong>Showing {selected.label} Tests & Packages</strong>
          <span>Only catalog results for this selected laboratory are shown below.</span>
        </div>
      </div>
      <a href="/#catalog" className="refChangePartner">Change Lab</a>
    </div>
  );
}
