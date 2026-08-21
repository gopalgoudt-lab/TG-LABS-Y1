'use client';

import { useEffect, useMemo, useState } from 'react';

type IncludedTest = { id: string; name: string; active?: boolean };
type Item = {
  id: string;
  type: 'TEST' | 'PACKAGE';
  name: string;
  price: number;
  mrp: number;
  description?: string | null;
  tat?: string | null;
  fastingNeeded: boolean;
  sampleTypes: string[];
  active: boolean;
  includedTests?: IncludedTest[];
};

type CatalogForm = {
  id: string;
  type: 'TEST' | 'PACKAGE';
  name: string;
  price: string;
  mrp: string;
  description: string;
  tat: string;
  fastingNeeded: boolean;
  sampleTypes: string;
  includedTestIds: string[];
  customTestNames: string;
  active: boolean;
};

const blank: CatalogForm = {
  id: '', type: 'TEST', name: '', price: '', mrp: '', description: '', tat: '',
  fastingNeeded: false, sampleTypes: '', includedTestIds: [], customTestNames: '', active: true,
};
const SAMPLE_TYPES = ['Serum', 'EDTA', 'Fluoride', 'Urine'] as const;

export default function ThyrocareCatalogPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState<CatalogForm>(blank);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [packageTestQuery, setPackageTestQuery] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/admin/thyrocare/catalog?includeInactive=1', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Unable to load catalogue.');
      setItems([...(d.packages || []), ...(d.tests || [])]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load catalogue.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const tests = useMemo(() => items.filter((x) => x.type === 'TEST' && x.active), [items]);
  const shown = useMemo(() => items.filter((x) => {
    const hit = !q || x.name.toLowerCase().includes(q.toLowerCase());
    return hit && (filter === 'ALL' || x.type === filter);
  }), [items, q, filter]);
  const packageTestMatches = useMemo(() => {
    const query = packageTestQuery.trim().toLowerCase();
    if (!query) return tests.slice(0, 30);
    return tests.filter((x) => x.name.toLowerCase().includes(query)).slice(0, 30);
  }, [tests, packageTestQuery]);

  const selectedSampleType = SAMPLE_TYPES.includes(form.sampleTypes as (typeof SAMPLE_TYPES)[number])
    ? form.sampleTypes : form.sampleTypes ? 'OTHER' : '';

  function edit(x: Item) {
    setForm({
      id: x.id, type: x.type, name: x.name, price: String(x.price), mrp: String(x.mrp || x.price),
      description: x.description || '', tat: x.tat || '', fastingNeeded: x.fastingNeeded,
      sampleTypes: (x.sampleTypes || []).join(', '),
      includedTestIds: (x.includedTests || []).map((t) => t.id), customTestNames: '', active: x.active,
    });
    setPackageTestQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function reset() { setForm(blank); setPackageTestQuery(''); }
  function togglePackageTest(id: string) {
    setForm((x) => ({
      ...x,
      includedTestIds: x.includedTestIds.includes(id)
        ? x.includedTestIds.filter((testId) => testId !== id)
        : [...x.includedTestIds, id],
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const customTestNames = form.customTestNames.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
      const payload = {
        ...form,
        price: Number(form.price) || 0,
        mrp: Number(form.mrp) || Number(form.price) || 0,
        sampleTypes: form.sampleTypes.split(',').map((x) => x.trim()).filter(Boolean),
        includedTestIds: form.type === 'PACKAGE' ? form.includedTestIds : [],
        customTestNames: form.type === 'PACKAGE' ? customTestNames : [],
      };
      const r = await fetch('/api/admin/thyrocare/catalog', {
        method: form.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Unable to save item.');
      reset(); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save item.'); }
    finally { setSaving(false); }
  }

  async function remove(x: Item) {
    if (!confirm(`Delete ${x.name} from active Thyrocare catalogue?`)) return;
    setError('');
    try {
      const r = await fetch('/api/admin/thyrocare/catalog', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: x.id, type: x.type }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Unable to delete item.'); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to delete item.'); }
  }
  async function restore(x: Item) {
    setError('');
    try {
      const r = await fetch('/api/admin/thyrocare/catalog', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...x, active: true, description: x.description || '', tat: x.tat || '', sampleTypes: x.sampleTypes || [], includedTestIds: (x.includedTests || []).map((t) => t.id), customTestNames: [] }),
      });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Unable to restore item.'); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to restore item.'); }
  }

  return <main style={{ minHeight: '100vh', background: '#f5f7f9', fontFamily: 'Arial,sans-serif', color: '#1f2937' }}>
    <div style={{ maxWidth: 1380, margin: '0 auto', padding: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div><div style={{ fontSize: 12, fontWeight: 900, color: '#087f6f' }}>THYROCARE • MANUAL CATALOGUE</div><h1 style={{ margin: '5px 0' }}>Tests & Packages</h1><div style={{ color: '#64748b' }}>Separate Thyrocare names, prices and package contents.</div></div>
        <div style={{ display: 'flex', gap: 8 }}><a href="/manual" style={btnLight}>← Manual Dashboard</a><a href="/admin" style={btnLight}>Admin</a></div>
      </div>
      {error && <div style={err}>{error}</div>}
      <section style={{ display: 'grid', gridTemplateColumns: '410px minmax(0,1fr)', gap: 18, marginTop: 18 }}>
        <form onSubmit={save} style={card}>
          <h2 style={{ marginTop: 0, color: '#0d5f54' }}>{form.id ? 'Edit' : 'Add'} Test / Package</h2>
          <label style={label}>Type<select value={form.type} onChange={(e) => setForm((x) => ({ ...x, type: e.target.value as 'TEST' | 'PACKAGE', includedTestIds: [], customTestNames: '' }))} style={input}><option value="TEST">Test</option><option value="PACKAGE">Package</option></select></label>
          <label style={label}>Name *<input required value={form.name} onChange={(e) => setForm((x) => ({ ...x, name: e.target.value }))} style={input} placeholder="e.g. Aarogyam Profile" /></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={label}>Selling Price (₹) *<input required type="number" min="0" value={form.price} onChange={(e) => setForm((x) => ({ ...x, price: e.target.value }))} style={input} /></label>
            <label style={label}>MRP (₹)<input type="number" min="0" value={form.mrp} onChange={(e) => setForm((x) => ({ ...x, mrp: e.target.value }))} style={input} /></label>
          </div>
          <label style={label}>TAT<input value={form.tat} onChange={(e) => setForm((x) => ({ ...x, tat: e.target.value }))} style={input} placeholder="e.g. 24 hours" /></label>
          <label style={label}>Sample Type<select value={selectedSampleType} onChange={(e) => { const value = e.target.value; setForm((x) => ({ ...x, sampleTypes: value === 'OTHER' ? 'Other' : value })); }} style={input}><option value="">Select Sample Type</option><option value="Serum">Serum</option><option value="EDTA">EDTA</option><option value="Fluoride">Fluoride</option><option value="Urine">Urine</option><option value="OTHER">Others (Specify)</option></select></label>
          {selectedSampleType === 'OTHER' && <label style={label}>Specify Other Sample Type *<input required value={form.sampleTypes === 'Other' ? '' : form.sampleTypes} onChange={(e) => setForm((x) => ({ ...x, sampleTypes: e.target.value }))} style={input} placeholder="e.g. Citrate Plasma, Swab, Stool" /></label>}

          {form.type === 'PACKAGE' && <div style={packageBox}>
            <div style={{ fontWeight: 900, color: '#0d5f54' }}>Tests Included in Package</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>Select existing Thyrocare tests or type new test names below.</div>
            <input value={packageTestQuery} onChange={(e) => setPackageTestQuery(e.target.value)} style={input} placeholder="Search existing tests..." />
            <div style={{ maxHeight: 190, overflowY: 'auto', marginTop: 7, border: '1px solid #e2e8f0', borderRadius: 8 }}>
              {packageTestMatches.length === 0 ? <div style={{ padding: 10, fontSize: 12, color: '#64748b' }}>No matching test found.</div> : packageTestMatches.map((test) => <label key={test.id} style={testOption}><input type="checkbox" checked={form.includedTestIds.includes(test.id)} onChange={() => togglePackageTest(test.id)} /> <span>{test.name}</span></label>)}
            </div>
            {form.includedTestIds.length > 0 && <div style={{ marginTop: 8, fontSize: 11, color: '#0f766e', fontWeight: 800 }}>{form.includedTestIds.length} existing test{form.includedTestIds.length === 1 ? '' : 's'} selected</div>}
            <label style={label}>Add Tests by Name<textarea rows={3} value={form.customTestNames} onChange={(e) => setForm((x) => ({ ...x, customTestNames: e.target.value }))} style={{ ...input, resize: 'vertical' }} placeholder="Enter new test names separated by comma or new line" /></label>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 5 }}>New names will be added to the Thyrocare Test list automatically with ₹0 price, so you can update their individual price/details later.</div>
          </div>}

          <label style={label}>Description<textarea rows={4} value={form.description} onChange={(e) => setForm((x) => ({ ...x, description: e.target.value }))} style={{ ...input, resize: 'vertical' }} /></label>
          <label style={{ ...label, display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={form.fastingNeeded} onChange={(e) => setForm((x) => ({ ...x, fastingNeeded: e.target.checked }))} /> Fasting required</label>
          <label style={{ ...label, display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={form.active} onChange={(e) => setForm((x) => ({ ...x, active: e.target.checked }))} /> Active</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 15 }}><button disabled={saving} style={btnPrimary}>{saving ? 'Saving…' : form.id ? 'Update' : 'Add Item'}</button><button type="button" onClick={reset} style={btnLight}>Clear</button></div>
        </form>

        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}><div><h2 style={{ margin: '0 0 4px', color: '#0d5f54' }}>Thyrocare Price List</h2><div style={{ fontSize: 12, color: '#64748b' }}>{items.length} items</div></div><div style={{ display: 'flex', gap: 8 }}><input value={q} onChange={(e) => setQ(e.target.value)} style={{ ...input, width: 260, marginTop: 0 }} placeholder="Search test/package" /><select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...input, width: 130, marginTop: 0 }}><option value="ALL">All</option><option value="TEST">Tests</option><option value="PACKAGE">Packages</option></select></div></div>
          <div style={{ overflowX: 'auto', marginTop: 14 }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}><thead><tr>{['Type','Name / Included Tests','MRP','Price','TAT','Fasting','Status','Actions'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead><tbody>
            {loading ? <tr><td colSpan={8} style={td}>Loading…</td></tr> : shown.length === 0 ? <tr><td colSpan={8} style={td}>No Thyrocare catalogue items yet.</td></tr> : shown.map((x) => <tr key={`${x.type}-${x.id}`}>
              <td style={td}><span style={pill}>{x.type === 'TEST' ? 'Test' : 'Package'}</span></td>
              <td style={td}><b>{x.name}</b>{x.sampleTypes?.length > 0 && <div style={sub}>Sample: {x.sampleTypes.join(', ')}</div>}{x.type === 'PACKAGE' && <div style={{ ...sub, marginTop: 5, color: '#475569' }}><b>Includes:</b> {(x.includedTests || []).length ? (x.includedTests || []).map((t) => t.name).join(', ') : 'No tests linked yet'}</div>}</td>
              <td style={td}>₹{(x.mrp || x.price).toLocaleString('en-IN')}</td><td style={{ ...td, fontWeight: 900, color: '#087f6f' }}>₹{x.price.toLocaleString('en-IN')}</td><td style={td}>{x.tat || '—'}</td><td style={td}>{x.fastingNeeded ? 'Yes' : 'No'}</td><td style={td}>{x.active ? <span style={activePill}>Active</span> : <span style={inactivePill}>Deleted</span>}</td>
              <td style={td}><div style={{ display: 'flex', gap: 6 }}><button onClick={() => edit(x)} style={smallBlue}>Edit</button>{x.active ? <button onClick={() => remove(x)} style={smallRed}>Delete</button> : <button onClick={() => restore(x)} style={smallGreen}>Restore</button>}</div></td>
            </tr>)}
          </tbody></table></div>
        </div>
      </section>
    </div>
  </main>;
}

const card = { background:'#fff',border:'1px solid #dfe5e9',borderRadius:12,padding:16,boxShadow:'0 4px 18px rgba(15,23,42,.05)' } as const;
const label = { display:'block',fontSize:12,fontWeight:800,marginTop:10 } as const;
const input = { display:'block',width:'100%',boxSizing:'border-box' as const,marginTop:5,padding:'10px 11px',border:'1px solid #cfd8df',borderRadius:8,font:'inherit',background:'#fff' } as const;
const btnPrimary = { border:0,borderRadius:8,padding:'10px 14px',background:'#087f6f',color:'#fff',fontWeight:900,cursor:'pointer',textDecoration:'none' } as const;
const btnLight = { border:'1px solid #d5dce1',borderRadius:8,padding:'10px 14px',background:'#fff',color:'#334155',fontWeight:800,cursor:'pointer',textDecoration:'none' } as const;
const err = { marginTop:14,padding:12,borderRadius:10,background:'#fff1f2',border:'1px solid #fecdd3',color:'#9f1239' } as const;
const packageBox = { marginTop:12,padding:12,border:'1px solid #cfe5df',borderRadius:10,background:'#f8fbfa' } as const;
const testOption = { display:'flex',gap:8,alignItems:'center',padding:'8px 9px',borderBottom:'1px solid #edf0f2',fontSize:12,cursor:'pointer',background:'#fff' } as const;
const th = { textAlign:'left' as const,padding:'10px 8px',borderBottom:'1px solid #dbe3e8',background:'#fafcfd',fontSize:12 };
const td = { padding:'10px 8px',borderBottom:'1px solid #e5e7eb',verticalAlign:'top' as const,fontSize:12 };
const sub = { fontSize:10,color:'#64748b',marginTop:3 };
const pill = { display:'inline-block',padding:'4px 7px',borderRadius:999,background:'#eef7f4',color:'#0d5f54',fontSize:10,fontWeight:900 };
const activePill = { ...pill,background:'#dcfce7',color:'#166534' };
const inactivePill = { ...pill,background:'#fee2e2',color:'#991b1b' };
const smallBlue = { border:0,borderRadius:6,padding:'6px 9px',background:'#1688e8',color:'#fff',fontWeight:800,cursor:'pointer' } as const;
const smallRed = { border:0,borderRadius:6,padding:'6px 9px',background:'#dc2626',color:'#fff',fontWeight:800,cursor:'pointer' } as const;
const smallGreen = { border:0,borderRadius:6,padding:'6px 9px',background:'#16a34a',color:'#fff',fontWeight:800,cursor:'pointer' } as const;
