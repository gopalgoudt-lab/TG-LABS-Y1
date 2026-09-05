'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductCard, { type PublicProduct } from './ProductCard';

export default function CatalogBrowser() {
  const params = useSearchParams();
  const [items, setItems] = useState<PublicProduct[]>([]);
  const [state, setState] = useState('Loading current catalog…');
  const [pincode, setPincode] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setState('Loading current catalog…');
    fetch(`/api/catalog?${params}`, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error();
        setItems(data.products ?? []);
        setState((data.products ?? []).length ? '' : 'No eligible products match these filters.');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setState('Catalog is temporarily unavailable.');
      });
    return () => controller.abort();
  }, [params]);

  return (
    <>
      <div className="catalogPincode">
        <label htmlFor="catalog-pincode"><b>Home collection pincode</b></label>
        <input
          id="catalog-pincode"
          inputMode="numeric"
          maxLength={6}
          placeholder="Enter 6-digit pincode once"
          value={pincode}
          onChange={(event) => setPincode(event.target.value.replace(/\D/g, '').slice(0, 6))}
        />
        <small>This pincode will be used when checking any test you add to the cart.</small>
      </div>
      {state && <div className="catalogState" role="status">{state}</div>}
      <div className="productGrid">
        {items.map((product) => (
          <ProductCard key={`${product.type}-${product.slug}`} product={product} pincode={pincode} />
        ))}
      </div>
      <style>{`.catalogPincode{margin:18px 0 22px;padding:16px;border:1px solid #cfe6e1;border-radius:14px;background:#f5faf9;display:flex;gap:10px;align-items:center;flex-wrap:wrap}.catalogPincode input{min-width:240px;padding:11px 12px;border:1px solid #bfd8d2;border-radius:10px}.catalogPincode small{width:100%;color:#667a75}`}</style>
    </>
  );
}
