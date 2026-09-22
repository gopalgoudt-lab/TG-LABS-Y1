import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

test.after(async () => {
  await prisma.$disconnect();
});

test("KIDPRO authoritative Thyrocare offer matches approved TG Labs selling price ₹600", async () => {
  const item = await prisma.diagnosticPackage.findUnique({
    where: { slug: "thyrocare-profile-kidpro-49" },
    include: { partnerOffers: { include: { partner: true } } },
  });
  assert.ok(item, "KIDPRO must exist");
  assert.equal(item.price, 600);
  const offer = item.partnerOffers.find((candidate) => candidate.partner.name === "Thyrocare");
  assert.ok(offer, "KIDPRO Thyrocare offer must exist");
  assert.equal(offer.price, 600, "authoritative Thyrocare offer must match approved selling price");
});

test("24-hour urine sample wording is not stored as 25 Hrs Urine", async () => {
  for (const slug of ["sagepath-cb079", "sagepath-cb218"]) {
    const item = await prisma.diagnosticTest.findUnique({ where: { slug } });
    assert.ok(item, `${slug} must exist`);
    const sampleText = item.sampleTypes.join(" ");
    assert.match(sampleText, /24\s*Hrs?\s*Urine/i);
    assert.doesNotMatch(sampleText, /25\s*Hrs?\s*Urine/i);
  }
});
