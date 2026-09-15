import type { Metadata } from 'next';
import BrandLogo from '@/components/BrandLogo';

export const metadata: Metadata = {
  title: 'HOMA-IR Test in Hyderabad',
  description: 'Explore HOMA-IR insulin resistance test options in Hyderabad through TG Labs. Current test availability, partner eligibility, price, preparation and collection options depend on the live catalog and pincode.',
  alternates: { canonical: 'https://www.tglabs.in/homa-ir-test-hyderabad' },
  robots: { index: true, follow: true },
  openGraph: { title: 'HOMA-IR Test in Hyderabad | TG Labs', description: 'Browse currently displayable HOMA-IR insulin resistance test options and confirm live test details, preparation, price, partner eligibility and collection availability before booking.', url: 'https://www.tglabs.in/homa-ir-test-hyderabad', type: 'website' },
};

const breadcrumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
  { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.tglabs.in' },
  { '@type': 'ListItem', position: 2, name: 'Diabetes Test in Hyderabad', item: 'https://www.tglabs.in/diabetes-test-hyderabad' },
  { '@type': 'ListItem', position: 3, name: 'HOMA-IR Test in Hyderabad', item: 'https://www.tglabs.in/homa-ir-test-hyderabad' },
] };

export default function HomaIrTestHyderabadPage() {
  return <main style={{ minHeight: '100vh', background: '#f5faf8', color: '#163b34', fontFamily: 'Arial,sans-serif' }}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
    <header style={{ background: '#fff', borderBottom: '1px solid #dbe8e3' }}><div style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}><a href="/" aria-label="TG Labs home" style={{ width: 150 }}><BrandLogo /></a><nav style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}><a href="/">Home</a><a href="/#catalog">Tests & Packages</a><a href="/diagnostic-tests-hyderabad">Hyderabad Tests</a><a href="/diabetes-test-hyderabad">Diabetes Tests</a><a href="/insulin-test-hyderabad">Insulin Test</a><a href="/home-blood-test-hyderabad">Home Collection</a></nav></div></header>
    <section style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 22px 0' }}><nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/diabetes-test-hyderabad">Diabetes Test in Hyderabad</a> / <span>HOMA-IR Test in Hyderabad</span></nav></section>
    <section style={{ maxWidth: 1180, margin: '0 auto', padding: '42px 22px 28px' }}><span style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.3, color: '#087f6f' }}>TG LABS · INSULIN RESISTANCE TEST DISCOVERY</span><h1 style={{ fontSize: 'clamp(34px,5vw,56px)', lineHeight: 1.05 }}>HOMA-IR insulin resistance test options in Hyderabad.</h1><p style={{ maxWidth: 860, fontSize: 18, lineHeight: 1.7, color: '#536b65' }}>HOMA-IR (Homeostatic Model Assessment of Insulin Resistance) uses glucose and insulin measurements to estimate insulin resistance. Browse the live TG Labs catalog and confirm the exact test components, preparation instructions, partner eligibility, price and collection options before booking.</p><div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><a href="/#catalog" style={{ background: '#087f6f', color: '#fff', padding: '13px 18px', borderRadius: 10, fontWeight: 800 }}>Browse tests</a><a href="/insulin-test-hyderabad" style={{ background: '#fff', color: '#087f6f', padding: '13px 18px', borderRadius: 10, fontWeight: 800 }}>Explore insulin tests</a></div></section>
    <section style={{ maxWidth: 1180, margin: '0 auto 54px', padding: '0 22px' }}><div style={{ background: '#e8f5f1', borderRadius: 18, padding: 24, lineHeight: 1.65 }}><b>Test information notice</b><p>This discovery page is general information and does not diagnose insulin resistance or replace medical advice. HOMA-IR is different from a standalone insulin, fasting glucose or HbA1c test. Test components and preparation requirements can vary by laboratory, so confirm the exact listing and instructions in the live TG Labs catalog. This page does not guarantee a particular test, partner, price, pincode or collection slot.</p><div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}><a href="/insulin-test-hyderabad">Insulin test →</a><a href="/fasting-blood-sugar-test-hyderabad">Fasting blood sugar test →</a><a href="/hba1c-test-hyderabad">HbA1c test →</a><a href="/diabetes-test-hyderabad">Diabetes tests →</a></div></div></section>
  </main>;
}
