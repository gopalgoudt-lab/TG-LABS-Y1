import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import BrandLogo from '@/components/BrandLogo';

const base = 'https://www.tglabs.in';
const links = [
  ['/thyrocare-sithaphalmandi', 'Sithaphalmandi centre'],
  ['/home-blood-test-sithaphalmandi', 'Home collection'],
  ['/thyrocare-packages-sithaphalmandi', 'Thyrocare packages'],
];

export function localMetadata(slug: string, title: string, description: string): Metadata {
  return {
    title: { absolute: `${title} | TG Labs` }, description,
    alternates: { canonical: `${base}/${slug}` }, robots: { index: true, follow: true },
    openGraph: { title: `${title} | TG Labs`, description, url: `${base}/${slug}`, type: 'website' },
  };
}

export default function SithaphalmandiLanding({ slug, title, intro, children }: {
  slug: string; title: string; intro: string; children: ReactNode;
}) {
  const breadcrumbs = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: base },
      { '@type': 'ListItem', position: 2, name: title, item: `${base}/${slug}` },
    ],
  };
  return <main style={{ minHeight: '100vh', background: '#f5faf8', color: '#163b34', fontFamily: 'Arial,sans-serif' }}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs).replace(/</g, '\\u003c') }} />
    <header style={{ background: '#fff', borderBottom: '1px solid #dbe8e3', padding: '18px 22px' }}>
      <div style={{ maxWidth: 1100, margin: 'auto', display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <a href="/" aria-label="TG Labs home" style={{ width: 150 }}><BrandLogo /></a>
        <nav aria-label="Local services" style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>{links.map(([href, label]) => <a key={href} href={href} aria-current={href === `/${slug}` ? 'page' : undefined}>{label}</a>)}</nav>
      </div>
    </header>
    <div style={{ maxWidth: 1100, margin: 'auto', padding: '24px 22px 48px', lineHeight: 1.7 }}>
      <nav aria-label="Breadcrumb"><a href="/">Home</a> / <span>{title}</span></nav>
      <section style={{ padding: '28px 0' }}>
        <span style={{ color: '#087f6f', fontWeight: 800 }}>TG LABS · SITHAPHALMANDI, SECUNDERABAD</span>
        <h1 style={{ fontSize: 'clamp(30px,5vw,52px)', lineHeight: 1.15 }}>{title}</h1>
        <p style={{ maxWidth: 850, fontSize: 18 }}>{intro}</p>
        <p>Contact the Sithaphalmandi centre directly for local enquiries:</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href="tel:+919701162302" style={{ background: '#087f6f', color: '#fff', padding: '12px 18px', borderRadius: 10 }}>Call 97011 62302</a>
          <a href="https://wa.me/919701162302" style={{ background: '#e1eee9', color: '#163b34', padding: '12px 18px', borderRadius: 10 }}>WhatsApp the centre</a>
        </div>
      </section>
      <div style={{ display: 'grid', gap: 24 }}>{children}</div>
      <aside style={{ background: '#e8f5f1', padding: 22, borderRadius: 16, marginTop: 28 }}>
        <h2 style={{ fontSize: 20 }}>About this page</h2>
        <p>This is a TG Labs page for enquiries about the Thyrocare collection centre in Sithaphalmandi. TG Labs is a multi-lab diagnostic marketplace; this is not Thyrocare’s corporate website. Confirm the selected processing laboratory, current price and collection arrangements before booking.</p>
        <p>Online booking depends on the current test or package, partner eligibility, pincode and available slot. Sending an enquiry does not confirm a booking.</p>
        <a href="/#catalog">Explore the live TG Labs catalog →</a>
      </aside>
    </div>
  </main>;
}
