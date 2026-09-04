'use client';

import { useEffect } from 'react';

type CatalogProduct = { slug?: string; name?: string };
type CatalogPage = { products?: CatalogProduct[]; nextCursor?: string | null };

export default function OrderSummaryLabels() {
  useEffect(() => {
    let observer: MutationObserver | null = null;
    let cancelled = false;

    async function hydrateLabels() {
      try {
        const names = new Map<string, string>();
        let cursor: string | null = null;
        let pageCount = 0;

        // The public catalog is paginated. The previous implementation only
        // inspected the first page, so products such as CBC could remain as
        // their internal slug in checkout even though the catalog had a name.
        do {
          const params = new URLSearchParams({ limit: '100' });
          if (cursor) params.set('cursor', cursor);
          const response = await fetch(`/api/catalog?${params.toString()}`, { cache: 'no-store' });
          const data = (await response.json()) as CatalogPage;
          if (!response.ok || cancelled) return;

          for (const product of Array.isArray(data.products) ? data.products : []) {
            if (product.slug && product.name) names.set(product.slug, product.name);
          }

          cursor = typeof data.nextCursor === 'string' && data.nextCursor ? data.nextCursor : null;
          pageCount += 1;
        } while (cursor && pageCount < 20 && !cancelled);

        const apply = () => {
          document.querySelectorAll<HTMLElement>('.orderSummary .summaryRow > span').forEach((row) => {
            const first = row.firstChild;
            if (!first || first.nodeType !== Node.TEXT_NODE) return;
            const current = first.textContent?.trim() ?? '';
            const friendly = names.get(current);
            if (friendly && friendly !== current) first.textContent = friendly;
          });
        };

        apply();
        observer = new MutationObserver(apply);
        const summary = document.querySelector('.orderSummary');
        if (summary) observer.observe(summary, { childList: true, subtree: true });
      } catch {
        // Display enhancement only; checkout must remain usable if catalog lookup fails.
      }
    }

    hydrateLabels();
    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, []);

  return null;
}
