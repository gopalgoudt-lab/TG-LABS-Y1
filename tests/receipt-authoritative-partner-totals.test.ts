import test from 'node:test';import assert from 'node:assert/strict';
import { receiptPartners,reconcilePaidReceipt } from '../lib/receipt-reconciliation.ts';

test('receipt resolves booked offer partner when snapshot name is absent',()=>{
 assert.deepEqual(receiptPartners([{partnerName:null,offer:{partner:{name:'Thyrocare'}}}],[]),['Thyrocare']);
});
test('paid receipt includes home collection subtotal when legacy stored total omitted it',()=>{
 assert.deepEqual(reconcilePaidReceipt(200,300,200),{total:300,paidAmount:300,due:0});
});
test('receipt never reduces a valid authoritative stored total',()=>{
 assert.deepEqual(reconcilePaidReceipt(350,300,350),{total:350,paidAmount:350,due:0});
});
