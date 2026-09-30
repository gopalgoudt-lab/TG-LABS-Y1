import test from 'node:test';import assert from 'node:assert/strict';
import { receiptPartners,reconcilePaidReceipt } from '../lib/receipt-reconciliation.ts';

test('receipt uses authoritative booked offer partner over stale snapshot name',()=>{
 assert.deepEqual(receiptPartners([{partnerName:'TG Labs',offer:{partner:{name:'Thyrocare'}}}],[]),['Thyrocare']);
});
test('receipt falls back to snapshot partner only when booked offer relation is unavailable',()=>{
 assert.deepEqual(receiptPartners([{partnerName:'Thyrocare',offer:null}],[]),['Thyrocare']);
});
test('paid receipt keeps the stored booking total even when current catalog lines are higher',()=>{
 assert.deepEqual(reconcilePaidReceipt(200,300,200),{total:200,paidAmount:200,due:0});
});
test('paid receipt keeps the stored booking total when current catalog lines are lower',()=>{
 assert.deepEqual(reconcilePaidReceipt(350,300,350),{total:350,paidAmount:350,due:0});
});
test('paid receipt does not inflate the paid amount to a changed line subtotal',()=>{
 assert.deepEqual(reconcilePaidReceipt(6260,9000,6260),{total:6260,paidAmount:6260,due:0});
});

test('receipt resolves partner id before stale snapshot when offer relation is unavailable',()=>{
 const names=new Map([['thyrocare-id','Thyrocare']]);
 assert.deepEqual(receiptPartners([{partnerId:'thyrocare-id',partnerName:'TG Labs',offer:null}],[],names),['Thyrocare']);
});

test('receipt accepts a uniquely resolved catalog partner as fallback over stale snapshot',()=>{
 assert.deepEqual(receiptPartners([{partnerId:null,partnerName:'Thyrocare',offer:null}],[]),['Thyrocare']);
});
