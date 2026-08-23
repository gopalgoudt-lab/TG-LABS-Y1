'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

type DeliveryItem={id:string;printed:boolean;printedAt:string|null;delivered:boolean;deliveredAt:string|null};

export default function ReportDeliveryControl(){
  const pathname=usePathname();

  useEffect(()=>{
    if(pathname!=='/manual')return;
    let cancelled=false;
    const status=new Map<string,DeliveryItem>();

    function findOrdersTable(){
      return [...document.querySelectorAll('table')].find(t=>{
        const head=(t.querySelector('thead')?.textContent||'').toUpperCase();
        return head.includes('ACTIONS')&&head.includes('BILL')&&head.includes('REPORT');
      })||null;
    }

    async function load(){
      try{
        const r=await fetch('/api/admin/thyrocare/report-delivery',{cache:'no-store'});
        const d=await r.json();
        if(!r.ok||cancelled)return;
        for(const item of d.items||[])status.set(item.id,item);
        inject();
      }catch{}
    }

    async function update(id:string,field:'printed'|'delivered',value:boolean,select:HTMLSelectElement,note:HTMLElement){
      select.disabled=true;
      try{
        const r=await fetch('/api/admin/thyrocare/report-delivery',{
          method:'PATCH',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({id,[field]:value}),
        });
        const d=await r.json();
        if(!r.ok)throw new Error(d.error||'Unable to update');
        const current=status.get(id)||{id,printed:false,printedAt:null,delivered:false,deliveredAt:null};
        const next={...current,printed:d.printed,printedAt:d.printedAt||null,delivered:d.delivered,deliveredAt:d.deliveredAt||null};
        status.set(id,next);
        const at=field==='printed'?next.printedAt:next.deliveredAt;
        note.textContent=at?`Updated ${new Date(at).toLocaleString('en-IN')}`:'';
      }catch(e){
        select.value=value?'NO':'YES';
        note.textContent=e instanceof Error?e.message:'Unable to update';
      }finally{select.disabled=false;}
    }

    function addControl(wrap:HTMLElement,id:string,labelText:string,field:'printed'|'delivered',value:boolean,updatedAt:string|null){
      const box=document.createElement('div');
      box.style.display='grid';
      box.style.gap='3px';
      const label=document.createElement('div');
      label.textContent=labelText;
      label.style.fontSize='11px';
      label.style.fontWeight='800';
      label.style.color='#374151';
      const select=document.createElement('select');
      select.innerHTML='<option value="NO">No</option><option value="YES">Yes</option>';
      select.value=value?'YES':'NO';
      select.style.padding='5px 7px';
      select.style.border='1px solid #cbd5e1';
      select.style.borderRadius='6px';
      select.style.background='#fff';
      select.style.fontSize='11px';
      const note=document.createElement('div');
      note.style.fontSize='9px';
      note.style.color='#64748b';
      note.textContent=updatedAt?`Updated ${new Date(updatedAt).toLocaleString('en-IN')}`:'';
      select.addEventListener('change',()=>update(id,field,select.value==='YES',select,note));
      box.append(label,select,note);
      wrap.appendChild(box);
    }

    function inject(){
      if(cancelled)return;
      const table=findOrdersTable();
      if(!table)return;
      const rows=[...table.querySelectorAll('tbody tr')];
      for(const row of rows){
        const cells=row.querySelectorAll('td');
        if(cells.length<2)continue;
        const idMatch=(cells[1].textContent||'').match(/THY-[A-Z0-9-]+/i);
        const id=idMatch?.[0];
        if(!id)continue;
        const reportCell=cells[cells.length-1] as HTMLTableCellElement;
        if(reportCell.querySelector(`[data-report-status-control="${id}"]`))continue;
        const item=status.get(id)||{id,printed:false,printedAt:null,delivered:false,deliveredAt:null};
        const wrap=document.createElement('div');
        wrap.dataset.reportStatusControl=id;
        wrap.style.marginTop='7px';
        wrap.style.display='grid';
        wrap.style.gridTemplateColumns='1fr 1fr';
        wrap.style.gap='6px';
        wrap.style.minWidth='230px';
        addControl(wrap,id,'Report Printed', 'printed',item.printed,item.printedAt);
        addControl(wrap,id,'Report Delivered','delivered',item.delivered,item.deliveredAt);
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
