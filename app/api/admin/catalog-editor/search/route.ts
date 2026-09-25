import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminAuthError } from '@/lib/admin-auth';
import { adminFromRequest } from '@/lib/admin-audit';
import { evaluateCatalogOfferEligibility } from '@/lib/catalog-eligibility';

export const dynamic = 'force-dynamic';

const searchSchema = z.object({
  partner: z.string().trim().min(1).max(200),
  kind: z.enum(['test', 'package']),
  q: z.string().trim().min(1).max(200),
  packageType: z.enum(['PACKAGE', 'PROFILE']).optional(),
});

function authFailure(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  return message === 'UNAUTHENTICATED' || message.startsWith('ADMIN_');
}

export async function GET(request: Request) {
  try {
    await adminFromRequest(request);
    const url = new URL(request.url);
    const { partner, kind, q, packageType } = searchSchema.parse({
      partner: url.searchParams.get('partner') ?? '',
      kind: url.searchParams.get('kind') ?? '',
      q: url.searchParams.get('q') ?? '',
      packageType: url.searchParams.get('packageType') || undefined,
    });

    const fingerprintRows = await prisma.$queryRawUnsafe<Array<{ database_name: string; branch_id: string | null }>>(
      "SELECT current_database() AS database_name, current_setting('neon.branch_id', true) AS branch_id"
    );
    const databaseFingerprint = fingerprintRows[0] ?? { database_name: 'unknown', branch_id: null };

    const diagnosticPartner = await prisma.diagnosticPartner.findFirst({
      where: {
        OR: [
          { name: { equals: partner, mode: 'insensitive' } },
          { slug: { equals: partner, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, slug: true, active: true, bookingEnabled: true, operationalEnabled: true, displayEnabled: true },
    });

    if (!diagnosticPartner) return NextResponse.json({ items: [] });

    if (kind === 'test') {
      const offers = await prisma.testPartnerOffer.findMany({
        where: {
          partnerId: diagnosticPartner.id,
          OR: [
            { test: { name: { contains: q, mode: 'insensitive' } } },
            { test: { aliases: { has: q } } },
            { test: { catalogCode: { contains: q, mode: 'insensitive' } } },
          ],
        },
        include: { test: true },
        orderBy: { test: { name: 'asc' } },
        take: 25,
      });
      return NextResponse.json({
        items: offers.map(({ test, price, mrp, tat, active, availability, sourceReference, lastVerifiedAt, effectiveFrom, effectiveTo }) => ({
          id: test.id,
          partnerName: diagnosticPartner.name,
          partnerSlug: diagnosticPartner.slug,
          name: test.name,
          mrp: mrp ?? test.mrp,
          price,
          description: test.description,
          sampleTypes: test.sampleTypes,
          sampleTypeOther: test.sampleTypeOther,
          preparation: test.preparation,
          fastingNeeded: test.fastingNeeded,
          tatHours: tat ?? test.tat,
          imageData: test.imageData,
          active: test.active,
          homeCollectionCharge: test.homeCollectionCharge,
          offerEligibility: {
            ...evaluateCatalogOfferEligibility(test, { active, availability, price, tat, sourceReference, lastVerifiedAt, effectiveFrom, effectiveTo }, diagnosticPartner),
            displayEnabled: diagnosticPartner.displayEnabled,
            displayable: diagnosticPartner.displayEnabled && evaluateCatalogOfferEligibility(test, { active, availability, price, tat, sourceReference, lastVerifiedAt, effectiveFrom, effectiveTo }, { ...diagnosticPartner, bookingEnabled: true, operationalEnabled: true }).bookable,
          },
        })),
      });
    }

    // Diagnostic fallback: if a requested PROFILE/PACKAGE cannot be found in its expected type,
    // surface same-name catalog records across package types so Admin can identify misclassification.
    const offers = await prisma.packagePartnerOffer.findMany({
      where: {
        partnerId: diagnosticPartner.id,
        package: { name: { contains: q, mode: 'insensitive' }, ...(packageType ? { packageType } : {}) },
      },
      include: { package: { include: {
        tests: { include: { test: { select: { id: true, name: true } } } },
        includedProfiles: { include: { profile: { include: { tests: { include: { test: { select: { id: true, name: true } } } } } } } },
      } } },
      orderBy: { package: { name: 'asc' } },
      take: 25,
    });
    if (offers.length === 0) {
      let orphanPackages = await prisma.diagnosticPackage.findMany({
        where: { name: { contains: q, mode: 'insensitive' }, ...(packageType ? { packageType } : {}) },
        include: {
          tests: { include: { test: { select: { id: true, name: true } } } },
          includedProfiles: { include: { profile: { include: { tests: { include: { test: { select: { id: true, name: true } } } } } } } },
          partnerOffers: { include: { partner: { select: { name: true, slug: true } } } },
        },
        orderBy: { name: 'asc' },
        take: 25,
      });
      let typeMismatch = false;
      if (orphanPackages.length === 0 && packageType) {
        orphanPackages = await prisma.diagnosticPackage.findMany({
          where: { name: { contains: q, mode: 'insensitive' } },
          include: {
            tests: { include: { test: { select: { id: true, name: true } } } },
            includedProfiles: { include: { profile: { include: { tests: { include: { test: { select: { id: true, name: true } } } } } } },
            partnerOffers: { include: { partner: { select: { name: true, slug: true } } } },
          },
          orderBy: { name: 'asc' },
          take: 25,
        });
        typeMismatch = orphanPackages.length > 0;
      }
      return NextResponse.json({
        items: orphanPackages.map(catalogPackage => ({
          id: catalogPackage.id,
          partnerName: diagnosticPartner.name,
          partnerSlug: diagnosticPartner.slug,
          name: catalogPackage.name,
          mrp: catalogPackage.mrp,
          price: catalogPackage.price,
          description: catalogPackage.description,
          sampleTypes: catalogPackage.sampleTypes,
          sampleTypeOther: catalogPackage.sampleTypeOther,
          preparation: catalogPackage.preparation,
          fastingNeeded: catalogPackage.fastingNeeded,
          tatHours: catalogPackage.tat,
          imageData: catalogPackage.imageData,
          packageType: catalogPackage.packageType,
          active: catalogPackage.active,
          homeCollectionCharge: catalogPackage.homeCollectionCharge,
          includedTestIds: catalogPackage.tests.map(item => item.testId),
          includedTests: catalogPackage.tests.map(item => ({ id: item.test.id, name: item.test.name })),
          offerEligibility: { bookable: false, reasons: [typeMismatch ? 'CATALOG_TYPE_MISMATCH' : 'MISSING_PARTNER_OFFER'], displayEnabled: diagnosticPartner.displayEnabled, displayable: false },
          existingPartnerOffers: catalogPackage.partnerOffers.map(offer => ({ partnerName: offer.partner.name, partnerSlug: offer.partner.slug })),
          includedProfiles: catalogPackage.includedProfiles.map(item => ({
            id: item.profile.id, name: item.profile.name,
            tests: item.profile.tests.map(profileTest => ({ id: profileTest.test.id, name: profileTest.test.name })),
          })),
        })),
      });
    }

    return NextResponse.json({
      items: offers.map(({ package: catalogPackage, price, mrp, tat, active, availability, sourceReference, lastVerifiedAt, effectiveFrom, effectiveTo }) => ({
        id: catalogPackage.id,
        partnerName: diagnosticPartner.name,
        partnerSlug: diagnosticPartner.slug,
        name: catalogPackage.name,
        mrp: mrp ?? catalogPackage.mrp,
        price,
        description: catalogPackage.description,
        sampleTypes: catalogPackage.sampleTypes,
        sampleTypeOther: catalogPackage.sampleTypeOther,
        preparation: catalogPackage.preparation,
        fastingNeeded: catalogPackage.fastingNeeded,
        tatHours: tat ?? catalogPackage.tat,
        imageData: catalogPackage.imageData,
        packageType: catalogPackage.packageType,
        active: catalogPackage.active,
        homeCollectionCharge: catalogPackage.homeCollectionCharge,
        includedTestIds: catalogPackage.tests.map(item => item.testId),
        includedTests: catalogPackage.tests.map(item => ({ id: item.test.id, name: item.test.name })),
        offerEligibility: {
          ...evaluateCatalogOfferEligibility(catalogPackage, { active, availability, price, tat, sourceReference, lastVerifiedAt, effectiveFrom, effectiveTo }, diagnosticPartner),
          displayEnabled: diagnosticPartner.displayEnabled,
          displayable: diagnosticPartner.displayEnabled && evaluateCatalogOfferEligibility(catalogPackage, { active, availability, price, tat, sourceReference, lastVerifiedAt, effectiveFrom, effectiveTo }, { ...diagnosticPartner, bookingEnabled: true, operationalEnabled: true }).bookable,
        },
        includedProfiles: catalogPackage.includedProfiles.map(item => ({
          id: item.profile.id,
          name: item.profile.name,
          tests: item.profile.tests.map(profileTest => ({ id: profileTest.test.id, name: profileTest.test.name })),
        })),
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Partner, catalog type and search query are required.' }, { status: 400 });
    if (authFailure(error)) {
      const auth = adminAuthError(error);
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    console.error('GET admin catalog search failed', error);
    return NextResponse.json({ error: 'Unable to search catalog.' }, { status: 500 });
  }
}
