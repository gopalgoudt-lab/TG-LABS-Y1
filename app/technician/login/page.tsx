'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BrandLogo from '@/components/BrandLogo';

const input:React.CSSProperties={width:'100%',padding:'13px 14px',border:'1px solid #cddbd6',borderRadius:12,boxSizing:'border-box',fontSize:16};
const button:React.CSSProperties={width:'100%',border:0,borderRadius:12,padding:'13px 16px',background:'#087f6f',color:'#fff',fontWeight:800,fontSize:16,cursor:'pointer'};

export default function TechnicianLogin(){
 const router=useRouter();
 const [identity,setIdentity]=useState(''),[pin,setPin]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function login(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{const r=await fetch('/api/technician/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identity,pin})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Unable to sign in');router.replace('/technician');router.refresh()}catch(e:any){setError(e.message)}finally{setBusy(false)}}
 return <main style={{minHeight:'100vh',background:'#eef7f4',display:'grid',placeItems:'center',padding:22,fontFamily:'Arial,sans-serif',color:'#12352f'}}><form onSubmit={login} style={{width:'100%',maxWidth:430,background:'#fff',border:'1px solid #dbe8e4',borderRadius:22,padding:28,boxShadow:'0 18px 50px rgba(12,71,61,.09)'}}><a href="/" className="standaloneBrand" aria-label="TG Labs home"><BrandLogo className="brandLogoAuth" priority /></a><div style={{fontSize:12,fontWeight:900,color:'#087f6f'}}>TG LABS • TECHNICIAN PORTAL</div><h1 style={{marginBottom:8}}>Technician Sign In</h1><p style={{marginTop:0,color:'#657973'}}>Use your registered mobile number, employee code or email and the PIN provided by Admin.</p>{error&&<div style={{padding:11,background:'#fff0f0',border:'1px solid #efcaca',borderRadius:10,color:'#9b2929',margin:'15px 0'}}>{error}</div>}<label style={{display:'block',marginTop:15,fontWeight:700}}>Mobile / Employee Code / Email<input autoComplete="username" style={{...input,marginTop:7}} value={identity} onChange={e=>setIdentity(e.target.value)} placeholder="e.g. TECH-001"/></label><label style={{display:'block',marginTop:15,fontWeight:700}}>Login PIN<input autoComplete="current-password" type="password" inputMode="numeric" maxLength={6} style={{...input,marginTop:7}} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="4–6 digit PIN"/></label><button disabled={busy} style={{...button,marginTop:20,opacity:busy?.7:1}}>{busy?'Signing in…':'Sign In'}</button><div style={{textAlign:'center',marginTop:16}}><a href="/" style={{color:'#087f6f',fontWeight:700}}>← TG Labs website</a></div></form></main>
}
