'use client';

import { FormEvent, useState } from 'react';

export const dynamic = 'force-dynamic';

type CatalogKind = 'test' | 'package';

type EditorForm = {
  id: string;
  partner: string;
  name: string;
  mrp: string;
  price: string;
  description: string;
  sampleType: string;
  preparation: string;
  tat: string;
};

const emptyForm: EditorForm = {
  id: '', partner: '', name: '', mrp: '', price: '', description: '', sampleType: '', preparation: '', tat: '',
};

export default function AdminCatalogEditorPage() {
  const [kind, setKind] = useState<CatalogKind>('test');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<EditorForm>(emptyForm);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function searchCatalog(event: FormEvent) {
    event.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const response = await fetch(`/api/admin/catalog-editor/search?partner=${encodeURIComponent(form.partner)}&kind=${kind}&q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      const item = data.items?.[0];
      if (!item) throw new Error('No matching catalog item found');
      setForm({
        id: String(item.id ?? ''), partner: String(item.partnerSlug ?? form.partner ?? ''), name: String(item.name ?? ''),
        mrp: String(item.mrp ?? ''), price: String(item.price ?? ''), description: String(item.description ?? ''),
        sampleType: String(item.sampleType ?? ''), preparation: String(item.preparation ?? ''), tat: String(item.tatHours ?? ''),
      });
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Error searching catalog');
    }
  }

  async function saveChanges(event: FormEvent) {
    event.preventDefault();
    if (!form.id) return;
    setStatus('saving');
    setMessage('');
    try {
      const response = await fetch(`/api/admin/catalog-editor/${kind}/${form.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          mrp: form.mrp === '' ? null : Number(form.mrp),
          price: form.price === '' ? null : Number(form.price),
          description: form.description,
          sampleType: form.sampleType,
          preparation: form.preparation,
          tat: form.tat === '' ? null : form.tat,
        }),
      });
      if (!response.ok) throw new Error('Save failed');
      setStatus('success');
      setMessage('Success: catalog changes saved and audited.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? `Error: ${error.message}` : 'Error saving catalog changes');
    }
  }

  const setField = (field: keyof EditorForm, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const margin = form.mrp && form.price ? Number(form.price) - Number(form.mrp) : null;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide">Admin catalog controls</p>
        <h1 className="text-3xl font-bold">Test &amp; Package Editor</h1>
        <p className="mt-2 text-sm text-slate-600">Edit approved descriptive and pricing metadata. Activation, booking and serviceability remain protected.</p>
      </div>

      <form onSubmit={searchCatalog} className="rounded-xl border p-5 space-y-4">
        <h2 className="text-xl font-semibold">Search catalog</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label>Partner<select className="mt-1 w-full rounded border p-2" value={form.partner} onChange={(e) => setField('partner', e.target.value)}><option value="">Select partner</option><option value="tg-labs-partner">Metropolis</option><option value="sagepath-labs">Sagepath Labs</option><option value="thyrocare">Thyrocare</option></select></label>
          <label>Type<select className="mt-1 w-full rounded border p-2" value={kind} onChange={(e) => setKind(e.target.value as CatalogKind)}><option value="test">Test</option><option value="package">Package</option></select></label>
          <label>Search<input className="mt-1 w-full rounded border p-2" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Test or Package name" /></label>
        </div>
        <button className="rounded bg-blue-600 px-4 py-2 text-white" type="submit" disabled={status === 'loading' || !form.partner || !query.trim()}>{status === 'loading' ? 'Searching…' : 'Search catalog'}</button>
      </form>

      <form onSubmit={saveChanges} className="rounded-xl border p-5 space-y-4">
        <h2 className="text-xl font-semibold">{kind === 'test' ? 'Tests' : 'Packages'} editor</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label>Name<input className="mt-1 w-full rounded border p-2" value={form.name} onChange={(e) => setField('name', e.target.value)} /></label>
          <label>MRP<input type="number" className="mt-1 w-full rounded border p-2" value={form.mrp} onChange={(e) => setField('mrp', e.target.value)} /></label>
          <label>Selling price<input type="number" className="mt-1 w-full rounded border p-2" value={form.price} onChange={(e) => setField('price', e.target.value)} /></label>
          <label>Sample type<input className="mt-1 w-full rounded border p-2" value={form.sampleType} onChange={(e) => setField('sampleType', e.target.value)} /></label>
          <label>Preparation<input className="mt-1 w-full rounded border p-2" value={form.preparation} onChange={(e) => setField('preparation', e.target.value)} /></label>
          <label>TAT<input className="mt-1 w-full rounded border p-2" value={form.tat} onChange={(e) => setField('tat', e.target.value)} placeholder="e.g. 24 hours or 11:00/18:00" /></label>
        </div>
        <label className="block">Description<textarea className="mt-1 min-h-28 w-full rounded border p-2" value={form.description} onChange={(e) => setField('description', e.target.value)} /></label>
        <section className="rounded border p-4"><h3 className="font-semibold">Pricing &amp; Gross margin</h3><p className="text-sm">Gross margin: {margin === null ? '—' : margin}. Informational only; activation, booking and serviceability remain protected.</p></section>
        <button className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50" type="submit" disabled={!form.id || status === 'saving'}>{status === 'saving' ? 'Saving…' : 'Save changes'}</button>
        {message && <p role="status" className={status === 'error' ? 'text-red-700' : 'text-green-700'}>{message}</p>}
      </form>
    </main>
  );
}
