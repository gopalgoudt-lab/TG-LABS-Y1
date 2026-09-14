import type { Metadata } from 'next';
import BrandLogo from '@/components/BrandLogo';

export const metadata: Metadata = {
  title: 'Diagnostic Tests in Hyderabad',
  description: 'Browse diagnostic tests and health packages in Hyderabad, compare eligible partner-lab options, and check home sample collection availability by pincode.',
  alternates: { canonical: 'https://www.tglabs.in/diagnostic-tests-hyderabad' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Diagnostic Tests in Hyderabad | TG Labs',
    description: 'Browse tests and packages, compare eligible partner-lab options, and confirm home collection availability by pincode.',
    url: 'https://www.tglabs.in/diagnostic-tests-hyderabad',
    type: 'website',
  },
};

const breadcrumbs = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.tglabs.in' },
    { '@type': 'ListItem', position: 2, name: 'Diagnostic Tests in Hyderabad', item: 'https://www.tglabs.in/diagnostic-tests-hyderabad' },
  ],
};

const cards = [
  ['Search the live catalog', 'Find blood tests, diagnostic profiles and preventive health packages.'],
  ['Compare partner options', 'Review partner options currently shown by TG Labs before choosing an eligible item.'],
  ['Confirm your pincode', 'Home collection and booking eligibility depend on pincode and the selected partner offer.'],
];

export default function DiagnosticTestsHyderabadPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#f5faf8', color: '#163b34', fontFamily: 'Arial,sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <header style={{ background: '#fff', borderBottom: '1px solid #dbe8e3' }}><div style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}><a href="/" aria-label="TG Labs home" style={{ width: 150 }}><BrandLogo /></a><nav style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}><a href="/">Home</a><a href="/#catalog">Tests & Packages</a><a href="/compare/labs">Partner Labs</a><a href="/health-blog">Health Blog</a></nav></div></header>
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 22px 0' }}><nav aria-label="Breadcrumb"><a href="/">Home</a> / <span>Diagnostic Tests in Hyderabad</span></nav></section>
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '42px 22px 30px' }}><span style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.3, color: '#087f6f' }}>TG LABS · HYDERABAD</span><h1 style={{ fontSize: 'clamp(34px,5vw,56px)', lineHeight: 1.05 }}>Diagnostic tests in Hyderabad, with partner options in one place.</h1><p style={{ maxWidth: 820, fontSize: 18, lineHeight: 1.7, color: '#536b65' }}>Browse diagnostic tests and preventive health packages, compare currently displayable partner-lab options, and check whether home sample collection is available for your pincode before booking.</p><div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><a href="/#catalog" style={{ background: '#087f6f', color: '#fff', padding: '13px 18px', borderRadius: 10, fontWeight: 800 }}>Search tests & packages</a><a href="/compare/labs" style={{ background: '#fff', color: '#087f6f', padding: '13px 18px', borderRadius: 10, fontWeight: 800 }}>Compare partner labs</a></div></section>
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '10px 22px 36px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>{cards.map(([title, body], index) => <article key={title} style={{ background: '#fff', border: '1px solid #dce9e4', borderRadius: 18, padding: 22 }}><strong>{index + 1}</strong><h2 style={{ fontSize: 20 }}>{title}</h2><p style={{ color: '#5a706a', lineHeight: 1.65 }}>{body}</p></article>)}</section>
      <section style={{ maxWidth: 1180, margin: '0 auto 54px', padding: '0 22px' }}><div style={{ background: '#e8f5f1', borderRadius: 18, padding: 24, lineHeight: 1.65 }}><b>Availability notice</b><p>This discovery page does not guarantee that every test, partner, slot or pincode is bookable. Use the live catalog and pincode check for current eligibility.</p><div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}><a href="/thyroid-test-hyderabad">Explore thyroid test options →</a><a href="/diabetes-test-hyderabad">Explore diabetes test options →</a><a href="/cbc-test-hyderabad">Explore CBC test options →</a><a href="/home-blood-test-hyderabad">Explore home blood test options →</a><a href="/health-blog">Read TG Labs health guides →</a></div></div></section>
    </main>
  );
}
