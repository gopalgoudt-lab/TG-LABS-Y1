
import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const url = process.env.NEON_DATABASE_URL ?? '';
const isolated =
  process.env.MANUAL_UPI_ISOLATED_DB_TEST === '1' &&
  /^postgres(?:ql)?:\/\/[^/]+@localhost:5432\/manual_upi_test(?:\?|$)/.test(url);

if (!isolated) {
  throw new Error(
    'Role integration tests require the explicitly enabled localhost isolated PostgreSQL database.'
  );
}

const prisma = new PrismaClient({
  datasources: { db: { url } },
});

const table = '"ManualUpiRoleAssignment"';

async function createAssignment(
  role: string,
  active?: boolean,
  revokedAt?: Date | null,
) {
  const uid = `isolated-${randomUUID()}`;

  await prisma.$executeRawUnsafe(
    `INSERT INTO ${table}
      ("id", "firebaseUid", "role", "assignedByUid"${
        active === undefined ? '' : ', "active"'
      }${revokedAt === undefined ? '' : ', "revokedAt"'})
     VALUES ($1, $2, $3, $4${
       active === undefined ? '' : ', $5'
     }${revokedAt === undefined ? '' : active === undefined ? ', $5' : ', $6'})`,
    ...[
      randomUUID(),
      uid,
      role,
      'isolated-test-assigner',
      ...(active === undefined ? [] : [active]),
      ...(revokedAt === undefined ? [] : [revokedAt]),
    ],
  );

  return uid;
}

test('role assignments default to inactive', async () => {
  const uid = await createAssignment('OWNER');

  const rows = await prisma.$queryRawUnsafe<
    Array<{ active: boolean }>
  >(
    `SELECT "active" FROM ${table} WHERE "firebaseUid" = $1`,
    uid,
  );

  assert.equal(rows[0]?.active, false);
});

test('duplicate Firebase UID is rejected', async () => {
  const uid = await createAssignment('ADMIN');

  await assert.rejects(
    prisma.$executeRawUnsafe(
      `INSERT INTO ${table}
       ("id", "firebaseUid", "role", "assignedByUid")
       VALUES ($1, $2, $3, $4)`,
      randomUUID(),
      uid,
      'OWNER',
      'isolated-test-assigner',
    ),
  );
});

test('unknown roles are rejected by PostgreSQL', async () => {
  await assert.rejects(createAssignment('SUPERUSER'));
});

test('revoked assignment cannot remain active', async () => {
  await assert.rejects(
    createAssignment('OWNER', true, new Date()),
  );
});

test('active OWNER assignment can be stored', async () => {
  const uid = await createAssignment('OWNER', true, null);

  const rows = await prisma.$queryRawUnsafe<
    Array<{ role: string; active: boolean }>
  >(
    `SELECT "role", "active" FROM ${table}
     WHERE "firebaseUid" = $1`,
    uid,
  );

  assert.equal(rows[0]?.role, 'OWNER');
  assert.equal(rows[0]?.active, true);
});

test.after(async () => {
  await prisma.$disconnect();
});
