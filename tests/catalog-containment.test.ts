import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveCoveredTestIds,
  findRedundantIndividualTests,
} from "../lib/catalog/containment";

type CartItem =
  | { kind: "test"; id: string }
  | { kind: "package"; id: string };

const composition = new Map<string, string[]>([
  ["profile-a", ["t1", "t2", "t2"]],
  ["package-b", ["t2", "t3"]],
]);

test("resolves unique underlying tests for selected profiles/packages", () => {
  const items: CartItem[] = [
    { kind: "package", id: "profile-a" },
    { kind: "package", id: "package-b" },
  ];
  assert.deepEqual([...resolveCoveredTestIds(items, composition)].sort(), ["t1", "t2", "t3"]);
});

test("finds an individual test already covered by a selected profile", () => {
  const items: CartItem[] = [
    { kind: "test", id: "t1" },
    { kind: "package", id: "profile-a" },
  ];
  assert.deepEqual(findRedundantIndividualTests(items, composition), ["t1"]);
});

test("keeps unrelated individual tests", () => {
  const items: CartItem[] = [
    { kind: "test", id: "t4" },
    { kind: "package", id: "profile-a" },
  ];
  assert.deepEqual(findRedundantIndividualTests(items, composition), []);
});

test("overlapping packages remain valid while only individual overlaps are redundant", () => {
  const items: CartItem[] = [
    { kind: "package", id: "profile-a" },
    { kind: "package", id: "package-b" },
    { kind: "test", id: "t2" },
  ];
  assert.deepEqual(findRedundantIndividualTests(items, composition), ["t2"]);
});
