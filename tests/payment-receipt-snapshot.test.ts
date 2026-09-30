import test from 'node:test';import assert from 'node:assert/strict';
import {buildPaymentReceiptSnapshot,parsePaymentReceiptSnapshot} from '../lib/payment-receipt-snapshot.ts';
test('snapshot freezes names prices charges total and partner',()=>{
 const snap=buildPaymentReceiptSnapshot({items:[{price:399,test:{name:'THYROID PROFILE'},partnerName:'Thyrocare'}],packages:[],homeCollectionCharge:100,printedReportFee:0,totalAmount:499},new Date('2026-09-30T04:12:15Z'));
 assert.deepEqual(snap.lines,[{name:'THYROID PROFILE',amount:399},{name:'Home Collection Charges',amount:100}]);
 assert.equal(snap.total,499);assert.deepEqual(snap.partners,['Thyrocare']);
});
test('parser rejects malformed snapshots and preserves valid frozen values',()=>{
 assert.equal(parsePaymentReceiptSnapshot({version:1,lines:'bad',subtotal:1,total:1,partners:[]}),null);
 const valid={version:1 as const,capturedAt:'x',lines:[{name:'A',amount:200}],subtotal:200,discount:0,total:200,partners:['Sagepath Labs']};
 assert.deepEqual(parsePaymentReceiptSnapshot(valid),valid);
});

test('frozen snapshot is independent of later catalog changes',()=>{const stored={version:1 as const,capturedAt:'x',lines:[{name:'Original Test',amount:200}],subtotal:200,discount:0,total:200,partners:['Sagepath Labs']};const parsed=parsePaymentReceiptSnapshot(stored)!;assert.equal(parsed.lines[0].name,'Original Test');assert.equal(parsed.lines[0].amount,200);assert.equal(parsed.total,200);});
