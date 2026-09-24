import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read=(p:string)=>readFileSync(new URL(p,import.meta.url),'utf8');
const layout=read('../app/layout.tsx');
const robots=read('../app/robots.ts');
const sitemap=read('../app/sitemap.ts');
const structured=read('../components/SiteStructuredData.tsx');
const local=read('../app/thyrocare-sithaphalmandi/page.tsx');

test('site metadata uses the canonical www TG Labs origin and indexable public defaults',()=>{
 assert.ok(layout.includes("const siteUrl = 'https://www.tglabs.in'"));
 assert.ok(layout.includes('metadataBase: new URL(siteUrl)'));
 assert.ok(layout.includes("alternates: { canonical: '/' }"));
 assert.ok(layout.includes('index: true'));
 assert.ok(layout.includes('follow: true'));
});

test('robots exposes the canonical sitemap while excluding private and API surfaces',()=>{
 for(const p of ['/admin','/auth','/checkout','/manual','/patient','/technician','/api']) assert.ok(robots.includes(`'${p}'`));
 assert.ok(robots.includes("sitemap: 'https://www.tglabs.in/sitemap.xml'"));
 assert.ok(robots.includes("host: 'https://www.tglabs.in'"));
});

test('sitemap contains core public acquisition routes and only displayable dynamic catalog offers',()=>{
 for(const p of ['/diagnostic-tests-hyderabad','/home-blood-test-hyderabad','/thyrocare-sithaphalmandi','/full-body-checkup-hyderabad','/compare/labs','/health-blog']) assert.ok(sitemap.includes(`route: '${p}'`));
 assert.ok(sitemap.includes('displayableOffers(test, now).length > 0'));
 assert.ok(sitemap.includes('displayableOffers(item, now).length > 0'));
 assert.ok(sitemap.includes('healthArticles.map'));
});

test('site structured data identifies TG Labs without inventing local medical-business claims',()=>{
 assert.ok(structured.includes("'@type': 'Organization'"));
 assert.ok(structured.includes("'@type': 'WebSite'"));
 assert.ok(structured.includes("logo: `${siteUrl}/brand/tg-labs-logo.png`"));
 for(const claim of ['streetAddress','postalCode','telephone','openingHours','MedicalClinic','DiagnosticLab','Physician']) assert.ok(!structured.includes(claim));
});

test('Thyrocare Sithaphalmandi landing page remains transparent, canonical and conversion ready',()=>{
 assert.ok(local.includes('https://www.tglabs.in/thyrocare-sithaphalmandi'));
 assert.match(local,/TG Labs/i);
 assert.match(local,/Thyrocare/i);
 assert.ok(!/official Thyrocare website/i.test(local));
 assert.match(local,/Home sample collection/i);
 assert.ok(local.includes('https://wa.me/919701162302'));
 assert.ok(local.includes('tel:+919701162302'));
 assert.match(local,/openingHoursSpecification/);
});
