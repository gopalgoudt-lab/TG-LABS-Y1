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
          if (detail.textContent !== text) detail.textContent = text;
        }
      });
    };

    const scheduleApply = () => requestAnimationFrame(apply);

    // Apply after initial hydration and a couple of bounded follow-up passes.
    // Avoid MutationObserver here: checkout is controlled by React and an
    // observer that mutates the same subtree can create a render/mutation loop.
    scheduleApply();
    const t1 = window.setTimeout(scheduleApply, 150);
    const t2 = window.setTimeout(scheduleApply, 600);

    // React rerenders checkout as the patient edits fields. Re-apply only in
    // response to user interactions rather than continuously observing DOM.
    document.addEventListener('input', scheduleApply, true);
    document.addEventListener('change', scheduleApply, true);
    document.addEventListener('click', scheduleApply, true);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      document.removeEventListener('input', scheduleApply, true);
      document.removeEventListener('change', scheduleApply, true);
      document.removeEventListener('click', scheduleApply, true);
    };
  }, []);

  return null;
}
