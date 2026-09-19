import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("app/admin/catalog-editor/page.tsx", "utf8");

test("catalog editor provides an image file picker with safe image types", () => {
  assert.match(page, /type=["']file["']/);
  assert.match(page, /accept=["']image\/jpeg,image\/png,image\/webp["']/);
});

test("catalog editor validates image size and converts approved files to data URLs", () => {
  assert.match(page, /MAX_IMAGE_BYTES/);
  assert.match(page, /file\.size\s*>\s*MAX_IMAGE_BYTES/);
  assert.match(page, /FileReader/);
  assert.match(page, /readAsDataURL/);
  assert.match(page, /setField\(['"]imageData["']/);
});

test("catalog editor previews selected image before save", () => {
  assert.match(page, /form\.imageData/);
  assert.match(page, /<img[^>]+src=\{form\.imageData\}/s);
});
