import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { evaluateHomeCollectionServiceability } from '../lib/serviceability';
import { evaluatePackageOfferEligibility, evaluateTestOfferEligibility } from '../lib/catalog-eligibility';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const booking=read('../app/api/bookings/route.ts');
const serviceabilityRoute=read('../app/api/serviceability/route.ts');
const publicDto=read('../lib/catalog-public-dto.ts');

const now=new Date('2026-09-24T00:00:00.000Z');
const product={active:true};
const partner={active:true,bookingEnabled:true,operationalEnabled:true,displayEnabled:true};
const offer={active:true,availability:'AVAILABLE' as const,price:399,tat:'12 hours',sourceReference:'verified-owner-source',lastVerifiedAt:new Date('2026-09-23T00:00:00.000Z')};

test('catalog booking eligibility remains fail-closed for inactive/unverified/non-bookable offers',()=>{
 assert.equal(evaluateTestOfferEligibility(product,offer,partner,now).bookable,true);
 assert.equal(evaluateTestOfferEligibility(product,{...offer,sourceReference:null},partner,now).bookable,false);
 assert.equal(evaluateTestOfferEligibility(product,{...offer,lastVerifiedAt:null},partner,now).bookable,false);
 assert.equal(evaluateTestOfferEligibility(product,{...offer,availability:'CHECK_AVAILABILITY'},partner,now).bookable,false);
 assert.equal(evaluatePackageOfferEligibility(product,offer,{...partner,operationalEnabled:false},now).bookable,false);
});

test('home collection serviceability fails closed unless pincode is configured, active and enabled',()=>{
 assert.deepEqual(evaluateHomeCollectionServiceability('500001',null),{serviceable:false,reasons:['SERVICEABILITY_NOT_CONFIGURED']});
 assert.equal(evaluateHomeCollectionServiceability('500001',{pincode:'500001',active:false,homeCollectionEnabled:true}).serviceable,false);
 assert.equal(evaluateHomeCollectionServiceability('500001',{pincode:'500001',active:true,homeCollectionEnabled:false}).serviceable,false);
 assert.equal(evaluateHomeCollectionServiceability('500001',{pincode:'500001',active:true,homeCollectionEnabled:true}).serviceable,true);
});

test('public serviceability requires a valid product-partner-offer association and degrades closed',()=>{
 assert.ok(serviceabilityRoute.includes("!isValidIndianPincode(pincode)||!partner||!offerId||!slug"));
 assert.ok(serviceabilityRoute.includes('x.id===offerId&&x.partner.slug===partner'));
 assert.ok(serviceabilityRoute.includes('partnerServiceability.findUnique'));
 assert.ok(serviceabilityRoute.includes("Serviceability is temporarily unavailable."));
 assert.ok(serviceabilityRoute.includes('{status:503}'));
});

test('booking revalidates authoritative offer eligibility and exact product association server-side',()=>{
 assert.ok(booking.includes('evaluateTestOfferEligibility(offer.test,offer,offer.partner).bookable'));
 assert.ok(booking.includes('evaluatePackageOfferEligibility(offer.package,offer,offer.partner).bookable'));
 assert.ok(booking.includes('A selected partner offer does not match its diagnostic test.'));
 assert.ok(booking.includes('A selected package offer does not match its package.'));
});

test('home booking independently rechecks every selected partner pincode before creation',()=>{
 assert.ok(booking.includes('partnerServiceability.findMany'));
 assert.ok(booking.includes('partnerIds.some'));
 assert.ok(booking.includes('evaluateHomeCollectionServiceability'));
 assert.ok(booking.includes('Home collection is unavailable for one or more selected partners.'));
});

test('booking protects date, slot, identity and duplicate submission boundaries',()=>{
 assert.ok(booking.includes('verifyFirebasePatientRequest(request)'));
 assert.ok(booking.includes('assertBookingOwner(body.phone, identity.databasePhone)'));
 assert.ok(booking.includes('idempotencyKey: z.string().uuid()'));
 assert.ok(booking.includes('BOOKING_SLOTS.includes(value)'));
 assert.ok(booking.includes('Collection date cannot be in the past.'));
 assert.ok(booking.includes('Please choose a collection date within the next 90 days.'));
 assert.ok(booking.includes("error.code === 'P2002'"));
});

test('server calculates authoritative diagnostic, printed-report and home-collection totals',()=>{
 assert.ok(booking.includes('validateAndPriceBooking'));
 assert.ok(booking.includes('const printedReportFee = body.printedReport ? PRINTED_REPORT_FEE : 0'));
 assert.ok(booking.includes("body.mode === 'home' ? Math.max"));
 assert.ok(booking.includes('const totalAmount = pricing.totalAmount + homeCollectionCharge'));
});

test('public DTO exposes only verified partner accreditation and coherent MRP discount values',()=>{
 assert.ok(publicDto.includes('accreditationReference?.trim()&&value.partner.accreditationVerifiedAt'));
 assert.ok(publicDto.includes('value.mrp&&value.mrp>=value.price?value.mrp:null'));
 assert.ok(publicDto.includes('value.mrp&&value.mrp>value.price?Math.round'));
});
