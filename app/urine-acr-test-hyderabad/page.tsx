import type { Metadata } from 'next';
import BrandLogo from '@/components/BrandLogo';

export const metadata: Metadata = {
  title: 'Urine ACR Test in Hyderabad',
  description: 'Explore urine albumin-creatinine ratio (ACR) test options in Hyderabad through TG Labs. Current test availability, partner eligibility, price and collection options depend on the live catalog and pincode.',
  alternates: { canonical: 'https://www.tglabs.in/urine-acr-test-hyderabad' },
  robots: { index: true, follow: true },
  openGraph: { title: 'Urine ACR Test in Hyderabad | TG Labs', description: 'Browse currently displayable urine albumin-creatinine ratio test options and confirm live test details, price, partner eligibility and collection availability before booking.', url: 'https://www.tglabs.in/urine-acr-test-hyderabad', type: 'website' },
};

const breadcrumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
  { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.tglabs.in' },
  { '@type': 'ListItem', position: 2, name: 'Kidney Function Test in Hyderabad', item: 'https://www.tglabs.in/kidney-function-test-hyderabad' },
  { '@type': 'ListItem', position: 3, name: 'Urine ACR Test in Hyderabad', item: 'https://www.tglabs.in/urine-acr-test-hyderabad' },
] };

export default function UrineAcrTestHyderabadPage() {
  return <main style={{ minHeight: '100vh', background: '#f5faf8', color: '#163b34', fontFamily: 'Arial,sans-serif' }}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
    <header style={{ background: '#fff', borderBottom: '1px solid #dbe8e3' }}><div style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}><a href="/" aria-label="TG Labs home" style={{ width: 150 }}><BrandLogo /></a><nav style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}><a href="/">Home</a><a href="/#catalog">Tests & Packages</a><a href="/diagnostic-tests-hyderabad">Hyderabad Tests</a><a href="/home-blood-test-hyderabad">Home Collection</a><a href="/compare/labs">Partner Labs</a></nav></div></header>
    <section style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 22px 0' }}><nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/kidney-function-test-hyderabad">Kidney Function Test in Hyderabad</a> / <span>Urine ACR Test in Hyderabad</span></nav></section>
    <section style={{ maxWidth: 1180, margin: '0 auto', padding: '42px 22px 28px' }}><span style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.3, color: '#087f6f' }}>TG LABS · KIDNEY & DIABETES TEST DISCOVERY</span><h1 style={{ fontSize: 'clamp(34px,5vw,56px)', lineHeight: 1.05 }}>Urine ACR test options in Hyderabad.</h1><p style={{ maxWidth: 860, fontSize: 18, lineHeight: 1.7, color: '#536b65' }}>Urine albumin-creatinine ratio (ACR) testing measures urine albumin relative to urine creatinine and may be used by clinicians when assessing kidney health, including kidney monitoring in people with diabetes. Browse the live TG Labs catalog and confirm the exact test, specimen requirements, partner eligibility, price and collection options before booking.</p><div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><a href="/#catalog" style={{ background: '#087f6f', color: '#fff', padding: '13px 18px', borderRadius: 10, fontWeight: 800 }}>Browse tests</a><a href="/kidney-function-test-hyderabad" style={{ background: '#fff', color: '#087f6f', padding: '13px 18px', borderRadius: 10, fontWeight: 800 }}>Explore kidney tests</a></div></section>
    <section style={{ maxWidth: 1180, margin: '0 auto 54px', padding: '0 22px' }}><div style={{ background: '#e8f5f1', borderRadius: 18, padding: 24, lineHeight: 1.65 }}><b>Test information notice</b><p>This discovery page is general information and does not diagnose kidney disease or replace medical advice. Urine ACR and urine microalbumin are related terms but may refer to different measurements or test listings. This page does not guarantee a particular test, partner, price, pincode or collection slot. Confirm the exact test name, specimen and preparation requirements and current eligibility in the live catalog and booking flow.</p><div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}><a href="/urine-microalbumin-test-hyderabad">Urine microalbumin test →</a><a href="/kidney-function-test-hyderabad">Kidney function tests →</a><a href="/diabetes-test-hyderabad">Diabetes tests →</a></div></div></section>
  </main>;
}
