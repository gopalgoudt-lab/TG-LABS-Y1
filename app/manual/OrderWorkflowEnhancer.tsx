'use client';

import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

type OrderLite={id:string;orderId?:string;billNumber?:string;balance?:number;paidAmount?:number;reportAvailable?:boolean;reportReady?:boolean;originalBillAvailable?:boolean};
type DeliveryItem={id:string;printed:boolean;delivered:boolean};

export default function OrderWorkflowEnhancer(){
  const pathname=usePathname();
  useEffect(()=>{
    if(pathname!=='/manual')return;
    let stopped=false;
    const orders=new Map<string,OrderLite>();
    const delivery=new Map<string,DeliveryItem>();

    function table(){
      return [...document.querySelectorAll('table')].find(t=>{
        const h=(t.querySelector('thead')?.textContent||'').toUpperCase();
        return h.includes('ACTIONS')&&h.includes('BILL')&&h.includes('REPORT');
      })||null;
    }
    function key(o:OrderLite){return String(o.orderId||o.id||'').toUpperCase()}
    function pill(text:string,state:'done'|'active'|'pending'){
      const s=document.createElement('span');
      const colors=state==='done'?['#dcfce7','#166534','#86efac']:state==='active'?['#fef3c7','#92400e','#fcd34d']:['#f1f5f9','#64748b','#cbd5e1'];
      s.textContent=text;
      s.style.cssText=`display:inline-flex;align-items:center;justify-content:center;padding:3px 6px;border-radius:999px;background:${colors[0]};color:${colors[1]};border:1px solid ${colors[2]};font-size:8px;line-height:1.15;font-weight:900;white-space:nowrap`;
      return s;
    }
    function inject(){
      if(stopped)return;
      const t=table();if(!t)return;
      for(const row of [...t.querySelectorAll('tbody tr')]){
        const cells=row.querySelectorAll('td');if(cells.length<2)continue;
        const text=(row.textContent||'').toUpperCase();
        const orderId=text.match(/THY-[A-Z0-9-]+/)?.[0];
        const billNo=text.match(/OP\d+/)?.[0];
        const o=(orderId&&orders.get(orderId))||(billNo&&[...orders.values()].find(x=>String(x.billNumber||'').toUpperCase()===billNo));
        if(!o)continue;
        const action=cells[0] as HTMLTableCellElement;
        if(action.querySelector(`[data-order-workflow="${o.id}"]`))continue;
        const d=delivery.get(o.id)||{id:o.id,printed:false,delivered:false};
        const balance=Number(o.balance||0), paid=Number(o.paidAmount||0);
        const paymentState=balance<=0?'done':paid>0?'active':'pending';
        const wrap=document.createElement('div');
        wrap.dataset.orderWorkflow=o.id;
        wrap.style.cssText='margin-top:5px;padding:5px 6px;border:1px solid #dbe7e5;border-radius:7px;background:#f8fffd;display:grid;grid-template-columns:repeat(3,max-content);align-items:center;gap:4px 5px;width:max-content;max-width:100%;min-width:0';
        const title=document.createElement('div');title.textContent='ORDER WORKFLOW';title.style.cssText='grid-column:1/-1;font-size:8px;line-height:1;font-weight:900;color:#0f766e;letter-spacing:.04em;margin-bottom:1px';
        wrap.append(title);
        wrap.append(
          pill('1 Order Created','done'),
          pill(balance<=0?'2 Payment Paid':paid>0?'2 Payment Partial':'2 Payment Due',paymentState),
          pill(o.originalBillAvailable?'3 Bill Uploaded':'3 Bill Pending',o.originalBillAvailable?'done':'pending'),
          pill(o.reportAvailable||o.reportReady?'4 Report Uploaded':'4 Report Pending',(o.reportAvailable||o.reportReady)?'done':'pending'),
          pill(d.printed?'5 Printed':'5 Print Pending',d.printed?'done':'pending'),
          pill(d.delivered?'6 Delivered':'6 Delivery Pending',d.delivered?'done':'pending')
        );
        action.appendChild(wrap);
      }
    }
    async function load(){
      try{
        const [or,dr]=await Promise.all([
          fetch('/api/admin/thyrocare/orders',{cache:'no-store'}),
          fetch('/api/admin/thyrocare/report-delivery',{cache:'no-store'})
        ]);
        const od=await or.json();const dd=await dr.json();
        if(or.ok)for(const o of od.orders||[]){orders.set(key(o),o);orders.set(String(o.id).toUpperCase(),o)}
        if(dr.ok)for(const d of dd.items||[])delivery.set(d.id,d);
        inject();
      }catch{}
    }
    load();
    const observer=new MutationObserver(inject);observer.observe(document.body,{childList:true,subtree:true});
    const onRefresh=()=>setTimeout(load,250);
    document.addEventListener('change',onRefresh,true);
    return()=>{stopped=true;observer.disconnect();document.removeEventListener('change',onRefresh,true)};
  },[pathname]);
  return null;
}
