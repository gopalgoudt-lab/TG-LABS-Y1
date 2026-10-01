'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Job={id:string;workflowStatus:string;collectionDate:string;slot:string;address?:string|null;pincode?:string|null;paymentStatus:string;totalAmount:number;technicianNotes?:string|null;patient:{name:string;phone:string;age?:number|null;gender?:string|null};items:{test:{name:string;sampleTypes:string[];sampleTypeOther?:string|null;fastingNeeded:boolean}}[]};
const steps=['TECHNICIAN_ASSIGNED','TECHNICIAN_ACCEPTED','ON_THE_WAY','REACHED_PATIENT','SAMPLE_COLLECTED','SAMPLE_RECEIVED_AT_LAB'];
const labels:Record<string,string>={TECHNICIAN_ASSIGNED:'Assigned',TECHNICIAN_ACCEPTED:'Accepted',ON_THE_WAY:'On the Way',REACHED_PATIENT:'Reached Patient',SAMPLE_COLLECTED:'Sample Collected',SAMPLE_RECEIVED_AT_LAB:'Submitted to Lab'};
const locationStages=new Set(['ON_THE_WAY','REACHED_PATIENT','SAMPLE_COLLECTED']);
export default function TechnicianJobPage(){
 const {id}=useParams<{id:string}>();const router=useRouter();const [job,setJob]=useState<Job|null>(null),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false),[locationStatus,setLocationStatus]=useState('');const watchRef=useRef<number|null>(null),lastSentRef=useRef(0);
 async function load(){const r=await fetch('/api/technician/jobs/'+id,{cache:'no-store'});if(r.status===401){router.replace('/technician/login');return}const j=await r.json();if(!r.ok){setMsg(j.error||'Unable to load assignment');return}setJob(j.booking)}
 useEffect(()=>{load()},[id]);
 useEffect(()=>{
  if(!job||!locationStages.has(job.workflowStatus)){if(watchRef.current!==null&&navigator.geolocation){navigator.geolocation.clearWatch(watchRef.current);watchRef.current=null}setLocationStatus('');return}
  if(!navigator.geolocation){setLocationStatus('Live location is unavailable on this device.');return}
  if(watchRef.current!==null)return;
  setLocationStatus('Waiting for location permission…');
  watchRef.current=navigator.geolocation.watchPosition(async position=>{
   const now=Date.now();if(now-lastSentRef.current<15000)return;lastSentRef.current=now;
   const {latitude,longitude,accuracy,speed,heading}=position.coords;
   const payload:{latitude:number;longitude:number;accuracy?:number;speed?:number;heading?:number;recordedAt:string}={latitude,longitude,recordedAt:new Date(position.timestamp).toISOString()};
   if(Number.isFinite(accuracy)&&accuracy>=0&&accuracy<=10000)payload.accuracy=accuracy;
   if(speed!==null&&Number.isFinite(speed)&&speed>=0&&speed<=200)payload.speed=speed;
   if(heading!==null&&Number.isFinite(heading)&&heading>=0&&heading<=360)payload.heading=heading;
   try{const response=await fetch('/api/technician/jobs/'+job.id+'/location',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(response.ok)setLocationStatus('Live location sharing active · last update '+new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}));
    else if(response.status===409){navigator.geolocation.clearWatch(watchRef.current!);watchRef.current=null;setLocationStatus('Live location sharing stopped.')}
    else setLocationStatus('Unable to send live location.');}
   catch{setLocationStatus('Unable to send live location.')}
  },error=>{setLocationStatus(error.code===1?'Location permission denied. Enable location permission to share journey updates.':'Current location is unavailable.');},{enableHighAccuracy:true,maximumAge:10000,timeout:15000});
  return()=>{if(watchRef.current!==null){navigator.geolocation.clearWatch(watchRef.current);watchRef.current=null}}
 },[job?.id,job?.workflowStatus]);
 async function advance(){if(!job)return;const i=steps.indexOf(job.workflowStatus);const next=steps[i+1];if(!next)return;setBusy(true);setMsg('');const r=await fetch('/api/technician/jobs/'+job.id+'/workflow',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:next,notes:job.technicianNotes||''})});const j=await r.json();if(!r.ok)setMsg(j.error||'Unable to update job');else{setMsg((labels[next]||next)+' updated.');await load()}setBusy(false)}
 if(!job)return <main className="technicianPortalContent" style={{padding:24}}>{msg||'Loading assignment…'}</main>;
 const i=steps.indexOf(job.workflowStatus),next=i>=0?steps[i+1]:undefined;const samples=Array.from(new Set(job.items.flatMap(x=>[...x.test.sampleTypes,x.test.sampleTypeOther||''].filter(Boolean)))).join(', ')||'Not specified';
 return <main className="technicianPortalContent" style={{padding:24,maxWidth:900,margin:'0 auto'}}><a href="/technician">← Back to assignments</a><h1>{job.patient.name}</h1><p><b>Status:</b> {labels[job.workflowStatus]||job.workflowStatus}</p><p><b>Date / Slot:</b> {new Date(job.collectionDate).toLocaleDateString('en-IN')} · {job.slot}</p><p><b>Tests:</b> {job.items.map(x=>x.test.name).join(', ')}</p><p><b>Sample Type:</b> {samples}</p><p><b>Fasting:</b> {job.items.some(x=>x.test.fastingNeeded)?'Required':'Not required'}</p><p><b>Address:</b> {job.address||'Lab centre'} {job.pincode||''}</p><p><b>Payment:</b> {job.paymentStatus} · ₹{job.totalAmount}</p><p><a href={'tel:'+job.patient.phone}>Call Patient</a></p>{locationStatus&&<p><b>Location:</b> {locationStatus}</p>}{msg&&<p>{msg}</p>}{next&&<button disabled={busy} onClick={advance} style={{padding:'12px 18px',fontWeight:800}}>{busy?'Updating…':'Mark: '+labels[next]}</button>}</main>
}
