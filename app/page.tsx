import { Suspense } from 'react';
import BrandLogo from '@/components/BrandLogo';
import CatalogFilters from '@/components/catalog/CatalogFilters';
import CatalogBrowser from '@/components/catalog/CatalogBrowser';
import CartNav from '@/components/catalog/CartNav';

const categories = [
  ['◉', 'Diabetes', 'Glucose, HbA1c & metabolic checks', 'diabetes'],
  ['✦', 'Thyroid', 'TSH, T3, T4 & thyroid profiles', 'thyroid'],
  ['♀', "Women's Health", 'Hormonal, wellness & preventive tests', 'women'],
  ['♂', "Men's Health", 'Preventive and metabolic screening', 'men'],
  ['♡', 'Senior Care', 'Routine health checks for older adults', 'senior'],
];

const popular = [
  ['Complete Blood Count (CBC)', 'Routine blood health screening', '₹300', 'cbc'],
  ['Thyroid Profile', 'Thyroid hormone screening', 'View options', 'thyroid'],
  ['Diabetes Screening', 'Glucose and HbA1c focused checks', 'View options', 'diabetes'],
];

const labs = [
  ['TG Labs', 'Home collection focused diagnostic service', 'Bookable where serviceable', '/?q=TG%20Labs#catalog'],
  ['Sagepath Labs', 'Partner catalog for transparent comparison', 'Display-only where applicable', '/compare/labs'],
  ['Thyrocare', 'Large preventive diagnostics network', 'Display-only where applicable', '/compare/labs'],
];

export default function Home() {
  return (
    <main>
      <div className="utilityBar">
        <div className="marketWrap utilityInner">
          <span>Home sample collection</span>
          <span>Verified partner catalog</span>
          <span>Transparent test comparison</span>
        </div>
      </div>

      <header className="marketHeader">
        <div className="marketWrap marketNav">
          <a href="/" className="marketBrand" aria-label="TG Labs home">
            <BrandLogo priority />
          </a>
          <nav className="marketLinks" aria-label="Primary navigation">
            <a href="#categories">Health Categories</a>
            <a href="#catalog">Tests & Packages</a>
            <a href="/compare/labs">Compare Labs</a>
            <a href="#partners">Partner Labs</a>
          </nav>
          <div className="marketActions">
            <a className="outlineBtn" href="#catalog">Book a Test</a>
            <a className="navLogin" href="/auth">Patient Login</a>
            <span className="navCart"><CartNav /></span>
          </div>
        </div>
      </header>

      <section className="marketHero">
        <div className="marketWrap heroLayout">
          <div className="heroCopy">
            <span className="kicker">TG LABS • SMART DIAGNOSTIC DISCOVERY</span>
            <h1>Healthcare testing made <em>clear, simple and convenient.</em></h1>
            <p>Search tests and health packages, compare eligible laboratory options, and book home sample collection with a clean, transparent experience.</p>
            <form className="heroSearch" action="/" method="get">
              <span aria-hidden="true">⌕</span>
              <input name="q" type="search" placeholder="Search CBC, thyroid, diabetes, vitamins…" aria-label="Search tests and packages" />
              <button type="submit">Search Tests</button>
            </form>
            <div className="popularLine">Popular: <a href="/?q=CBC#catalog">CBC</a> <a href="/?q=Thyroid#catalog">Thyroid</a> <a href="/?q=Vitamin#catalog">Vitamins</a> <a href="/?q=Diabetes#catalog">Diabetes</a></div>
            <div className="heroTrustRow">
              <span>✓ Home collection</span><span>✓ Trusted lab partners</span><span>✓ Secure patient access</span>
            </div>
          </div>
          <aside className="heroServiceCard" aria-label="How TG Labs works">
            <span className="networkBadge">SMART LAB NETWORK</span>
            <div className="medicalPlus">✚</div>
            <h3>Your test journey, from search to report.</h3>
            <ol>
              <li><b>1</b><span>Search a test or package</span></li>
              <li><b>2</b><span>Compare eligible lab options</span></li>
              <li><b>3</b><span>Choose home or centre collection</span></li>
              <li><b>4</b><span>Track booking and access reports</span></li>
            </ol>
            <div className="serviceMeta"><span>Simple booking</span><span>Secure reports</span></div>
          </aside>
        </div>
      </section>

      <section id="categories" className="discoverSection">
        <div className="marketWrap">
          <div className="sectionTop"><div><span className="kicker">DISCOVER BY HEALTH NEED</span><h2>Find the right starting point.</h2><p>Browse common screening needs without needing to know the exact test name.</p></div><a className="outlineBtn" href="#catalog">View all tests</a></div>
          <div className="categoryGrid">
            {categories.map(([icon, title, text, q]) => <a key={title} className="categoryCard" href={`/?q=${encodeURIComponent(q)}#catalog`}><span>{icon}</span><b>{title}</b><small>{text}</small><i>→</i></a>)}
          </div>
        </div>
      </section>

      <section className="popularChecks">
        <div className="marketWrap">
          <div className="sectionTop"><div><span className="kicker">POPULAR CHECKS</span><h2>Frequently searched tests.</h2><p>Quick access to everyday diagnostic needs.</p></div></div>
          <div className="healthGrid">
            {popular.map(([name, desc, price, q]) => <article className="healthCard" key={name}><div className="healthLabels"><span>POPULAR</span><b>HOME COLLECTION</b></div><h3>{name}</h3><p>{desc}</p><div className="healthMeta">Compare available lab options before booking.</div><div className="healthBottom"><div><small>Starting / reference</small><strong>{price}</strong></div><a className="outlineBtn" href={`/?q=${encodeURIComponent(q)}#catalog`}>View</a></div></article>)}
          </div>
        </div>
      </section>

      <section id="partners" className="labPartnerSection">
        <div className="marketWrap">
          <div className="sectionTop"><div><span className="kicker">PARTNER LAB NETWORK</span><h2>One place to compare trusted labs.</h2><p>Partner availability and booking eligibility remain controlled by serviceability and operational readiness.</p></div><a className="outlineBtn" href="/compare/labs">Compare labs</a></div>
          <div className="labGrid">
            {labs.map(([name, desc, status, href]) => <article className="labCard" key={name}><div className="labInitial">{name.split(' ').map(x=>x[0]).join('').slice(0,2)}</div><h3>{name}</h3><b>{status}</b><p>{desc}</p><div className="labStats"><span>Catalog<strong>Transparent</strong></span><span>Access<strong>Eligibility-based</strong></span></div><a href={href}>Explore {name}</a></article>)}
          </div>
          <p className="partnerNote">TG Labs presents partner information for comparison. Actual booking depends on active offers, serviceability and partner readiness.</p>
        </div>
      </section>

      <section className="responsibility">
        <div className="marketWrap">
          <span className="kicker lightKicker">HOME COLLECTION JOURNEY</span><h2>Simple from booking to report.</h2>
          <div className="stepsRow"><div><b>1</b><span>Choose test</span></div><div><b>2</b><span>Select collection</span></div><div><b>3</b><span>Sample collected</span></div><div><b>4</b><span>Lab processing</span></div><div><b>5</b><span>View report securely</span></div></div>
        </div>
      </section>

      <section className="trustSection">
        <div className="marketWrap trustLayout">
          <div><span className="kicker">TRUST & QUALITY</span><h2>Designed around verified diagnostics.</h2><p>TG Labs is building a partner network around accredited diagnostic providers, clear patient communication and secure digital report access.</p></div>
          <div className="trustCards"><div><strong>NABL-focused</strong><span>Partner strategy prioritises accredited laboratories.</span></div><div><strong>Secure access</strong><span>Patient reports stay behind authenticated access.</span></div><div><strong>Transparent choices</strong><span>See partner and service eligibility before booking.</span></div></div>
        </div>
      </section>

      <section id="catalog" className="catalogPremiumSection">
        <div className="marketWrap">
          <div className="sectionTop"><div><span className="kicker">LIVE CATALOG</span><h2>Search current tests & packages.</h2><p>Use filters, check your pincode and add eligible products to your cart.</p></div></div>
          <Suspense fallback={<div className="catalogState">Loading catalog…</div>}><CatalogFilters/><CatalogBrowser/></Suspense>
        </div>
      </section>

      <section className="homeCta"><div className="marketWrap homeCtaInner"><div><span className="kicker lightKicker">READY TO BOOK?</span><h2>Start with the test you need today.</h2><p>Search the live catalog and check home collection availability for your pincode.</p></div><a href="#catalog">Explore Tests →</a></div></section>

      <footer className="marketFooter">
        <div className="marketWrap footerGrid">
          <div><BrandLogo variant="footer" className="footerLogoImage"/><p>Diagnostic discovery, home collection and secure patient report access through TG Labs and eligible partner laboratories.</p></div>
          <div><b>Explore</b><a href="#catalog">Tests & Packages</a><a href="/compare/labs">Compare Labs</a><a href="#categories">Health Categories</a></div>
          <div><b>Patients</b><a href="/auth">Login</a><a href="/cart">Cart</a><a href="#catalog">Book a Test</a></div>
          <div><b>TG Labs</b><a href="#partners">Partner Network</a><a href="#categories">Preventive Health</a><a href="#catalog">Home Collection</a></div>
        </div>
      </footer>
      <a className="floatingBook" href="#catalog">Book a Test</a>
    </main>
  );
}
