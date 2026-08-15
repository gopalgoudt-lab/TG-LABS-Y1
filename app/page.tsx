'use client';

import { useEffect, useMemo, useState } from 'react';

const tests = [
  ['DIABETES', 'HbA1c', 'Glycated haemoglobin test.', 350],
  ['GENERAL', 'CBC', 'Complete blood count.', 300],
  ['THYROID', 'Thyroid Profile', 'Thyroid function profile.', 450],
  ['VITAMIN', 'Vitamin D', '25-OH Vitamin D test.', 700],
  ['LIPID', 'Lipid Profile', 'Cholesterol and triglyceride profile.', 550],
  ['LIVER', 'Liver Function Test', 'Routine liver health screening.', 650],
];

const quickTests = ['HbA1c', 'CBC', 'Vitamin D', 'Thyroid'];
const packages = [
  ['Comprehensive Health', 1999, 'A broad preventive screening package.'],
  ['Diabetes Care', 999, 'Focused screening for diabetes risk and monitoring.'],
  ["Women's Health", 1499, 'Routine screening designed around women’s health.'],
];

export default function Home() {
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<string[]>([]);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem('tglabs-cart');
    if (saved) setCart(JSON.parse(saved));
  }, []);

  useEffect(() => {
    window.localStorage.setItem('tglabs-cart', JSON.stringify(cart));
  }, [cart]);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return tests;
    return tests.filter(([cat, name, desc]) =>
      `${cat} ${name} ${desc}`.toLowerCase().includes(term),
    );
  }, [query]);

  const addToCart = (name: string) => {
    setCart((current) => (current.includes(name) ? current : [...current, name]));
    setShowCart(true);
  };

  const removeFromCart = (name: string) => {
    setCart((current) => current.filter((item) => item !== name));
  };

  return (
    <>
      <header className="top">
        <div className="wrap">
          <nav aria-label="Primary navigation">
            <a className="brand" href="/" aria-label="TG Labs home">
              <span className="logo">TG</span>TG LABS
            </a>
            <div className="links">
              <a href="#tests">Tests</a>
              <a href="#packages">Packages</a>
              <a href="#booking">Home Collection</a>
              <a href="/patient">Reports</a>
            </div>
            <div className="navActions">
              <a className="btn" href="/auth">Login</a>
              <button className="btn primary" type="button" onClick={() => setShowCart(true)}>
                Cart ({cart.length})
              </button>
            </div>
          </nav>
        </div>
      </header>

      {showCart && (
        <div className="cartOverlay" role="dialog" aria-modal="true" aria-label="Your cart">
          <div className="cartPanel">
            <div className="cartHeader">
              <div><small>YOUR BASKET</small><h2>Ready to book?</h2></div>
              <button className="iconBtn" onClick={() => setShowCart(false)} aria-label="Close cart">×</button>
            </div>
            {cart.length === 0 ? (
              <div className="emptyCart">Your basket is empty. Add a test to start your booking.</div>
            ) : (
              <>
                <div className="cartItems">
                  {cart.map((name) => {
                    const test = tests.find((item) => item[1] === name);
                    return (
                      <div className="cartItem" key={name}>
                        <div><b>{name}</b><span>Diagnostic test</span></div>
                        <div><b>₹{test?.[3].toLocaleString('en-IN')}</b><button onClick={() => removeFromCart(name)}>Remove</button></div>
                      </div>
                    );
                  })}
                </div>
                <a className="btn primary full" href="/checkout" onClick={() => setShowCart(false)}>Continue to booking →</a>
              </>
            )}
          </div>
        </div>
      )}

      <main>
        <section className="hero">
          <div className="wrap heroGrid">
            <div>
              <span className="ey">TRUSTED DIAGNOSTIC CARE</span>
              <h1>Accurate diagnostics.<br /><span>Conveniently delivered.</span></h1>
              <p>Find diagnostic tests, compare health packages and book home sample collection through one simple, secure journey.</p>
              <div className="heroActions">
                <a className="btn primary" href="#tests">Book a Test →</a>
                <a className="btn" href="#packages">View Health Packages</a>
              </div>
              <div className="heroTrust"><span>✓ Home collection</span><span>✓ Digital reports</span><span>✓ Secure booking</span></div>
            </div>

            <div className="card searchCard">
              <div className="searchKicker">FAST TEST SEARCH</div>
              <h2>What test are you looking for?</h2>
              <p className="muted">Search tests, profiles and health packages.</p>
              <div className="search">
                <span className="searchIcon">⌕</span>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search HbA1c, CBC, Vitamin D..." aria-label="Search tests, packages or health checkups" />
                <a href="#tests" className="searchButton">Search</a>
              </div>
              <div className="quickSearch" aria-label="Popular searches">
                <span>Popular:</span>
                {quickTests.map((x) => <button type="button" key={x} onClick={() => setQuery(x)}>{x}</button>)}
              </div>
              <p className="searchMeta">Home collection • Centre booking • Secure payments • Digital reports</p>
            </div>
          </div>
        </section>

        <section className="trustStrip" aria-label="TG Labs service highlights">
          <div className="wrap trustGrid">
            <div><b>✓ Patient-first care</b><span>Simple, clear booking journey</span></div>
            <div><b>✓ Home sample collection</b><span>Convenient doorstep service</span></div>
            <div><b>✓ Secure booking</b><span>Choose a convenient appointment</span></div>
            <div><b>✓ Digital reports</b><span>Access reports through your portal</span></div>
          </div>
        </section>

        <section id="tests">
          <div className="wrap">
            <div className="head rowHead"><div><small>POPULAR TESTS</small><h2>Start with the tests you need.</h2><p>Search, compare and add tests to your basket.</p></div><span className="resultCount">{results.length} tests</span></div>
            <div className="grid">
              {results.map(([cat, name, desc, price]) => (
                <article className="card testCard" key={name}>
                  <span className="pill">{cat}</span>
                  <h3>{name}</h3>
                  <p>{desc}</p>
                  <div className="cardBottom"><div className="price">₹{price.toLocaleString('en-IN')}</div><button className="btn primary" type="button" onClick={() => addToCart(name)}>{cart.includes(name) ? 'Added ✓' : 'Add to Cart'}</button></div>
                </article>
              ))}
            </div>
            {results.length === 0 && <div className="notice">No matching test found. Try HbA1c, CBC, Vitamin D or Thyroid.</div>}
          </div>
        </section>

        <section id="packages" className="dark">
          <div className="wrap">
            <div className="head"><small>HEALTH PACKAGES</small><h2>Preventive care, packaged.</h2><p>Explore practical health-check options for routine preventive screening.</p></div>
            <div className="grid">
              {packages.map(([name, price, desc]) => (
                <article className="card packageCard" key={name}>
                  <span className="packageTag">HEALTH PACKAGE</span><h3>{name}</h3><p>{desc}</p><div className="price">₹{price.toLocaleString('en-IN')}</div><a className="btn primary" href="#booking">View Package →</a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="booking">
          <div className="wrap">
            <div className="head"><small>HOW IT WORKS</small><h2>From search to report, made simple.</h2><p>One clear journey from selecting a test to receiving your digital report.</p></div>
            <div className="flow simpleFlow">
              {[['01','Search','Find a test or package.'],['02','Book','Choose patient, address and slot.'],['03','Sample','Complete centre or home collection.'],['04','Report','Access your digital report.']].map(([num,title,desc]) => <div className="step" key={title}><b>{num}</b><h3>{title}</h3><p>{desc}</p></div>)}
            </div>
          </div>
        </section>

        <section className="homeCollection">
          <div className="wrap collectionGrid">
            <div><small>HOME SAMPLE COLLECTION</small><h2>We come to you.</h2><p>Choose a convenient slot and let the collection team handle the doorstep sample journey.</p><a className="btn primary" href="/checkout">Book Home Collection →</a></div>
            <div className="collectionPoints"><div><b>01</b><span>Choose your tests</span></div><div><b>02</b><span>Select address & slot</span></div><div><b>03</b><span>Sample collected at home</span></div></div>
          </div>
        </section>

        <section id="portals" className="roles">
          <div className="wrap"><div className="head"><small>CONNECTED OPERATIONS</small><h2>One platform for every part of care.</h2><p>Dedicated experiences keep patients, collection teams and administrators connected.</p></div>
            <div className="grid">
              {[['👤 Patient Portal','Appointments, orders, reports, family members, addresses and payments.','/patient'],['🧑‍🔬 Technician Portal','Mobile-first collection operations and live order status.','/technician'],['🛡️ Admin Command Centre','Orders, catalogue, technicians, payments and analytics.','/admin']].map(([name,desc,href]) => <article className="card role" key={name}><h3>{name}</h3><p>{desc}</p><ul><li>Role-protected access</li><li>Live order status</li><li>Audit-ready actions</li></ul><a className="btn primary" href={href}>Open Portal</a></article>)}
            </div>
          </div>
        </section>
      </main>

      <footer><div className="wrap foot"><div><div className="brand footerBrand"><span className="logo">TG</span>TG LABS</div><p>Diagnostics, health packages, home collection and digital reports — brought together in one patient-first experience.</p></div><div><h4>Patients</h4><a href="#tests">Tests</a><a href="#packages">Packages</a><a href="/checkout">Home Collection</a><a href="/patient">Reports</a></div><div><h4>Portals</h4><a href="/auth">Login</a><a href="/technician">Technician</a><a href="/admin">Admin</a></div><div><h4>Need help?</h4><p>Use the booking journey or sign in to manage appointments, orders and reports.</p></div></div></footer>
    </>
  );
}
