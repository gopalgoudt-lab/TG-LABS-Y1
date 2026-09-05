'use client';

import { useEffect, useMemo, useState } from 'react';
import BrandLogo from '@/components/BrandLogo';
import { readCatalogCart, type CatalogCartItem } from '@/lib/catalog-cart';

export default function CartPage() {
  const [items, setItems] = useState<CatalogCartItem[]>([]);

  useEffect(() => {
    setItems(readCatalogCart(localStorage.getItem('tglabs-cart')));
  }, []);

  const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.displayedPrice || 0), 0), [items]);

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
          {items.map((item) => <div key={item.productIdentifier} style={{display:'flex',justifyContent:'space-between',gap:18,padding:'16px 0',borderBottom:'1px solid #dce9e7'}}>
            <div><b>{item.productName || item.productIdentifier}</b><small style={{display:'block',marginTop:4}}>{item.partnerName || item.partnerIdentifier}{item.tat ? ` • ${item.tat}` : ''}{item.pincode ? ` • PIN ${item.pincode}` : ''}</small></div>
            <div style={{textAlign:'right'}}><b>₹{item.displayedPrice.toLocaleString('en-IN')}</b><br/><button type="button" className="btn" style={{marginTop:8}} onClick={() => remove(item.productIdentifier)}>Remove</button></div>
          </div>)}
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,margin:'18px 0'}}><b>{items.length} selected item{items.length === 1 ? '' : 's'}</b><strong style={{fontSize:26}}>₹{total.toLocaleString('en-IN')}</strong></div>
        <div style={{display:'flex',gap:12,flexWrap:'wrap'}}><a className="btn" href="/">← Add more tests</a><a className="btn primary" href="/checkout">Proceed to booking →</a></div>
      </>}
    </div>
  </main>;
}
