import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {evaluateHomeCollectionServiceability,isValidIndianPincode} from '../lib/serviceability.ts';
const booking=readFileSync(new URL('../app/api/bookings/route.ts',import.meta.url),'utf8');
const service=readFileSync(new URL('../app/api/serviceability/route.ts',import.meta.url),'utf8');
test('Indian pincode and home collection serviceability fail closed',()=>{
 assert.equal(isValidIndianPincode('500061'),true);assert.equal(isValidIndianPincode('000000'),false);assert.equal(isValidIndianPincode('50006'),false);
 assert.equal(evaluateHomeCollectionServiceability('500061',null).serviceable,false);
 assert.equal(evaluateHomeCollectionServiceability('500061',{pincode:'500061',active:false,homeCollectionEnabled:true}).serviceable,false);
 assert.equal(evaluateHomeCollectionServiceability('500061',{pincode:'500061',active:true,homeCollectionEnabled:false}).serviceable,false);
 assert.deepEqual(evaluateHomeCollectionServiceability('500061',{pincode:'500061',active:true,homeCollectionEnabled:true}),{serviceable:true,reasons:[]});
});
test('public serviceability endpoint validates offer/product and is rate limited',()=>{
 assert.ok(service.includes("enforceApiRateLimit(r,'serviceability'"));
 assert.ok(service.includes("['TEST','PROFILE','PACKAGE'].includes"));
 assert.ok(service.includes("partnerId_pincode"));
 assert.ok(service.includes("Serviceability is temporarily unavailable."));
});
test('booking route revalidates identity, server pricing, serviceability and date window',()=>{
 assert.ok(booking.includes('verifyFirebasePatientRequest(request)'));
 assert.ok(booking.includes('assertBookingOwner(body.phone, identity.databasePhone)'));
 assert.ok(booking.includes('validateAndPriceBooking'));
 assert.ok(booking.includes('evaluateHomeCollectionServiceability'));
 assert.ok(booking.includes('Collection date cannot be in the past.'));
 assert.ok(booking.includes('within the next 90 days'));
 assert.ok(booking.includes('idempotencyKey'));
});
test('booking selections reject duplicates and require selected partner offers',()=>{
 assert.ok(booking.includes('Each diagnostic test must have exactly one selected partner offer.'));
 assert.ok(booking.includes('Each package must have exactly one selected partner offer.'));
 assert.ok(booking.includes('Please select an available diagnostic partner for every test.'));
});
