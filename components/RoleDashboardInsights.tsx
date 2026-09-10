'use client';

import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';

type Role = 'patient' | 'technician' | 'admin';
type LoadState = 'loading' | 'ready' | 'unavailable';
type AdminBooking = { id:string; status:string; paymentStatus:string; totalAmount:number; collectionDate:string; patient?:{name?:string}; items?:{test?:{name?:string;diagnosticPartner?:string|null}}[] };
type AdminTest = { id:string; name:string; diagnosticPartner?:string|null };
type AdminPackage = { id:string; name:string; diagnosticPartner?:string|null };
type TechJob = { id:string; workflowStatus:string; collectionDate:string; slot:string; address?:string|null; pincode?:string|null; patient:{name:string;phone:string}; items:{test:{name:string}}[] };
type PatientBooking = { id:string; orderNumber:string; status:string; workflowStatus:string; collectionDate:string; slot:string; total:number; tests:string[]; packages:string[] };
type PatientReport = { id:string; status:string };

export default function RoleDashboardInsights({role}:{role:Role}) {
  if (role === 'admin') return <AdminInsights/>;
  if (role === 'technician') return <TechnicianInsights/>;
  return <PatientInsights/>;
}

function PatientInsights(){
  const [bookings,setBookings]=useState<PatientBooking[]>([]);
  const [reports,setReports]=useState<PatientReport[]>([]);
  const [state,setState]=useState<LoadState>('loading');
  useEffect(()=>{
    let unsubscribe=()=>{};
    try{
      const auth=getFirebaseAuth();
      unsubscribe=onAuthStateChanged(auth,async user=>{
        if(!user){setState('unavailable');return;}
        try{
          const token=await user.getIdToken();
          const headers={Authorization:`Bearer ${token}`};
          const [b,r]=await Promise.all([fetch('/api/patient/bookings',{headers,cache:'no-store'}),fetch('/api/patient/reports',{headers,cache:'no-store'})]);
          if(!b.ok||!r.ok){setState('unavailable');return;}
          setBookings((await b.json()).orders||[]); setReports((await r.json()).reports||[]); setState('ready');
        }catch{setState('unavailable')}
      });
    }catch{setState('unavailable')}
    return()=>unsubscribe();
  },[]);
  const upcoming=bookings.filter(b=>!['COMPLETED','CANCELLED'].includes(b.status));
  const reportReady=reports.filter(r=>['READY','PUBLISHED','REPORT_READY'].includes(r.status)).length;
  const latest=bookings.slice(0,4);
  const value=(n:number)=>state==='ready'?n:'—';
  return <section className="roleInsights patientInsights">
    {state==='unavailable'&&<PreviewNotice/>}
    <div className="insightKpis">
      <Kpi icon="▣" value={value(bookings.length)} label="Total Bookings" tone="blue"/>
      <Kpi icon="✓" value={value(reportReady)} label="Reports Ready" tone="green"/>
      <Kpi icon="◷" value={value(upcoming.length)} label="Upcoming" tone="purple"/>
      <Kpi icon="⌂" value="Home" label="Sample Collection" tone="orange"/>
    </div>
    <div className="insightGrid twoCol">
      <Panel title="Recent Bookings" action="View all" href="/patient#bookings">
        {state==='loading'?<Skeleton/>:state==='unavailable'?<Empty text="Sign in on this Preview to load your live bookings."/>:latest.length?latest.map(b=><div className="miniRow" key={b.id}><div><b>{[...b.packages,...b.tests][0]||'Diagnostic booking'}</b><small>{b.orderNumber} · {fmt(b.collectionDate)} · {b.slot}</small></div><Status text={b.workflowStatus||b.status}/></div>):<Empty text="No bookings yet"/>}
      </Panel>
      <Panel title="My Health Summary" action="View reports" href="/patient#reports">
        <div className="summaryList"><Summary n={state==='ready'?reports.length:'—'} text="Reports available"/><Summary n={state==='ready'?upcoming.length:'—'} text="Upcoming appointments"/><Summary n={state==='ready'?bookings.length:'—'} text="Bookings in your account"/><Summary n="24×7" text="Secure access to your records"/></div>
        <div className="homeCollectionCallout"><span>⌂</span><div><b>Home Sample Collection</b><small>Safe, convenient doorstep collection with trusted diagnostic partners.</small></div><a href="/booking">Book Now →</a></div>
      </Panel>
    </div>
  </section>
}

function TechnicianInsights(){
  const [jobs,setJobs]=useState<TechJob[]>([]); const [state,setState]=useState<LoadState>('loading');
  useEffect(()=>{fetch('/api/technician/jobs',{cache:'no-store'}).then(async r=>{if(!r.ok){setState('unavailable');return;}setJobs((await r.json()).bookings||[]);setState('ready')}).catch(()=>setState('unavailable'))},[]);
  const today=new Date().toISOString().slice(0,10);
  const todayJobs=jobs.filter(j=>new Date(j.collectionDate).toISOString().slice(0,10)===today);
  const collected=todayJobs.filter(j=>['SAMPLE_COLLECTED','SAMPLE_RECEIVED_AT_LAB','PROCESSING','REPORT_READY','REPORT_DELIVERED'].includes(j.workflowStatus)).length;
  const pending=todayJobs.filter(j=>!['SAMPLE_COLLECTED','SAMPLE_RECEIVED_AT_LAB','PROCESSING','REPORT_READY','REPORT_DELIVERED'].includes(j.workflowStatus)).length;
  const value=(n:number)=>state==='ready'?n:'—';
  return <section className="roleInsights technicianInsights">
    {state==='unavailable'&&<PreviewNotice/>}
    <div className="insightKpis">
      <Kpi icon="▣" value={value(todayJobs.length)} label="Today's Visits" tone="blue"/><Kpi icon="✓" value={value(collected)} label="Collected" tone="green"/><Kpi icon="◷" value={value(pending)} label="Pending" tone="orange"/><Kpi icon="↻" value={value(jobs.filter(j=>j.workflowStatus==='RESCHEDULED').length)} label="Rescheduled" tone="red"/>
    </div>
    <div className="insightGrid techGrid">
      <Panel title={`Today's Assignments${state==='ready'?` (${todayJobs.length})`:''}`} action="Open jobs" href="/technician#assignments">
        {state==='loading'?<Skeleton/>:state==='unavailable'?<Empty text="Sign in on this Preview to load today's assignments."/>:todayJobs.slice(0,6).map((j,i)=><div className="assignmentRow" key={j.id}><span className="num">{i+1}</span><div><b>{j.patient.name}</b><small>{j.items.map(x=>x.test.name).slice(0,2).join(', ')||'Diagnostic collection'} · {j.slot}</small></div><Status text={j.workflowStatus}/><a href={`/technician#${j.id}`}>View</a></div>)}
        {state==='ready'&&!todayJobs.length&&<Empty text="No assignments for today"/>}
      </Panel>
      <Panel title="Today's Route & Quick Actions">
        <div className="routeCard"><div className="routeBackdrop"><b>Today's collection route</b><small>{state==='ready'?(todayJobs.length?`${todayJobs.length} scheduled stop${todayJobs.length===1?'':'s'}`:'No route stops yet'):'Preview session required'}</small></div><div className="routeLine">{todayJobs.slice(0,5).map((j,i)=><span key={j.id}><i>{i+1}</i>{j.address||j.pincode||'Collection stop'}</span>)}</div></div>
        <div className="quickTiles"><a href="/technician#scan">▥<b>Scan</b></a><a href="/technician#status">↻<b>Status</b></a><a href="/technician#assignments">☎<b>Call</b></a><a href="/technician#visits">⌖<b>Navigate</b></a></div>
      </Panel>
    </div>
  </section>
}

function AdminInsights(){
  const [bookings,setBookings]=useState<AdminBooking[]>([]),[tests,setTests]=useState<AdminTest[]>([]),[packages,setPackages]=useState<AdminPackage[]>([]),[state,setState]=useState<LoadState>('loading');
  useEffect(()=>{Promise.all([fetch('/api/admin/bookings'),fetch('/api/admin/catalog/tests'),fetch('/api/admin/catalog/packages')]).then(async([b,t,p])=>{if(!b.ok||!t.ok||!p.ok){setState('unavailable');return;}setBookings((await b.json()).bookings||[]);setTests((await t.json()).tests||[]);setPackages((await p.json()).packages||[]);setState('ready')}).catch(()=>setState('unavailable'))},[]);
  const paid=bookings.filter(b=>b.paymentStatus==='PAID'); const revenue=paid.reduce((s,b)=>s+(b.totalAmount||0),0);
  const completed=bookings.filter(b=>['COMPLETED','REPORT_DELIVERED'].includes(b.status)).length; const cancelled=bookings.filter(b=>b.status==='CANCELLED').length; const inProgress=Math.max(0,bookings.length-completed-cancelled);
  const partnerCounts=useMemo(()=>{const m=new Map<string,number>();bookings.forEach(b=>b.items?.forEach(i=>{const p=i.test?.diagnosticPartner||'TG Labs';m.set(p,(m.get(p)||0)+1)}));return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4)},[bookings]);
  const topTests=useMemo(()=>{const m=new Map<string,number>();bookings.forEach(b=>b.items?.forEach(i=>{const n=i.test?.name;if(n)m.set(n,(m.get(n)||0)+1)}));return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5)},[bookings]);
  const value=(n:number|string)=>state==='ready'?n:'—';
  return <section className="roleInsights adminInsights">
    {state==='unavailable'&&<PreviewNotice/>}
    <div className="insightKpis adminSix"><Kpi icon="▣" value={value(bookings.length)} label="Total Bookings" tone="blue"/><Kpi icon="✓" value={value(completed)} label="Completed" tone="green"/><Kpi icon="◷" value={value(inProgress)} label="In Progress" tone="orange"/><Kpi icon="×" value={value(cancelled)} label="Cancelled" tone="red"/><Kpi icon="⚗" value={value(tests.length)} label="Tests" tone="purple"/><Kpi icon="◫" value={value(packages.length)} label="Packages" tone="teal"/></div>
    <div className="insightGrid adminGrid">
      <Panel title="Bookings by Status">{state==='ready'?<div className="statusBars"><Bar label="Completed" value={completed} total={bookings.length}/><Bar label="In Progress" value={inProgress} total={bookings.length}/><Bar label="Cancelled" value={cancelled} total={bookings.length}/></div>:<Skeleton/>}</Panel>
      <Panel title="Top Tests (Bookings)" action="Catalog" href="/admin/partner-catalog">{state==='loading'?<Skeleton/>:state==='unavailable'?<Empty text="Preview admin session required."/>:topTests.length?topTests.map(([n,v],i)=><Rank key={n} rank={i+1} name={n} value={v}/>):<Empty text="No booking data yet"/>}</Panel>
      <Panel title="Partner Performance" action="View partners" href="/admin/partner-catalog">{state==='loading'?<Skeleton/>:state==='unavailable'?<Empty text="Preview admin session required."/>:partnerCounts.length?partnerCounts.map(([n,v],i)=><Rank key={n} rank={i+1} name={n} value={v}/>):<Empty text="No partner data yet"/>}</Panel>
      <Panel title="Revenue Overview"><div className="revenue">{state==='ready'?`₹${revenue.toLocaleString('en-IN')}`:'—'}<small>Paid booking value</small></div><div className="summaryList compact"><Summary n={state==='ready'?paid.length:'—'} text="Paid bookings"/><Summary n={state==='ready'?bookings.length-paid.length:'—'} text="Pending / unpaid"/></div></Panel>
    </div>
    <Panel title="Recent Bookings" action="Manage bookings" href="/admin/bookings">
      {state==='loading'?<Skeleton/>:state==='unavailable'?<Empty text="Preview admin session required to load recent bookings."/>:<div className="adminTable"><div className="tableHead"><span>#</span><span>Patient</span><span>Test</span><span>Amount</span><span>Status</span><span>Date</span></div>{bookings.slice(0,6).map((b,i)=><div className="tableRow" key={b.id}><span>{i+1}</span><b>{b.patient?.name||'Patient'}</b><span>{b.items?.[0]?.test?.name||'Diagnostic booking'}</span><b>₹{(b.totalAmount||0).toLocaleString('en-IN')}</b><Status text={b.status}/><span>{fmt(b.collectionDate)}</span></div>)}</div>}
    </Panel>
  </section>
}

function Kpi({icon,value,label,tone}:{icon:string;value:string|number;label:string;tone:string}){return <article className={`insightKpi ${tone}`}><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></article>}
function Panel({title,children,action,href}:{title:string;children:React.ReactNode;action?:string;href?:string}){return <article className="insightPanel"><header><h3>{title}</h3>{action&&href&&<a href={href}>{action} →</a>}</header>{children}</article>}
function Status({text}:{text:string}){return <span className="statusPill">{String(text||'Pending').replaceAll('_',' ')}</span>}
function Summary({n,text}:{n:string|number;text:string}){return <div><strong>{n}</strong><span>{text}</span></div>}
function Rank({rank,name,value}:{rank:number;name:string;value:number}){return <div className="rankRow"><i>{rank}</i><span>{name}</span><b>{value}</b></div>}
function Bar({label,value,total}:{label:string;value:number;total:number}){const pct=total?Math.round(value/total*100):0;return <div className="barRow"><div><span>{label}</span><b>{value} ({pct}%)</b></div><i><em style={{width:`${pct}%`}}/></i></div>}
function Empty({text}:{text:string}){return <div className="insightEmpty">{text}</div>}
function Skeleton(){return <div className="insightEmpty">Loading live dashboard data…</div>}
function PreviewNotice(){return <div className="previewNotice"><b>Preview data not loaded</b><span>This design Preview could not read the signed-in portal session. Production data has not been changed.</span></div>}
function fmt(v:string){try{return new Date(v).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}catch{return '—'}}
