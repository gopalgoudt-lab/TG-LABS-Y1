const tests = [
  ['DIABETES', 'HbA1c', 'Glycated haemoglobin test.', '₹350'],
  ['THYROID', 'Thyroid Profile', 'Thyroid function profile.', '₹450'],
  ['VITAMIN', 'Vitamin D', '25-OH Vitamin D test.', '₹700'],
];

const quickTests = ['HbA1c', 'CBC', 'Vitamin D', 'Thyroid'];
const packages = [
  ['Comprehensive Health', '₹1,999'],
  ['Diabetes Care', '₹999'],
  ["Women's Health", '₹1,499'],
];

export default function Home() {
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
              <a href="#portals">Reports</a>
            </div>
            <div className="navActions">
              <a className="btn" href="/auth">Login</a>
              <a className="btn primary" href="/patient">Cart (0)</a>
            </div>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="wrap heroGrid">
            <div>
              <span className="ey">TRUSTED DIAGNOSTIC CARE</span>
              <h1>Accurate diagnostics. <span>Conveniently delivered.</span></h1>
              <p>
                Find diagnostic tests, compare health packages and book home sample collection through a simple, secure journey.
              </p>
              <div className="heroActions">
                <a className="btn primary" href="#tests">Book a Test →</a>
                <a className="btn" href="#packages">View Health Packages</a>
              </div>
            </div>

            <div className="card searchCard">
              <h2>What test are you looking for?</h2>
              <p className="muted">Search tests, profiles and health packages.</p>
              <div className="search">
                <input
                  placeholder="Search tests, packages or health checkups..."
                  aria-label="Search tests, packages or health checkups"
                />
                <a href="#tests" className="searchButton">Search</a>
              </div>
              <div className="quickSearch" aria-label="Popular searches">
                <span>Popular:</span>
                {quickTests.map((x) => <a href="#tests" key={x}>{x}</a>)}
              </div>
              <p className="searchMeta">Home collection • Centre booking • Secure payments • Digital reports</p>
            </div>
          </div>
        </section>

        <section className="trustStrip" aria-label="TG Labs service highlights">
          <div className="wrap trustGrid">
            <div><b>✓ Trusted diagnostic care</b><span>Clear, patient-first experience</span></div>
            <div><b>✓ Home sample collection</b><span>Convenient doorstep service</span></div>
            <div><b>✓ Secure booking</b><span>Simple online appointment journey</span></div>
            <div><b>✓ Digital reports</b><span>Access reports through your portal</span></div>
          </div>
        </section>

        <section id="tests">
          <div className="wrap">
            <div className="head">
              <small>POPULAR TESTS</small>
              <h2>Start with the tests you need.</h2>
              <p>Choose a test, add it to your basket and continue to booking.</p>
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
              <p>Explore practical health-check options for routine preventive screening.</p>
            </div>
            <div className="grid">
              {packages.map(([n, p]) => (
                <div className="card" key={n}>
                  <h3>{n}</h3>
                  <div className="price">{p}</div>
                  <p>View the package details, included tests and booking options.</p>
                  <button className="btn primary" type="button">View Package</button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="booking">
          <div className="wrap">
            <div className="head">
              <small>HOW IT WORKS</small>
              <h2>From search to report, made simple.</h2>
              <p>One clear journey from selecting a test to receiving your digital report.</p>
            </div>
            <div className="flow simpleFlow">
              {[
                ['01', 'Search', 'Find a test or package.'],
                ['02', 'Book', 'Choose patient, address and slot.'],
                ['03', 'Sample', 'Complete centre or home collection.'],
                ['04', 'Report', 'Access your digital report.'],
              ].map(([num, title, desc]) => (
                <div className="step" key={title}>
                  <b>{num}</b>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="portals" className="roles">
          <div className="wrap">
            <div className="head">
              <small>CONNECTED OPERATIONS</small>
              <h2>One platform for every part of care.</h2>
              <p>Dedicated experiences keep patients, collection teams and administrators connected.</p>
            </div>
            <div className="grid">
              {[
                ['👤 Patient Portal', 'Appointments, orders, reports, family members, addresses and payments.', '/patient'],
                ['🧑‍🔬 Technician Portal', 'Mobile-first collection operations and live order status.', '/technician'],
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
                  <a className="btn primary" href={href}>Open Portal</a>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap foot">
          <div>
            <div className="brand footerBrand"><span className="logo">TG</span>TG LABS</div>
            <p>Diagnostics, health packages, home collection and digital reports — brought together in one patient-first experience.</p>
          </div>
          <div>
            <h4>Patients</h4>
            <a href="#tests">Tests</a>
            <a href="#packages">Packages</a>
            <a href="#booking">Home Collection</a>
            <a href="/patient">Reports</a>
          </div>
          <div>
            <h4>Portals</h4>
            <a href="/auth">Login</a>
            <a href="/technician">Technician</a>
            <a href="/admin">Admin</a>
          </div>
          <div>
            <h4>Need help?</h4>
            <p>Use the booking journey above or sign in to manage your appointments, orders and reports.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
