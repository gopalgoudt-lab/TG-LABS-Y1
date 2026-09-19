import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const detail = fs.readFileSync("components/catalog/CatalogDetail.tsx", "utf8");

test("patient detail add-to-cart uses containment-aware cart helper", () => {
  assert.match(detail, /addCatalogItemWithContainment/);
  assert.match(detail, /already-included/);
});

test("patient detail image action uses a safe image reference guard", () => {
  assert.match(detail, /safeImage/);
  assert.match(detail, /data:image\//);
  assert.match(detail, /https:\/\//);
  assert.doesNotMatch(detail, /href=\{product\.imageData\}/);
});
