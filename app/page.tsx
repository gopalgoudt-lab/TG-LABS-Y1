const tests = [
  ['DIABETES', 'HbA1c', 'Glycated haemoglobin test.', '₹350'],
  ['THYROID', 'Thyroid Profile', 'Thyroid function profile.', '₹450'],
  ['VITAMIN', 'Vitamin D', '25-OH Vitamin D test.', '₹700'],
];

export default function Home() {
  return (
    <>
      <header className="top">
        <div className="wrap">
          <nav aria-label="Primary navigation">
            <div className="brand">
              <span className="logo">TG</span>TG LABS
            </div>
            <div className="links">
              <a href="#tests">Tests</a>
              <a href="#packages">Packages</a>
              <a href="#booking">Home Collection</a>
              <a href="#portals">Reports</a>
            </div>
            <div>
              <a className="btn" href="/auth">Login</a>{' '}
              <a className="btn primary" href="/patient">Cart (0)</a>
            </div>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="wrap heroGrid">
            <div>
              <span className="ey">V6.1 · PRODUCTION LAUNCH</span>
              <h1>Diagnostics that move at the <span>speed of care.</span></h1>
              <p>
                Discover tests, explore health packages, arrange home collection and move through a clear booking journey — with dedicated patient, technician and admin portals.
              </p>
              <a className="btn primary" href="#tests">Book a Test →</a>{' '}
              <a className="btn" href="#packages">Explore Packages</a>
            </div>

            <div className="card">
              <h2>Find a diagnostic test</h2>
              <p style={{ color: 'var(--mut)' }}>
                Search tests, profiles and health packages.
              </p>
              <div className="search">
                <input
                  placeholder="HbA1c, CBC, Vitamin D, Thyroid..."
                  aria-label="Search tests"
                />
                <button type="button">Search</button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--mut)' }}>
                Home collection • Centre booking • Secure payments • Digital reports
              </p>
            </div>
          </div>
        </section>

        <section id="tests">
          <div className="wrap">
            <div className="head">
              <small>TEST STORE</small>
              <h2>Build your booking basket.</h2>
              <p>Production catalogue and pricing can be connected to the backend without changing the customer-facing flow.</p>
            </div>
            <div className="grid">
              {tests.map(([cat, name, desc, price]) => (
                <div className="card" key={name}>
                  <span className="pill">{cat}</span>
                  <h3>{name}</h3>
                  <p>{desc}</p>
                  <div className="price">{price}</div>
                  <button className="btn primary" type="button">Add to Cart</button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="packages" className="dark">
          <div className="wrap">
            <div className="head">
              <small style={{ color: '#73ddd4' }}>HEALTH PACKAGES</small>
              <h2>Preventive care, packaged.</h2>
              <p>Package cards are ready for connection to the production catalogue.</p>
            </div>
            <div className="grid">
              {[
                ['Comprehensive Health', '₹1,999'],
                ['Diabetes Care', '₹999'],
                ["Women's Health", '₹1,499'],
              ].map(([n, p]) => (
                <div className="card" key={n}>
                  <h3>{n}</h3>
                  <div className="price">{p}</div>
                  <p>Verified package content will be supplied by the configured catalogue.</p>
                  <button className="btn primary" type="button">View Package</button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="booking">
          <div className="wrap">
            <div className="head">
              <small>BOOKING ENGINE</small>
              <h2>One order. Fully traceable.</h2>
            </div>
            <div className="flow">
              {['Cart', 'OTP / Patient', 'Address', 'Serviceability', 'Slot', 'Payment', 'Confirmation'].map((x, i) => (
                <div className="step" key={x}>
                  <b>{String(i + 1).padStart(2, '0')}</b>
                  <p>{x}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="portals" className="roles">
          <div className="wrap">
            <div className="head">
              <small>CONNECTED OPERATIONS</small>
              <h2>Three portals. One order lifecycle.</h2>
            </div>
            <div className="grid">
              {[
                ['👤 Patient Portal', 'Appointments, orders, reports, family members, addresses and payments.', '/patient'],
                ['🧑‍🔬 Technician Portal', 'Mobile-first collection operations.', '/technician'],
                ['🛡️ Admin Command Centre', 'Orders, catalogue, technicians, payments and analytics.', '/admin'],
              ].map(([n, d, href]) => (
                <div className="card role" key={n}>
                  <h3>{n}</h3>
                  <p>{d}</p>
                  <ul>
                    <li>Role-protected access</li>
                    <li>Live order status</li>
                    <li>Audit-ready actions</li>
                  </ul>
                  <a className="btn primary" href={href}>Open</a>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap foot">
          <div>
            <div className="brand" style={{ color: '#fff' }}>TG LABS</div>
            <p>V6.1 production launch build for the TG Labs commercial diagnostic experience.</p>
          </div>
          <div>
            <h4>Patients</h4>
            <a href="#tests">Tests</a>
            <a href="#packages">Packages</a>
            <a href="#booking">Home Collection</a>
          </div>
          <div>
            <h4>Operations</h4>
            <a href="/technician">Technician</a>
            <a href="/admin">Admin</a>
            <a href="/patient">Reports</a>
          </div>
          <div>
            <h4>Launch</h4>
            <p>Web shell, production metadata, sitemap, robots policy and deployment health endpoint are included in V6.1.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
