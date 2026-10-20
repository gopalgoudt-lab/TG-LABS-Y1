
import type { PrismaClient } from '@prisma/client';

export type ManualUpiRole =
  | 'OWNER'
  | 'ADMIN'
  | 'ACCOUNTS_STAFF'
  | 'TECHNICIAN';

export type ManualUpiRoleLookup = Readonly<{
  role: ManualUpiRole | null;
  authorized: boolean;
  reason:
    | 'ACTIVE_ASSIGNMENT'
    | 'INVALID_IDENTITY'
    | 'ASSIGNMENT_NOT_FOUND'
    | 'ASSIGNMENT_INACTIVE'
    | 'ASSIGNMENT_REVOKED'
    | 'INVALID_ROLE';
}>;

const allowedRoles: readonly ManualUpiRole[] = [
  'OWNER',
  'ADMIN',
  'ACCOUNTS_STAFF',
  'TECHNICIAN',
];

function isManualUpiRole(value: string): value is ManualUpiRole {
  return allowedRoles.includes(value as ManualUpiRole);
}

/**
 * Internal, read-only role lookup.
 *
 * firebaseUid must come from verified server-side Firebase
 * authentication, never from a browser-supplied UID or role.
 *
 * No role is automatically assigned or activated here.
 */
export async function lookupManualUpiRole(
  prisma: PrismaClient,
  firebaseUid: string,
): Promise<ManualUpiRoleLookup> {
  if (
    typeof firebaseUid !== 'string' ||
    !firebaseUid.trim() ||
    firebaseUid !== firebaseUid.trim()
  ) {
    return {
      role: null,
      authorized: false,
      reason: 'INVALID_IDENTITY',
    };
  }

  const assignment = await prisma.manualUpiRoleAssignment.findUnique({
    where: { firebaseUid },
    select: {
      role: true,
      active: true,
      revokedAt: true,
    },
  });

  if (!assignment) {
    return {
      role: null,
      authorized: false,
      reason: 'ASSIGNMENT_NOT_FOUND',
    };
  }

  if (assignment.revokedAt !== null) {
    return {
      role: null,
      authorized: false,
      reason: 'ASSIGNMENT_REVOKED',
    };
  }

  if (assignment.active !== true) {
    return {
      role: null,
      authorized: false,
      reason: 'ASSIGNMENT_INACTIVE',
    };
  }

  if (!isManualUpiRole(assignment.role)) {
    return {
      role: null,
      authorized: false,
      reason: 'INVALID_ROLE',
    };
  }

  return {
    role: assignment.role,
    authorized: true,
    reason: 'ACTIVE_ASSIGNMENT',
  };
}

/**
 * OWNER authorization is explicit.
 * ADMIN and ACCOUNTS_STAFF never inherit OWNER privileges.
 */
export function hasManualUpiOwnerRole(
  lookup: ManualUpiRoleLookup,
): boolean {
  return lookup.authorized === true && lookup.role === 'OWNER';
}
