'use client';

import { useEffect, useState } from 'react';
import { readCatalogCart } from '@/lib/catalog-cart';

export default function CartNav() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const refresh = () => setCount(readCatalogCart(localStorage.getItem('tglabs-cart')).length);
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('tglabs-cart-updated', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('tglabs-cart-updated', refresh);
    };
  }, []);

  return <a href="/cart">Cart{count ? ` (${count})` : ''}</a>;
}
