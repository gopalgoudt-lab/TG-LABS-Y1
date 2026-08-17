'use client';

import { useEffect, useState } from 'react';

type Booking={id:string;source:string;mode:string;collectionDate:string;slot:string;status:string;paymentStatus:string;totalAmount:number;technician?:string|null;patient:{name:string;phone:string;age?:number|null;gender?:string|null};items:{test:{id:string;name:string}}[]};

export default function BookingManagementPage(){
 const [rows,setRows]=useState<Booking[]>([]),[q,setQ]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{fetch('/api/admin/bookings').then(r=>r.json()).then(j=>setRows(j.bookings||[])).finally(()=>setLoading(false))},[]);
 const shown=rows.filter(b=>(`${b.patient.name} ${b.patient.phone} ${b.items.map(i=>i.test.name).join(' ')} ${b.slot} ${b.technician||''} ${b.status}`).toLowerCase().includes(q.toLowerCase()));
 return <main style={{minHeight:'100vh',background:'#f4f8f6',padding:28,fontFamily:'Arial,sans-serif',color:'#12352f'}}><div style={{maxWidth:1400,margin:'0 auto'}}>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><div><div style={{fontSize:12,fontWeight:900,color:'#087f6f'}}>TG LABS ADMIN</div><h1>Booking Management</h1><p>Edit patient details, tests/packages, date, time, technician, price, report, mobile number and address.</p></div><a href="/admin" style={{color:'#087f6f',fontWeight:800}}>← Admin Dashboard</a></div>
  <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search patient, mobile, test, slot, technician or status..." style={{width:'100%',maxWidth:650,padding:'13px 15px',border:'1px solid #cddbd6',borderRadius:10,margin:'15px 0 20px'}}/>
  <div style={{background:'#fff',border:'1px solid #dfe9e5',borderRadius:18,padding:18,overflowX:'auto'}}>{loading?'Loading…':<table style={{width:'100%',borderCollapse:'collapse',minWidth:1050}}><thead><tr>{['Patient','Age/Gender','Tests','Collection','Technician','Payment','Status','Price','Action'].map(h=><th key={h} style={{textAlign:'left',padding:11,borderBottom:'1px solid #dce7e3'}}>{h}</th>)}</tr></thead><tbody>{shown.map(b=><tr key={b.id}><td style={{padding:11,borderBottom:'1px solid #edf2f0'}}><b>{b.patient.name}</b><br/><small>{b.patient.phone}</small></td><td>{b.patient.age??'—'} / {b.patient.gender||'—'}</td><td>{b.items.map(i=>i.test.name).join(', ')}</td><td>{new Date(b.collectionDate).toLocaleDateString('en-IN')}<br/><small>{b.mode} • {b.slot}</small></td><td>{b.technician||'—'}</td><td>{b.paymentStatus}</td><td>{b.status}</td><td><b>₹{b.totalAmount}</b></td><td><a href={`/admin/bookings/${b.id}`} style={{display:'inline-block',padding:'9px 13px',borderRadius:9,background:'#087f6f',color:'#fff',fontWeight:800,textDecoration:'none'}}>Edit Booking</a></td></tr>)}{!shown.length&&<tr><td colSpan={9} style={{padding:25,textAlign:'center'}}>No matching bookings.</td></tr>}</tbody></table>}</div>
 </div></main>
}
