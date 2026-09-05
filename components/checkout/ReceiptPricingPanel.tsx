'use client';

import { useEffect, useMemo, useState } from 'react';
import { readCatalogCart, type CatalogCartItem } from '@/lib/catalog-cart';

function money(value: number) {
  return `₹${value.toLocaleString('en-IN')}`;
}

export default function ReceiptPricingPanel() {
  const [items, setItems] = useState<CatalogCartItem[]>([]);

  useEffect(() => {
    setItems(readCatalogCart(localStorage.getItem('tglabs-cart')));
  }, []);

  const discountTotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.displayedPrice || 0), 0), [items]);
  const allMrpKnown = items.length > 0 && items.every((item) => Number(item.mrp || 0) > 0);
  const mrpTotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.mrp || 0), 0), [items]);
  const savings = allMrpKnown ? Math.max(0, mrpTotal - discountTotal) : null;

  if (!items.length) return null;

  return <aside className="card receiptPricing" aria-label="Payment price breakdown">
    <small>PAYMENT PRICE BREAKDOWN</small>
    {items.map((item) => {
      const mrp = Number(item.mrp || 0);
      const price = Number(item.displayedPrice || 0);
      return <div className="receiptPriceRow" key={`${item.productType}-${item.productIdentifier}`}>
        <span><b>{item.productName || item.productIdentifier}</b><small>{item.partnerName || item.partnerIdentifier}</small></span>
        <span><small>MRP {mrp > 0 ? money(mrp) : 'not supplied'}</small><b>{money(price)}</b></span>
      </div>;
    })}
    <div className="receiptTotals">
      <div><span>Total MRP</span><b>{allMrpKnown ? money(mrpTotal) : 'Not fully available'}</b></div>
      {savings !== null && <div><span>Total discount</span><b>-{money(savings)}</b></div>}
      <div className="receiptPayable"><span>Diagnostic amount payable</span><b>{money(discountTotal)}</b></div>
    </div>
    <small className="receiptNote">These selected-test price details remain visible with the booking/payment confirmation. Any approved printed-report fee is added separately at checkout.</small>
    <style>{`.receiptPricing{max-width:720px;margin:22px auto;padding:24px}.receiptPriceRow{display:flex;justify-content:space-between;gap:18px;padding:13px 0;border-bottom:1px solid #e1ebe9}.receiptPriceRow>span{display:grid;gap:4px}.receiptPriceRow>span:last-child{text-align:right}.receiptPriceRow small{color:#667a75}.receiptTotals{display:grid;gap:8px;padding-top:14px}.receiptTotals>div{display:flex;justify-content:space-between;gap:16px}.receiptPayable{font-size:18px;padding-top:9px;border-top:1px solid #cfe0dc}.receiptNote{display:block;margin-top:14px;line-height:1.45;color:#667a75}`}</style>
  </aside>;
}
