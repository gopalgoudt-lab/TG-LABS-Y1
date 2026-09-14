import type { Metadata } from 'next';
import BrandLogo from '@/components/BrandLogo';

export const metadata: Metadata = {
  title: { absolute: 'Vitamin B12 Test in Hyderabad | TG Labs' },
  description: 'Explore Vitamin B12 blood test options in Hyderabad through TG Labs. Availability, partner eligibility, pricing and home collection depend on the live catalog and pincode.',
  alternates: { canonical: 'https://www.tglabs.in/vitamin-b12-test-hyderabad' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Vitamin B12 Test in Hyderabad | TG Labs',
    description: 'Browse displayable Vitamin B12 test options and confirm live price and home collection eligibility before booking.',
    url: 'https://www.tglabs.in/vitamin-b12-test-hyderabad',
    type: 'website',
  },
};

const breadcrumbs = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.tglabs.in' },
    { '@type': 'ListItem', position: 2, name: 'Diagnostic Tests in Hyderabad', item: 'https://www.tglabs.in/diagnostic-tests-hyderabad' },
    { '@type': 'ListItem', position: 3, name: 'Vitamin B12 Test in Hyderabad', item: 'https://www.tglabs.in/vitamin-b12-test-hyderabad' },
  ],
};

export default function VitaminB12TestHyderabadPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#f5faf8', color: '#163b34', fontFamily: 'Arial,sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <header style={{ background: '#fff', borderBottom: '1px solid #dbe8e3' }}><div style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}><a href="/" aria-label="TG Labs home" style={{ width: 150 }}><BrandLogo /></a><nav style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}><a href="/">Home</a><a href="/#catalog">Tests & Packages</a><a href="/diagnostic-tests-hyderabad">Hyderabad Tests</a><a href="/home-blood-test-hyderabad">Home Collection</a><a href="/compare/labs">Partner Labs</a></nav></div></header>
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 22px 0' }}><nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/diagnostic-tests-hyderabad">Diagnostic Tests in Hyderabad</a> / <span>Vitamin B12 Test in Hyderabad</span></nav></section>
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '42px 22px 28px' }}><span style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.3, color: '#087f6f' }}>TG LABS · VITAMIN B12 TEST DISCOVERY</span><h1 style={{ fontSize: 'clamp(34px,5vw,56px)', lineHeight: 1.05 }}>Vitamin B12 test options in Hyderabad.</h1><p style={{ maxWidth: 860, fontSize: 18, lineHeight: 1.7, color: '#536b65' }}>Browse Vitamin B12 blood test options in the live TG Labs catalog, compare currently displayable partner options, and confirm current pricing and home collection eligibility before booking.</p><div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><a href="/#catalog" style={{ background: '#087f6f', color: '#fff', padding: '13px 18px', borderRadius: 10, fontWeight: 800 }}>Browse Vitamin B12 tests</a><a href="/compare/labs" style={{ background: '#fff', color: '#087f6f', padding: '13px 18px', borderRadius: 10, fontWeight: 800 }}>Compare partner labs</a></div></section>
      <section style={{ maxWidth: 1180, margin: '0 auto 54px', padding: '0 22px' }}><div style={{ background: '#e8f5f1', borderRadius: 18, padding: 24, lineHeight: 1.65 }}><b>Availability notice</b><p>This page does not guarantee a particular test, partner, price, pincode or home collection slot. Confirm current details and eligibility in the live TG Labs catalog.</p><div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}><a href="/diagnostic-tests-hyderabad">Browse Hyderabad diagnostic tests →</a><a href="/home-blood-test-hyderabad">Check home collection options →</a></div></div></section>
    </main>
  );
}
