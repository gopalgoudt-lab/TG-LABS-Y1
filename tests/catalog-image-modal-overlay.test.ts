import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const detail = fs.readFileSync("components/catalog/CatalogDetail.tsx", "utf8");

test("details image dialog uses viewport-fixed overlay styles independent of utility CSS", () => {
  assert.match(detail, /position:\s*['"]fixed['"]/);
  assert.match(detail, /inset:\s*0/);
  assert.match(detail, /display:\s*['"]flex['"]/);
  assert.match(detail, /alignItems:\s*['"]center['"]/);
  assert.match(detail, /justifyContent:\s*['"]center['"]/);
  assert.match(detail, /zIndex:\s*\d+/);
});

test("details image is constrained to the viewport and close control remains available", () => {
  assert.match(detail, /maxHeight:\s*['"](?:90vh|calc\()/);
  assert.match(detail, /maxWidth:\s*['"](?:100%|\d+vw)/);
  assert.match(detail, /aria-label=["']Close test details image["']/);
});
