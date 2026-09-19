import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const editor = fs.readFileSync("components/admin/CatalogEditor.tsx", "utf8");
const route = fs.readFileSync("app/api/admin/catalog-editor/[kind]/[id]/route.ts", "utf8");

test("admin package editor exposes controlled PROFILE/PACKAGE classification", () => {
  assert.match(editor, /packageType/);
  assert.match(editor, /PROFILE/);
  assert.match(editor, /PACKAGE/);
});

test("admin catalog API validates and persists packageType without activation controls", () => {
  assert.match(route, /packageType/);
  assert.match(route, /z\.enum\(\["PACKAGE",\s*"PROFILE"\]\)/);
  assert.doesNotMatch(route, /bookingEnabled\s*:/);
  assert.doesNotMatch(route, /operationalEnabled\s*:/);
  assert.doesNotMatch(route, /displayEnabled\s*:/);
});
