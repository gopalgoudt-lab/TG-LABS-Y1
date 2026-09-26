'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Suggestion = {
  slug: string;
  name: string;
  type: 'TEST' | 'PROFILE' | 'PACKAGE';
  offers?: Array<{ price: number; partner: { slug?: string; name: string } }>;
};

function suggestionRank(item: Suggestion, query: string) {
  const name = item.name.toLocaleLowerCase();
  const q = query.trim().toLocaleLowerCase();
  const typeRank = item.type === 'PROFILE' ? 0 : item.type === 'TEST' ? 1 : 2;
  if (name === q) return typeRank;
  if (name.startsWith(q)) return 10 + typeRank;
  const words = name.split(/[^a-z0-9]+/).filter(Boolean);
  if (words.includes(q)) return 20 + typeRank;
  return 30 + typeRank;
}

function expandPartnerChoices(items: Suggestion[]) {
  return items.flatMap((item) =>
    item.offers?.length
      ? item.offers.map((offer) => ({ ...item, offers: [offer] }))
      : [item]
  );
}

function rankSuggestions(items: Suggestion[], query: string) {
  return [...items].sort((a, b) =>
    suggestionRank(a, query) - suggestionRank(b, query) ||
    (a.offers?.[0]?.price ?? Number.POSITIVE_INFINITY) - (b.offers?.[0]?.price ?? Number.POSITIVE_INFINITY) ||
    (a.offers?.[0]?.partner.name ?? '').localeCompare(b.offers?.[0]?.partner.name ?? '') ||
    a.name.localeCompare(b.name)
  );
}

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
        const encoded = encodeURIComponent(value);
        const [testResponse, catalogResponse] = await Promise.all([
          fetch(`/api/catalog?search=${encoded}&type=TEST&limit=8`, { signal: controller.signal, cache: 'no-store' }),
          fetch(`/api/catalog?search=${encoded}&limit=8`, { signal: controller.signal, cache: 'no-store' }),
        ]);
        const [testData, catalogData] = await Promise.all([testResponse.json(), catalogResponse.json()]);
        if (!testResponse.ok || !catalogResponse.ok) throw new Error('Search failed');
        const combined = [
          ...(Array.isArray(testData.products) ? testData.products : []),
          ...(Array.isArray(catalogData.products) ? catalogData.products : []),
        ].filter((item, index, all) => all.findIndex((candidate) => candidate.type === item.type && candidate.slug === item.slug) === index);
        setItems(rankSuggestions(expandPartnerChoices(combined), value).slice(0, 8));
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
                <button key={`${item.type}-${item.slug}-${offer?.partner.slug ?? offer?.partner.name ?? 'no-offer'}`} type="button" role="option" onClick={() => router.push(detailsHref(item))}>
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
