'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductCard, { type PublicProduct } from './ProductCard';

export default function CatalogBrowser() {
  const params = useSearchParams();
  const [items, setItems] = useState<PublicProduct[]>([]);
  const [state, setState] = useState('Loading current catalog…');
  const [pincodeInput, setPincodeInput] = useState('');
  const [checkedPincode, setCheckedPincode] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState('');

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

  function updatePincode(value: string) {
    const next = value.replace(/\D/g, '').slice(0, 6);
    setPincodeInput(next);
    if (next !== checkedPincode) setCheckedPincode('');
    setPincodeStatus('');
  }

  function checkPincode() {
    if (!/^[1-9][0-9]{5}$/.test(pincodeInput)) {
      setCheckedPincode('');
      setPincodeStatus('Enter a valid 6-digit pincode.');
      return;
    }
    setCheckedPincode(pincodeInput);
    setPincodeStatus(`Pincode ${pincodeInput} selected. Test availability will be confirmed when you add each test.`);
  }

  return (
    <>
      <div className="catalogPincode">
        <label htmlFor="catalog-pincode"><b>Home collection pincode</b></label>
        <div className="catalogPincodeControls">
          <input
            id="catalog-pincode"
            inputMode="numeric"
            maxLength={6}
            placeholder="Enter 6-digit pincode"
            value={pincodeInput}
            onChange={(event) => updatePincode(event.target.value)}
          />
          <button type="button" className="btn primary" onClick={checkPincode}>Check availability</button>
        </div>
        <small>This pincode is entered once. Each selected test is then checked against the relevant lab before it is added to your cart.</small>
        {pincodeStatus && <span className="catalogPincodeStatus" role="status">{pincodeStatus}</span>}
      </div>
      {state && <div className="catalogState" role="status">{state}</div>}
      <div className="productGrid">
        {items.map((product) => (
          <ProductCard key={`${product.type}-${product.slug}`} product={product} pincode={checkedPincode} />
        ))}
      </div>
      <style>{`.catalogPincode{margin:18px 0 22px;padding:16px;border:1px solid #cfe6e1;border-radius:14px;background:#f5faf9;display:flex;gap:10px;align-items:center;flex-wrap:wrap}.catalogPincodeControls{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.catalogPincode input{min-width:240px;padding:11px 12px;border:1px solid #bfd8d2;border-radius:10px}.catalogPincode small,.catalogPincodeStatus{width:100%;color:#667a75}.catalogPincodeStatus{font-weight:700;color:#087f78}`}</style>
    </>
  );
}
