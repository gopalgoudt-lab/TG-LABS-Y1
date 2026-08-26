'use client';

import Image from 'next/image';
import BrandLogo from '@/components/BrandLogo';
import { useEffect, useMemo, useState } from 'react';

type CatalogTest = { id:string; slug:string; name:string; description?:string|null; mrp:number; price:number; diagnosticPartner?:string|null; tat?:string|null; fastingNeeded:boolean; sampleTypes:string[] };
type CatalogPackage = CatalogTest & { tests:{ id:string; name:string; slug:string }[] };
type CartItem = { kind:'test'|'package'; id:string; name:string; price:number };
type Partner = { name:string; logo:string; description:string; reports:string; startingPrice:string; specialty:string };

const quickTests = ['Diabetes','Thyroid','Women','Senior Citizen'];
const healthCheckFallbacks = [
  { name:'Diabetes Care Check', description:'Explore blood sugar, HbA1c and metabolic health tests.', term:'diabetes', icon:'◉' },
  { name:'Thyroid Wellness Check', description:'Explore T3, T4, TSH and advanced thyroid profiles.', term:'thyroid', icon:'✦' },
  { name:'Preventive Health Check', description:'Explore routine tests for proactive health monitoring.', term:'health', icon:'✚' },
];
const categories = [
  ['◉','Diabetes Care','Sugar control & complication screening','diabetes'],
  ['✦','Thyroid Health','T3, T4, TSH & advanced thyroid profiles','thyroid'],
  ['♡','Heart Health','Lipids, cardiac risk & inflammation','heart'],
  ['⌁','Liver Health','Liver function & enzyme profiles','liver'],
  ['⊙','Kidney Health','Renal function, urine & electrolytes','kidney'],
  ['♀','Women’s Wellness','Hormones, anaemia, thyroid & vitamins','women'],
  ['♂','Men’s Wellness','Metabolic, hormone & prostate screening','men'],
  ['♟','Senior Citizen','Comprehensive age-focused screening','senior'],
  ['≋','Bone & Vitamin Health','Vitamin D, B12, calcium & minerals','vitamin'],
  ['✚','Fever & Infection','Fever panels and infection markers','fever'],
];
const partners:Partner[] = [
  { name:'Sagepath Labs', logo:'/partners/sagepath-labs.svg', description:'Regional speciality testing', reports:'24–48 hrs', startingPrice:'₹399', specialty:'Regional specialty testing' },
  { name:'Thyrocare', logo:'/partners/thyrocare.svg', description:'Preventive profiles & packages', reports:'24 hrs', startingPrice:'₹299', specialty:'Preventive profiles & packages' },
  { name:'Dr Lal PathLabs', logo:'/partners/dr-lal-pathlabs.svg', description:'Routine & specialised diagnostics', reports:'24–48 hrs', startingPrice:'₹399', specialty:'Routine & specialised diagnostics' },
];

function partnerFor(name?:string|null){
  if(!name) return null;
  const n=name.toLowerCase();
  return partners.find(p=>n.includes(p.name.toLowerCase())||p.name.toLowerCase().includes(n))||null;
}

export default function Home(){
  const [query,setQuery]=useState('');
  const [tests,setTests]=useState<CatalogTest[]>([]);
  const [packages,setPackages]=useState<CatalogPackage[]>([]);
  const [catalogError,setCatalogError]=useState('');
  const [cart,setCart]=useState<CartItem[]>([]);
  const [showCart,setShowCart]=useState(false);
  const [partnerFilter,setPartnerFilter]=useState('all');
  const [catalogLoading,setCatalogLoading]=useState(true);

  useEffect(()=>{ fetch('/api/catalog',{cache:'no-store'}).then(async r=>{ const d=await r.json(); if(!r.ok) throw new Error(d.error||'Unable to load catalogue.'); setTests(d.tests||[]); setPackages(d.packages||[]); }).catch(e=>setCatalogError(e instanceof Error?e.message:'Unable to load catalogue.')).finally(()=>setCatalogLoading(false)); },[]);
  useEffect(()=>{ const saved=window.localStorage.getItem('tglabs-cart'); if(!saved)return; try{ const parsed=JSON.parse(saved); if(Array.isArray(parsed)) setCart(parsed); }catch{ window.localStorage.removeItem('tglabs-cart'); } },[]);
  useEffect(()=>{ window.localStorage.setItem('tglabs-cart',JSON.stringify(cart)); },[cart]);

  const filteredTests=useMemo(()=>{ const term=query.trim().toLowerCase(); if(!term)return tests; return tests.filter(t=>`${t.name} ${t.description||''} ${t.diagnosticPartner||''}`.toLowerCase().includes(term)); },[query,tests]);
  const filteredPackages=useMemo(()=>{ const term=query.trim().toLowerCase(); if(!term)return packages; return packages.filter(p=>`${p.name} ${p.description||''} ${p.tests.map(t=>t.name).join(' ')}`.toLowerCase().includes(term)); },[query,packages]);
  const addToCart=(item:CartItem)=>{ setCart(current=>current.some(x=>x.kind===item.kind&&x.id===item.id)?current:[...current,item]); setShowCart(true); };
  const removeFromCart=(item:CartItem)=>setCart(current=>current.filter(x=>!(x.kind===item.kind&&x.id===item.id)));
  const inCart=(kind:CartItem['kind'],id:string)=>cart.some(item=>item.kind===kind&&item.id===id);
  const cartTotal=cart.reduce((sum,item)=>sum+item.price,0);
  const featuredTests=(query?filteredTests:tests).filter(test=>partnerFilter==='all'||test.diagnosticPartner?.toLowerCase().includes(partnerFilter.toLowerCase())).slice(0,4);
  const featuredPackages=(query?filteredPackages:packages).slice(0,3);

  return <>
    <div className="utilityBar"><div className="marketWrap utilityInner"><span>✓ Verified diagnostic partner network</span><span>Barcode tracking</span><span>Secure digital reports</span></div></div>
    <header className="marketHeader"><div className="marketWrap marketNav">
      <a className="marketBrand" href="/" aria-label="TG Labs home"><BrandLogo className="brandLogoHeader" priority/></a>
      <nav className="marketLinks" aria-label="Primary navigation"><a href="#tests">Search Tests</a><a href="#partners">Lab Partners</a><a href="#packages">Health Packages</a><a href="#how">How It Works</a></nav>
      <div className="marketActions"><span className="location" aria-label="Service location Hyderabad">● Hyderabad</span><a className="outlineBtn" href="/checkout">Upload Prescription</a><a className="navLogin" href="/auth">Login</a><button className="navCart" type="button" onClick={()=>setShowCart(true)} aria-label={`Open cart with ${cart.length} items`}>Cart ({cart.length})</button></div>
    </div></header>

    {showCart&&<div className="cartOverlay" role="dialog" aria-modal="true" aria-labelledby="cart-title"><div className="cartPanel"><div className="cartHeader"><div><small>YOUR BASKET</small><h2 id="cart-title">Ready to book?</h2></div><button className="iconBtn" type="button" onClick={()=>setShowCart(false)} aria-label="Close cart">×</button></div>{cart.length===0?<div className="emptyCart">Your basket is empty. Add a test or package to start your booking.</div>:<><div className="cartItems">{cart.map(item=><div className="cartItem" key={`${item.kind}-${item.id}`}><div><b>{item.name}</b><span>{item.kind==='package'?'Health package':'Diagnostic test'}</span></div><div><b>₹{item.price.toLocaleString('en-IN')}</b><button type="button" onClick={()=>removeFromCart(item)} aria-label={`Remove ${item.name} from cart`}>Remove</button></div></div>)}</div><div className="summaryTotal"><span>Total</span><b>₹{cartTotal.toLocaleString('en-IN')}</b></div><a className="navCart full" href="/checkout">Continue to booking →</a></>}</div></div>}

    <main>
      <section className="marketHero"><div className="marketWrap heroLayout"><div className="heroCopy"><span className="kicker">PREMIUM MULTI-LAB DIAGNOSTIC BOOKING</span><h1>One booking. Trusted NABL labs.<br/><em>Quality reports.</em></h1><p>Choose a test or diagnostic partner. TG Labs coordinates safe sample collection and sends it to your selected partner laboratory for testing.</p><div className="heroSearch" role="search"><span aria-hidden="true">⌕</span><label className="srOnly" htmlFor="catalog-search">Search tests and health packages</label><input id="catalog-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search diabetes, thyroid, liver, women, senior citizen..."/><a href="#tests">Search</a></div><div className="popularLine">Popular: {quickTests.map(x=><button type="button" key={x} onClick={()=>setQuery(x)}>{x}</button>)}</div><div className="heroAssurance" aria-label="Booking assurances"><span><b>NABL</b> accredited partner labs</span><span><b>Secure</b> patient report access</span><span><b>Clear</b> lab selection before payment</span></div></div><div className="heroServiceCard"><span className="networkBadge">✓ PARTNER NETWORK</span><div className="medicalPlus">✚</div><h3>Home collection, your preferred lab</h3><ol><li><b>1</b> Choose test & partner</li><li><b>2</b> TG Labs collects safely</li><li><b>3</b> Partner tests & reports</li></ol><div className="serviceMeta"><span>▦ Barcode tracked</span><span>▣ Cold-chain ready</span></div></div></div></section>

      <section className="discoverSection" aria-labelledby="discover-heading"><div className="marketWrap"><div className="sectionTop"><div><span className="kicker">DISCOVER YOUR TEST</span><h2 id="discover-heading">Search the way you think about health</h2><p>Explore by organ, condition, life stage or preferred diagnostic partner.</p></div><a className="outlineBtn" href="#tests">View all tests →</a></div><div className="categoryTabs" aria-label="Ways to browse"><span className="active">All categories</span><span>By organ</span><span>By disorder</span><span>By life stage</span></div><div className="categoryGrid">{categories.map(([icon,title,desc,term])=><button type="button" className="categoryCard" key={title} onClick={()=>setQuery(term)}><span aria-hidden="true">{icon}</span><b>{title}</b><small>{desc}</small><i aria-hidden="true">›</i></button>)}</div></div></section>

      <section id="tests" className="compareSection"><div className="marketWrap"><div className="sectionTop"><div><span className="kicker">COMPARE BEFORE YOU BOOK</span><h2>{query||'Popular diagnostic tests'}</h2><p>Choose a test and review the performing diagnostic partner before adding it.</p></div><label className="partnerFilterLabel">Filter by laboratory<select className="partnerSelect" value={partnerFilter} onChange={e=>setPartnerFilter(e.target.value)}><option value="all">All partners</option>{partners.map(p=><option key={p.name} value={p.name}>{p.name}</option>)}</select></label></div>{catalogError&&<div className="notice" role="alert">{catalogError}</div>}{catalogLoading&&<div className="catalogStatus" role="status">Loading current tests and prices…</div>}<div className="comparisonList">{featuredTests.map(test=>{const partner=partnerFor(test.diagnosticPartner);return <article className="comparisonCard" key={test.id}><div className="testInfo"><h3>{test.name}</h3><p>{test.sampleTypes?.[0]||'Blood sample'} • Home collection available</p><span className="detailNote">Preparation confirmed during booking</span></div><div className="partnerChoices"><div className="choice active"><span className="radio" aria-hidden="true">●</span><div><b>{test.diagnosticPartner||partner?.name||'TG Labs partner'}</b><small>✓ Verified partner • {test.tat||'TAT confirmed before booking'}</small></div><strong>₹{test.price.toLocaleString('en-IN')}</strong><em>LISTED OPTION</em></div>{partners.filter(p=>p.name!==partner?.name).slice(0,2).map(p=><div className="choice mutedChoice" key={p.name}><span className="radio" aria-hidden="true">○</span><div><b>{p.name}</b><small>Availability confirmed before payment</small></div><strong>Check availability</strong></div>)}</div><button type="button" className="addBlue" onClick={()=>addToCart({kind:'test',id:test.id,name:test.name,price:test.price})}>{inCart('test',test.id)?'Added ✓':'Add to cart'}</button></article>})}</div>{!catalogLoading&&!catalogError&&featuredTests.length===0&&<div className="catalogStatus">No tests match this search and laboratory filter. Try another partner or search term.</div>}</div></section>

      <section id="packages" className="popularChecks"><div className="marketWrap"><div className="sectionTop"><div><span className="kicker">RECOMMENDED FOR YOU</span><h2>Popular health checks</h2><p>{featuredPackages.length?'Compare the performing laboratory before adding a package.':'Start with a health goal and explore matching tests from the live catalogue.'}</p></div></div>{featuredPackages.length?<div className="healthGrid">{featuredPackages.map(pkg=>{const discount=pkg.mrp>pkg.price?Math.round((1-pkg.price/pkg.mrp)*100):0;return <article className="healthCard" key={pkg.id}><div className="healthLabels"><span>{discount?`${discount}% OFF`:'POPULAR'}</span><b>{pkg.diagnosticPartner?`Tested by ${pkg.diagnosticPartner}`:'TG Labs partner network'}</b></div><h3>{pkg.name}</h3><p>{pkg.tests.length} parameters</p><div className="healthMeta">◷ Reports in {pkg.tat||'24–48 hrs'} &nbsp; • &nbsp; ⌂ Home collection</div><div className="healthBottom"><div>{pkg.mrp>pkg.price&&<s>₹{pkg.mrp.toLocaleString('en-IN')}</s>}<strong>₹{pkg.price.toLocaleString('en-IN')}</strong></div><button type="button" onClick={()=>addToCart({kind:'package',id:pkg.id,name:pkg.name,price:pkg.price})}>{inCart('package',pkg.id)?'Added ✓':'Add +'}</button></div></article>})}</div>:!catalogLoading&&!catalogError?<div className="healthGrid">{healthCheckFallbacks.map(item=><article className="healthCard healthDiscoveryCard" key={item.name}><span className="healthIcon" aria-hidden="true">{item.icon}</span><span className="discoveryLabel">BROWSE LIVE TESTS</span><h3>{item.name}</h3><p>{item.description}</p><button type="button" onClick={()=>{setQuery(item.term);document.getElementById('tests')?.scrollIntoView({behavior:'smooth'});}}>Explore matching tests →</button></article>)}</div>:<div className="catalogStatus" role={catalogError?'alert':'status'}>{catalogError?'Health checks are temporarily unavailable. Please search the live test catalogue above.':'Loading current health packages…'}</div>}</div></section>

      <section id="partners" className="labPartnerSection"><div className="marketWrap"><div className="sectionTop"><div><span className="kicker">CHOOSE YOUR DIAGNOSTIC PARTNER</span><h2>Compare trusted partner laboratories</h2><p>Partner status, starting price and turnaround are shown before booking.</p></div></div><div className="labGrid">{partners.map(p=><article className="labCard" key={p.name}><div className="partnerLogo"><Image src={p.logo} alt={`${p.name} logo`} width={320} height={72}/></div><h3>{p.name}</h3><b>✓ Verified diagnostic partner</b><p>{p.description}</p><div className="labStats"><span>Reports<strong>{p.reports}</strong></span><span>Tests from<strong>{p.startingPrice}</strong></span></div><a href="#tests" onClick={()=>setPartnerFilter(p.name)}>View tests & packages →</a></article>)}</div><p className="partnerNote">Partner availability, NABL accreditation scope, pricing and turnaround time may vary by location and test. The performing laboratory and final price are confirmed before payment.</p></div></section>

      <section id="how" className="responsibility"><div className="marketWrap"><span className="kicker lightKicker">CLEAR RESPONSIBILITY AT EVERY STEP</span><h2>One booking. One collection journey. Clear handoff.</h2><div className="stepsRow">{[['1','Choose test & partner'],['2','Book home collection'],['3','Barcode-tracked sample'],['4','Partner testing'],['5','Digital report']].map(([n,t])=><div key={n}><b>{n}</b><span>{t}</span></div>)}</div></div></section>
    </main>

    <a className="floatingBook" href="/checkout">⌂ Book Home Collection</a>
    <footer className="marketFooter"><div className="marketWrap footerGrid"><div><a className="footerBrand" href="/" aria-label="TG Labs home"><BrandLogo className="brandLogoFooter"/></a><p>Multi-lab diagnostic booking, home sample collection and digital reports in one patient-first journey.</p></div><div><b>Patients</b><a href="#tests">Search Tests</a><a href="#packages">Health Packages</a><a href="/patient">Reports</a></div><div><b>Partners</b><a href="#partners">Lab Partners</a><a href="/technician">Technician</a><a href="/admin">Admin</a></div><div><b>Book</b><a href="/checkout">Home Collection</a><a href="/auth">Login</a></div></div></footer>
  </>;
}
