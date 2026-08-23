'use client';

import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

type OrderLite={id:string;billNumber:string;patient?:{phone?:string};reportDocuments?:Array<{id:string;fileName:string}>;originalBillAvailable?:boolean};

export default function DeleteUploadedFilesEnhancer(){
 const pathname=usePathname();
 useEffect(()=>{
  if(pathname!=='/manual')return;
  let stopped=false;
  const orderMap=new Map<string,OrderLite>();
  async function load(){try{const r=await fetch('/api/admin/thyrocare/orders',{cache:'no-store'});const d=await r.json();if(!r.ok||stopped)return;for(const o of d.orders||[]){if(o.billNumber)orderMap.set(String(o.billNumber).toUpperCase(),o)}inject()}catch{}}
  async function remove(url:string,label:string){if(!confirm(`Delete this ${label}? You can upload a new one afterwards.`))return;try{const r=await fetch(url,{method:'DELETE'});const d=await r.json();if(!r.ok)throw new Error(d.error||`Unable to delete ${label}.`);location.reload()}catch(e){alert(e instanceof Error?e.message:`Unable to delete ${label}.`)}}
  function delButton(text:string,onClick:()=>void){const b=document.createElement('button');b.type='button';b.textContent=text;b.style.cssText='padding:5px 7px;border:1px solid #dc2626;border-radius:6px;background:#fff;color:#b91c1c;font-size:10px;font-weight:800;cursor:pointer';b.onclick=onClick;return b}
  function inject(){if(stopped)return;const h=[...document.querySelectorAll('h2')].find(x=>x.textContent?.includes('Orders / Bills List'));const table=h?.closest('div')?.parentElement?.querySelector('table')||h?.parentElement?.parentElement?.querySelector('table');if(!table)return;for(const row of [...table.querySelectorAll('tbody tr')]){const c=row.querySelectorAll('td');if(c.length<2)continue;const rowText=(row.textContent||'').toUpperCase();const billNumber=rowText.match(/OP\d+/)?.[0];const directId=rowText.match(/THY-[A-Z0-9-]+/)?.[0];const mapped=billNumber?orderMap.get(billNumber):undefined;const id=mapped?.id||directId;if(!id)continue;const action=c[0] as HTMLTableCellElement;
    for(const link of [...action.querySelectorAll('a[href*="/report?documentId="]')]){const a=link as HTMLAnchorElement;if(a.dataset.deleteAttached)continue;a.dataset.deleteAttached='1';const u=new URL(a.href,location.origin);const documentId=u.searchParams.get('documentId');if(!documentId)continue;const b=delButton('Delete Report',()=>remove(`/api/admin/thyrocare/orders/${encodeURIComponent(id)}/report?documentId=${encodeURIComponent(documentId)}`,'report'));a.insertAdjacentElement('afterend',b)}
    const latestReport=action.querySelector('a[href$="/report"]') as HTMLAnchorElement|null;if(latestReport&&!latestReport.dataset.deleteAttached){latestReport.dataset.deleteAttached='1';latestReport.insertAdjacentElement('afterend',delButton('Delete Latest Report',()=>remove(`/api/admin/thyrocare/orders/${encodeURIComponent(id)}/report`,'latest report')))}
    const billLink=action.querySelector('a[href*="/original-bill"]') as HTMLAnchorElement|null;if(billLink&&!billLink.dataset.deleteAttached){billLink.dataset.deleteAttached='1';billLink.insertAdjacentElement('afterend',delButton('Delete Bill',()=>remove(`/api/admin/thyrocare/orders/${encodeURIComponent(id)}/original-bill`,'original bill')))}
  }}
  load();inject();const ob=new MutationObserver(inject);ob.observe(document.body,{childList:true,subtree:true});return()=>{stopped=true;ob.disconnect()}
 },[pathname]);return null
}
