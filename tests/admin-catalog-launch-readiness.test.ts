import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read=(p:string)=>readFileSync(new URL(p,import.meta.url),'utf8');
const edit=read('../app/api/admin/catalog-editor/[kind]/[id]/route.ts');
const search=read('../app/api/admin/catalog-editor/search/route.ts');
const partner=read('../app/api/admin/partner-catalog/[id]/route.ts');
const middleware=read('../middleware.ts');

test('catalog editor and partner catalog APIs remain inside protected admin surface',()=>{
 assert.ok(middleware.includes("pathname.startsWith('/api/admin/')"));
 assert.ok(edit.includes('adminFromRequest(request)'));
 assert.ok(search.includes('adminFromRequest(request)'));
 assert.ok(partner.includes('adminFromRequest(request)'));
});

test('catalog editor accepts only approved strict fields and separates test from package composition',()=>{
 assert.ok(edit.includes('}).strict()'));
 assert.ok(edit.includes("kind !== 'test' && kind !== 'package'"));
 assert.ok(edit.includes("Package/profile fields apply only to packages/profiles."));
 for(const marker of ['fastingNeeded: z.boolean().optional()','sampleTypes: z.array','active: z.boolean().optional()','homeCollectionCharge: z.number().int().refine','includedTestIds: z.array','includedProfileIds: z.array']) assert.ok(edit.includes(marker),marker);
});

test('price MRP and TAT updates synchronize to the selected partner offer transactionally',()=>{
 assert.ok(edit.includes('prisma.$transaction'));
 assert.ok(edit.includes('body.price !== undefined || body.mrp !== undefined'));
 assert.ok(edit.includes('tx.testPartnerOffer.updateMany'));
 assert.ok(edit.includes('tx.packagePartnerOffer.updateMany'));
 assert.ok(edit.includes('body.tat !== undefined'));
 assert.ok(edit.includes('partnerId: partner.id'));
});

test('package composition rejects invalid profile or ambiguous test membership',()=>{
 assert.ok(edit.includes("if (uniqueProfileIds.includes(id)) throw new Error('INVALID_INCLUDED_PROFILE')"));
 assert.ok(edit.includes("package: { packageType: 'PROFILE' }"));
 assert.ok(edit.includes("throw new Error('INVALID_INCLUDED_TEST')"));
 assert.ok(edit.includes('tx.packageItem.deleteMany'));
 assert.ok(edit.includes('tx.packageProfileItem.deleteMany'));
});

test('catalog edits produce an admin audit trail with changed fields and prior values',()=>{
 assert.ok(edit.includes('tx.adminAuditLog.create'));
 assert.ok(edit.includes("actorSource: 'TG_LABS_ADMIN'"));
 assert.ok(edit.includes("changedFields: Object.keys(body).filter(key => key !== 'partnerSlug')"));
 assert.ok(edit.includes('before: Object.fromEntries'));
});

test('admin search is partner-scoped and returns offer-specific patient-facing metadata',()=>{
 assert.ok(search.includes('partnerId: diagnosticPartner.id'));
 assert.ok(search.includes('take: 25'));
 for(const marker of ['price,','mrp: mrp ??','tatHours: tat ??','sampleTypes:','fastingNeeded:','homeCollectionCharge:']) assert.ok(search.includes(marker),marker);
});

test('partner metadata editor blocks activation and serviceability mutations',()=>{
 assert.ok(partner.includes('findBlockedPartnerMutationFields(raw)'));
 assert.ok(partner.includes('partnerActivationMutationMessage(blockedFields)'));
 assert.ok(partner.includes('{ status: 409 }'));
 assert.ok(partner.includes('Only approved partner metadata fields may be changed.'));
 assert.ok(partner.includes('tx.adminAuditLog.create'));
});
