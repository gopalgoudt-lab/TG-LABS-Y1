import type { Metadata } from 'next';
import BrandLogo from '@/components/BrandLogo';

export const metadata: Metadata = {
  title: { absolute: 'Serum Electrolytes Test in Hyderabad | TG Labs' },
  description: 'Explore serum electrolytes test options in Hyderabad through TG Labs. Current test components, partner eligibility, price, preparation and collection options depend on the live catalog and pincode.',
  alternates: { canonical: 'https://www.tglabs.in/electrolytes-test-hyderabad' },
  robots: { index: true, follow: true },
  openGraph: { title: 'Serum Electrolytes Test in Hyderabad | TG Labs', description: 'Browse currently displayable serum electrolytes test options and confirm live components, preparation, price, partner eligibility and collection availability before booking.', url: 'https://www.tglabs.in/electrolytes-test-hyderabad', type: 'website' },
};

const breadcrumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
  { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.tglabs.in' },
  { '@type': 'ListItem', position: 2, name: 'Kidney Function Test in Hyderabad', item: 'https://www.tglabs.in/kidney-function-test-hyderabad' },
  { '@type': 'ListItem', position: 3, name: 'Serum Electrolytes Test in Hyderabad', item: 'https://www.tglabs.in/electrolytes-test-hyderabad' },
] };

export default function ElectrolytesTestHyderabadPage() {
  return <main style={{ minHeight: '100vh', background: '#f5faf8', color: '#163b34', fontFamily: 'Arial,sans-serif' }}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
    <header style={{ background: '#fff', borderBottom: '1px solid #dbe8e3' }}><div style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}><a href="/" aria-label="TG Labs home" style={{ width: 150 }}><BrandLogo /></a><nav style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}><a href="/">Home</a><a href="/#catalog">Tests & Packages</a><a href="/diagnostic-tests-hyderabad">Hyderabad Tests</a><a href="/kidney-function-test-hyderabad">Kidney Tests</a><a href="/home-blood-test-hyderabad">Home Collection</a></nav></div></header>
    <section style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 22px 0' }}><nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/kidney-function-test-hyderabad">Kidney Function Test in Hyderabad</a> / <span>Serum Electrolytes Test in Hyderabad</span></nav></section>
    <section style={{ maxWidth: 1180, margin: '0 auto', padding: '42px 22px 28px' }}><span style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.3, color: '#087f6f' }}>TG LABS · SERUM ELECTROLYTES TEST DISCOVERY</span><h1 style={{ fontSize: 'clamp(34px,5vw,56px)', lineHeight: 1.05 }}>Serum electrolytes test options in Hyderabad.</h1><p style={{ maxWidth: 860, fontSize: 18, lineHeight: 1.7, color: '#536b65' }}>A serum electrolytes panel commonly measures minerals such as sodium, potassium and chloride in blood. Exact components can vary by laboratory and test listing. Browse the live TG Labs catalog and confirm the exact components, preparation instructions, partner eligibility, price and collection options before booking.</p><div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><a href="/#catalog" style={{ background: '#087f6f', color: '#fff', padding: '13px 18px', borderRadius: 10, fontWeight: 800 }}>Browse tests</a><a href="/kidney-function-test-hyderabad" style={{ background: '#fff', color: '#087f6f', padding: '13px 18px', borderRadius: 10, fontWeight: 800 }}>Explore kidney tests</a></div></section>
    <section style={{ maxWidth: 1180, margin: '0 auto 54px', padding: '0 22px' }}><div style={{ background: '#e8f5f1', borderRadius: 18, padding: 24, lineHeight: 1.65 }}><b>Test information notice</b><p>This discovery page is general information and does not diagnose an electrolyte imbalance, kidney disease or another condition, and it does not replace medical advice. Electrolyte results need interpretation with symptoms, health history, medicines and other investigations. Panel components, test methods, preparation requirements and reference ranges can vary, so confirm the exact listing and follow your clinician or laboratory instructions. This page does not guarantee a particular test, component set, partner, price, pincode or collection slot.</p><div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}><a href="/sodium-test-hyderabad">Serum sodium test →</a><a href="/potassium-test-hyderabad">Serum potassium test →</a><a href="/chloride-test-hyderabad">Serum chloride test →</a><a href="/calcium-test-hyderabad">Serum calcium test →</a><a href="/kidney-function-test-hyderabad">Kidney function test →</a><a href="/uric-acid-test-hyderabad">Uric acid test →</a><a href="/urine-acr-test-hyderabad">Urine ACR test →</a><a href="/diagnostic-tests-hyderabad">Hyderabad diagnostic tests →</a></div></div></section>
  </main>;
}
