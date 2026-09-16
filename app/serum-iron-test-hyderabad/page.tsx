import type { Metadata } from 'next';
import BrandLogo from '@/components/BrandLogo';

export const metadata: Metadata = {
  title: { absolute: 'Serum Iron Test in Hyderabad | TG Labs' },
  description: 'Explore serum iron test options in Hyderabad through TG Labs. Current test details, partner eligibility, price, preparation and collection options depend on the live catalog and pincode.',
  alternates: { canonical: 'https://www.tglabs.in/serum-iron-test-hyderabad' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Serum Iron Test in Hyderabad | TG Labs',
    description: 'Browse currently displayable serum iron test options and confirm live test details, preparation, price, partner eligibility and collection availability before booking.',
    url: 'https://www.tglabs.in/serum-iron-test-hyderabad',
    type: 'website',
  },
};

const breadcrumbs = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.tglabs.in' },
    { '@type': 'ListItem', position: 2, name: 'Diagnostic Tests in Hyderabad', item: 'https://www.tglabs.in/diagnostic-tests-hyderabad' },
    { '@type': 'ListItem', position: 3, name: 'Serum Iron Test in Hyderabad', item: 'https://www.tglabs.in/serum-iron-test-hyderabad' },
  ],
};

export default function SerumIronTestHyderabadPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#f5faf8', color: '#163b34', fontFamily: 'Arial,sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <header style={{ background: '#fff', borderBottom: '1px solid #dbe8e3' }}><div style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}><a href="/" aria-label="TG Labs home" style={{ width: 150 }}><BrandLogo /></a><nav style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}><a href="/">Home</a><a href="/#catalog">Tests & Packages</a><a href="/diagnostic-tests-hyderabad">Hyderabad Tests</a><a href="/cbc-test-hyderabad">CBC Test</a><a href="/home-blood-test-hyderabad">Home Collection</a></nav></div></header>
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 22px 0' }}><nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/diagnostic-tests-hyderabad">Diagnostic Tests in Hyderabad</a> / <span>Serum Iron Test in Hyderabad</span></nav></section>
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '42px 22px 28px' }}><span style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.3, color: '#087f6f' }}>TG LABS · SERUM IRON TEST DISCOVERY</span><h1 style={{ fontSize: 'clamp(34px,5vw,56px)', lineHeight: 1.05 }}>Serum iron test options in Hyderabad.</h1><p style={{ maxWidth: 860, fontSize: 18, lineHeight: 1.7, color: '#536b65' }}>A serum iron test measures iron circulating in blood and may be ordered with other investigations as part of a broader clinical assessment. Test methods, preparation instructions and reference ranges can vary by laboratory. Browse the live TG Labs catalog and confirm the current listing, preparation requirements, partner eligibility, price and collection options before booking.</p><div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><a href="/#catalog" style={{ background: '#087f6f', color: '#fff', padding: '13px 18px', borderRadius: 10, fontWeight: 800 }}>Browse tests</a><a href="/diagnostic-tests-hyderabad" style={{ background: '#fff', color: '#087f6f', padding: '13px 18px', borderRadius: 10, fontWeight: 800 }}>Explore Hyderabad tests</a></div></section>
      <section style={{ maxWidth: 1180, margin: '0 auto 54px', padding: '0 22px' }}><div style={{ background: '#e8f5f1', borderRadius: 18, padding: 24, lineHeight: 1.65 }}><b>Test information notice</b><p>This discovery page is general information and does not diagnose iron deficiency, iron overload, anaemia or another illness, and it does not replace medical advice. Serum iron results need interpretation with symptoms, health history, medicines and other investigations. Test methods, preparation requirements and reference ranges can vary, so confirm the exact listing and follow your clinician or laboratory instructions. This page does not guarantee a particular test, partner, price, pincode or collection slot.</p><div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}><a href="/cbc-test-hyderabad">CBC test →</a><a href="/vitamin-b12-test-hyderabad">Vitamin B12 test →</a><a href="/diagnostic-tests-hyderabad">Hyderabad diagnostic tests →</a><a href="/home-blood-test-hyderabad">Home blood test →</a></div></div></section>
    </main>
  );
}
