import type { Metadata } from 'next';
import BrandLogo from '@/components/BrandLogo';

export const metadata: Metadata = {
  title: 'Home Blood Test in Hyderabad',
  description: 'Check home blood test and sample collection options in Hyderabad through TG Labs. Availability depends on pincode, selected test or package, partner eligibility, and slot availability.',
  alternates: { canonical: 'https://www.tglabs.in/home-blood-test-hyderabad' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Home Blood Test in Hyderabad | TG Labs',
    description: 'Explore blood tests and health packages, then confirm whether home sample collection is available for your pincode and selected partner option.',
    url: 'https://www.tglabs.in/home-blood-test-hyderabad',
    type: 'website',
  },
};

const breadcrumbs = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.tglabs.in' },
    { '@type': 'ListItem', position: 2, name: 'Home Blood Test in Hyderabad', item: 'https://www.tglabs.in/home-blood-test-hyderabad' },
  ],
};

const steps = [
  ['Choose a test or package', 'Search the live TG Labs catalog for a diagnostic test, profile or preventive health package.'],
  ['Check your pincode', 'Home sample collection availability is determined from the pincode and the selected partner offer.'],
  ['Review eligible partner options', 'Compare partner choices that are currently displayed and eligible for the selected item.'],
  ['Choose an available slot', 'Booking can continue only when the selected item, pincode, partner option and collection slot are eligible.'],
];

export default function HomeBloodTestHyderabadPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#f5faf8', color: '#163b34', fontFamily: 'Arial,sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <header style={{ background: '#fff', borderBottom: '1px solid #dbe8e3' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <a href="/" aria-label="TG Labs home" style={{ width: 150 }}><BrandLogo /></a>
          <nav style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}><a href="/">Home</a><a href="/#catalog">Tests & Packages</a><a href="/diagnostic-tests-hyderabad">Hyderabad Tests</a><a href="/compare/labs">Partner Labs</a></nav>
        </div>
      </header>
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 22px 0' }}><nav aria-label="Breadcrumb"><a href="/">Home</a> / <span>Home Blood Test in Hyderabad</span></nav></section>
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '42px 22px 28px' }}>
        <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.3, color: '#087f6f' }}>TG LABS · HOME COLLECTION DISCOVERY</span>
        <h1 style={{ fontSize: 'clamp(34px,5vw,56px)', lineHeight: 1.05 }}>Home blood test options in Hyderabad, checked by pincode.</h1>
        <p style={{ maxWidth: 850, fontSize: 18, lineHeight: 1.7, color: '#536b65' }}>Use TG Labs to browse blood tests and health packages, compare currently displayable partner options, and confirm whether home sample collection is available for your pincode before booking.</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><a href="/#catalog" style={{ background: '#087f6f', color: '#fff', padding: '13px 18px', borderRadius: 10, fontWeight: 800 }}>Search tests & packages</a><a href="/diagnostic-tests-hyderabad" style={{ background: '#fff', color: '#087f6f', padding: '13px 18px', borderRadius: 10, fontWeight: 800 }}>Browse Hyderabad diagnostic tests</a></div>
      </section>
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '10px 22px 36px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
        {steps.map(([title, body], index) => <article key={title} style={{ background: '#fff', border: '1px solid #dce9e4', borderRadius: 18, padding: 22 }}><strong>{index + 1}</strong><h2 style={{ fontSize: 20 }}>{title}</h2><p style={{ color: '#5a706a', lineHeight: 1.65 }}>{body}</p></article>)}
      </section>
      <section style={{ maxWidth: 1180, margin: '0 auto 54px', padding: '0 22px' }}>
        <div style={{ background: '#e8f5f1', borderRadius: 18, padding: 24, lineHeight: 1.65 }}><b>Home collection availability</b><p>Home sample collection is not guaranteed for every test, package, partner, pincode, date or time slot. Confirm current eligibility in the live booking flow before relying on collection availability.</p><div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}><a href="/home-blood-test-sithaphalmandi">Sithaphalmandi home collection →</a><a href="/full-body-checkup-hyderabad">Explore preventive health checkups →</a><a href="/compare/labs">Compare partner labs →</a></div></div>
      </section>
    </main>
  );
}
