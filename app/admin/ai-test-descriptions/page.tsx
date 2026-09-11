'use client';

import { useEffect, useRef, useState } from 'react';

type Status = { total:number; withDescription:number; missing:number; batchLimit:number };
type Batch = { attempted:number; updated:number; failed:number; remaining:number; results:Array<{id:string;name:string;status:string;error?:string}> };

export default function AiTestDescriptionsPage(){
  const [status,setStatus]=useState<Status|null>(null);
  const [message,setMessage]=useState('');
  const [running,setRunning]=useState(false);
  const stopRef=useRef(false);

  async function refresh(){
    const res=await fetch('/api/admin/catalog/test-descriptions',{cache:'no-store'});
    const data=await res.json();
    if(!res.ok){setMessage(data.error||'Unable to load description status.');return null;}
    setStatus(data);return data as Status;
  }
  useEffect(()=>{void refresh()},[]);

  async function runBatch(){
    const res=await fetch('/api/admin/catalog/test-descriptions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({limit:5})});
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||'AI description batch failed.');
    return data as Batch;
  }

  async function runOne(){
    setRunning(true);setMessage('Generating the next controlled batch…');
    try{const data=await runBatch();setMessage(`Updated ${data.updated} test descriptions. ${data.remaining} remain.${data.failed?` ${data.failed} failed; review before continuing.`:''}`);await refresh();}
    catch(error){setMessage(error instanceof Error?error.message:'AI description batch failed.');}
    finally{setRunning(false);}
  }

  async function runAll(){
    stopRef.current=false;setRunning(true);setMessage('Backfill started. Existing descriptions will not be overwritten.');
    let totalUpdated=0;
    try{
      while(!stopRef.current){
        const data=await runBatch();totalUpdated+=data.updated;
        setStatus(current=>current?{...current,withDescription:current.withDescription+data.updated,missing:data.remaining}:current);
        setMessage(`Updated ${totalUpdated} descriptions in this run. ${data.remaining} remain.`);
        if(data.failed>0)throw new Error(`Stopped because ${data.failed} description(s) failed AI validation or generation.`);
        if(data.remaining===0||data.attempted===0)break;
      }
      if(stopRef.current)setMessage(`Stopped safely. ${totalUpdated} descriptions were added in this run.`);
      else setMessage(`AI description backfill complete. ${totalUpdated} descriptions were added in this run.`);
      await refresh();
    }catch(error){setMessage(error instanceof Error?error.message:'Backfill stopped because of an error.');await refresh();}
    finally{setRunning(false);}
  }

  return <main style={{maxWidth:900,margin:'0 auto',padding:'32px 18px 60px',fontFamily:'Arial,sans-serif'}}>
    <a href="/admin">← Admin dashboard</a>
    <h1>AI test descriptions</h1>
    <p>Generate patient-friendly educational descriptions for partner-linked diagnostic tests that currently have no description. Existing descriptions, pricing, TAT, booking state and partner settings are not changed.</p>
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:12,margin:'24px 0'}}>
      <Stat label="Partner-linked tests" value={status?.total}/><Stat label="With description" value={status?.withDescription}/><Stat label="Missing description" value={status?.missing}/>
    </div>
    <div role="status" style={{minHeight:24,padding:'12px 0',fontWeight:700}}>{message}</div>
    <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
      <button type="button" disabled={running||!status?.missing} onClick={()=>void runOne()} style={primary}>Generate next 5</button>
      <button type="button" disabled={running||!status?.missing} onClick={()=>void runAll()} style={primary}>Generate all missing</button>
      {running&&<button type="button" onClick={()=>{stopRef.current=true;setMessage('Stopping after the current batch…')}} style={secondary}>Stop safely</button>}
      <button type="button" disabled={running} onClick={()=>void refresh()} style={secondary}>Refresh status</button>
    </div>
    <section style={{marginTop:28,padding:16,border:'1px solid #d8e5e1',borderRadius:12}}><strong>Content guardrails</strong><p style={{marginBottom:0}}>Descriptions explain what a test measures and common reasons it may be ordered. AI is instructed not to diagnose, prescribe, invent ranges or preparation, or make marketing claims. Generated text should still be periodically reviewed as medical catalog content.</p></section>
  </main>;
}

function Stat({label,value}:{label:string;value:number|undefined}){return <div style={{padding:16,border:'1px solid #d8e5e1',borderRadius:12}}><div style={{fontSize:13,color:'#54655f'}}>{label}</div><div style={{fontSize:28,fontWeight:900,marginTop:5}}>{value??'—'}</div></div>}
const primary={padding:'11px 15px',border:0,borderRadius:9,background:'#102f29',color:'#fff',fontWeight:800,cursor:'pointer'};
const secondary={padding:'10px 14px',border:'1px solid #16705d',borderRadius:9,background:'#fff',color:'#145c4e',fontWeight:800,cursor:'pointer'};
