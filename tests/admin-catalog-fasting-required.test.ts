import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("app/admin/catalog-editor/page.tsx", "utf8");
const search = fs.readFileSync("app/api/admin/catalog-editor/search/route.ts", "utf8");
const patch = fs.readFileSync("app/api/admin/catalog-editor/[kind]/[id]/route.ts", "utf8");

test("admin catalog editor exposes Fasting required Yes/No", () => {
  assert.match(page, /Fasting required/);
  assert.match(page, /<option value="yes">Yes<\/option>/);
  assert.match(page, /<option value="no">No<\/option>/);
  assert.match(page, /fastingNeeded/);
});

test("fasting requirement round-trips through search and PATCH", () => {
  assert.match(search, /fastingNeeded: test\.fastingNeeded/);
  assert.match(search, /fastingNeeded: catalogPackage\.fastingNeeded/);
  assert.match(patch, /fastingNeeded: z\.boolean\(\)\.optional\(\)/);
});

test("no schema migration is required because fastingNeeded already exists", () => {
  const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
  assert.match(schema, /fastingNeeded\s+Boolean\s+@default\(false\)/);
});
