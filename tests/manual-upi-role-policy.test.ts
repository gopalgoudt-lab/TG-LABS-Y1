import assert from 'node:assert/strict';
import test from 'node:test';
import { authorizeManualUpiAction as check } from '../lib/manual-upi-role-policy';

test('unprovisioned, inactive and mismatched identities fail closed', () => {
  assert.equal(check({authenticatedUid:'a',assignment:null,action:'APPROVE_DISCOUNT'}).allowed,false);
  assert.equal(check({authenticatedUid:'a',assignment:{uid:'a',role:'OWNER',active:false},action:'APPROVE_DISCOUNT'}).allowed,false);
  assert.equal(check({authenticatedUid:'a',assignment:{uid:'b',role:'OWNER',active:true},action:'APPROVE_DISCOUNT'}).allowed,false);
});
test('admin and technician cannot approve discounts', () => {
  for (const role of ['ADMIN','TECHNICIAN'] as const)
    assert.equal(check({authenticatedUid:'a',assignment:{uid:'a',role,active:true},action:'APPROVE_DISCOUNT',verifierUid:'v'}).allowed,false);
});
test('accounts staff can verify but cannot approve', () => {
  const assignment={uid:'v',role:'ACCOUNTS_STAFF' as const,active:true};
  assert.equal(check({authenticatedUid:'v',assignment,action:'VERIFY_BANK_CREDIT',requesterUid:'r',approverUid:'o'}).allowed,true);
  assert.equal(check({authenticatedUid:'v',assignment,action:'APPROVE_DISCOUNT',verifierUid:'other'}).allowed,false);
  assert.equal(check({authenticatedUid:'v',assignment,action:'VERIFY_BANK_CREDIT',requesterUid:'v'}).allowed,false);
});
test('owner approval requires independent verifier', () => {
  const assignment={uid:'o',role:'OWNER' as const,active:true};
  assert.equal(check({authenticatedUid:'o',assignment,action:'APPROVE_DISCOUNT',requesterUid:'r',verifierUid:'v'}).allowed,true);
  assert.equal(check({authenticatedUid:'o',assignment,action:'APPROVE_DISCOUNT',requesterUid:'r',verifierUid:'o'}).allowed,false);
});
test('receipt issuance disabled for every role', () => {
  for (const role of ['OWNER','ADMIN','ACCOUNTS_STAFF','TECHNICIAN'] as const)
    assert.equal(check({authenticatedUid:'x',assignment:{uid:'x',role,active:true},action:'ISSUE_CORRECTED_RECEIPT'}).allowed,false);
});
