'use client';

import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';

const FLOW = [
  ['BOOKING_CREATED','Booking created'],['BOOKING_CONFIRMED','Confirmed'],['TECHNICIAN_ASSIGNED','Technician assigned'],
  ['TECHNICIAN_ACCEPTED','Accepted'],['ON_THE_WAY','On the way'],['REACHED_PATIENT','Reached'],
  ['SAMPLE_COLLECTED','Sample collected'],['SAMPLE_RECEIVED_AT_LAB','At lab'],['PROCESSING','Processing'],
  ['REPORT_READY','Report ready'],['REPORT_DELIVERED','Delivered'],
] as const;

type Booking = {
  id:string; orderNumber:string; status:string; paymentStatus:string; workflowStatus:string; total:number; mode:string;
  collectionDate:string; slot:string; tests:string[]; packages:string[]; doctorName?:string|null; printedReport?:boolean;
  printedReportFee?:number; technician?:string|null; timeline:Record<string,string|null>;
};
type Report = {id:string;orderNumber:string;name:string;status:string;publishedAt:string|null;tests:string[];packages:string[];downloadUrl:string|null};
type AiReport = {analysis:string;generatedAt:string;disclaimer:string};

export default function PatientPage(){
  const router=useRouter();
  const [phone,setPhone]=useState('');
  const [name,setName]=useState('');
  const [orders,setOrders]=useState<Booking[]>([]);
  const [reports,setReports]=useState<Report[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [aiReports,setAiReports]=useState<Record<string,AiReport>>({});
  const [aiBusy,setAiBusy]=useState('');
  const [aiError,setAiError]=useState<Record<string,string>>({});

  useEffect(()=>onAuthStateChanged(auth,async user=>{
    if(!user){router.replace('/auth');return}
    setPhone(user.phoneNumber??''); setLoading(true); setError('');
    try{
      const token=await user.getIdToken();
      const headers={Authorization:`Bearer ${token}`};
      const [br,rr]=await Promise.all([
        fetch('/api/patient/bookings',{headers,cache:'no-store'}),
        fetch('/api/patient/reports',{headers,cache:'no-store'}),
      ]);
      if(br.status===401||rr.status===401){await signOut(auth);router.replace('/auth');return}
      if(!br.ok||!rr.ok) throw new Error('Unable to load your TG Labs account right now. Please try again.');
      const b=await br.json(),r=await rr.json();
      setOrders(b.orders??[]); setReports(r.reports??[]); setName(b.patient?.name??'');
    }catch(e){setError(e instanceof Error?e.message:'Unable to load your account.')}finally{setLoading(false)}
  }),[router]);

  const upcoming=useMemo(()=>orders.filter(o=>!['COMPLETED','CANCELLED'].includes(o.status)),[orders]);
  const tracking=upcoming[0]||orders[0];
  const date=(v:string)=>new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v));
  const stamp=(v?:string|null)=>v?new Date(v).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'Pending';

  async function handleSignOut(){await signOut(auth);router.replace('/auth')}

  async function generateAiReport(report:Report){
    if(!report.downloadUrl)return;
    const consent=window.confirm('AI Report will send this diagnostic report to OpenAI for an educational explanation. It is not a diagnosis or a substitute for your doctor. Continue?');
    if(!consent)return;
    const user=auth.currentUser;
    if(!user){router.replace('/auth');return}
    setAiBusy(report.id); setAiError(x=>({...x,[report.id]:''}));
    try{
      const token=await user.getIdToken();
      const res=await fetch(`/api/patient/reports/${report.id}/ai`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});
      const data=await res.json();
      if(res.status===401){await signOut(auth);router.replace('/auth');return}
      if(!res.ok)throw new Error(data.error||'Unable to generate AI Report.');
      setAiReports(x=>({...x,[report.id]:data}));
    }catch(e){setAiError(x=>({...x,[report.id]:e instanceof Error?e.message:'Unable to generate AI Report.'}))}
    finally{setAiBusy('')}
  }

  return <main style={{minHeight:'100vh',background:'#f6faf9',color:'#15312c'}}><div style={{maxWidth:1180,margin:'0 auto',padding:'32px 20px 64px'}}>
    <header style={{display:'flex',gap:20,alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',marginBottom:28}}>
      <div><p style={ey}>TG LABS PATIENT PORTAL</p><h1 style={{margin:'6px 0 4px',fontSize:'clamp(30px,5vw,46px)'}}>My TG Labs</h1><p style={{margin:0,color:'#64748b'}}>{name?`Welcome, ${name}`:'Your secure diagnostic dashboard'} {phone?`• ${phone}`:''}</p></div>
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}><a href="/tests" style={secondary}>Browse tests</a><a href="/booking" style={primary}>Book new test</a><button onClick={handleSignOut} style={secondary}>Sign out</button></div>
    </header>

    {error&&<div style={{padding:16,borderRadius:14,background:'#fff1f2',border:'1px solid #fecdd3',color:'#9f1239',marginBottom:20}}>{error}</div>}

    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:16,marginBottom:22}}>
      <Stat label="Total bookings" value={orders.length}/><Stat label="Active" value={upcoming.length}/><Stat label="Reports" value={reports.length}/>
    </section>

    {!loading&&tracking&&<section style={{...panel,marginBottom:22,border:'1px solid #b7ddd4'}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:16,flexWrap:'wrap',alignItems:'start'}}><div><p style={ey}>LIVE BOOKING TRACKER</p><h2 style={{margin:'4px 0 5px'}}>{tracking.orderNumber}</h2><div style={{color:'#64748b'}}>{date(tracking.collectionDate)} • {tracking.slot} • {tracking.mode==='HOME'?'Home collection':'Centre visit'}</div></div><Status text={tracking.workflowStatus}/></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:10,marginTop:18}}>{FLOW.map(([code,label],i)=>{const current=FLOW.findIndex(x=>x[0]===tracking.workflowStatus),done=i<=current;return <div key={code} style={{padding:12,borderRadius:12,border:`1px solid ${done?'#9ed2c6':'#e2e8f0'}`,background:done?'#effaf7':'#fafcfc'}}><div style={{fontWeight:900,color:done?'#087f6b':'#94a3b8'}}>{i+1}. {label}</div><small style={{color:'#64748b'}}>{stamp(tracking.timeline?.[code])}</small></div>})}</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:12,marginTop:16}}><Info label="Technician" value={tracking.technician||'Not assigned yet'}/><Info label="Doctor" value={tracking.doctorName||'Not provided'}/><Info label="Printed report" value={tracking.printedReport?`Yes • ₹${tracking.printedReportFee||100} • 24–48 hrs`:'No'}/><Info label="Payment" value={`${tracking.paymentStatus} • ₹${tracking.total.toLocaleString('en-IN')}`}/></div>
    </section>}

    {loading?<section style={panel}><h2>Loading your account…</h2></section>:<div style={{display:'grid',gap:22}}>
      <section style={panel}><div style={head}><div><p style={ey}>BOOKINGS</p><h2 style={{margin:'4px 0 0'}}>Recent bookings</h2></div></div>{orders.length===0?<Empty title="No bookings yet"/>:<div style={{display:'grid',gap:12}}>{orders.map(o=><article key={o.id} style={row}><div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><strong>{o.orderNumber}</strong><Status text={o.status}/><Status text={o.paymentStatus} soft/></div><p style={{margin:'8px 0 4px'}}>{[...o.packages,...o.tests].slice(0,3).join(' • ')||'Diagnostic booking'}</p><small style={{color:'#64748b'}}>{date(o.collectionDate)} • {o.slot}</small></div><div style={{textAlign:'right'}}><strong style={{fontSize:20}}>₹{o.total.toLocaleString('en-IN')}</strong><div style={{marginTop:6,color:'#64748b',fontSize:13}}>{o.workflowStatus.replaceAll('_',' ')}</div></div></article>)}</div>}</section>

      <section style={panel}><div style={head}><div><p style={ey}>REPORTS</p><h2 style={{margin:'4px 0 0'}}>Diagnostic reports</h2><p style={{margin:'6px 0 0',color:'#64748b',fontSize:13}}>Open the original lab report or use AI Report for a simpler explanation, diet guidance and activity suggestions.</p></div></div>
        {reports.length===0?<Empty title="No reports available yet"/>:<div style={{display:'grid',gap:12}}>{reports.map(r=><div key={r.id} style={{display:'grid',gap:10}}>
          <article style={row}><div><strong>{r.name}</strong><p style={{margin:'6px 0',color:'#64748b',fontSize:14}}>{r.orderNumber} • {[...r.packages,...r.tests].slice(0,3).join(' • ')}</p><Status text={r.status}/>{r.publishedAt&&<div style={{fontSize:12,color:'#64748b',marginTop:6}}>Published {stamp(r.publishedAt)}</div>}</div>
            {r.downloadUrl?<div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}><a href={r.downloadUrl} target="_blank" rel="noreferrer" style={primary}>View / Download report</a><button type="button" onClick={()=>generateAiReport(r)} disabled={aiBusy===r.id} style={{...aiButton,opacity:aiBusy===r.id?0.65:1}}>{aiBusy===r.id?'Analyzing…':'✨ AI Report'}</button></div>:<span style={{color:'#64748b'}}>Processing</span>}
          </article>
          {aiError[r.id]&&<div style={{padding:12,borderRadius:12,background:'#fff1f2',border:'1px solid #fecdd3',color:'#9f1239'}}>{aiError[r.id]}</div>}
          {aiReports[r.id]&&<section style={aiPanel}><div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap',alignItems:'start'}}><div><p style={{...ey,color:'#5b3cc4'}}>TG LABS • AI REPORT</p><h3 style={{margin:'4px 0'}}>AI-powered report explanation</h3><small style={{color:'#64748b'}}>Generated {stamp(aiReports[r.id].generatedAt)}</small></div><button type="button" onClick={()=>setAiReports(x=>{const n={...x};delete n[r.id];return n})} style={secondary}>Close</button></div><div style={{whiteSpace:'pre-wrap',lineHeight:1.65,marginTop:16,fontSize:14,color:'#253d38'}}>{aiReports[r.id].analysis}</div><div style={{marginTop:18,padding:13,borderRadius:12,background:'#fff8e7',border:'1px solid #f0d89a',fontSize:13,color:'#6b4e10'}}><b>Important:</b> {aiReports[r.id].disclaimer}</div></section>}
        </div>)}</div>}
      </section>
    </div>}
  </div></main>
}

function Stat({label,value}:{label:string;value:number}){return <article style={{...panel,padding:20}}><p style={{margin:0,color:'#64748b',fontWeight:700}}>{label}</p><strong style={{display:'block',fontSize:34,marginTop:8}}>{value}</strong></article>}
function Status({text,soft=false}:{text:string;soft?:boolean}){return <span style={{display:'inline-block',padding:'5px 9px',borderRadius:999,background:soft?'#f1f5f9':'#e7f7f3',color:soft?'#475569':'#087f6b',fontSize:11,fontWeight:800}}>{text.replaceAll('_',' ')}</span>}
function Info({label,value}:{label:string;value:string}){return <div style={{padding:12,borderRadius:12,background:'#f8fbfa'}}><small style={{display:'block',color:'#64748b',fontWeight:800}}>{label}</small><b>{value}</b></div>}
function Empty({title}:{title:string}){return <div style={{padding:28,textAlign:'center',border:'1px dashed #cbd5e1',borderRadius:16,color:'#64748b'}}>{title}</div>}
const panel={background:'#fff',border:'1px solid #e2e8f0',borderRadius:20,padding:22,boxShadow:'0 12px 35px rgba(15,23,42,.05)'} as const;
const row={display:'flex',gap:18,alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',padding:18,border:'1px solid #e2e8f0',borderRadius:16} as const;
const head={display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap',marginBottom:18} as const;
const ey={margin:0,color:'#087f6b',fontSize:12,fontWeight:800,letterSpacing:1.1} as const;
const primary={display:'inline-block',border:0,borderRadius:12,padding:'11px 15px',background:'#087f6b',color:'#fff',fontWeight:800,textDecoration:'none',cursor:'pointer',fontSize:14} as const;
const secondary={display:'inline-block',border:'1px solid #cbd5e1',borderRadius:12,padding:'10px 14px',background:'#fff',color:'#334155',fontWeight:800,textDecoration:'none',cursor:'pointer',fontSize:14} as const;
const aiButton={display:'inline-block',border:'1px solid #c8bff2',borderRadius:12,padding:'10px 14px',background:'#f4f1ff',color:'#5038a8',fontWeight:900,cursor:'pointer',fontSize:14} as const;
const aiPanel={background:'#fbfaff',border:'1px solid #d9d2f7',borderRadius:18,padding:20,boxShadow:'0 10px 28px rgba(80,56,168,.06)'} as const;
