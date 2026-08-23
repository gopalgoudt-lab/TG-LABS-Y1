'use client';

import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

type ReportDoc={id:string;fileName:string};
type OrderLite={id:string;billNumber:string;reportDocuments?:ReportDoc[];originalBillAvailable?:boolean;originalBillName?:string|null};

export default function DeleteUploadedFilesEnhancer(){
 const pathname=usePathname();
 useEffect(()=>{
  if(pathname!=='/manual')return;
  let stopped=false;
  const orderMap=new Map<string,OrderLite>();

  function findOrdersTable(){
   return [...document.querySelectorAll('table')].find(t=>{
    const head=(t.querySelector('thead')?.textContent||'').toUpperCase();
    return head.includes('ACTIONS')&&head.includes('BILL')&&head.includes('PATIENT');
   })||null;
  }

  async function load(){
   try{
    const r=await fetch('/api/admin/thyrocare/orders',{cache:'no-store'});
    const d=await r.json();
    if(!r.ok||stopped)return;
    orderMap.clear();
    for(const o of d.orders||[]){if(o.billNumber)orderMap.set(String(o.billNumber).toUpperCase(),o)}
    inject();
   }catch{}
  }

  async function remove(url:string,label:string){
   if(!confirm(`Delete this ${label}? You can upload the corrected PDF afterwards.`))return;
   try{
    const r=await fetch(url,{method:'DELETE'});
    const d=await r.json();
    if(!r.ok)throw new Error(d.error||`Unable to delete ${label}.`);
    location.reload();
   }catch(e){alert(e instanceof Error?e.message:`Unable to delete ${label}.`)}
  }

  function delButton(text:string,onClick:()=>void){
   const b=document.createElement('button');
   b.type='button';
   b.textContent=text;
   b.style.cssText='padding:5px 8px;border:1px solid #dc2626;border-radius:6px;background:#fff;color:#b91c1c;font-size:10px;font-weight:900;cursor:pointer;white-space:nowrap';
   b.onclick=onClick;
   return b;
  }

  function inject(){
   if(stopped)return;
   const table=findOrdersTable();
   if(!table)return;
   for(const row of [...table.querySelectorAll('tbody tr')]){
    const cells=row.querySelectorAll('td');
    if(cells.length<2)continue;
    const rowText=(row.textContent||'').toUpperCase();
    const billNumber=rowText.match(/OP\d+/)?.[0];
    const directId=rowText.match(/THY-[A-Z0-9-]+/)?.[0];
    const mapped=billNumber?orderMap.get(billNumber):undefined;
    const id=mapped?.id||directId;
    if(!id)continue;
    const action=cells[0] as HTMLTableCellElement;
    if(action.querySelector(`[data-delete-files-for="${CSS.escape(id)}"]`))continue;

    const wrap=document.createElement('div');
    wrap.dataset.deleteFilesFor=id;
    wrap.style.cssText='display:grid;gap:5px;margin-top:6px;padding-top:6px;border-top:1px dashed #fecaca;min-width:190px';

    const docs=mapped?.reportDocuments||[];
    if(docs.length){
     const heading=document.createElement('div');
     heading.textContent='Delete uploaded report';
     heading.style.cssText='font-size:10px;font-weight:900;color:#991b1b';
     wrap.appendChild(heading);
     for(const doc of docs){
      const line=document.createElement('div');
      line.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:6px';
      const name=document.createElement('span');
      name.textContent=doc.fileName;
      name.title=doc.fileName;
      name.style.cssText='font-size:9px;color:#475569;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px';
      line.append(name,delButton('Delete Report',()=>remove(`/api/admin/thyrocare/orders/${encodeURIComponent(id)}/report?documentId=${encodeURIComponent(doc.id)}`,'report')));
      wrap.appendChild(line);
     }
    }

    if(mapped?.originalBillAvailable){
     const line=document.createElement('div');
     line.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:6px';
     const name=document.createElement('span');
     name.textContent=mapped.originalBillName||'Original Bill';
     name.title=mapped.originalBillName||'Original Bill';
     name.style.cssText='font-size:9px;color:#475569;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px';
     line.append(name,delButton('Delete Bill',()=>remove(`/api/admin/thyrocare/orders/${encodeURIComponent(id)}/original-bill`,'original bill')));
     wrap.appendChild(line);
    }

    if(docs.length||mapped?.originalBillAvailable)action.appendChild(wrap);
   }
  }

  load();
  const ob=new MutationObserver(()=>inject());
  ob.observe(document.body,{childList:true,subtree:true});
  const timer=window.setInterval(()=>{inject()},1500);
  return()=>{stopped=true;ob.disconnect();window.clearInterval(timer)};
 },[pathname]);
 return null;
}
