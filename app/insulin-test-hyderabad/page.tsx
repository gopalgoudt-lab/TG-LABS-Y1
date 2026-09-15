import type { Metadata } from 'next';
import BrandLogo from '@/components/BrandLogo';

export const metadata: Metadata = {
  title: 'Insulin Test in Hyderabad',
  description: 'Browse insulin test options in Hyderabad and confirm current partner, pricing, preparation requirements and home collection eligibility in the live TG Labs catalog.',
  alternates: { canonical: 'https://www.tglabs.in/insulin-test-hyderabad' },
  robots: { index: true, follow: true },
  openGraph: { title: 'Insulin Test in Hyderabad | TG Labs', description: 'Explore insulin test options in Hyderabad and confirm current eligibility and preparation requirements before booking.', url: 'https://www.tglabs.in/insulin-test-hyderabad', type: 'website' },
};

const breadcrumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
  { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.tglabs.in' },
  { '@type': 'ListItem', position: 2, name: 'Diabetes Test in Hyderabad', item: 'https://www.tglabs.in/diabetes-test-hyderabad' },
  { '@type': 'ListItem', position: 3, name: 'Insulin Test in Hyderabad', item: 'https://www.tglabs.in/insulin-test-hyderabad' },
] };

export default function InsulinTestHyderabadPage() {
  return <main style={{ minHeight: '100vh', background: '#f5faf8', color: '#163b34', fontFamily: 'Arial,sans-serif' }}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
    <header style={{ background: '#fff', borderBottom: '1px solid #dbe8e3' }}><div style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}><a href="/" aria-label="TG Labs home" style={{ width: 150 }}><BrandLogo /></a><nav style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}><a href="/">Home</a><a href="/#catalog">Tests & Packages</a><a href="/diagnostic-tests-hyderabad">Hyderabad Tests</a><a href="/diabetes-test-hyderabad">Diabetes Tests</a><a href="/hba1c-test-hyderabad">HbA1c Test</a><a href="/glucose-tolerance-test-hyderabad">GTT Test</a><a href="/home-blood-test-hyderabad">Home Collection</a></nav></div></header>
    <section style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 22px 0' }}><nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/diabetes-test-hyderabad">Diabetes Test in Hyderabad</a> / <span>Insulin Test in Hyderabad</span></nav></section>
    <section style={{ maxWidth: 1180, margin: '0 auto', padding: '42px 22px 30px' }}><span style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.3, color: '#087f6f' }}>TG LABS · INSULIN TEST DISCOVERY</span><h1 style={{ fontSize: 'clamp(34px,5vw,56px)', lineHeight: 1.05 }}>Insulin test options in Hyderabad.</h1><p style={{ maxWidth: 860, fontSize: 18, lineHeight: 1.7, color: '#536b65' }}>Browse insulin test options in the live TG Labs catalog, compare currently displayable partner options, and confirm current pricing, preparation requirements and home collection eligibility before booking.</p><div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><a href="/#catalog" style={{ background: '#087f6f', color: '#fff', padding: '13px 18px', borderRadius: 10, fontWeight: 800 }}>Browse insulin tests</a><a href="/diabetes-test-hyderabad" style={{ background: '#fff', color: '#087f6f', padding: '13px 18px', borderRadius: 10, fontWeight: 800 }}>Explore diabetes tests</a></div></section>
    <section style={{ maxWidth: 1180, margin: '0 auto 54px', padding: '0 22px' }}><div style={{ background: '#e8f5f1', borderRadius: 18, padding: 24, lineHeight: 1.65 }}><b>Availability and preparation notice</b><p>This discovery page does not guarantee a particular insulin test, partner, price, pincode or home collection slot. Confirm current test details, eligibility and preparation instructions shown for the selected test in the live TG Labs catalog before booking.</p><div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}><a href="/homa-ir-test-hyderabad">Explore HOMA-IR / insulin resistance test →</a><a href="/fasting-blood-sugar-test-hyderabad">Explore FBS tests →</a><a href="/hba1c-test-hyderabad">Explore HbA1c tests →</a><a href="/glucose-tolerance-test-hyderabad">Explore GTT tests →</a></div></div></section>
  </main>;
}
