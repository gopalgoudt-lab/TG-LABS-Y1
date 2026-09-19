import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "components/catalog/CatalogDetail.tsx"), "utf8");

test("catalog detail derives patient-facing terminology from product type", () => {
  assert.match(source, /product\.type\s*===\s*['"]PROFILE['"]/);
  assert.match(source, /profile/i);
  assert.match(source, /package/i);
  assert.match(source, /About \{itemNoun\}/);
  assert.match(source, /What does \{product\.name\} \{measureVerb\}/);
});

test("catalog detail image and accessibility labels use dynamic terminology", () => {
  assert.match(source, /View \{itemNoun\} details/);
  assert.match(source, /aria-label=\{`[^`]*\$\{itemNounTitle\}/);
  assert.match(source, /alt=\{`[^`]*\$\{itemNoun\}[^`]*`\}/);
});
