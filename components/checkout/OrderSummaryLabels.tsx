'use client';

import { useEffect } from 'react';

type CatalogProduct = { slug?: string; name?: string };

export default function OrderSummaryLabels() {
  useEffect(() => {
    let observer: MutationObserver | null = null;
    let cancelled = false;

    async function hydrateLabels() {
      try {
        const response = await fetch('/api/catalog', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok || cancelled) return;

        const names = new Map<string, string>();
        for (const product of (Array.isArray(data.products) ? data.products : []) as CatalogProduct[]) {
          if (product.slug && product.name) names.set(product.slug, product.name);
        }

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
