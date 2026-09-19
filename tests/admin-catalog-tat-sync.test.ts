import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const page = fs.readFileSync(path.join(process.cwd(), "app/admin/catalog-editor/page.tsx"), "utf8");
const route = fs.readFileSync(path.join(process.cwd(), "app/api/admin/catalog-editor/[kind]/[id]/route.ts"), "utf8");

test("admin editor sends selected partner when saving catalog metadata", () => {
  assert.match(page, /partnerSlug:\s*form\.partner/);
});

test("catalog TAT update synchronizes only the selected partner offer", () => {
  assert.match(route, /partnerSlug:\s*z\.string/);
  assert.match(route, /diagnosticPartner\.findFirst/);
  assert.match(route, /testPartnerOffer\.updateMany/);
  assert.match(route, /packagePartnerOffer\.updateMany/);
  assert.match(route, /partnerId:\s*partner\.id/);
  assert.match(route, /tat:\s*body\.tat/);
});
