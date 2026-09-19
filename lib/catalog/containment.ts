export type CatalogCartItem =
  | { kind: "test"; id: string }
  | { kind: "package"; id: string };

export type CatalogComposition = ReadonlyMap<string, readonly string[]>;

export function resolveCoveredTestIds(
  items: readonly CatalogCartItem[],
  composition: CatalogComposition,
): Set<string> {
  const covered = new Set<string>();

  for (const item of items) {
    if (item.kind !== "package") continue;
    for (const testId of composition.get(item.id) ?? []) {
      covered.add(testId);
    }
  }

  return covered;
}

export function findRedundantIndividualTests(
  items: readonly CatalogCartItem[],
  composition: CatalogComposition,
): string[] {
  const covered = resolveCoveredTestIds(items, composition);
  const redundant = new Set<string>();

  for (const item of items) {
    if (item.kind === "test" && covered.has(item.id)) {
      redundant.add(item.id);
    }
  }

  return [...redundant];
}
