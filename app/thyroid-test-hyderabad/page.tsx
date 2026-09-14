import type { Metadata } from 'next';
import BrandLogo from '@/components/BrandLogo';

export const metadata: Metadata = {
  title: 'Thyroid Test in Hyderabad - TSH, T3 & T4',
  description: 'Explore thyroid profile, TSH, T3 and T4 blood test options in Hyderabad through TG Labs. Availability, partner eligibility, price and home collection depend on the live catalog and pincode.',
  alternates: { canonical: 'https://www.tglabs.in/thyroid-test-hyderabad' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Thyroid Test in Hyderabad | TG Labs',
    description: 'Browse currently displayable thyroid profile, TSH, T3 and T4 options, compare eligible partner labs, and confirm live price and home collection availability before booking.',
    url: 'https://www.tglabs.in/thyroid-test-hyderabad',
    type: 'website',
  },
};

const breadcrumbs = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.tglabs.in' },
    { '@type': 'ListItem', position: 2, name: 'Thyroid Test in Hyderabad', item: 'https://www.tglabs.in/thyroid-test-hyderabad' },
  ],
};

const cards = [
  ['TSH test', 'Explore currently displayable thyroid-stimulating hormone (TSH) test options and confirm current eligibility before booking.', '/tsh-test-hyderabad'],
  ['T3 test', 'Explore currently displayable triiodothyronine (T3) test options and confirm current eligibility before booking.', '/t3-test-hyderabad'],
  ['T4 test', 'Explore currently displayable thyroxine (T4) test options and confirm current eligibility before booking.', '/t4-test-hyderabad'],
  ['Thyroid profiles', 'Use the live catalog to review thyroid profiles that may contain multiple thyroid-related parameters, depending on the currently displayable item.', '/#catalog'],
];

const faqs = [
  ['What tests can be part of thyroid assessment?', 'Thyroid assessment may include TSH and, when clinically appropriate, T3, T4 or other thyroid-related tests. The exact tests needed depend on clinical context and should be interpreted by a qualified clinician.'],
  ['Are TSH, T3 and T4 always sold together?', 'Not necessarily. TG Labs displays the currently available tests and profiles from eligible partner offers. Review the live catalog to confirm what a selected item includes.'],
  ['Can I book thyroid testing with home collection?', 'Home sample collection is conditional on the selected test or profile, pincode, eligible partner option and available slot. Confirm availability in the live booking flow.'],
];

export default function ThyroidTestHyderabadPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#f5faf8', color: '#163b34', fontFamily: 'Arial,sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <header style={{ background: '#fff', borderBottom: '1px solid #dbe8e3' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <a href="/" aria-label="TG Labs home" style={{ width: 150 }}><BrandLogo /></a>
          <nav style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}><a href="/">Home</a><a href="/#catalog">Tests & Packages</a><a href="/diagnostic-tests-hyderabad">Hyderabad Tests</a><a href="/home-blood-test-hyderabad">Home Collection</a><a href="/compare/labs">Partner Labs</a></nav>
        </div>
      </header>
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 22px 0' }}><nav aria-label="Breadcrumb"><a href="/">Home</a> / <span>Thyroid Test in Hyderabad</span></nav></section>
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '42px 22px 28px' }}>
        <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.3, color: '#087f6f' }}>TG LABS · THYROID TEST DISCOVERY</span>
        <h1 style={{ fontSize: 'clamp(34px,5vw,56px)', lineHeight: 1.05 }}>Thyroid tests in Hyderabad: TSH, T3, T4 and thyroid profiles.</h1>
        <p style={{ maxWidth: 900, fontSize: 18, lineHeight: 1.7, color: '#536b65' }}>Explore thyroid-related blood tests and profiles in the live TG Labs catalog, compare currently displayable partner options, and confirm current pricing and home collection eligibility before booking.</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><a href="/#catalog" style={{ background: '#087f6f', color: '#fff', padding: '13px 18px', borderRadius: 10, fontWeight: 800 }}>Browse thyroid tests</a><a href="/compare/labs" style={{ background: '#fff', color: '#087f6f', padding: '13px 18px', borderRadius: 10, fontWeight: 800 }}>Compare partner labs</a></div>
      </section>
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '10px 22px 36px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
        {cards.map(([title, body, href]) => <article key={title} style={{ background: '#fff', border: '1px solid #dce9e4', borderRadius: 18, padding: 22 }}><h2 style={{ fontSize: 20 }}>{title}</h2><p style={{ color: '#5a706a', lineHeight: 1.65 }}>{body}</p><a href={href}>Explore {title.toLowerCase()} →</a></article>)}
      </section>
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '0 22px 36px' }}>
        <h2>Thyroid testing FAQs</h2>
        <div style={{ display: 'grid', gap: 14 }}>{faqs.map(([question, answer]) => <article key={question} style={{ background: '#fff', border: '1px solid #dce9e4', borderRadius: 16, padding: 20 }}><h3 style={{ marginTop: 0 }}>{question}</h3><p style={{ color: '#5a706a', lineHeight: 1.65, marginBottom: 0 }}>{answer}</p></article>)}</div>
      </section>
      <section style={{ maxWidth: 1180, margin: '0 auto 54px', padding: '0 22px' }}>
        <div style={{ background: '#e8f5f1', borderRadius: 18, padding: 24, lineHeight: 1.65 }}><b>Test information notice</b><p>This discovery page does not diagnose thyroid conditions or guarantee a particular thyroid test, profile, partner, price, pincode or home collection slot. Confirm current test details, offer information and eligibility in the live TG Labs catalog and discuss interpretation of results with a qualified clinician.</p><div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}><a href="/health-blog/thyroid-profile-test-guide">Read the thyroid profile guide →</a><a href="/home-blood-test-hyderabad">Check home collection options →</a><a href="/diagnostic-tests-hyderabad">Browse Hyderabad diagnostic tests →</a></div></div>
      </section>
    </main>
  );
}
