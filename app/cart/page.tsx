'use client';

import { useEffect, useMemo, useState } from 'react';
import BrandLogo from '@/components/BrandLogo';
import { readCatalogCart, type CatalogCartItem } from '@/lib/catalog-cart';

function money(value: number) {
  return `₹${value.toLocaleString('en-IN')}`;
}

export default function CartPage() {
  const [items, setItems] = useState<CatalogCartItem[]>([]);

  useEffect(() => {
    setItems(readCatalogCart(localStorage.getItem('tglabs-cart')));
  }, []);

  const discountTotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.displayedPrice || 0), 0), [items]);
  const allMrpKnown = items.length > 0 && items.every((item) => Number(item.mrp || 0) > 0);
  const mrpTotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.mrp || 0), 0), [items]);
  const savings = allMrpKnown ? Math.max(0, mrpTotal - discountTotal) : null;

  function save(next: CatalogCartItem[]) {
    setItems(next);
    localStorage.setItem('tglabs-cart', JSON.stringify(next));
    window.dispatchEvent(new Event('tglabs-cart-updated'));
  }

  function remove(productIdentifier: string) {
    save(items.filter((item) => item.productIdentifier !== productIdentifier));
  }

  return <main className="dashboard">
    <a href="/" className="standaloneBrand" aria-label="TG Labs home"><BrandLogo className="brandLogoStandalone" priority /></a>
    <div className="card" style={{maxWidth:900,margin:'34px auto',padding:28}}>
      <span className="ey">YOUR CART</span>
      <h1>Review your selected tests.</h1>
      {!items.length ? <div><p>Your cart is empty.</p><a className="btn primary" href="/">Browse tests</a></div> : <>
        <div style={{display:'grid',gap:12,margin:'22px 0'}}>
          {items.map((item) => {
            const mrp = Number(item.mrp || 0);
            const price = Number(item.displayedPrice || 0);
            const itemSavings = mrp > 0 ? Math.max(0, mrp - price) : null;
            const discountPercent = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
            return <div key={item.productIdentifier} style={{display:'flex',justifyContent:'space-between',gap:18,padding:'16px 0',borderBottom:'1px solid #dce9e7'}}>
              <div>
                <b>{item.productName || item.productIdentifier}</b>
                <small style={{display:'block',marginTop:4}}>{item.partnerName || item.partnerIdentifier}{item.tat ? ` • ${item.tat}` : ''}{item.pincode ? ` • PIN ${item.pincode}` : ''}</small>
                <small style={{display:'block',marginTop:8}}>
                  MRP: {mrp > 0 ? money(mrp) : 'Not supplied'} • Discount price: <b>{money(price)}</b>
                  {discountPercent > 0 ? ` • ${discountPercent}% off` : ''}
                  {itemSavings !== null && itemSavings > 0 ? ` • You save ${money(itemSavings)}` : ''}
                </small>
              </div>
              <div style={{textAlign:'right'}}><b>{money(price)}</b><br/><button type="button" className="btn" style={{marginTop:8}} onClick={() => remove(item.productIdentifier)}>Remove</button></div>
            </div>;
          })}
        </div>
        <div style={{borderTop:'1px solid #dce9e7',paddingTop:16,marginTop:8,display:'grid',gap:8}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:16}}><span>Selected items</span><b>{items.length}</b></div>
          <div style={{display:'flex',justifyContent:'space-between',gap:16}}><span>Total MRP</span><b>{allMrpKnown ? money(mrpTotal) : 'Not fully available'}</b></div>
          {savings !== null && <div style={{display:'flex',justifyContent:'space-between',gap:16}}><span>Total discount</span><b>-{money(savings)}</b></div>}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,paddingTop:8,borderTop:'1px solid #dce9e7'}}><strong>Total amount</strong><strong style={{fontSize:26}}>{money(discountTotal)}</strong></div>
        </div>
        <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:18}}><a className="btn" href="/">← Add more tests</a><a className="btn primary" href="/checkout">Proceed to booking →</a></div>
      </>}
    </div>
  </main>;
}
