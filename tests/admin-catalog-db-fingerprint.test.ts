import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync("app/api/admin/catalog-editor/search/route.ts", "utf8");

test("authenticated admin catalog search exposes a non-secret database fingerprint", () => {
  assert.match(route, /databaseFingerprint/);
  assert.match(route, /current_database\(\)/);
  assert.match(route, /current_setting\('neon\.branch_id'/);
});

test("database fingerprint never exposes connection credentials", () => {
  assert.doesNotMatch(route, /NEON_DATABASE_URL/);
  assert.doesNotMatch(route, /process\.env/);
  assert.doesNotMatch(route, /password/i);
});
