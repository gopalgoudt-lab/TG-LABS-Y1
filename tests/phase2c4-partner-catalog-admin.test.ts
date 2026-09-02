import assert from 'node:assert/strict';
import test from 'node:test';
import { findBlockedPartnerMutationFields, PARTNER_CREATE_SAFETY_DEFAULTS, partnerActivationMutationMessage } from '../lib/partner-catalog-admin';

test('partner metadata payloads do not trigger activation guard',()=>{
 assert.deepEqual(findBlockedPartnerMutationFields({name:'Sagepath Labs',accreditationDisplay:'NABL details pending verification',orderHandoffMethod:'Manual handoff metadata'}),[]);
});

test('activation and serviceability fields are blocked even when nested',()=>{
 assert.deepEqual(findBlockedPartnerMutationFields({bookingEnabled:true,details:{operationalEnabled:true},serviceability:[{homeCollectionEnabled:true}],active:false}),['active','bookingEnabled','homeCollectionEnabled','operationalEnabled','serviceability']);
});

test('guard returns an explicit safety message',()=>{
 const message=partnerActivationMutationMessage(['bookingEnabled','serviceability']);
 assert.match(message,/does not permit activation or serviceability changes/);
 assert.match(message,/bookingEnabled/);
 assert.match(message,/serviceability/);
});

test('new partner records are forced to disabled activation defaults',()=>{
 assert.deepEqual(PARTNER_CREATE_SAFETY_DEFAULTS,{active:false,bookingEnabled:false,operationalEnabled:false,displayEnabled:false});
});
