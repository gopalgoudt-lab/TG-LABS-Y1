'use client';

import { useEffect } from 'react';
import { readCatalogCart } from '@/lib/catalog-cart';

export default function OrderSummaryLabels() {
  useEffect(() => {
    const cart = readCatalogCart(localStorage.getItem('tglabs-cart'));
    const names = new Map(
      cart
        .filter((item) => item.productName)
        .map((item) => [item.productIdentifier, item.productName as string]),
    );

    const partnerNames = new Map(
      cart
        .filter((item) => item.partnerName)
        .map((item) => [item.partnerIdentifier, item.partnerName as string]),
    );

    const apply = () => {
      document.querySelectorAll<HTMLElement>('.orderSummary .summaryRow > span').forEach((row) => {
        const first = row.firstChild;
        if (first && first.nodeType === Node.TEXT_NODE) {
          const current = first.textContent?.trim() ?? '';
          const friendly = names.get(current);
          if (friendly && friendly !== current) first.textContent = friendly;
        }

        const detail = row.querySelector('small');
        if (detail) {
          let text = detail.textContent ?? '';
          for (const [slug, friendly] of partnerNames) {
            if (text.includes(slug)) text = text.replace(slug, friendly);
          }
          detail.textContent = text;
        }
      });
    };

    apply();
    const summary = document.querySelector('.orderSummary');
    if (!summary) return;

    const observer = new MutationObserver(apply);
    observer.observe(summary, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
