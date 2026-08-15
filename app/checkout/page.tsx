'use client';

import { useEffect, useMemo, useState } from 'react';

const catalog: Record<string, number> = {
  HbA1c: 350,
  CBC: 300,
  'Thyroid Profile': 450,
  'Vitamin D': 700,
  'Lipid Profile': 550,
  'Liver Function Test': 650,
};

export default function CheckoutPage() {
  const [cart, setCart] = useState<string[]>([]);
  const [mode, setMode] = useState<'home' | 'centre'>('home');
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', date: '', slot: '' });

  useEffect(() => {
    const saved = window.localStorage.getItem('tglabs-cart');
    if (saved) setCart(JSON.parse(saved));
  }, []);

  const total = useMemo(() => cart.reduce((sum, name) => sum + (catalog[name] || 0), 0), [cart]);

  const submitBooking = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return <main className="dashboard"><div className="card flowCard"><span className="ey">BOOKING REQUEST</span><h1>Details captured successfully.</h1><p>Your V6.2 booking flow is ready for the next integration step. Payment gateway and production notifications should be connected before accepting live payments.</p><div className="notice"><b>Selected service:</b> {mode === 'home' ? 'Home sample collection' : 'Centre booking'}<br /><b>Patient:</b> {form.name}<br /><b>Phone:</b> {form.phone}</div><a className="btn primary" href="/">Return to TG Labs →</a></div></main>;
  }

  return (
    <main className="dashboard">
      <a href="/" className="brand"><span className="logo">TG</span>TG LABS</a>
      <div className="checkoutLayout">
        <section>
          <div className="ey">STEP 1 OF 3 · BOOKING</div>
          <h1>Complete your booking.</h1>
          <p className="muted">Choose collection method, enter patient details and select a convenient slot.</p>

          <div className="modeGrid">
            <button className={`mode ${mode === 'home' ? 'selected' : ''}`} onClick={() => setMode('home')}><b>Home Collection</b><span>Sample collected at your address.</span></button>
            <button className={`mode ${mode === 'centre' ? 'selected' : ''}`} onClick={() => setMode('centre')}><b>Lab Centre</b><span>Visit a TG Labs collection centre.</span></button>
          </div>

          <form className="card flowCard bookingForm" onSubmit={submitBooking}>
            <h2>Patient details</h2>
            <label>Full name<input className="field" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Patient full name" /></label>
            <label>Mobile number<input className="field" required pattern="[0-9]{10}" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="10-digit mobile number" /></label>
            {mode === 'home' && <label>Collection address<input className="field" required placeholder="House / street / locality" /></label>}
            <div className="twoFields"><label>Date<input className="field" required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label><label>Preferred slot<select className="field" required value={form.slot} onChange={(e) => setForm({ ...form, slot: e.target.value })}><option value="">Choose</option><option>7:00 AM – 9:00 AM</option><option>9:00 AM – 11:00 AM</option><option>11:00 AM – 1:00 PM</option><option>4:00 PM – 6:00 PM</option></select></label></div>
            <div className="notice">Payment gateway integration is intentionally not activated yet. This prevents accidental live charges while V6.2 is being validated.</div>
            <button className="btn primary full" type="submit">Continue to secure payment →</button>
          </form>
        </section>

        <aside className="card orderSummary">
          <small>ORDER SUMMARY</small><h2>{cart.length ? `${cart.length} selected test${cart.length > 1 ? 's' : ''}` : 'No tests selected'}</h2>
          {cart.length ? cart.map((name) => <div className="summaryRow" key={name}><span>{name}</span><b>₹{catalog[name]?.toLocaleString('en-IN')}</b></div>) : <p className="muted">Return to the homepage and add tests to your basket.</p>}
          <div className="summaryTotal"><span>Estimated total</span><b>₹{total.toLocaleString('en-IN')}</b></div>
          <p className="tiny">Final pricing, availability, taxes/fees and payment confirmation must be validated by the production backend before go-live.</p>
        </aside>
      </div>
    </main>
  );
}
