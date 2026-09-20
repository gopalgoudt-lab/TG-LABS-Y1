'use client';

import { FormEvent, useState } from 'react';

export const dynamic = 'force-dynamic';

type CatalogKind = 'test' | 'package';
type EditorMode = 'TEST' | 'PROFILE' | 'PACKAGE';

type EditorForm = {
  id: string;
  partner: string;
  name: string;
  mrp: string;
  price: string;
  description: string;
  sampleTypes: string[];
  sampleTypeOther: string;
  preparation: string;
  fastingNeeded: boolean;
  tat: string;
  imageData: string;
  includedTestIds: string;
  packageType: 'PACKAGE' | 'PROFILE';
};

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const emptyForm: EditorForm = {
  id: '', partner: '', name: '', mrp: '', price: '', description: '', sampleTypes: [], sampleTypeOther: '', preparation: '', fastingNeeded: false, tat: '', imageData: '', includedTestIds: '', packageType: 'PACKAGE',
};

function ProfileSearchTests({ partner, profile }: { partner: string; profile: { id: string; name: string } }) {
  const [tests, setTests] = useState<Array<{ id: string; name: string }> | null>(null);
  const [error, setError] = useState('');

  async function loadTests() {
    if (tests !== null || error) return;
    try {
      const response = await fetch(`/api/admin/catalog-editor/search?partner=${encodeURIComponent(partner)}&kind=package&packageType=PROFILE&q=${encodeURIComponent(profile.name)}`);
      if (!response.ok) throw new Error('Profile details failed');
      const data = await response.json();
      const exact = (data.items ?? []).find((item: { id: string }) => String(item.id) === profile.id);
      setTests(Array.isArray(exact?.includedTests) ? exact.includedTests.map((test: { id: string; name: string }) => ({ id: String(test.id), name: String(test.name) })) : []);
    } catch {
      setError('Could not load included tests.');
    }
  }

  return <div className="mt-2 text-sm" onClick={() => void loadTests()} onFocus={() => void loadTests()}>{error ? <p className="text-red-700">{error}</p> : tests === null ? <button type="button" className="rounded border px-2 py-1" onClick={() => void loadTests()}>Load tests</button> : tests.length ? tests.map(test => <p key={test.id}>{test.name}</p>) : <p className="text-slate-600">No tests linked to this profile.</p>}</div>;
}

export default function AdminCatalogEditorPage() {
  const [kind, setKind] = useState<CatalogKind>('test');
  const [editorMode, setEditorMode] = useState<EditorMode>('TEST');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<EditorForm>(emptyForm);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [includedTestQuery, setIncludedTestQuery] = useState('');
  const [includedTestResults, setIncludedTestResults] = useState<Array<{ id: string; name: string }>>([]);
  const [includedProfileQuery, setIncludedProfileQuery] = useState('');
  const [includedProfileResults, setIncludedProfileResults] = useState<Array<{ id: string; name: string; tests: Array<{ id: string; name: string }> }>>([]);
  const [selectedProfiles, setSelectedProfiles] = useState<Array<{ id: string; name: string; tests: Array<{ id: string; name: string }> }>>([]);

  async function searchCatalog(event: FormEvent) {
    event.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const response = await fetch(`/api/admin/catalog-editor/search?partner=${encodeURIComponent(form.partner)}&kind=${kind}${kind === 'package' ? `&packageType=${editorMode}` : ''}&q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      const item = data.items?.[0];
      if (!item) throw new Error('No matching catalog item found');
      setForm({
        id: String(item.id ?? ''), partner: String(item.partnerSlug ?? form.partner ?? ''), name: String(item.name ?? ''),
        mrp: String(item.mrp ?? ''), price: String(item.price ?? ''), description: String(item.description ?? ''),
        sampleTypes: Array.isArray(item.sampleTypes) ? item.sampleTypes.map(String) : [], sampleTypeOther: String(item.sampleTypeOther ?? ''), preparation: String(item.preparation ?? ''), fastingNeeded: Boolean(item.fastingNeeded), tat: String(item.tatHours ?? ''),
        imageData: String(item.imageData ?? ''), includedTestIds: Array.isArray(item.includedTestIds) ? item.includedTestIds.join(', ') : '',
        packageType: item.packageType === 'PROFILE' ? 'PROFILE' : 'PACKAGE',
      });
      setSelectedProfiles(Array.isArray(item.includedProfiles) ? item.includedProfiles : []);
      setEditorMode(kind === 'test' ? 'TEST' : item.packageType === 'PROFILE' ? 'PROFILE' : 'PACKAGE');
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Error searching catalog');
    }
  }

  async function searchIncludedTests() {
    if (!form.partner || !includedTestQuery.trim()) return;
    try {
      const response = await fetch(`/api/admin/catalog-editor/search?partner=${encodeURIComponent(form.partner)}&kind=test&q=${encodeURIComponent(includedTestQuery)}`);
      if (!response.ok) throw new Error('Included-test search failed');
      const data = await response.json();
      setIncludedTestResults((data.items ?? []).map((item: { id: string; name: string }) => ({ id: String(item.id), name: String(item.name) })));
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? `Error: ${error.message}` : 'Error searching included tests');
    }
  }

  function addIncludedTest(test: { id: string; name: string }) {
    const ids = form.includedTestIds.split(',').map(value => value.trim()).filter(Boolean);
    if (!ids.includes(test.id)) ids.push(test.id);
    setForm(current => ({ ...current, includedTestIds: ids.join(', ') }));
    setIncludedTestQuery('');
    setIncludedTestResults([]);
  }

  function removeIncludedTest(testId: string) {
    const ids = form.includedTestIds.split(',').map(value => value.trim()).filter(Boolean).filter(id => id !== testId);
    setForm(current => ({ ...current, includedTestIds: ids.join(', ') }));
  }

  async function searchIncludedProfiles() {
    if (!form.partner || !includedProfileQuery.trim()) return;
    try {
      const response = await fetch(`/api/admin/catalog-editor/search?partner=${encodeURIComponent(form.partner)}&kind=package&packageType=PROFILE&q=${encodeURIComponent(includedProfileQuery)}`);
      if (!response.ok) throw new Error('Included-profile search failed');
      const data = await response.json();
      setIncludedProfileResults((data.items ?? []).map((item: { id: string; name: string; includedTestIds?: string[]; includedProfiles?: unknown[] }) => ({
        id: String(item.id),
        name: String(item.name),
        tests: [],
      })));
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? `Error: ${error.message}` : 'Error searching included profiles');
    }
  }

  async function addIncludedProfile(profile: { id: string; name: string }) {
    if (selectedProfiles.some(item => item.id === profile.id)) return;
    try {
      const response = await fetch(`/api/admin/catalog-editor/search?partner=${encodeURIComponent(form.partner)}&kind=package&packageType=PROFILE&q=${encodeURIComponent(profile.name)}`);
      if (!response.ok) throw new Error('Profile details failed');
      const data = await response.json();
      const exact = (data.items ?? []).find((item: { id: string }) => String(item.id) === profile.id);
      const tests = Array.isArray(exact?.includedTests) ? exact.includedTests.map((test: { id: string; name: string }) => ({ id: String(test.id), name: String(test.name) })) : [];
      setSelectedProfiles(current => [...current, { id: profile.id, name: profile.name, tests }]);
      setIncludedProfileQuery('');
      setIncludedProfileResults([]);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? `Error: ${error.message}` : 'Error loading profile');
    }
  }

  function removeIncludedProfile(profileId: string) {
    setSelectedProfiles(current => current.filter(profile => profile.id !== profileId));
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
          partnerSlug: form.partner,
          name: form.name,
          mrp: form.mrp === '' ? null : Number(form.mrp),
          price: form.price === '' ? null : Number(form.price),
          description: form.description,
          sampleTypes: form.sampleTypes,
          sampleTypeOther: form.sampleTypes.includes('OTHER') ? form.sampleTypeOther : null,
          preparation: form.preparation,
          fastingNeeded: form.fastingNeeded,
          tat: form.tat === '' ? null : form.tat,
          imageData: form.imageData.trim() === '' ? null : form.imageData.trim(),
          ...(kind === 'package' ? { packageType: form.packageType, includedTestIds: form.includedTestIds.split(',').map(value => value.trim()).filter(Boolean), includedProfileIds: selectedProfiles.map(profile => profile.id) } : {}),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Save failed');
      }
      setStatus('success');
      setMessage('Success: catalog changes saved and audited.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? `Error: ${error.message}` : 'Error saving catalog changes');
    }
  }

  const setField = (field: keyof EditorForm, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const sampleTypeOptions = ['SERUM', 'EDTA', 'FLUORIDE', 'URINE', 'SODIUM CITRATE', 'SODIUM HEPARIN', 'LITHIUM HEPARIN', 'OTHER'] as const;
  const toggleSampleType = (value: string) => setForm((current) => ({
    ...current,
    sampleTypes: current.sampleTypes.includes(value) ? current.sampleTypes.filter(item => item !== value) : [...current.sampleTypes, value],
    sampleTypeOther: value === 'OTHER' && current.sampleTypes.includes('OTHER') ? '' : current.sampleTypeOther,
  }));
  async function selectImage(file: File | undefined) {
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setStatus('error'); setMessage('Error: Choose a JPEG, PNG or WebP image.'); return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setStatus('error'); setMessage('Error: Image must be 2 MB or smaller.'); return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      setField('imageData', reader.result);
      setStatus('idle'); setMessage('Image ready. Save changes to apply it.');
    };
    reader.onerror = () => { setStatus('error'); setMessage('Error: Could not read image.'); };
    reader.readAsDataURL(file);
  }

  const margin = form.mrp && form.price ? Number(form.price) - Number(form.mrp) : null;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide">Admin catalog controls</p>
        <h1 className="text-3xl font-bold">Test, Profile &amp; Package Editor</h1>
        <p className="mt-2 text-sm text-slate-600">Edit approved descriptive and pricing metadata. Activation, booking and serviceability remain protected.</p>
      </div>

      <form onSubmit={searchCatalog} className="rounded-xl border p-5 space-y-4">
        <h2 className="text-xl font-semibold">Search catalog</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label>Partner<select className="mt-1 w-full rounded border p-2" value={form.partner} onChange={(e) => setField('partner', e.target.value)}><option value="">Select partner</option><option value="tg-labs-partner">Metropolis</option><option value="sagepath-labs">Sagepath Labs</option><option value="thyrocare">Thyrocare</option></select></label>
          <label>Edit<select className="mt-1 w-full rounded border p-2" value={editorMode} onChange={(e) => { const mode = e.target.value as EditorMode; setEditorMode(mode); setKind(mode === 'TEST' ? 'test' : 'package'); setForm(current => ({ ...current, id: '', packageType: mode === 'PROFILE' ? 'PROFILE' : 'PACKAGE' })); setSelectedProfiles([]); }}><option value="TEST">Test</option><option value="PROFILE">Profile</option><option value="PACKAGE">Package</option></select></label>
          <label>Search<input className="mt-1 w-full rounded border p-2" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={editorMode === 'TEST' ? 'Test name' : editorMode === 'PROFILE' ? 'Profile name' : 'Package name'} /></label>
        </div>
        <button className="rounded bg-blue-600 px-4 py-2 text-white" type="submit" disabled={status === 'loading' || !form.partner || !query.trim()}>{status === 'loading' ? 'Searching…' : 'Search catalog'}</button>
      </form>

      <form onSubmit={saveChanges} className="rounded-xl border p-5 space-y-4">
        <h2 className="text-xl font-semibold">Edit {editorMode === 'TEST' ? 'Test' : editorMode === 'PROFILE' ? 'Profile' : 'Package'}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label>Name<input className="mt-1 w-full rounded border p-2" value={form.name} onChange={(e) => setField('name', e.target.value)} /></label>
          <label>MRP<input type="number" className="mt-1 w-full rounded border p-2" value={form.mrp} onChange={(e) => setField('mrp', e.target.value)} /></label>
          <label>Selling price<input type="number" className="mt-1 w-full rounded border p-2" value={form.price} onChange={(e) => setField('price', e.target.value)} /></label>
          <fieldset className="rounded border p-3"><legend className="px-1">Sample type</legend><select multiple className="mt-1 min-h-40 w-full rounded border p-2" value={form.sampleTypes} onChange={(e) => { const selected = Array.from(e.currentTarget.selectedOptions, option => option.value); setForm(current => ({ ...current, sampleTypes: selected, sampleTypeOther: selected.includes('OTHER') ? current.sampleTypeOther : '' })); }}>{sampleTypeOptions.map(option => <option key={option} value={option}>{option === 'OTHER' ? 'Others' : option}</option>)}</select><span className="mt-1 block text-xs text-slate-600">Hold Ctrl (Windows) or Command (Mac) to select more than one sample type.</span>{form.sampleTypes.includes('OTHER') && <label className="mt-2 block">Other sample type<input className="mt-1 w-full rounded border p-2" value={form.sampleTypeOther} onChange={(e) => setField('sampleTypeOther', e.target.value)} placeholder="Enter sample type manually" /></label>}</fieldset>
          <label>Preparation<input className="mt-1 w-full rounded border p-2" value={form.preparation} onChange={(e) => setField('preparation', e.target.value)} /></label>
          <label>Fasting required<select className="mt-1 w-full rounded border p-2" value={form.fastingNeeded ? 'yes' : 'no'} onChange={(e) => setForm(current => ({ ...current, fastingNeeded: e.target.value === 'yes' }))}><option value="yes">Yes</option><option value="no">No</option></select></label>
          <label>TAT<input className="mt-1 w-full rounded border p-2" value={form.tat} onChange={(e) => setField('tat', e.target.value)} placeholder="e.g. 24 hours or 11:00/18:00" /></label>
        </div>
        <label className="block">Test details image<input type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full rounded border p-2" onChange={(e) => void selectImage(e.target.files?.[0])} /><span className="mt-1 block text-xs text-slate-600">JPEG, PNG or WebP; maximum 2 MB.</span></label>\n        {form.imageData && <div className="rounded border p-3"><img src={form.imageData} alt="Catalog image preview" className="max-h-72 w-auto rounded object-contain" /></div>}
        {kind === 'package' && <label className="block">Catalog type<select className="mt-1 w-full rounded border p-2" value={form.packageType} onChange={(e) => setField('packageType', e.target.value)}><option value="PACKAGE">Package</option><option value="PROFILE">Profile</option></select></label>}
        {kind === 'package' && form.packageType === 'PACKAGE' && <section className="rounded border p-4 space-y-3"><h3 className="font-semibold">Included profiles</h3><div className="flex gap-2"><input className="w-full rounded border p-2" value={includedProfileQuery} onChange={(e) => setIncludedProfileQuery(e.target.value)} placeholder="Search TG Labs profiles by name" /><button type="button" className="rounded border px-4 py-2" onClick={() => void searchIncludedProfiles()} disabled={!form.partner || !includedProfileQuery.trim()}>Search profiles</button></div>{includedProfileResults.length > 0 && <div className="max-h-72 overflow-auto rounded border">{includedProfileResults.map(profile => <div key={profile.id} className="border-b p-2 last:border-b-0"><div className="flex items-center justify-between gap-2"><span className="font-medium">{profile.name}</span><button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => void addIncludedProfile(profile)}>Add profile</button></div><details className="mt-2"><summary className="cursor-pointer text-sm font-medium text-blue-700">View included tests</summary><ProfileSearchTests partner={form.partner} profile={profile} /></details></div>)}</div>}{selectedProfiles.map(profile => <details key={profile.id} className="rounded border p-3"><summary className="cursor-pointer font-medium">{profile.name} [{profile.tests.length}]</summary><div className="mt-2 space-y-1">{profile.tests.length ? profile.tests.map(test => <p key={test.id} className="text-sm">{test.name}</p>) : <p className="text-sm text-slate-600">No tests linked to this profile.</p>}</div><button type="button" className="mt-2 rounded border px-2 py-1 text-xs" onClick={() => removeIncludedProfile(profile.id)}>Remove profile</button></details>)}</section>}
        {kind === 'package' && <section className="rounded border p-4 space-y-3"><h3 className="font-semibold">Included tests</h3><div className="flex gap-2"><input className="w-full rounded border p-2" value={includedTestQuery} onChange={(e) => setIncludedTestQuery(e.target.value)} placeholder="Search TG Labs tests by name" /><button type="button" className="rounded border px-4 py-2" onClick={() => void searchIncludedTests()} disabled={!form.partner || !includedTestQuery.trim()}>Search tests</button></div>{includedTestResults.length > 0 && <div className="max-h-56 overflow-auto rounded border">{includedTestResults.map(test => <button key={test.id} type="button" className="block w-full border-b p-2 text-left last:border-b-0 hover:bg-slate-50" onClick={() => addIncludedTest(test)}>{test.name}</button>)}</div>}<div><p className="text-xs text-slate-600">Selected catalog IDs are saved internally. Search and select tests instead of typing names.</p><textarea readOnly aria-label="Selected included test catalog IDs" className="mt-1 min-h-20 w-full rounded border bg-slate-50 p-2" value={form.includedTestIds} /></div>{form.includedTestIds && <div className="flex flex-wrap gap-2">{form.includedTestIds.split(',').map(value => value.trim()).filter(Boolean).map(testId => <button key={testId} type="button" className="rounded border px-2 py-1 text-xs" onClick={() => removeIncludedTest(testId)}>Remove {testId}</button>)}</div>}</section>}
        <label className="block">Description<textarea className="mt-1 min-h-28 w-full rounded border p-2" value={form.description} onChange={(e) => setField('description', e.target.value)} /></label>
        <section className="rounded border p-4"><h3 className="font-semibold">Pricing &amp; Gross margin</h3><p className="text-sm">Gross margin: {margin === null ? '—' : margin}. Informational only; activation, booking and serviceability remain protected.</p></section>
        <button className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50" type="submit" disabled={!form.id || status === 'saving'}>{status === 'saving' ? 'Saving…' : 'Save changes'}</button>
        {message && <p role="status" className={status === 'error' ? 'text-red-700' : 'text-green-700'}>{message}</p>}
      </form>
    </main>
  );
}
