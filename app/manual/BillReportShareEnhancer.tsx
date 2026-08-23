'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

type OrderLite={id:string;billNumber:string;patient?:{phone?:string};reportAvailable?:boolean;originalBillAvailable?:boolean};

export default function BillReportShareEnhancer(){
 const pathname=usePathname();
 useEffect(()=>{if(pathname!=='/manual')return;let stopped=false;const orderMap=new Map<string,OrderLite>();
  const read=(f:File)=>new Promise<string>((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result||''));r.onerror=()=>no(new Error('Unable to read PDF'));r.readAsDataURL(f)});
  function findOrdersTable(){return [...document.querySelectorAll('table')].find(t=>{const head=(t.querySelector('thead')?.textContent||'').toUpperCase();return head.includes('ACTIONS')&&head.includes('BILL')&&head.includes('PATIENT')})||null}
  async function loadOrders(){try{const r=await fetch('/api/admin/thyrocare/orders',{cache:'no-store'});const d=await r.json();if(!r.ok)return;for(const o of d.orders||[]){if(o.billNumber)orderMap.set(String(o.billNumber).toUpperCase(),o)}inject()}catch{}}
  async function uploadMany(id:string,files:File[],btn:HTMLElement){if(!files.length)return;btn.textContent='Uploading bill(s)…';try{for(const f of files){if(f.type!=='application/pdf')throw new Error('Original bills must be PDF files.');const fileData=await read(f);const r=await fetch(`/api/admin/thyrocare/orders/${encodeURIComponent(id)}/original-bill`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fileName:f.name,fileData})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to upload bill.')}location.reload()}catch(e){alert(e instanceof Error?e.message:'Unable to upload bills.');btn.textContent='Upload Original Bill(s)'}}
  async function sendWhatsAppLink(id:string,phone:string,type:'report'|'bill',label:string){try{const r=await fetch(`/api/admin/thyrocare/orders/${encodeURIComponent(id)}/share-link`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type})});const d=await r.json();if(!r.ok)throw new Error(d.error||`Unable to prepare ${label.toLowerCase()}.`);const text=`Dear Patient,\n\nYour Thyrocare ${label} is ready.\nOpen/download securely here:\n${d.url}\n\nThis secure link is valid for 7 days.\nSupport: 9701162302`;window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(text)}`,'_blank')}catch(e){alert(e instanceof Error?e.message:`Unable to send ${label.toLowerCase()}.`)}}
  function inject(){if(stopped)return;const table=findOrdersTable();if(!table)return;for(const row of [...table.querySelectorAll('tbody tr')]){const c=row.querySelectorAll('td');if(c.length<2)continue;const rowText=(row.textContent||'').toUpperCase();const billNumber=rowText.match(/OP\d+/)?.[0];const directId=rowText.match(/THY-[A-Z0-9-]+/)?.[0];const mapped=billNumber?orderMap.get(billNumber):undefined;const id=mapped?.id||directId;const phone=(mapped?.patient?.phone||rowText.match(/\b\d{10}\b/)?.[0]||'').replace(/\D/g,'').slice(-10);if(!id||phone.length!==10)continue;const action=c[0] as HTMLTableCellElement;if(action.querySelector('[data-bill-share]'))continue;const wrap=document.createElement('div');wrap.dataset.billShare='1';wrap.style.cssText='display:flex;flex-wrap:wrap;gap:5px;margin-top:6px;min-width:170px';
    const upload=document.createElement('label');upload.textContent='Upload Original Bill(s)';upload.style.cssText='cursor:pointer;padding:6px 8px;border-radius:6px;background:#e0f2fe;color:#075985;font-size:10px;font-weight:800;text-align:center';const inp=document.createElement('input');inp.type='file';inp.accept='application/pdf';inp.multiple=true;inp.hidden=true;inp.onchange=()=>uploadMany(id,Array.from(inp.files||[]),upload);upload.appendChild(inp);
    const mk=(text:string,enabled:boolean,fn:()=>void)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.disabled=!enabled;b.style.cssText=`padding:6px 8px;border:1px solid ${enabled?'#16a34a':'#94a3b8'};border-radius:6px;background:${enabled?'#16a34a':'#e2e8f0'};color:${enabled?'#fff':'#64748b'};font-size:10px;font-weight:800;cursor:${enabled?'pointer':'not-allowed'}`;if(enabled)b.onclick=fn;return b};
    const reportEnabled=Boolean(mapped?.reportAvailable)||/\b(FULL|PARTIAL)\s+REPORT\b/.test(rowText)||rowText.includes('LATEST REPORT');
    const billEnabled=Boolean(mapped?.originalBillAvailable)||rowText.includes('ORIGINAL BILL');
    const reportButton=mk('Send Report',reportEnabled,()=>sendWhatsAppLink(id,phone,'report','Report'));
    const billButton=mk('Send Bill',billEnabled,()=>sendWhatsAppLink(id,phone,'bill','Original Bill'));
    wrap.append(upload,reportButton,billButton);action.appendChild(wrap)}}
  loadOrders();inject();const ob=new MutationObserver(inject);ob.observe(document.body,{childList:true,subtree:true});return()=>{stopped=true;ob.disconnect()}
 },[pathname]);return null
}
