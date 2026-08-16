'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';

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
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', address: '', date: '', slot: '' });

  useEffect(() => {
    const saved = window.localStorage.getItem('tglabs-cart');
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch {
        setCart([]);
      }
    }

    if (!document.querySelector('script[data-razorpay-checkout]')) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.dataset.razorpayCheckout = 'true';
      document.body.appendChild(script);
    }
  }, []);

  const total = useMemo(() => cart.reduce((sum, name) => sum + (catalog[name] || 0), 0), [cart]);
  const minDate = new Date().toISOString().slice(0, 10);

  async function startPayment(id: string) {
    setPaying(true);
    setError('');

    try {
      const response = await fetch('/api/payments/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to start payment.');

      const RazorpayCheckout = (window as unknown as { Razorpay?: new (options: Record<string, unknown>) => { open: () => void } }).Razorpay;
      if (!RazorpayCheckout) throw new Error('Payment window is still loading. Please try again.');

      const checkout = new RazorpayCheckout({
        key: data.keyId,
        amount: data.order.amount,
        currency: data.order.currency || 'INR',
        name: 'TG Labs',
        description: `Diagnostic booking ${id}`,
        order_id: data.order.id,
        prefill: { name: form.name, contact: form.phone },
        theme: { color: '#087f78' },
        handler: async (payment: Record<string, string>) => {
          const verifyResponse = await fetch('/api/payments/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId: id, ...payment }),
          });
          const verified = await verifyResponse.json();
          if (!verifyResponse.ok) {
            setError(verified.error || 'Payment verification failed.');
            return;
          }
          setPaid(true);
          window.localStorage.removeItem('tglabs-cart');
        },
        modal: { ondismiss: () => setPaying(false) },
      });

      checkout.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start payment.');
    } finally {
      setPaying(false);
    }
  }

  async function submitBooking(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          mode,
          address: mode === 'home' ? form.address : undefined,
          date: form.date,
          slot: form.slot,
          testNames: cart,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to create booking.');

      setBookingId(data.booking.id);
      setSubmitted(true);
      await startPayment(data.booking.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create booking.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="dashboard">
        <div className="card flowCard">
          <span className="ey">{paid ? 'PAYMENT SUCCESSFUL' : 'BOOKING CREATED'}</span>
          <h1>{paid ? 'Your booking is confirmed.' : 'Your booking has been saved.'}</h1>
          <p>{paid ? 'Payment was verified successfully and your diagnostic booking is confirmed.' : 'Complete the payment to confirm your appointment.'}</p>
          <div className="notice">
            <b>Booking ID:</b> {bookingId}<br />
            <b>Service:</b> {mode === 'home' ? 'Home sample collection' : 'Centre booking'}<br />
            <b>Patient:</b> {form.name}<br />
            <b>Mobile:</b> {form.phone}<br />
            <b>Amount:</b> ₹{total.toLocaleString('en-IN')}<br />
            <b>Payment:</b> {paid ? 'PAID' : 'PENDING'}
          </div>
          {error && <div className="errorBox" role="alert">{error}</div>}
          {!paid && <button className="btn primary full" type="button" disabled={paying} onClick={() => startPayment(bookingId)}>{paying ? 'Opening payment…' : 'Pay securely with Razorpay →'}</button>}
          {paid && <a className="btn primary" href="/">Return to TG Labs →</a>}
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <a href="/" className="brand"><span className="logo">TG</span>TG LABS</a>
      <div className="checkoutLayout">
        <section className="checkoutMain">
          <div className="ey">STEP 1 OF 3 · BOOKING</div>
          <h1>Complete your booking.</h1>
          <p className="muted">Choose collection method, enter patient details and select a convenient slot.</p>
          <div className="modeGrid">
            <button type="button" className={`mode ${mode === 'home' ? 'selected' : ''}`} onClick={() => setMode('home')}><b>Home Collection</b><span>Sample collected at your address.</span></button>
            <button type="button" className={`mode ${mode === 'centre' ? 'selected' : ''}`} onClick={() => setMode('centre')}><b>Lab Centre</b><span>Visit a TG Labs collection centre.</span></button>
          </div>
          <form className="card flowCard bookingForm" onSubmit={submitBooking}>
            <h2>Patient details</h2>
            <label>Full name<input className="field" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Patient full name" /></label>
            <label>Mobile number<input className="field" required inputMode="numeric" pattern="[0-9]{10}" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="10-digit mobile number" /></label>
            {mode === 'home' && <label>Collection address<textarea className="field" required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="House / street / locality" rows={3} /></label>}
            <div className="twoFields">
              <label>Date<input className="field" required min={minDate} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
              <label>Preferred slot<select className="field" required value={form.slot} onChange={(e) => setForm({ ...form, slot: e.target.value })}><option value="">Choose</option><option>7:00 AM – 9:00 AM</option><option>9:00 AM – 11:00 AM</option><option>11:00 AM – 1:00 PM</option><option>4:00 PM – 6:00 PM</option></select></label>
            </div>
            {error && <div className="errorBox" role="alert">{error}</div>}
            <div className="notice">Your booking is saved first, then Razorpay opens for secure payment. Payment is confirmed only after server-side signature verification.</div>
            <button className="btn primary full" type="submit" disabled={submitting || !cart.length}>{submitting ? 'Creating booking…' : 'Create booking & pay →'}</button>
          </form>
        </section>
        <aside className="card orderSummary"><small>ORDER SUMMARY</small><h2>{cart.length ? `${cart.length} selected test${cart.length > 1 ? 's' : ''}` : 'No tests selected'}</h2>{cart.length ? cart.map((name) => <div className="summaryRow" key={name}><span>{name}</span><b>₹{catalog[name]?.toLocaleString('en-IN')}</b></div>) : <p className="muted">Return to the homepage and add tests to your basket.</p>}<div className="summaryTotal"><span>Estimated total</span><b>₹{total.toLocaleString('en-IN')}</b></div><p className="tiny">Secure payment is processed by Razorpay after the booking is created.</p></aside>
      </div>
      <style>{`body{background:#f5faf9}.dashboard{max-width:1180px;margin:0 auto;padding:28px 20px 70px}.checkoutLayout{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(300px,.75fr);gap:25px;margin-top:45px}.checkoutMain>h1{font-size:clamp(38px,5vw,60px);letter-spacing:-3px;margin:12px 0}.checkoutMain>.muted{max-width:650px}.modeGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:25px 0}.mode{border:1px solid #dce9e7;background:#fff;border-radius:15px;text-align:left;padding:18px;cursor:pointer}.mode b,.mode span{display:block}.mode span{font-size:12px;color:#6c8186;margin-top:6px}.mode.selected{border:2px solid #087f78;background:#effaf8}.bookingForm{margin:0;max-width:none}.bookingForm h2{margin-top:0}.bookingForm label{display:block;font-size:12px;font-weight:800;margin-top:15px}.field{width:100%;box-sizing:border-box}.twoFields{display:grid;grid-template-columns:1fr 1fr;gap:15px}.orderSummary{height:max-content;position:sticky;top:95px}.orderSummary>small{color:#087f78;font-weight:900;letter-spacing:1px;font-size:10px}.orderSummary h2{font-size:22px}.summaryRow{display:flex;justify-content:space-between;padding:14px 0;border-bottom:1px solid #dce9e7;font-size:13px}.summaryTotal{display:flex;justify-content:space-between;margin-top:20px;padding-top:16px;border-top:2px solid #102f37;font-size:16px}.tiny{font-size:10px;line-height:1.5;color:#6c8186;margin-top:18px}.flowCard{max-width:720px;margin:20px auto;padding:30px}.errorBox{margin:18px 0;padding:12px 14px;border-radius:10px;background:#fff0f0;border:1px solid #f0b8b8;color:#8c2424;font-size:12px;font-weight:700}.btn:disabled{opacity:.55;cursor:not-allowed}@media(max-width:850px){.checkoutLayout{grid-template-columns:1fr}.orderSummary{position:static}.checkoutMain{order:1}.orderSummary{order:2}}@media(max-width:560px){.dashboard{padding:20px 15px 50px}.modeGrid,.twoFields{grid-template-columns:1fr}.checkoutMain>h1{letter-spacing:-2px}.flowCard{padding:20px}}`}</style>
    </main>
  );
}
