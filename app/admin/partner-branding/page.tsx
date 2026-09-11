'use client';

import { ChangeEvent, useEffect, useState } from 'react';

type PartnerBranding = {
  id: string;
  slug: string;
  name: string;
  logoData: string | null;
  logoMime: string | null;
  logoUpdatedAt: string | null;
};

const MAX_FILE_BYTES = 600_000;
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export default function PartnerBrandingAdminPage() {
  const [partners, setPartners] = useState<PartnerBranding[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selected = partners.find(p => p.id === selectedId) || null;

  async function load(preferredId?: string) {
    setLoading(true);
    const res = await fetch('/api/admin/partner-branding', { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || 'Unable to load partner logos.');
      setLoading(false);
      return;
    }
    setPartners(data.partners || []);
    const nextId = preferredId || selectedId || data.partners?.[0]?.id || '';
    setSelectedId(nextId);
    const partner = (data.partners || []).find((p: PartnerBranding) => p.id === nextId);
    setPreview(partner?.logoData || null);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  function selectPartner(id: string) {
    setSelectedId(id);
    const partner = partners.find(p => p.id === id);
    setPreview(partner?.logoData || null);
    setMessage('');
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.has(file.type)) {
      setMessage('Please choose a PNG, JPG/JPEG or WebP logo.');
      event.target.value = '';
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setMessage('Logo is too large. Please use an image smaller than 600 KB.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(typeof reader.result === 'string' ? reader.result : null);
      setMessage('Logo ready to save.');
    };
    reader.onerror = () => setMessage('Unable to read that image.');
    reader.readAsDataURL(file);
  }

  async function saveLogo() {
    if (!selected || !preview) return;
    setSaving(true);
    setMessage('Saving logo…');
    const res = await fetch('/api/admin/partner-branding', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ partnerId: selected.id, logoData: preview }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || 'Unable to save logo.');
      setSaving(false);
      return;
    }
    setMessage(`${selected.name} logo saved successfully.`);
    setSaving(false);
    await load(selected.id);
  }

  async function removeLogo() {
    if (!selected) return;
    setSaving(true);
    setMessage('Removing logo…');
    const res = await fetch('/api/admin/partner-branding', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ partnerId: selected.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || 'Unable to remove logo.');
      setSaving(false);
      return;
    }
    setPreview(null);
    setMessage(`${selected.name} logo removed.`);
    setSaving(false);
    await load(selected.id);
  }

  return <main style={{maxWidth:1120,margin:'0 auto',padding:'28px 18px 60px',fontFamily:'Arial,sans-serif'}}>
    <header style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:18,marginBottom:24}}>
      <div>
        <p style={{fontWeight:900,color:'#16705d',margin:'0 0 6px'}}>PARTNER BRANDING ADMIN</p>
        <h1 style={{margin:'0 0 8px'}}>Laboratory logos</h1>
        <p style={{margin:0,color:'#566'}}>Upload one approved logo for each diagnostic partner. This changes branding only; booking, operations, serviceability and partner activation are untouched.</p>
      </div>
      <a href="/admin/partner-catalog" style={{padding:'10px 13px',border:'1px solid #16705d',borderRadius:9,color:'#145c4e',textDecoration:'none',fontWeight:800,whiteSpace:'nowrap'}}>← Partner Catalog</a>
    </header>

    {message && <div role="status" style={{padding:12,border:'1px solid #cfe1dc',borderRadius:10,marginBottom:18,background:'#f8fcfb'}}>{message}</div>}

    <div style={{display:'grid',gridTemplateColumns:'minmax(250px,330px) minmax(0,1fr)',gap:24}}>
      <section>
        <h2>Partner laboratories</h2>
        {loading ? <p>Loading…</p> : partners.map(partner => <button key={partner.id} type="button" onClick={() => selectPartner(partner.id)} style={{display:'grid',gridTemplateColumns:'56px 1fr',gap:12,alignItems:'center',width:'100%',textAlign:'left',padding:12,marginBottom:10,borderRadius:12,border:partner.id===selectedId?'2px solid #16705d':'1px solid #d8e5e1',background:'#fff',cursor:'pointer'}}>
          <div style={{width:54,height:42,border:'1px solid #e0e9e6',borderRadius:8,display:'grid',placeItems:'center',overflow:'hidden',background:'#fff'}}>{partner.logoData ? <img src={partner.logoData} alt="" style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}}/> : <span style={{fontSize:10,color:'#899'}}>No logo</span>}</div>
          <div><strong>{partner.name}</strong><br/><small>{partner.slug}</small></div>
        </button>)}
      </section>

      <section>
        {!selected ? <p>Select a partner.</p> : <div style={{border:'1px solid #d8e5e1',borderRadius:14,padding:20,background:'#fff'}}>
          <h2 style={{marginTop:0}}>{selected.name}</h2>
          <p style={{color:'#667'}}>Recommended: transparent PNG or WebP, horizontal logo, maximum 600 KB.</p>
          <div style={{minHeight:180,border:'1px dashed #bfcfca',borderRadius:12,display:'grid',placeItems:'center',padding:18,background:'#fafcfb',margin:'18px 0'}}>
            {preview ? <img src={preview} alt={`${selected.name} logo preview`} style={{maxWidth:'420px',width:'100%',maxHeight:150,objectFit:'contain'}}/> : <div style={{textAlign:'center',color:'#788'}}>No logo uploaded<br/><small>The partner name can be used as fallback.</small></div>}
          </div>
          <label style={{display:'block',fontWeight:800}}>Choose logo
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onFileChange} style={{display:'block',marginTop:8,width:'100%',padding:10,border:'1px solid #cbd8d4',borderRadius:9}}/>
          </label>
          <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:16}}>
            <button type="button" disabled={!preview||saving} onClick={saveLogo} style={{padding:'11px 16px',border:0,borderRadius:9,background:'#102f29',color:'#fff',fontWeight:900,cursor:'pointer',opacity:!preview||saving?.6:1}}>{saving?'Please wait…':'Save / Replace Logo'}</button>
            <button type="button" disabled={!selected.logoData||saving} onClick={removeLogo} style={{padding:'11px 16px',border:'1px solid #b93333',borderRadius:9,background:'#fff',color:'#a22',fontWeight:800,cursor:'pointer',opacity:!selected.logoData||saving?.6:1}}>Remove Logo</button>
          </div>
          {selected.logoUpdatedAt && <p style={{marginBottom:0,color:'#788',fontSize:12}}>Last updated: {new Date(selected.logoUpdatedAt).toLocaleString()}</p>}
        </div>}
      </section>
    </div>
  </main>;
}
