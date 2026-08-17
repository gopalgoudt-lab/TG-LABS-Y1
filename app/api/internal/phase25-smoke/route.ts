import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const PACKAGE_SLUG = 'basic-health-checkup';
const EXPECTED_PRICE = 999;
const EXPECTED_TESTS = 5;

export async function GET() {
  const startedAt = Date.now();

  try {
    const catalogPackage = await prisma.diagnosticPackage.findUnique({
      where: { slug: PACKAGE_SLUG },
      select: {
        id: true,
        name: true,
        price: true,
        active: true,
        tests: { select: { test: { select: { id: true, name: true, active: true } } } },
      },
    });

    if (!catalogPackage || !catalogPackage.active) {
      return NextResponse.json({ ok: false, stage: 'catalog', error: 'Basic Health Checkup is missing or inactive.' }, { status: 500 });
    }

    const activeTests = catalogPackage.tests.filter((item) => item.test.active);
    if (catalogPackage.price !== EXPECTED_PRICE || activeTests.length !== EXPECTED_TESTS) {
      return NextResponse.json({
        ok: false,
        stage: 'catalog',
        error: 'Basic Health Checkup does not match the expected Phase 2.5 configuration.',
        observed: { price: catalogPackage.price, activeTests: activeTests.length },
      }, { status: 500 });
    }

    const runId = `phase25-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const testPhone = `9${String(Date.now()).slice(-9)}`;
    const testEmail = `${runId}@example.invalid`;

    const verification = await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.create({
        data: {
          name: 'TG Labs Phase 2.5 Smoke Test',
          phone: testPhone,
          email: testEmail,
          age: 30,
          gender: 'OTHERS',
        },
      });

      const booking = await tx.booking.create({
        data: {
          patientId: patient.id,
          mode: 'HOME',
          source: 'ADMIN',
          address: 'Phase 2.5 temporary test address',
          pincode: '500001',
          collectionDate: new Date('2099-01-01T00:00:00.000Z'),
          slot: '6:00 AM - 6:30 AM',
          totalAmount: catalogPackage.price,
          adminNotes: `Temporary smoke-test record ${runId}; deleted before transaction commit.`,
          createdByAdmin: 'PHASE_2_5_SMOKE_TEST',
          packages: {
            create: [{ packageId: catalogPackage.id, price: catalogPackage.price }],
          },
          items: {
            create: activeTests.map((item) => ({ testId: item.test.id, price: 0 })),
          },
        },
        include: {
          patient: true,
          packages: { include: { package: true } },
          items: { include: { test: true } },
        },
      });

      const checks = {
        patientCreated: booking.patient.email === testEmail,
        bookingCreated: Boolean(booking.id),
        packageRecorded: booking.packages.length === 1 && booking.packages[0].package.slug === PACKAGE_SLUG,
        packagePriceCorrect: booking.packages[0]?.price === EXPECTED_PRICE,
        includedTestsRecorded: booking.items.length === EXPECTED_TESTS,
        includedTestsNotDoubleCharged: booking.items.every((item) => item.price === 0),
        bookingTotalCorrect: booking.totalAmount === EXPECTED_PRICE,
        slotStored: booking.slot === '6:00 AM - 6:30 AM',
        patientFieldsStored: booking.patient.age === 30 && booking.patient.gender === 'OTHERS' && booking.patient.email === testEmail,
      };

      await tx.booking.delete({ where: { id: booking.id } });
      await tx.patient.delete({ where: { id: patient.id } });

      const [bookingAfterCleanup, patientAfterCleanup] = await Promise.all([
        tx.booking.findUnique({ where: { id: booking.id }, select: { id: true } }),
        tx.patient.findUnique({ where: { id: patient.id }, select: { id: true } }),
      ]);

      return {
        runId,
        checks: {
          ...checks,
          cleanupVerified: !bookingAfterCleanup && !patientAfterCleanup,
        },
        observed: {
          package: catalogPackage.name,
          price: catalogPackage.price,
          testCount: booking.items.length,
          tests: booking.items.map((item) => item.test.name).sort(),
          bookingIdWasCreated: booking.id,
        },
      };
    });

    const razorpay = {
      keyIdConfigured: Boolean(process.env.RAZORPAY_KEY_ID),
      keySecretConfigured: Boolean(process.env.RAZORPAY_KEY_SECRET),
      webhookSecretConfigured: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
      liveOrderCreated: false,
      note: 'Phase 2.5 intentionally does not call Razorpay or create a charge.',
    };

    const allChecksPassed = Object.values(verification.checks).every(Boolean);

    return NextResponse.json({
      ok: allChecksPassed,
      phase: '2.5',
      mode: 'safe-production-smoke-test',
      databaseResidueCreated: false,
      verification,
      razorpay,
      durationMs: Date.now() - startedAt,
    }, { status: allChecksPassed ? 200 : 500 });
  } catch (error) {
    console.error('Phase 2.5 smoke test failed', error);
    return NextResponse.json({
      ok: false,
      phase: '2.5',
      stage: 'execution',
      error: error instanceof Error ? error.message : 'Unknown smoke-test error.',
      durationMs: Date.now() - startedAt,
    }, { status: 500 });
  }
}
