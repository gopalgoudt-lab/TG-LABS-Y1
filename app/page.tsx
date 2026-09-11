import { Suspense } from 'react';
import Image from 'next/image';
import BrandLogo from '@/components/BrandLogo';
import CatalogFilters from '@/components/catalog/CatalogFilters';
import CatalogBrowser from '@/components/catalog/CatalogBrowser';
import '@/app/homepage-reference.css';

const packages = [
  ['Aarogyam Pro', 'Full Body Checkup', '70+ Tests', 'Fasting Required', '🩺', 'full body'],
  ['Executive Health Check', 'For Men', '80+ Tests', 'Fasting Required', '👨', 'men health'],
  ['Executive Health Check', 'For Women', '80+ Tests', 'Fasting Required', '👩', 'women health'],
  ['Diabetes Care Package', 'Preventive Screening', '50+ Tests', 'Fasting Required', '🩸', 'diabetes'],
  ['Thyroid Profile', 'T3, T4, TSH', '3 Tests', 'Fasting Not Required', '🦋', 'thyroid'],
  ['Vitamin D (25-OH)', 'Vitamin Screening', '1 Test', 'Fasting Not Required', '☀️', 'vitamin d'],
];

export default function Home() {
  return (
    <main className="refHome refHomeExact">
      <header className="refHeader">
        <div className="refWrap refNav">
          <a href="/" className="refBrand" aria-label="TG Labs home"><BrandLogo priority /></a>
          <nav className="refLinks" aria-label="Primary navigation">
            <a href="/">Home</a>
            <a href="#catalog">Tests</a>
            <a href="/packages/full-body-checkup">Packages</a>
            <a href="/compare/labs">Partners</a>
            <a href="#services">Health Blog</a>
            <a href="/contact-us">About</a>
          </nav>
          <div className="refNavMeta">
            <div className="refMetaBox"><span>⌖</span><div><b>Hyderabad</b><small>Change</small></div></div>
            <div className="refMetaBox"><span>☎</span><div><b>+91 98765 43210</b><small>Call us</small></div></div>
            <a className="refLogin" href="/auth">Login</a>
            <a className="refBook" href="#catalog">Book Now</a>
          </div>
        </div>
      </header>

      <section className="refHero refHeroExact">
        <div className="refWrap refHeroGrid">
          <div className="refHeroCopy">
            <span className="refTrustBadge">✹ NABL TRUSTED LABS</span>
            <h1>Your Health<span>Our Priority</span></h1>
            <p>Book diagnostic tests from trusted NABL labs.<br/>Home sample collection. Affordable prices.<br/>Accurate reports. A healthier tomorrow.</p>
            <form className="refSearch" action="/" method="get">
              <span>⌕</span>
              <input name="q" type="search" placeholder="Search for tests, packages or health conditions..." aria-label="Search tests and packages" />
              <button type="submit">Search Tests</button>
            </form>
            <div className="refPopular">Popular searches:
              <a href="/?q=CBC#catalog">CBC</a>
              <a href="/?q=Thyroid#catalog">Thyroid Profile</a>
              <a href="/?q=Diabetes#catalog">Diabetes</a>
              <a href="/?q=Vitamin%20D#catalog">Vitamin D</a>
              <a href="/?q=Lipid#catalog">Lipid Profile</a>
              <a href="/?q=full%20body#catalog">Full Body Checkup</a>
            </div>
          </div>

          <div className="refFamilyVisual refFamilyPhoto" aria-label="Healthy family choosing diagnostic care">
            <Image src="/home/family-health-reference.jpg" alt="Healthy family for TG Labs diagnostic care" fill priority sizes="(max-width: 760px) 100vw, 430px" />
          </div>

          <aside className="refHeroNotes" aria-label="TG Labs benefits">
            <div className="refHeroNote"><span>⌂</span><b>Home Sample<br/>Collection</b></div>
            <div className="refHeroNote"><span>♢</span><b>NABL Trusted<br/>Labs</b></div>
            <div className="refHeroNote"><span>₹</span><b>Pay at<br/>Collection</b></div>
            <div className="refHeroNote"><span>▤</span><b>View & Download<br/>Reports</b></div>
            <div className="refHeroScribble">Healthy<br/>Families<br/>Tomorrows</div>
          </aside>
        </div>
      </section>

      <section className="refPartnerStrip" aria-label="Diagnostic partner network">
        <div className="refWrap refPartnerGrid">
          <div className="refPartnerItem ownLab"><BrandLogo/><span>TG Labs<br/><small>Our Own Lab</small></span></div>
          <div className="refPartnerItem"><img src="/partners/thyrocare.svg" alt="Thyrocare" /></div>
          <div className="refPartnerItem"><img src="/partners/sagepath-labs.svg" alt="Sagepath Diagnostics" /></div>
          <div className="refPartnerItem"><img src="/partners/dr-lal-pathlabs.svg" alt="Dr Lal PathLabs" /></div>
          <div className="refPartnerItem"><span>✹</span><span>NABL<br/><small>Accredited Labs</small></span></div>
          <div className="refPartnerItem"><span>♧</span><span>Affordable<br/><small>Pricing</small></span></div>
          <div className="refPartnerItem"><span>◉</span><span>Dedicated<br/><small>Support</small></span></div>
        </div>
      </section>

      <section className="refPackages refPackagesExact">
        <div className="refWrap">
          <div className="refSectionHead"><h2>Popular Health Packages</h2><a href="#catalog">View All Packages →</a></div>
          <div className="refPackageGrid">
            {packages.map(([title, subtitle, tests, fasting, icon, query], index) => (
              <article className="refPackageCard" key={`${title}-${subtitle}`}>
                <div className="refPackageTitleRow"><h3>{title}<br/><small>{subtitle}</small></h3><div className="refPackageIcon" aria-hidden="true">{icon}</div></div>
                <div className="refPackageMeta"><span>▤ {tests}</span><span>♨ {fasting}</span></div>
                <div className="refPackagePrice"><div><small>Compare live partner prices</small><strong>Live Price</strong><em>{index < 3 ? 'Popular' : 'Recommended'}</em></div><a href={`/?q=${encodeURIComponent(query)}#catalog`}>Book Now</a></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="refServiceStrip">
        <div className="refWrap refServiceGrid">
          <div className="refServiceItem"><span>🚚</span><div><b>Home Sample Collection</b><small>Safe. Convenient. Reliable.</small></div></div>
          <div className="refServiceItem"><span>▤</span><div><b>Accurate Reports</b><small>Digital reports with lab validation.</small></div></div>
          <div className="refServiceItem"><span>♢</span><div><b>Trusted & Secure</b><small>Your data is safe with us.</small></div></div>
          <div className="refServiceItem"><span>♧</span><div><b>Customer Support</b><small>We're here to help.</small></div></div>
        </div>
      </section>

      <section className="refCta">
        <div className="refWrap refCtaInner">
          <div className="refLeaf">🍃</div>
          <div className="refCtaCopy"><h2>Book. Test. Stay Healthy.</h2><p>Because prevention is better than cure.</p></div>
          <div className="refCtaTrust"><span>▣ Easy Booking</span><span>♢ Trusted Labs</span><span>₹ Great Prices</span><span>♡ Better Health</span></div>
          <a href="#catalog">Book a Test Now →</a>
        </div>
      </section>

      <section id="catalog" className="refLiveCatalog">
        <div className="refWrap">
          <div className="refSectionHead"><div><h2>Search Tests & Packages</h2><div className="refCatalogIntro">Browse the live TG Labs catalog, compare available partner options and check serviceability before booking.</div></div></div>
          <Suspense fallback={<div className="catalogState">Loading catalog…</div>}><CatalogFilters/><CatalogBrowser/></Suspense>
        </div>
      </section>

      <footer className="refFooter">
        <div className="refWrap refFooterGrid">
          <div><BrandLogo variant="footer"/><p>Diagnostic discovery, home sample collection and secure digital reports through TG Labs and eligible partner laboratories.</p></div>
          <div><b>Explore</b><a href="#catalog">Tests & Packages</a><a href="/compare/labs">Partner Labs</a><a href="#services">Home Collection</a></div>
          <div><b>Patients</b><a href="/auth">Login</a><a href="/cart">Cart</a><a href="#catalog">Book a Test</a></div>
          <div><b>Support</b><a href="/contact-us">Contact Us</a><a href="/privacy-policy">Privacy</a><a href="/terms">Terms</a></div>
        </div>
      </footer>
      <a className="refFloating" href="#catalog">Book a Test</a>
    </main>
  );
}
