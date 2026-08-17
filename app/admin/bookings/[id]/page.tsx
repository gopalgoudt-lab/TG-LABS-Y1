'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Test={id:string;name:string;price:number;diagnosticPartner?:string|null;sampleTypes?:string[]};
type Pack={id:string;name:string;price:number;tests:{test:Test}[]};

function fmt(total:number){const h=Math.floor(total/60),m=total%60,p=h>=12?'PM':'AM',hh=h%12||12;return `${hh}:${String(m).padStart(2,'0')} ${p}`;}
const SLOTS=Array.from({length:26},(_,i)=>{const s=360+i*30;return `${fmt(s)} - ${fmt(s+30)}`;});
const input={width:'100%',padding:'12px 14px',border:'1px solid #cddbd6',borderRadius:10,boxSizing:'border-box' as const};
const box={background:'#fff',border:'1px solid #dfe9e5',borderRadius:18,padding:20,boxShadow:'0 8px 28px rgba(12,71,61,.06)'};

export default function EditBookingPage(){
 const {id}=useParams<{id:string}>(); const router=useRouter();
 const [tests,setTests]=useState<Test[]>([]),[packages,setPackages]=useState<Pack[]>([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[msg,setMsg]=useState('');
 const [q,setQ]=useState(''),[pq,setPq]=useState('');
 const [f,setF]=useState<any>({name:'',phone:'',age:'',gender:'Male',mode:'HOME',address:'',date:'',slot:'6:00 AM - 6:30 AM',testIds:[],packageIds:[],technician:'',totalAmount:0,status:'PENDING',paymentStatus:'PENDING',adminNotes:'',reportName:'',reportData:''});
 const set=(k:string,v:any)=>setF((x:any)=>({...x,[k]:v}));
 useEffect(()=>{(async()=>{const [b,t,p]=await Promise.all([fetch(`/api/admin/bookings/${id}`),fetch('/api/admin/catalog/tests'),fetch('/api/admin/catalog/packages')]);const bj=await b.json();const tj=await t.json();const pj=await p.json();if(!b.ok){setMsg(bj.error||'Unable to load booking');setLoading(false);return;}const x=bj.booking;setTests(tj.tests||[]);setPackages(pj.packages||[]);setF({name:x.patient.name,phone:x.patient.phone,age:x.patient.age??'',gender:x.patient.gender||'Male',mode:x.mode,address:x.address||'',date:new Date(x.collectionDate).toISOString().slice(0,10),slot:x.slot,testIds:x.items.map((i:any)=>i.test.id),packageIds:[],technician:x.technician||'',totalAmount:x.totalAmount,status:x.status,paymentStatus:x.paymentStatus,adminNotes:x.adminNotes||'',reportName:x.reportName||'',reportData:x.reportData||''});setLoading(false)})()},[id]);
 const shownTests=useMemo(()=>tests.filter(t=>t.name.toLowerCase().includes(q.toLowerCase())),[tests,q]);
 const shownPacks=useMemo(()=>packages.filter(p=>(p.name+' '+p.tests.map(x=>x.test.name).join(' ')).toLowerCase().includes(pq.toLowerCase())),[packages,pq]);
 async function report(file?:File){if(!file)return;if(file.size>3000000){setMsg('Report must be below 3 MB.');return;}const data=await new Promise<string>((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result));r.onerror=rej;r.readAsDataURL(file)});setF((x:any)=>({...x,reportName:file.name,reportData:data}));}
 async function save(){setSaving(true);setMsg('');try{const r=await fetch(`/api/admin/bookings/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({...f,age:f.age===''?null:Number(f.age),totalAmount:Number(f.totalAmount)})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Unable to update booking');setMsg('Booking updated successfully.');setTimeout(()=>router.push('/admin'),700);}catch(e:any){setMsg(e.message)}finally{setSaving(false)}}
 if(loading)return <main style={{padding:30}}>Loading booking…</main>;
 return <main style={{minHeight:'100vh',background:'#f4f8f6',padding:28,color:'#12352f',fontFamily:'Arial,sans-serif'}}><div style={{maxWidth:1200,margin:'0 auto'}}>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:15,flexWrap:'wrap'}}><div><div style={{fontSize:12,fontWeight:900,color:'#087f6f'}}>ADMIN BOOKING EDITOR</div><h1>Edit Booking</h1><div style={{color:'#667a74'}}>Booking ID: {id}</div></div><a href="/admin" style={{color:'#087f6f',fontWeight:800}}>← Back to Admin</a></div>
  {msg&&<div style={{...box,margin:'15px 0'}}>{msg}</div>}
  <section style={{...box,marginTop:18}}><h2>Patient & Collection</h2><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14}}>
   <label>Name<input style={input} value={f.name} onChange={e=>set('name',e.target.value)}/></label>
   <label>Mobile Number<input style={input} maxLength={10} value={f.phone} onChange={e=>set('phone',e.target.value.replace(/\D/g,''))}/></label>
   <label>Age<input type="number" min="0" max="120" style={input} value={f.age} onChange={e=>set('age',e.target.value)}/></label>
   <label>Gender<select style={input} value={f.gender} onChange={e=>set('gender',e.target.value)}><option>Male</option><option>Female</option><option>Others</option></select></label>
   <label>Collection Type<select style={input} value={f.mode} onChange={e=>set('mode',e.target.value)}><option value="HOME">Home Collection</option><option value="CENTRE">Lab Centre</option></select></label>
   <label>Date<input type="date" style={input} value={f.date} onChange={e=>set('date',e.target.value)}/></label>
   <label>Time Slot<select style={input} value={f.slot} onChange={e=>set('slot',e.target.value)}>{SLOTS.map(s=><option key={s}>{s}</option>)}</select></label>
   <label>Technician<input style={input} placeholder="Technician name" value={f.technician} onChange={e=>set('technician',e.target.value)}/></label>
  </div>{f.mode==='HOME'&&<label style={{display:'block',marginTop:14}}>Address<textarea style={{...input,minHeight:80}} value={f.address} onChange={e=>set('address',e.target.value)}/></label>}</section>
  <section style={{...box,marginTop:18}}><h2>Tests & Packages</h2><input style={{...input,maxWidth:500,marginBottom:12}} placeholder="Search test..." value={q} onChange={e=>setQ(e.target.value)}/><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:8,maxHeight:300,overflowY:'auto'}}>{shownTests.map(t=><label key={t.id} style={{padding:10,border:'1px solid #dce7e3',borderRadius:10}}><input type="checkbox" checked={f.testIds.includes(t.id)} onChange={e=>set('testIds',e.target.checked?[...f.testIds,t.id]:f.testIds.filter((x:string)=>x!==t.id))}/> <b>{t.name}</b> • ₹{t.price}</label>)}</div>
   <h3 style={{marginTop:20}}>Add Package</h3><input style={{...input,maxWidth:500,marginBottom:12}} placeholder="Search package or included test..." value={pq} onChange={e=>setPq(e.target.value)}/><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:8,maxHeight:250,overflowY:'auto'}}>{shownPacks.map(p=><label key={p.id} style={{padding:10,border:'1px solid #dce7e3',borderRadius:10}}><input type="checkbox" checked={f.packageIds.includes(p.id)} onChange={e=>set('packageIds',e.target.checked?[...f.packageIds,p.id]:f.packageIds.filter((x:string)=>x!==p.id))}/> <b>{p.name}</b> • ₹{p.price}<br/><small>{p.tests.map(x=>x.test.name).join(', ')}</small></label>)}</div>
  </section>
  <section style={{...box,marginTop:18}}><h2>Price, Status & Report</h2><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14}}>
   <label>Final Price / Extra Discount<input type="number" min="0" style={input} value={f.totalAmount} onChange={e=>set('totalAmount',e.target.value)}/></label>
   <label>Booking Status<select style={input} value={f.status} onChange={e=>set('status',e.target.value)}><option>PENDING</option><option>CONFIRMED</option><option>CANCELLED</option><option>COMPLETED</option></select></label>
   <label>Payment Status<select style={input} value={f.paymentStatus} onChange={e=>set('paymentStatus',e.target.value)}><option>PENDING</option><option>PAID</option><option>FAILED</option><option>REFUNDED</option></select></label>
   <label>Replace / Upload Report<input type="file" accept="application/pdf,image/*" style={input} onChange={e=>report(e.target.files?.[0])}/><small>{f.reportName||'No report uploaded'}</small></label>
  </div><label style={{display:'block',marginTop:14}}>Admin Notes<textarea style={{...input,minHeight:100}} value={f.adminNotes} onChange={e=>set('adminNotes',e.target.value)}/></label>{f.reportData&&<a href={f.reportData} target="_blank" rel="noreferrer" style={{color:'#087f6f',fontWeight:800}}>View Current Report</a>}
  </section>
  <button disabled={saving} onClick={save} style={{marginTop:20,width:'100%',padding:15,border:0,borderRadius:12,background:'#087f6f',color:'#fff',fontWeight:900,fontSize:16,cursor:'pointer'}}>{saving?'Saving Changes…':'Save Booking Changes'}</button>
 </div></main>
}
