'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

type DeliveryItem={id:string;delivered:boolean;deliveredAt:string|null};

export default function ReportDeliveryControl(){
  const pathname=usePathname();

  useEffect(()=>{
    if(pathname!=='/manual')return;
    let cancelled=false;
    const status=new Map<string,DeliveryItem>();

    async function load(){
      try{
        const r=await fetch('/api/admin/thyrocare/report-delivery',{cache:'no-store'});
        const d=await r.json();
        if(!r.ok||cancelled)return;
        for(const item of d.items||[])status.set(item.id,item);
        inject();
      }catch{}
    }

    async function update(id:string,delivered:boolean,select:HTMLSelectElement,note:HTMLElement){
      select.disabled=true;
      try{
        const r=await fetch('/api/admin/thyrocare/report-delivery',{
          method:'PATCH',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({id,delivered}),
        });
        const d=await r.json();
        if(!r.ok)throw new Error(d.error||'Unable to update');
        status.set(id,{id,delivered:d.delivered,deliveredAt:d.deliveredAt||null});
        note.textContent=d.deliveredAt?`Updated ${new Date(d.deliveredAt).toLocaleString('en-IN')}`:'';
      }catch(e){
        select.value=delivered?'NO':'YES';
        note.textContent=e instanceof Error?e.message:'Unable to update';
      }finally{select.disabled=false;}
    }

    function inject(){
      if(cancelled)return;
      const headings=[...document.querySelectorAll('h2')];
      const heading=headings.find(h=>h.textContent?.includes('Orders / Bills List'));
      const card=heading?.parentElement?.parentElement;
      const table=card?.querySelector('table');
      if(!table)return;
      const rows=[...table.querySelectorAll('tbody tr')];
      for(const row of rows){
        const cells=row.querySelectorAll('td');
        if(cells.length<2)continue;
        const idMatch=(cells[1].textContent||'').match(/THY-[A-Z0-9-]+/i);
        const id=idMatch?.[0];
        if(!id)continue;
        const reportCell=cells[cells.length-1] as HTMLTableCellElement;
        if(reportCell.querySelector(`[data-report-delivery-control="${id}"]`))continue;
        const item=status.get(id);
        const wrap=document.createElement('div');
        wrap.dataset.reportDeliveryControl=id;
        wrap.style.marginTop='7px';
        wrap.style.display='grid';
        wrap.style.gap='4px';
        wrap.style.minWidth='115px';
        const label=document.createElement('div');
        label.textContent='Report Delivered';
        label.style.fontSize='11px';
        label.style.fontWeight='800';
        label.style.color='#374151';
        const select=document.createElement('select');
        select.innerHTML='<option value="NO">No</option><option value="YES">Yes</option>';
        select.value=item?.delivered?'YES':'NO';
        select.style.padding='5px 7px';
        select.style.border='1px solid #cbd5e1';
        select.style.borderRadius='6px';
        select.style.background='#fff';
        select.style.fontSize='11px';
        const note=document.createElement('div');
        note.style.fontSize='9px';
        note.style.color='#64748b';
        note.textContent=item?.deliveredAt?`Updated ${new Date(item.deliveredAt).toLocaleString('en-IN')}`:'';
        select.addEventListener('change',()=>update(id,select.value==='YES',select,note));
        wrap.append(label,select,note);
        reportCell.appendChild(wrap);
      }
    }

    load();
    const observer=new MutationObserver(()=>inject());
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>{cancelled=true;observer.disconnect();};
  },[pathname]);

  return null;
}
