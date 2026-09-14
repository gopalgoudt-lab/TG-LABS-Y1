import type { Metadata } from 'next';
import BrandLogo from '@/components/BrandLogo';

export const metadata: Metadata = {
  title: 'Vitamin D Test in Hyderabad',
  description: 'Explore Vitamin D blood test options in Hyderabad through TG Labs. Test availability, partner eligibility, price and home collection depend on the live catalog and pincode.',
  alternates: { canonical: 'https://www.tglabs.in/vitamin-d-test-hyderabad' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Vitamin D Test in Hyderabad | TG Labs',
    description: 'Browse currently displayable Vitamin D test options, compare eligible partner labs, and confirm live price and home collection availability before booking.',
    url: 'https://www.tglabs.in/vitamin-d-test-hyderabad',
    type: 'website',
  },
};

const breadcrumbs = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.tglabs.in' },
    { '@type': 'ListItem', position: 2, name: 'Vitamin D Test in Hyderabad', item: 'https://www.tglabs.in/vitamin-d-test-hyderabad' },
  ],
};

const cards = [
  ['Search Vitamin D test options', 'Use the live TG Labs catalog to find currently displayable Vitamin D blood test options before choosing a test.'],
  ['Compare eligible partner labs', 'Where multiple partner offers are displayed, compare current details and eligibility rather than relying on a static partner or price claim.'],
  ['Check current price and availability', 'Prices and offer availability can change, so confirm the current information in the live catalog before booking.'],
  ['Confirm home collection by pincode', 'Home sample collection is conditional on the selected item, pincode, eligible partner option and available slot.'],
];

export default function VitaminDTestHyderabadPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#f5faf8', color: '#163b34', fontFamily: 'Arial,sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <header style={{ background: '#fff', borderBottom: '1px solid #dbe8e3' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <a href="/" aria-label="TG Labs home" style={{ width: 150 }}><BrandLogo /></a>
          <nav style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}><a href="/">Home</a><a href="/#catalog">Tests & Packages</a><a href="/diagnostic-tests-hyderabad">Hyderabad Tests</a><a href="/home-blood-test-hyderabad">Home Collection</a><a href="/compare/labs">Partner Labs</a></nav>
        </div>
      </header>
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 22px 0' }}><nav aria-label="Breadcrumb"><a href="/">Home</a> / <span>Vitamin D Test in Hyderabad</span></nav></section>
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '42px 22px 28px' }}>
        <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.3, color: '#087f6f' }}>TG LABS · VITAMIN D TEST DISCOVERY</span>
        <h1 style={{ fontSize: 'clamp(34px,5vw,56px)', lineHeight: 1.05 }}>Vitamin D test options in Hyderabad.</h1>
        <p style={{ maxWidth: 860, fontSize: 18, lineHeight: 1.7, color: '#536b65' }}>Browse Vitamin D blood test options in the live TG Labs catalog, compare currently displayable partner options, and confirm current pricing and home collection eligibility before booking.</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><a href="/#catalog" style={{ background: '#087f6f', color: '#fff', padding: '13px 18px', borderRadius: 10, fontWeight: 800 }}>Browse Vitamin D tests</a><a href="/compare/labs" style={{ background: '#fff', color: '#087f6f', padding: '13px 18px', borderRadius: 10, fontWeight: 800 }}>Compare partner labs</a></div>
      </section>
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '10px 22px 36px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
        {cards.map(([title, body], index) => <article key={title} style={{ background: '#fff', border: '1px solid #dce9e4', borderRadius: 18, padding: 22 }}><strong>{index + 1}</strong><h2 style={{ fontSize: 20 }}>{title}</h2><p style={{ color: '#5a706a', lineHeight: 1.65 }}>{body}</p></article>)}
      </section>
      <section style={{ maxWidth: 1180, margin: '0 auto 54px', padding: '0 22px' }}>
        <div style={{ background: '#e8f5f1', borderRadius: 18, padding: 24, lineHeight: 1.65 }}><b>Test information notice</b><p>This discovery page does not guarantee a particular Vitamin D test, partner, price, pincode or home collection slot. Confirm the current test details, offer information and eligibility in the live TG Labs catalog and booking flow.</p><div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}><a href="/health-blog/vitamin-d-test-guide">Read the Vitamin D test guide →</a><a href="/home-blood-test-hyderabad">Check home collection options →</a><a href="/diagnostic-tests-hyderabad">Browse Hyderabad diagnostic tests →</a></div></div>
      </section>
    </main>
  );
}
