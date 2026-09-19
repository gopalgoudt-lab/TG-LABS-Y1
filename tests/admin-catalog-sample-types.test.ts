import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const page = fs.readFileSync(path.join(process.cwd(), "app/admin/catalog-editor/page.tsx"), "utf8");
const search = fs.readFileSync(path.join(process.cwd(), "app/api/admin/catalog-editor/search/route.ts"), "utf8");

test("admin catalog editor provides structured multi-select sample types", () => {
  for (const value of ["SERUM","EDTA","FLUORIDE","URINE","SODIUM CITRATE","SODIUM HEPARIN","LITHIUM HEPARIN","OTHER"]) assert.match(page, new RegExp(value));
  assert.match(page, /sampleTypes/);
  assert.match(page, /multiple/);
  assert.match(page, /sampleTypeOther/);
});

test("admin catalog editor loads and saves structured sample types", () => {
  assert.match(search, /sampleTypes:\s*test\.sampleTypes/);
  assert.match(search, /sampleTypeOther:\s*test\.sampleTypeOther/);
  assert.match(search, /sampleTypes:\s*catalogPackage\.sampleTypes/);
  assert.match(search, /sampleTypeOther:\s*catalogPackage\.sampleTypeOther/);
  assert.match(page, /sampleTypes:\s*form\.sampleTypes/);
  assert.match(page, /sampleTypeOther:/);
});
