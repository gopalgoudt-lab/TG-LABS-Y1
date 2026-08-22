'use client';

import { useEffect, useMemo, useState } from 'react';

type LogRow = {
  id: string;
  actorPhone: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
};

type AuditResponse = { logs: LogRow[]; actions: string[]; error?: string };

function niceAction(action: string) {
  return action
    .replace(/^THYROCARE_/, '')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function detailText(meta: Record<string, unknown>) {
  const parts: string[] = [];
  const keys: Array<[string, string]> = [
    ['billNumber', 'Bill'],
    ['fileName', 'File'],
    ['reportType', 'Report'],
    ['sampleStatus', 'Sample'],
    ['paymentMode', 'Payment'],
    ['totalAmount', 'Total'],
    ['paidAmount', 'Paid'],
    ['balance', 'Balance'],
  ];
  for (const [key, label] of keys) {
    const value = meta[key];
    if (value !== undefined && value !== null && value !== '') parts.push(`${label}: ${String(value)}`);
  }
  return parts.join(' • ');
}

export default function ThyrocareActivityPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (action) params.set('action', action);
    params.set('limit', '250');
    try {
      const res = await fetch(`/api/admin/thyrocare/audit?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json() as AuditResponse;
      if (!res.ok) throw new Error(data.error || 'Unable to load activity history.');
      setLogs(data.logs || []);
      setActions(data.actions || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load activity history.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const stats = useMemo(() => {
    const staff = logs.filter(x => x.actorRole === 'STAFF').length;
    const admin = logs.filter(x => x.actorRole === 'ADMIN').length;
    const today = new Date();
    const todayKey = today.toLocaleDateString('en-CA');
    const todayCount = logs.filter(x => new Date(x.createdAt).toLocaleDateString('en-CA') === todayKey).length;
    return { staff, admin, todayCount };
  }, [logs]);

  return <main style={{maxWidth:1400,margin:'0 auto',padding:'28px 22px 60px',fontFamily:'Arial,sans-serif'}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'flex-end',flexWrap:'wrap'}}>
      <div>
        <div style={{fontSize:12,fontWeight:900,letterSpacing:1.2,color:'#087565'}}>THYROCARE • ADMIN SECURITY</div>
        <h1 style={{margin:'6px 0 4px',fontSize:30}}>Activity History</h1>
        <p style={{margin:0,color:'#5c6865'}}>Track Staff and Admin actions with date, time, order, reports, payments and sample changes.</p>
      </div>
      <button onClick={() => void load()} style={buttonStyle}>↻ Refresh</button>
    </div>

    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,margin:'22px 0'}}>
      <Stat label="Loaded Activities" value={logs.length}/><Stat label="Admin Actions" value={stats.admin}/><Stat label="Staff Actions" value={stats.staff}/><Stat label="Today" value={stats.todayCount}/>
    </div>

    <div style={{display:'grid',gridTemplateColumns:'minmax(220px,1fr) minmax(220px,360px) auto',gap:10,alignItems:'end',marginBottom:18}}>
      <label style={labelStyle}>Search
        <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void load()}} placeholder="Bill, order, phone, action..." style={inputStyle}/>
      </label>
      <label style={labelStyle}>Action
        <select value={action} onChange={e=>setAction(e.target.value)} style={inputStyle}>
          <option value="">All Thyrocare Activities</option>
          {actions.map(x=><option key={x} value={x}>{niceAction(x)}</option>)}
        </select>
      </label>
      <div style={{display:'flex',gap:8}}>
        <button onClick={() => void load()} style={buttonStyle}>Search</button>
        <button onClick={()=>{setQ('');setAction('');setTimeout(()=>void load(),0)}} style={secondaryButton}>Clear</button>
      </div>
    </div>

    {error && <div style={{padding:12,border:'1px solid #e7b7b1',background:'#fff2f0',color:'#9a2d21',borderRadius:8,marginBottom:14}}>{error}</div>}

    <div style={{overflowX:'auto',border:'1px solid #dce5e2',borderRadius:10,background:'#fff'}}>
      <table style={{width:'100%',borderCollapse:'collapse',minWidth:1050}}>
        <thead><tr style={{background:'#f2f8f6',textAlign:'left'}}>
          {['Date & Time','User','Action','Order / Entity','Details','IP'].map(h=><th key={h} style={thStyle}>{h}</th>)}
        </tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={6} style={emptyStyle}>Loading activity history…</td></tr> : logs.length===0 ? <tr><td colSpan={6} style={emptyStyle}>No matching activities found.</td></tr> : logs.map(row => {
            const extra = detailText(row.metadata || {});
            return <tr key={row.id} style={{borderTop:'1px solid #edf1f0'}}>
              <td style={tdStyle}><b>{new Date(row.createdAt).toLocaleDateString('en-IN')}</b><br/><span style={muted}>{new Date(row.createdAt).toLocaleTimeString('en-IN')}</span></td>
              <td style={tdStyle}><span style={{...badge,background:row.actorRole==='ADMIN'?'#e5f4ef':'#eef2ff',color:row.actorRole==='ADMIN'?'#075e50':'#3346a8'}}>{row.actorRole}</span><br/><span style={muted}>{row.actorPhone}</span></td>
              <td style={tdStyle}><b>{niceAction(row.action)}</b></td>
              <td style={tdStyle}>{row.entityId ? <><b>{row.entityId}</b><br/><span style={muted}>{row.entityType}</span></> : <span style={muted}>{row.entityType}</span>}</td>
              <td style={tdStyle}><div>{row.summary}</div>{extra&&<div style={{...muted,marginTop:5}}>{extra}</div>}</td>
              <td style={tdStyle}><span style={muted}>{row.ipAddress||'—'}</span></td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
    <p style={{fontSize:12,color:'#6b7774',marginTop:10}}>Admin-only screen. New Thyrocare Staff/Admin actions are recorded from this deployment onward.</p>
  </main>;
}

function Stat({label,value}:{label:string;value:number}){return <div style={{padding:'15px 17px',border:'1px solid #dce5e2',borderRadius:10,background:'#fff'}}><div style={{fontSize:12,color:'#66736f',fontWeight:700}}>{label}</div><div style={{fontSize:25,fontWeight:900,color:'#076b5c',marginTop:4}}>{value}</div></div>}
const labelStyle={display:'grid',gap:6,fontSize:12,fontWeight:800,color:'#3d4b47'} as const;
const inputStyle={width:'100%',boxSizing:'border-box',padding:'10px 11px',border:'1px solid #cbd8d4',borderRadius:7,background:'#fff',fontSize:14} as const;
const buttonStyle={border:0,borderRadius:7,padding:'10px 16px',background:'#087c69',color:'#fff',fontWeight:900,cursor:'pointer',whiteSpace:'nowrap'} as const;
const secondaryButton={...buttonStyle,background:'#eef3f1',color:'#30413d'} as const;
const thStyle={padding:'12px 13px',fontSize:12,color:'#42534f',whiteSpace:'nowrap'} as const;
const tdStyle={padding:'12px 13px',fontSize:13,verticalAlign:'top'} as const;
const emptyStyle={padding:30,textAlign:'center' as const,color:'#6c7875'};
const muted={fontSize:11,color:'#6c7875'} as const;
const badge={display:'inline-block',padding:'3px 7px',borderRadius:99,fontSize:10,fontWeight:900,marginBottom:4} as const;
