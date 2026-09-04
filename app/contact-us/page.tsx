import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact TG Labs',
  description: 'Contact TG Labs for diagnostic tests, health packages, home sample collection and report support in Hyderabad and Secunderabad.',
  alternates: { canonical: '/contact-us' },
};

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #dfe9e5',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 8px 24px rgba(12,71,61,.05)',
};

export default function ContactPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#f4f8f6', color: '#12352f', fontFamily: 'Arial,sans-serif', padding: '40px 20px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <a href="/" style={{ color: '#087f6f', fontWeight: 800, textDecoration: 'none' }}>← TG Labs home</a>
        <div style={{ marginTop: 28 }}>
          <div style={{ color: '#087f6f', fontSize: 13, fontWeight: 900, letterSpacing: '.08em' }}>TG LABS • CONTACT</div>
          <h1 style={{ fontSize: 40, marginBottom: 10 }}>How can we help?</h1>
          <p style={{ fontSize: 18, lineHeight: 1.6, maxWidth: 760 }}>
            Contact TG Labs for diagnostic test discovery, health packages, home sample collection and secure report access in Hyderabad and Secunderabad.
          </p>
        </div>
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16, marginTop: 28 }}>
          <div style={card}><b>Phone</b><p><a href="tel:+919652603022">+91 9652603022</a></p></div>
          <div style={card}><b>Email</b><p><a href="mailto:info@tglabs.in">info@tglabs.in</a></p></div>
          <div style={card}><b>Service area</b><p>Hyderabad &amp; Secunderabad, Telangana</p></div>
          <div style={card}><b>Operating hours</b><p>Monday–Saturday: 8:00 AM–6:00 PM<br/>Sunday: 8:00 AM–3:00 PM</p></div>
        </section>
        <section style={{ ...card, marginTop: 20 }}>
          <h2 style={{ marginTop: 0 }}>Book or access reports</h2>
          <p>Use the new TG Labs catalog to choose tests and partner options. Existing patients can securely access their bookings and reports from the patient portal.</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 18 }}>
            <a href="/" style={{ background: '#087f6f', color: '#fff', padding: '11px 16px', borderRadius: 10, fontWeight: 800, textDecoration: 'none' }}>Browse tests &amp; packages</a>
            <a href="/patient" style={{ background: '#e8f3ef', color: '#12352f', padding: '11px 16px', borderRadius: 10, fontWeight: 800, textDecoration: 'none' }}>Patient portal</a>
          </div>
        </section>
      </div>
    </main>
  );
}
