'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import BrandLogo from '@/components/BrandLogo';

type CartItem = { kind: 'test' | 'package'; id: string; name: string; price: number; offerId?: string; partnerId?: string; partnerName?: string; tat?: string | null };
type CatalogPackage = { id: string; tests?: { id: string }[] };
type PaymentOption = 'ONLINE' | 'QR' | 'COLLECTION';
type CollectionPaymentMethod = 'CASH' | 'UPI';

function fmt(n: number) {
  const h = Math.floor(n / 60), m = n % 60, p = h >= 12 ? 'PM' : 'AM', hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')} ${p}`;
}

const SLOTS = Array.from({ length: 26 }, (_, i) => `${fmt(360 + i * 30)} - ${fmt(390 + i * 30)}`);
const PRINTED_REPORT_FEE = 100;

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [catalogPackages, setCatalogPackages] = useState<CatalogPackage[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);
  const [mode, setMode] = useState<'home' | 'centre'>('home');
  const [paymentOption, setPaymentOption] = useState<PaymentOption>('ONLINE');
  const [collectionPaymentMethod, setCollectionPaymentMethod] = useState<CollectionPaymentMethod>('CASH');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [deferredConfirmed, setDeferredConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [printedReport, setPrintedReport] = useState(false);
  const [serverTotal, setServerTotal] = useState<number | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '', age: '', gender: '', doctorName: '', address: '', pincode: '', date: '', slot: '' });

  useEffect(() => {
    const stored = localStorage.getItem('tglabs-cart');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCart(parsed.filter((x: any) => x && typeof x === 'object' && x.id && x.name && (x.kind === 'package' || (x.kind === 'test' && x.offerId && x.partnerId && x.partnerName))));
        }
      } catch {
        setCart([]);
      }
    }

    setIdempotencyKey(crypto.randomUUID());

    fetch('/api/catalog', { cache: 'no-store' })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Unable to load catalogue.');
        setCatalogPackages(Array.isArray(data.packages) ? data.packages : []);
      })
      .catch(() => setCatalogPackages([]))
      .finally(() => setCatalogReady(true));

    if (!document.querySelector('script[data-razorpay-checkout]')) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.dataset.razorpayCheckout = 'true';
      document.body.appendChild(script);
    }
  }, []);

  const packageTestIds = useMemo(() => {
    const selectedPackageIds = new Set(cart.filter((item) => item.kind === 'package').map((item) => item.id));
    const ids = new Set<string>();
    for (const pkg of catalogPackages) {
      if (!selectedPackageIds.has(pkg.id)) continue;
      for (const test of pkg.tests || []) ids.add(test.id);
    }
    return ids;
  }, [cart, catalogPackages]);

  const diagnosticTotal = useMemo(() => cart.reduce((sum, item) => {
    if (item.kind === 'test' && packageTestIds.has(item.id)) return sum;
    return sum + Number(item.price || 0);
  }, 0), [cart, packageTestIds]);

  const total = diagnosticTotal + (printedReport ? PRINTED_REPORT_FEE : 0);
  const displayedTotal = serverTotal ?? total;
  const hasPackage = cart.some((item) => item.kind === 'package');
  const minDate = new Date().toISOString().slice(0, 10);

  async function startPayment(id: string) {
    setPaying(true);
    setError('');
    try {
      const response = await fetch('/api/payments/razorpay/order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to start payment.');
      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) throw new Error('Payment window is still loading. Please try again.');
      new Razorpay({
        key: data.keyId,
        amount: data.order.amount,
        currency: data.order.currency || 'INR',
        name: 'TG Labs',
        description: paymentOption === 'QR' ? `QR / UPI payment for booking ${id}` : `Diagnostic booking ${id}`,
        order_id: data.order.id,
        prefill: { name: form.name, contact: form.phone, email: form.email },
        method: paymentOption === 'QR' ? { upi: true } : undefined,
        theme: { color: '#087f78' },
        handler: async (payment: any) => {
          setPaying(true);
          const verifyResponse = await fetch('/api/payments/razorpay/verify', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: id, ...payment }),
          });
          const verified = await verifyResponse.json();
          if (!verifyResponse.ok) {
            setError(verified.error || 'Payment verification failed.');
            setPaying(false);
            return;
          }
          setPaid(true);
          setPaying(false);
          localStorage.removeItem('tglabs-cart');
        },
        modal: { ondismiss: () => setPaying(false) },
      }).open();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to start payment.');
      setPaying(false);
    }
  }

  async function submitBooking(e: FormEvent) {
    e.preventDefault();
    if (hasPackage && !catalogReady) return;
    setSubmitting(true);
    setError('');
    const requestKey = idempotencyKey || crypto.randomUUID();
    if (!idempotencyKey) setIdempotencyKey(requestKey);

    try {
      const testSelections = cart.filter((item) => item.kind === 'test').map((item) => ({ testId: item.id, offerId: item.offerId! }));
      const packageIds = cart.filter((item) => item.kind === 'package').map((item) => item.id);
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: requestKey,
          name: form.name,
          phone: form.phone,
          email: form.email,
          age: Number(form.age),
          gender: form.gender,
          doctorName: form.doctorName.trim() || undefined,
          printedReport,
          paymentOption,
          collectionPaymentMethod: paymentOption === 'COLLECTION' ? collectionPaymentMethod : undefined,
          mode,
          address: mode === 'home' ? form.address : undefined,
          pincode: mode === 'home' ? form.pincode : undefined,
          date: form.date,
          slot: form.slot,
          testSelections,
          packageIds,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to create booking.');
      setBookingId(data.booking.id);
      setServerTotal(Number(data.booking.totalAmount));
      setSubmitted(true);

      if (paymentOption === 'COLLECTION') {
        setDeferredConfirmed(true);
        localStorage.removeItem('tglabs-cart');
      } else {
        await startPayment(data.booking.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to create booking.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    const confirmed = paid || deferredConfirmed;
    const deferredLabel = collectionPaymentMethod === 'UPI' ? 'UPI at sample collection' : 'Cash at sample collection';
    return <main className="dashboard"><div className="card flowCard successCard">
      <div className="flowSteps"><span className="done">1 Booking</span><span className={paid ? 'done' : deferredConfirmed ? 'active' : 'active'}>2 Payment</span><span className={confirmed ? 'done' : ''}>3 Confirmed</span></div>
      <span className="ey">{paid ? 'PAYMENT SUCCESSFUL' : deferredConfirmed ? 'BOOKING CONFIRMED · PAY AT COLLECTION' : 'BOOKING CREATED · PAYMENT PENDING'}</span>
      <h1>{paid ? 'Your booking is confirmed.' : deferredConfirmed ? 'Booking confirmed. Pay when the sample is collected.' : 'Complete payment to confirm your booking.'}</h1>
      <div className="notice"><b>Booking ID:</b> {bookingId}<br/><b>Patient:</b> {form.name}<br/><b>Age / Gender:</b> {form.age} / {form.gender}<br/>{form.doctorName && <><b>Doctor:</b> {form.doctorName}<br/></>}<b>Mobile:</b> {form.phone}<br/><b>Email:</b> {form.email}<br/>{mode === 'home' && <><b>Pincode:</b> {form.pincode}<br/></>}{printedReport && <><b>Printed reports:</b> Yes · Delivery in 24–48 hrs (+₹100)<br/></>}<b>Payment option:</b> {paymentOption === 'COLLECTION' ? deferredLabel : paymentOption === 'QR' ? 'QR / UPI via Razorpay' : 'Online via Razorpay'}<br/><b>Total amount:</b> ₹{displayedTotal.toLocaleString('en-IN')}</div>
      {paid && <div className="paidNote">Payment verified. Your appointment is confirmed and the booking status has been updated.</div>}
      {deferredConfirmed && <div className="paidNote">No online payment is required now. Please pay ₹{displayedTotal.toLocaleString('en-IN')} by {collectionPaymentMethod === 'UPI' ? 'UPI' : 'cash'} when the sample is collected.</div>}
      {error && <div className="errorBox">{error}</div>}
      {!confirmed ? <button className="btn primary full" onClick={() => startPayment(bookingId)} disabled={paying}>{paying ? 'Processing payment…' : paymentOption === 'QR' ? 'Pay by QR / UPI with Razorpay →' : 'Pay securely with Razorpay →'}</button> : <div className="successActions"><a className="btn primary" href="/patient">View patient dashboard →</a><a className="btn" href="/">Back to TG Labs</a></div>}
    </div></main>;
  }

  return <main className="dashboard">
    <a href="/" className="standaloneBrand" aria-label="TG Labs home"><BrandLogo className="brandLogoStandalone" priority /></a>
    <div className="checkoutLayout"><section className="checkoutMain">
      <div className="ey">BOOKING · PAYMENT · CONFIRMATION</div><h1>Complete your booking.</h1>
      <div className="modeGrid"><button type="button" className={`mode ${mode === 'home' ? 'selected' : ''}`} onClick={() => setMode('home')}><b>Home Collection</b><span>Sample collected at your address.</span></button><button type="button" className={`mode ${mode === 'centre' ? 'selected' : ''}`} onClick={() => setMode('centre')}><b>Lab Centre</b><span>Visit a TG Labs collection centre.</span></button></div>
      <form className="card flowCard bookingForm" onSubmit={submitBooking}><h2>Patient details</h2>
        <label>Full name<input className="field" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/></label>
        <div className="twoFields"><label>Age<input className="field" required type="number" min="0" max="120" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })}/></label><label>Gender<select className="field" required value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option value="">Select gender</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHERS">Others</option></select></label></div>
        <label>Doctor name <span className="optional">(optional)</span><input className="field" value={form.doctorName} onChange={(e) => setForm({ ...form, doctorName: e.target.value })} placeholder="Referring doctor name" maxLength={160}/></label>
        <label>Mobile number<input className="field" required inputMode="numeric" pattern="[0-9]{10}" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}/></label>
        <label>Email ID<input className="field" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="patient@example.com"/></label>
        {mode === 'home' && <><label>Collection address<textarea className="field" required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={3}/></label><label>Pincode<input className="field" required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} placeholder="6-digit pincode"/></label></>}
        <div className="twoFields"><label>Date<input className="field" required min={minDate} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}/></label><label>Preferred slot<select className="field" required value={form.slot} onChange={(e) => setForm({ ...form, slot: e.target.value })}><option value="">Choose 30-minute slot</option>{SLOTS.map((slot) => <option key={slot}>{slot}</option>)}</select></label></div>
        <div className="bookingTotal"><div><span>Total price</span><small>{cart.length} selected item{cart.length === 1 ? '' : 's'}{printedReport ? ' + printed reports' : ''}</small></div><strong>₹{total.toLocaleString('en-IN')}</strong></div>
        {packageTestIds.size > 0 && <div className="includedNotice">Tests already included in a selected package are not charged twice.</div>}
        <label className="printOption"><input type="checkbox" checked={printedReport} onChange={(e) => setPrintedReport(e.target.checked)}/><span><b>Printed Reports — ₹100 extra</b><small>Get printed diagnostic reports delivered in 24–48 hrs.</small></span></label>

        <div className="paymentSection"><h2>Choose payment option</h2><div className="paymentGrid">
          <button type="button" className={`paymentChoice ${paymentOption === 'ONLINE' ? 'selected' : ''}`} onClick={() => setPaymentOption('ONLINE')}><b>Pay Online</b><span>Card, UPI, Netbanking & wallets through Razorpay.</span></button>
          <button type="button" className={`paymentChoice ${paymentOption === 'QR' ? 'selected' : ''}`} onClick={() => setPaymentOption('QR')}><b>QR Code / UPI</b><span>Open Razorpay with UPI-focused payment options.</span></button>
          <button type="button" className={`paymentChoice ${paymentOption === 'COLLECTION' ? 'selected' : ''}`} onClick={() => setPaymentOption('COLLECTION')}><b>Pay at Sample Collection</b><span>Book now and pay the technician when your sample is collected.</span></button>
        </div>
        {paymentOption === 'COLLECTION' && <div className="collectionMethods"><span>How will you pay at collection?</span><div><button type="button" className={collectionPaymentMethod === 'CASH' ? 'selected' : ''} onClick={() => setCollectionPaymentMethod('CASH')}>Cash</button><button type="button" className={collectionPaymentMethod === 'UPI' ? 'selected' : ''} onClick={() => setCollectionPaymentMethod('UPI')}>UPI</button></div></div>}
        </div>

        {error && <div className="errorBox">{error}</div>}
        <button className="btn primary full createBooking" type="submit" disabled={submitting || !cart.length || (hasPackage && !catalogReady)}>{submitting ? 'Creating booking…' : hasPackage && !catalogReady ? 'Calculating package coverage…' : paymentOption === 'COLLECTION' ? `Confirm Booking • Pay ₹${total.toLocaleString('en-IN')} at Collection →` : paymentOption === 'QR' ? `Create Booking & Pay by QR / UPI • ₹${total.toLocaleString('en-IN')} →` : `Create Booking & Pay Online • ₹${total.toLocaleString('en-IN')} →`}</button>
        <small className="secureNote">{paymentOption === 'COLLECTION' ? `Booking will be confirmed now. Payment will remain pending until ${collectionPaymentMethod === 'UPI' ? 'UPI' : 'cash'} is collected.` : 'You will be taken to Razorpay secure checkout after the booking is created.'}</small>
      </form>
    </section><aside className="card orderSummary"><small>ORDER SUMMARY</small>
      {cart.map((item) => { const included = item.kind === 'test' && packageTestIds.has(item.id); return <div className="summaryRow" key={`${item.kind}-${item.id}`}><span>{item.name}<small style={{ display: 'block' }}>{included ? `Included in selected package • ${item.partnerName}` : item.kind === 'package' ? 'Health package' : `${item.partnerName} • ${item.tat||'TAT confirmed before booking'}`}</small></span><b>{included ? 'Included' : `₹${Number(item.price || 0).toLocaleString('en-IN')}`}</b></div>; })}
      {printedReport && <div className="summaryRow printRow"><span>Printed Reports<small style={{ display: 'block' }}>Delivery in 24–48 hrs</small></span><b>₹100</b></div>}
      <div className="summaryTotal"><span>Total price</span><b>₹{total.toLocaleString('en-IN')}</b></div><div className="secureSummary">{paymentOption === 'COLLECTION' ? `Payment due at sample collection by ${collectionPaymentMethod === 'UPI' ? 'UPI' : 'cash'}.` : paymentOption === 'QR' ? 'Secure QR / UPI payment through Razorpay.' : 'Secure online payment via Razorpay.'}</div>
    </aside></div>
    <style>{`body{background:#f5faf9}.dashboard{max-width:1180px;margin:0 auto;padding:28px 20px 70px}.checkoutLayout{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(300px,.75fr);gap:25px;margin-top:45px}.checkoutMain>h1{font-size:clamp(38px,5vw,60px)}.modeGrid,.twoFields{display:grid;grid-template-columns:1fr 1fr;gap:12px}.mode{border:1px solid #dce9e7;background:#fff;border-radius:15px;text-align:left;padding:18px}.mode b,.mode span{display:block}.mode.selected{border:2px solid #087f78;background:#effaf8}.bookingForm label{display:block;font-size:12px;font-weight:800;margin-top:15px}.optional{font-weight:500;color:#71817d}.field{width:100%;box-sizing:border-box}.bookingTotal{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:22px 0 14px;padding:18px;border:1px solid #b8ddd5;border-radius:14px;background:#effaf8}.bookingTotal span,.bookingTotal small{display:block}.bookingTotal span{font-weight:900;color:#12352f}.bookingTotal small{margin-top:4px;color:#647a74}.bookingTotal strong{font-size:28px;color:#087f78}.includedNotice{margin:-4px 0 14px;padding:11px 13px;border-radius:10px;background:#f2f8f7;color:#42645c;font-size:12px}.printOption{display:flex!important;align-items:flex-start;gap:12px;margin:4px 0 18px!important;padding:16px;border:1px solid #cfe6e1;border-radius:14px;background:#fff;cursor:pointer}.printOption input{width:20px;height:20px;margin:1px 0 0;accent-color:#087f78;flex:none}.printOption span,.printOption small{display:block}.printOption b{font-size:14px;color:#12352f}.printOption small{font-weight:500;margin-top:4px;color:#667a75;line-height:1.45}.paymentSection{margin:24px 0}.paymentSection h2{margin-bottom:12px}.paymentGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.paymentChoice{border:1px solid #d6e6e3;background:#fff;border-radius:14px;padding:16px;text-align:left;cursor:pointer}.paymentChoice b,.paymentChoice span{display:block}.paymentChoice b{color:#173d36;font-size:14px}.paymentChoice span{margin-top:5px;color:#6b7d79;font-size:12px;line-height:1.45}.paymentChoice.selected{border:2px solid #087f78;background:#effaf8}.collectionMethods{margin-top:12px;padding:14px;border-radius:12px;background:#f5faf9;border:1px solid #d8e9e5}.collectionMethods>span{font-size:12px;font-weight:800;color:#274f47}.collectionMethods>div{display:flex;gap:8px;margin-top:9px}.collectionMethods button{border:1px solid #cddfdb;background:#fff;border-radius:10px;padding:9px 18px;font-weight:800;cursor:pointer}.collectionMethods button.selected{border-color:#087f78;background:#087f78;color:#fff}.createBooking{margin-top:4px}.secureNote{display:block;text-align:center;margin-top:10px;color:#6b7d79}.orderSummary{height:max-content}.summaryRow,.summaryTotal{display:flex;justify-content:space-between;padding:14px 0;gap:15px}.summaryRow>b{white-space:nowrap}.printRow{border-top:1px dashed #dce9e7}.summaryTotal{border-top:1px solid #dce9e7;font-size:18px}.secureSummary{margin-top:12px;padding:12px;border-radius:10px;background:#f2f8f7;font-size:12px;line-height:1.5;color:#667a75}.flowCard{max-width:720px;margin:20px auto;padding:30px}.successCard{margin-top:55px}.flowSteps{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px}.flowSteps span{font-size:12px;font-weight:800;padding:7px 10px;border-radius:999px;background:#eef2f1;color:#6a7c78}.flowSteps .active{background:#fff4d8;color:#8a6100}.flowSteps .done{background:#e4f7f2;color:#087f78}.paidNote{margin:16px 0;padding:14px;border-radius:12px;background:#e9f8f3;color:#145c4c}.successActions{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}.errorBox{margin:18px 0;color:#8c2424}@media(max-width:850px){.checkoutLayout{grid-template-columns:1fr}.paymentGrid{grid-template-columns:1fr}}@media(max-width:560px){.modeGrid,.twoFields{grid-template-columns:1fr}.successActions .btn{width:100%;text-align:center}}`}</style>
  </main>;
}
