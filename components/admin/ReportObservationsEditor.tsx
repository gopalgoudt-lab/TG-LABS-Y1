'use client';

import { useEffect, useState } from 'react';

type Row={parameterName:string;value:string;unit:string;referenceRange:string;flag:string};
const empty=():Row=>({parameterName:'',value:'',unit:'',referenceRange:'',flag:''});
const input={width:'100%',padding:'9px 10px',border:'1px solid #cddbd6',borderRadius:8,boxSizing:'border-box' as const};

export default function ReportObservationsEditor({bookingId}:{bookingId:string}){
 const [rows,setRows]=useState<Row[]>([empty()]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[msg,setMsg]=useState('');
 useEffect(()=>{(async()=>{try{const r=await fetch(`/api/admin/bookings/${bookingId}/report-observations`,{cache:'no-store'});const j=await r.json();if(!r.ok)throw new Error(j.error||'Unable to load results');setRows(j.observations?.length?j.observations.map((x:any)=>({parameterName:x.parameterName,value:x.value,unit:x.unit||'',referenceRange:x.referenceRange||'',flag:x.flag||''})):[empty()]);}catch(e){setMsg(e instanceof Error?e.message:'Unable to load results')}finally{setLoading(false)}})()},[bookingId]);
 const set=(i:number,k:keyof Row,v:string)=>setRows(x=>x.map((r,n)=>n===i?{...r,[k]:v}:r));
 async function save(){setSaving(true);setMsg('');try{const observations=rows.filter(r=>r.parameterName.trim()||r.value.trim());if(observations.some(r=>!r.parameterName.trim()||!r.value.trim()))throw new Error('Every entered row needs both Parameter and Result.');const res=await fetch(`/api/admin/bookings/${bookingId}/report-observations`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({observations})});const j=await res.json();if(!res.ok)throw new Error(j.error||'Unable to save results');setMsg(`${j.count} verified observation${j.count===1?'':'s'} saved safely.`);}catch(e){setMsg(e instanceof Error?e.message:'Unable to save results')}finally{setSaving(false)}}
 if(loading)return <div>Loading structured results…</div>;
 return <div>
  <p style={{color:'#687c76',marginTop:0}}>Enter only diagnostic observations. Do not enter patient name, phone, email, address, IDs or free-form report instructions here. These verified fields are the future privacy-safe AI input.</p>
  <div style={{overflowX:'auto'}}><table style={{width:'100%',minWidth:850,borderCollapse:'collapse'}}><thead><tr>{['Parameter','Result','Unit','Reference Range','Flag',''].map(h=><th key={h} style={{textAlign:'left',padding:7}}>{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>
   <td style={{padding:5}}><input aria-label={`Parameter ${i+1}`} style={input} value={r.parameterName} onChange={e=>set(i,'parameterName',e.target.value)}/></td>
   <td style={{padding:5}}><input aria-label={`Result ${i+1}`} style={input} value={r.value} onChange={e=>set(i,'value',e.target.value)}/></td>
   <td style={{padding:5}}><input aria-label={`Unit ${i+1}`} style={input} value={r.unit} onChange={e=>set(i,'unit',e.target.value)}/></td>
   <td style={{padding:5}}><input aria-label={`Reference range ${i+1}`} style={input} value={r.referenceRange} onChange={e=>set(i,'referenceRange',e.target.value)}/></td>
   <td style={{padding:5}}><select aria-label={`Flag ${i+1}`} style={input} value={r.flag} onChange={e=>set(i,'flag',e.target.value)}><option value="">—</option>{['Normal','Low','High','Borderline','Critical','Abnormal','Positive','Negative'].map(x=><option key={x}>{x}</option>)}</select></td>
   <td style={{padding:5}}><button type="button" onClick={()=>setRows(x=>x.length===1?[empty()]:x.filter((_,n)=>n!==i))}>Remove</button></td>
  </tr>)}</tbody></table></div>
  <div style={{display:'flex',gap:10,marginTop:10,flexWrap:'wrap'}}><button type="button" onClick={()=>setRows(x=>x.length<250?[...x,empty()]:x)}>+ Add parameter</button><button type="button" disabled={saving} onClick={save} style={{border:0,borderRadius:9,padding:'9px 13px',background:'#087f6f',color:'#fff',fontWeight:800}}>{saving?'Saving…':'Save verified results'}</button></div>
  {msg&&<div style={{marginTop:9,fontWeight:700}}>{msg}</div>}
 </div>;
}
