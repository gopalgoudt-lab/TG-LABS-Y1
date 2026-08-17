'use client';

import { useEffect, useMemo, useState } from 'react';

type CatalogTest = {
  id: string; slug: string; name: string; description?: string | null; mrp: number; price: number;
  diagnosticPartner?: string | null; tat?: string | null; fastingNeeded: boolean; sampleTypes: string[];
};
type CatalogPackage = CatalogTest & { tests: { id: string; name: string; slug: string }[] };
type CartItem = { kind: 'test' | 'package'; id: string; name: string; price: number };

const quickTests = ['HbA1c', 'CBC', 'Vitamin D', 'Thyroid'];

export default function Home() {
  const [query, setQuery] = useState('');
  const [tests, setTests] = useState<CatalogTest[]>([]);
  const [packages, setPackages] = useState<CatalogPackage[]>([]);
  const [catalogError, setCatalogError] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    fetch('/api/catalog', { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Unable to load catalogue.');
        setTests(d.tests || []);
        setPackages(d.packages || []);
      })
      .catch((e) => setCatalogError(e instanceof Error ? e.message : 'Unable to load catalogue.'));
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem('tglabs-cart');
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.every((x) => x && typeof x === 'object' && 'kind' in x)) setCart(parsed);
    } catch { window.localStorage.removeItem('tglabs-cart'); }
  }, []);

  useEffect(() => { window.localStorage.setItem('tglabs-cart', JSON.stringify(cart)); }, [cart]);

  const filteredTests = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return tests;
    return tests.filter((t) => `${t.name} ${t.description || ''} ${t.diagnosticPartner || ''}`.toLowerCase().includes(term));
  }, [query, tests]);

  const filteredPackages = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return packages;
    return packages.filter((p) => `${p.name} ${p.description || ''} ${p.tests.map((t) => t.name).join(' ')}`.toLowerCase().includes(term));
  }, [query, packages]);

  const addToCart = (item: CartItem) => {
    setCart((current) => current.some((x) => x.kind === item.kind && x.id === item.id) ? current : [...current, item]);
    setShowCart(true);
  };
  const removeFromCart = (item: CartItem) => setCart((current) => current.filter((x) => !(x.kind === item.kind && x.id === item.id)));
  const inCart = (kind: CartItem['kind'], id: string) => cart.some((x) => x.kind === kind && x.id === id);
  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  return (
    <>
      <header className="top"><div className="wrap"><nav aria-label="Primary navigation"><a className="brand" href="/" aria-label="TG Labs home"><span className="logo">TG</span>TG LABS</a><div className="links"><a href="#tests">Tests</a><a href="#packages">Packages</a><a href="#booking">Home Collection</a><a href="/patient">Reports</a></div><div className="navActions"><a className="btn" href="/auth">Login</a><button className="btn primary" type="button" onClick={() => setShowCart(true)}>Cart ({cart.length})</button></div></nav></div></header>

      {showCart && <div className="cartOverlay" role="dialog" aria-modal="true" aria-label="Your cart"><div className="cartPanel"><div className="cartHeader"><div><small>YOUR BASKET</small><h2>Ready to book?</h2></div><button className="iconBtn" type="button" onClick={() => setShowCart(false)} aria-label="Close cart">×</button></div>{cart.length === 0 ? <div className="emptyCart">Your basket is empty. Add a test or package to start your booking.</div> : <><div className="cartItems">{cart.map((item) => <div className="cartItem" key={`${item.kind}-${item.id}`}><div><b>{item.name}</b><span>{item.kind === 'package' ? 'Health package' : 'Diagnostic test'}</span></div><div><b>₹{item.price.toLocaleString('en-IN')}</b><button type="button" onClick={() => removeFromCart(item)}>Remove</button></div></div>)}</div><div className="summaryTotal"><span>Total</span><b>₹{cartTotal.toLocaleString('en-IN')}</b></div><a className="btn primary full" href="/checkout" onClick={() => setShowCart(false)}>Continue to booking →</a></>}</div></div>}

      <main>
        <section className="hero"><div className="wrap heroGrid"><div><span className="ey">TRUSTED DIAGNOSTIC CARE</span><h1>Accurate diagnostics.<br /><span>Conveniently delivered.</span></h1><p>Find diagnostic tests, compare health packages and book home sample collection through one simple, secure journey.</p><div className="heroActions"><a className="btn primary" href="#tests">Book a Test →</a><a className="btn" href="#packages">View Health Packages</a></div><div className="heroTrust"><span>✓ Home collection</span><span>✓ Digital reports</span><span>✓ Secure booking</span></div></div><div className="card searchCard"><div className="searchKicker">FAST TEST SEARCH</div><h2>What test are you looking for?</h2><p className="muted">Search tests, profiles and health packages.</p><div className="search"><span className="searchIcon">⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search HbA1c, CBC, Vitamin D..." aria-label="Search tests, packages or health checkups" /><a href="#tests" className="searchButton">Search</a></div><div className="quickSearch" aria-label="Popular searches"><span>Popular:</span>{quickTests.map((x) => <button type="button" key={x} onClick={() => setQuery(x)}>{x}</button>)}</div><p className="searchMeta">Home collection • Centre booking • Secure payments • Digital reports</p></div></div></section>

        <section className="trustStrip" aria-label="TG Labs service highlights"><div className="wrap trustGrid"><div><b>✓ Patient-first care</b><span>Simple, clear booking journey</span></div><div><b>✓ Home sample collection</b><span>Convenient doorstep service</span></div><div><b>✓ Secure booking</b><span>Choose a convenient appointment</span></div><div><b>✓ Digital reports</b><span>Access reports through your portal</span></div></div></section>

        <section id="tests"><div className="wrap"><div className="head rowHead"><div><small>POPULAR TESTS</small><h2>Start with the tests you need.</h2><p>Live tests and pricing from the TG Labs diagnostic catalogue.</p></div><span className="resultCount">{filteredTests.length} tests</span></div>{catalogError && <div className="notice">{catalogError}</div>}<div className="grid">{filteredTests.map((test) => <article className="card testCard" key={test.id}><span className="pill">DIAGNOSTIC TEST</span><h3>{test.name}</h3><p>{test.description || 'Diagnostic test.'}</p>{test.tat && <p className="muted">TAT: {test.tat}{test.fastingNeeded ? ' • Fasting required' : ''}</p>}<div className="cardBottom"><div className="price">₹{test.price.toLocaleString('en-IN')}</div><button className="btn primary" type="button" onClick={() => addToCart({ kind: 'test', id: test.id, name: test.name, price: test.price })}>{inCart('test', test.id) ? 'Added ✓' : 'Add to Cart'}</button></div></article>)}</div>{!catalogError && filteredTests.length === 0 && <div className="notice">No matching test found.</div>}</div></section>

        <section id="packages" className="dark"><div className="wrap"><div className="head"><small>HEALTH PACKAGES</small><h2>Preventive care, packaged.</h2><p>Live package pricing and included tests from the production catalogue.</p></div><div className="grid">{filteredPackages.map((pkg) => <article className="card packageCard" key={pkg.id}><span className="packageTag">HEALTH PACKAGE</span><h3>{pkg.name}</h3><p>{pkg.description || `${pkg.tests.length} diagnostic tests included.`}</p><p className="muted">Includes: {pkg.tests.map((t) => t.name).join(', ')}</p>{pkg.mrp > pkg.price && <div className="muted">MRP <s>₹{pkg.mrp.toLocaleString('en-IN')}</s></div>}<div className="price">₹{pkg.price.toLocaleString('en-IN')}</div><button className="btn primary" type="button" onClick={() => addToCart({ kind: 'package', id: pkg.id, name: pkg.name, price: pkg.price })}>{inCart('package', pkg.id) ? 'Added ✓' : 'Add Package →'}</button></article>)}</div>{!catalogError && filteredPackages.length === 0 && <div className="notice">No matching health package found.</div>}</div></section>

        <section id="booking"><div className="wrap"><div className="head"><small>HOW IT WORKS</small><h2>From search to report, made simple.</h2><p>One clear journey from selecting a test to receiving your digital report.</p></div><div className="flow simpleFlow">{[['01','Search','Find a test or package.'],['02','Book','Choose patient, address and slot.'],['03','Sample','Complete centre or home collection.'],['04','Report','Access your digital report.']].map(([num,title,desc]) => <div className="step" key={title}><b>{num}</b><h3>{title}</h3><p>{desc}</p></div>)}</div></div></section>

        <section className="homeCollection"><div className="wrap collectionGrid"><div><small>HOME SAMPLE COLLECTION</small><h2>We come to you.</h2><p>Choose a convenient slot and let the collection team handle the doorstep sample journey.</p><a className="btn primary" href="/checkout">Book Home Collection →</a></div><div className="collectionPoints"><div><b>01</b><span>Choose your tests</span></div><div><b>02</b><span>Select address &amp; slot</span></div><div><b>03</b><span>Sample collected at home</span></div></div></div></section>

        <section id="portals" className="roles"><div className="wrap"><div className="head"><small>CONNECTED OPERATIONS</small><h2>One platform for every part of care.</h2><p>Dedicated experiences keep patients, collection teams and administrators connected.</p></div><div className="grid">{[['👤 Patient Portal','Appointments, orders, reports, family members, addresses and payments.','/patient'],['🧑‍🔬 Technician Portal','Mobile-first collection operations and live order status.','/technician'],['🛡️ Admin Command Centre','Orders, catalogue, technicians, payments and analytics.','/admin']].map(([name,desc,href]) => <article className="card role" key={name}><h3>{name}</h3><p>{desc}</p><ul><li>Role-protected access</li><li>Live order status</li><li>Audit-ready actions</li></ul><a className="btn primary" href={href}>Open Portal</a></article>)}</div></div></section>
      </main>

      <footer><div className="wrap foot"><div><div className="brand footerBrand"><span className="logo">TG</span>TG LABS</div><p>Diagnostics, health packages, home collection and digital reports — brought together in one patient-first experience.</p></div><div><h4>Patients</h4><a href="#tests">Tests</a><a href="#packages">Packages</a><a href="/checkout">Home Collection</a><a href="/patient">Reports</a></div><div><h4>Portals</h4><a href="/auth">Login</a><a href="/technician">Technician</a><a href="/admin">Admin</a></div><div><h4>Need help?</h4><p>Use the booking journey or sign in to manage appointments, orders and reports.</p></div></div></footer>
    </>
  );
}
