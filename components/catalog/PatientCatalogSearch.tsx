'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Suggestion = {
  slug: string;
  name: string;
  type: 'TEST' | 'PROFILE' | 'PACKAGE';
  offers?: Array<{ price: number; partner: { name: string } }>;
};

function detailsHref(item: Suggestion) {
  if (item.type === 'TEST') return `/tests/${encodeURIComponent(item.slug)}`;
  return `/profiles/${encodeURIComponent(item.slug)}`;
}

export default function PatientCatalogSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) {
      requestRef.current?.abort();
      setItems([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      setLoading(true);
      try {
        const response = await fetch(`/api/catalog?search=${encodeURIComponent(value)}&limit=8`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        const data = await response.json();
        if (!response.ok) throw new Error('Search failed');
        setItems(Array.isArray(data.products) ? data.products : []);
        setOpen(true);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setItems([]);
          setOpen(false);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    setOpen(false);
    router.push(`/?q=${encodeURIComponent(value)}#catalog`);
  }

  return (
    <form className="refSearch patientCatalogSearch" onSubmit={submit}>
      <span aria-hidden="true">⌕</span>
      <div className="patientSearchField">
        <input
          name="q"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => { if (items.length) setOpen(true); }}
          placeholder="Search for tests, packages or health conditions..."
          aria-label="Search tests and packages"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="patient-catalog-suggestions"
        />
        {open && (
          <div id="patient-catalog-suggestions" className="patientSearchSuggestions" role="listbox">
            {items.length ? items.map((item) => {
              const offer = item.offers?.[0];
              return (
                <button key={`${item.type}-${item.slug}`} type="button" role="option" onClick={() => router.push(detailsHref(item))}>
                  <span className="patientSuggestionName">{item.name}</span>
                  <span className="patientSuggestionMeta">
                    {item.type === 'TEST' ? 'Test' : item.type === 'PROFILE' ? 'Profile' : 'Package'}
                    {offer ? ` · ${offer.partner.name} · ₹${offer.price}` : ''}
                  </span>
                </button>
              );
            }) : !loading ? <p>No matching tests or packages found.</p> : null}
          </div>
        )}
      </div>
      <button type="submit">{loading ? 'Searching…' : 'Search Tests'}</button>
    </form>
  );
}
