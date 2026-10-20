
import assert from 'node:assert/strict';
import test from 'node:test';
import type { PrismaClient } from '@prisma/client';

import {
  hasManualUpiOwnerRole,
  lookupManualUpiRole,
} from '../lib/manual-upi-role-registry';

type Assignment = {
  role: string;
  active: boolean;
  revokedAt: Date | null;
};

function mockPrisma(assignment: Assignment | null) {
  let calls = 0;
  let requestedUid: string | undefined;

  const prisma = {
    manualUpiRoleAssignment: {
      findUnique: async (args: {
        where: { firebaseUid: string };
      }) => {
        calls++;
        requestedUid = args.where.firebaseUid;
        return assignment;
      },
    },
  } as unknown as PrismaClient;

  return {
    prisma,
    get calls() {
      return calls;
    },
    get requestedUid() {
      return requestedUid;
    },
  };
}

test('unassigned user is denied', async () => {
  const db = mockPrisma(null);
  const result = await lookupManualUpiRole(db.prisma, 'uid-1');

  assert.equal(result.authorized, false);
  assert.equal(result.role, null);
  assert.equal(result.reason, 'ASSIGNMENT_NOT_FOUND');
  assert.equal(hasManualUpiOwnerRole(result), false);
});

test('empty identity is denied without database access', async () => {
  const db = mockPrisma(null);
  const result = await lookupManualUpiRole(db.prisma, '');

  assert.equal(result.authorized, false);
  assert.equal(result.reason, 'INVALID_IDENTITY');
  assert.equal(db.calls, 0);
});

test('whitespace-padded identity is denied', async () => {
  const db = mockPrisma(null);
  const result = await lookupManualUpiRole(db.prisma, ' uid-1 ');

  assert.equal(result.authorized, false);
  assert.equal(result.reason, 'INVALID_IDENTITY');
  assert.equal(db.calls, 0);
});

test('inactive OWNER assignment is denied', async () => {
  const db = mockPrisma({
    role: 'OWNER',
    active: false,
    revokedAt: null,
  });

  const result = await lookupManualUpiRole(db.prisma, 'uid-owner');

  assert.equal(result.authorized, false);
  assert.equal(result.reason, 'ASSIGNMENT_INACTIVE');
  assert.equal(hasManualUpiOwnerRole(result), false);
});

test('revoked OWNER assignment is denied', async () => {
  const db = mockPrisma({
    role: 'OWNER',
    active: true,
    revokedAt: new Date('2026-01-01T00:00:00Z'),
  });

  const result = await lookupManualUpiRole(db.prisma, 'uid-owner');

  assert.equal(result.authorized, false);
  assert.equal(result.reason, 'ASSIGNMENT_REVOKED');
  assert.equal(hasManualUpiOwnerRole(result), false);
});

test('unknown role is denied', async () => {
  const db = mockPrisma({
    role: 'SUPERUSER',
    active: true,
    revokedAt: null,
  });

  const result = await lookupManualUpiRole(db.prisma, 'uid-unknown');

  assert.equal(result.authorized, false);
  assert.equal(result.reason, 'INVALID_ROLE');
  assert.equal(hasManualUpiOwnerRole(result), false);
});

for (const role of [
  'ADMIN',
  'ACCOUNTS_STAFF',
  'TECHNICIAN',
] as const) {
  test(`${role} does not inherit OWNER privileges`, async () => {
    const db = mockPrisma({
      role,
      active: true,
      revokedAt: null,
    });

    const result = await lookupManualUpiRole(db.prisma, 'uid-staff');

    assert.equal(result.authorized, true);
    assert.equal(result.role, role);
    assert.equal(hasManualUpiOwnerRole(result), false);
    assert.equal(db.requestedUid, 'uid-staff');
  });
}

test('active, unrevoked OWNER assignment is recognized', async () => {
  const db = mockPrisma({
    role: 'OWNER',
    active: true,
    revokedAt: null,
  });

  const result = await lookupManualUpiRole(db.prisma, 'uid-owner');

  assert.equal(result.authorized, true);
  assert.equal(result.role, 'OWNER');
  assert.equal(result.reason, 'ACTIVE_ASSIGNMENT');
  assert.equal(hasManualUpiOwnerRole(result), true);
});
