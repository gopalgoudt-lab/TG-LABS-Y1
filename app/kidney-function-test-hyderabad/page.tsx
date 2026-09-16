import type { Metadata } from 'next';
import BrandLogo from '@/components/BrandLogo';

export const metadata: Metadata = {
  title: { absolute: 'Kidney Function Test in Hyderabad | TG Labs' },
  description: 'Explore kidney function test (KFT/RFT) blood test options in Hyderabad through TG Labs. Test availability, partner eligibility, price and home collection depend on the live catalog and pincode.',
  alternates: { canonical: 'https://www.tglabs.in/kidney-function-test-hyderabad' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Kidney Function Test in Hyderabad | TG Labs',
    description: 'Browse currently displayable kidney function test options, compare eligible partner labs, and confirm live price and home collection availability before booking.',
    url: 'https://www.tglabs.in/kidney-function-test-hyderabad',
    type: 'website',
  },
};

const breadcrumbs = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.tglabs.in' },
    { '@type': 'ListItem', position: 2, name: 'Diagnostic Tests in Hyderabad', item: 'https://www.tglabs.in/diagnostic-tests-hyderabad' },
    { '@type': 'ListItem', position: 3, name: 'Kidney Function Test in Hyderabad', item: 'https://www.tglabs.in/kidney-function-test-hyderabad' },
  ],
};

const faqs = [
  ['What is a kidney function test (KFT/RFT)?', 'A kidney function test is a blood test panel commonly used to measure kidney-related markers. A qualified clinician can interpret the results in the context of your symptoms, health history, medicines and other investigations.'],
  ['Can I compare kidney function test options on TG Labs?', 'Use the live TG Labs catalog to review currently displayable kidney function test options and eligible partner offers. Availability and pricing can change.'],
  ['Is home collection guaranteed?', 'No. Home sample collection depends on the selected item, pincode, eligible partner option and available slot at the time of booking.'],
];

export default function KidneyFunctionTestHyderabadPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#f5faf8', color: '#163b34', fontFamily: 'Arial,sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <header style={{ background: '#fff', borderBottom: '1px solid #dbe8e3' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <a href="/" aria-label="TG Labs home" style={{ width: 150 }}><BrandLogo /></a>
          <nav style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}><a href="/">Home</a><a href="/#catalog">Tests & Packages</a><a href="/diagnostic-tests-hyderabad">Hyderabad Tests</a><a href="/home-blood-test-hyderabad">Home Collection</a><a href="/compare/labs">Partner Labs</a></nav>
        </div>
      </header>
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 22px 0' }}><nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/diagnostic-tests-hyderabad">Diagnostic Tests in Hyderabad</a> / <span>Kidney Function Test in Hyderabad</span></nav></section>
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '42px 22px 28px' }}>
        <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.3, color: '#087f6f' }}>TG LABS · KIDNEY FUNCTION TEST DISCOVERY</span>
        <h1 style={{ fontSize: 'clamp(34px,5vw,56px)', lineHeight: 1.05 }}>Kidney function test (KFT/RFT) options in Hyderabad.</h1>
        <p style={{ maxWidth: 860, fontSize: 18, lineHeight: 1.7, color: '#536b65' }}>Browse kidney function blood test options in the live TG Labs catalog, compare currently displayable partner options, and confirm current pricing and home collection eligibility before booking.</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><a href="/#catalog" style={{ background: '#087f6f', color: '#fff', padding: '13px 18px', borderRadius: 10, fontWeight: 800 }}>Browse kidney function tests</a><a href="/compare/labs" style={{ background: '#fff', color: '#087f6f', padding: '13px 18px', borderRadius: 10, fontWeight: 800 }}>Compare partner labs</a></div>
      </section>
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '0 22px 36px' }}><h2>Kidney function test FAQs</h2><div style={{ display: 'grid', gap: 14 }}>{faqs.map(([question, answer]) => <article key={question} style={{ background: '#fff', border: '1px solid #dce9e4', borderRadius: 16, padding: 20 }}><h3 style={{ marginTop: 0 }}>{question}</h3><p style={{ color: '#5a706a', lineHeight: 1.65, marginBottom: 0 }}>{answer}</p></article>)}</div></section>
      <section style={{ maxWidth: 1180, margin: '0 auto 54px', padding: '0 22px' }}><div style={{ background: '#e8f5f1', borderRadius: 18, padding: 24, lineHeight: 1.65 }}><b>Test information notice</b><p>This discovery page does not diagnose kidney disease or guarantee a particular kidney function panel, partner, price, pincode or home collection slot. Confirm current test details and eligibility in the live TG Labs catalog and discuss interpretation of results with a qualified clinician.</p><div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}><a href="/electrolytes-test-hyderabad">Serum electrolytes test →</a><a href="/uric-acid-test-hyderabad">Uric acid test →</a><a href="/urine-acr-test-hyderabad">Urine ACR test →</a><a href="/urine-microalbumin-test-hyderabad">Urine microalbumin test →</a><a href="/diagnostic-tests-hyderabad">Browse Hyderabad diagnostic tests →</a><a href="/home-blood-test-hyderabad">Check home collection options →</a></div></div></section>
    </main>
  );
}
