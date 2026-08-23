'use client';

import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

type OrderLite={
  id:string;billNumber?:string;orderId?:string;netAmount:number;paidAmount:number;balance:number;
  patient:{name:string;phone:string};
};

function money(n:number){return `₹${Number(n||0).toLocaleString('en-IN')}`}

export default function PaymentCollectionEnhancer(){
  const pathname=usePathname();
  useEffect(()=>{
    if(pathname!=='/manual')return;
    let stopped=false;
    const orders=new Map<string,OrderLite>();

    function findTable(){
      return [...document.querySelectorAll('table')].find(t=>{
        const h=(t.querySelector('thead')?.textContent||'').toUpperCase();
        return h.includes('ACTIONS')&&h.includes('BILL')&&h.includes('PAYMENT')&&h.includes('BALANCE');
      })||null;
    }

    function findOrder(row:HTMLTableRowElement){
      const text=(row.textContent||'').toUpperCase();
      for(const o of orders.values()){
        const bill=String(o.billNumber||'').toUpperCase();
        const id=String(o.orderId||o.id||'').toUpperCase();
        if((bill&&text.includes(bill))||(id&&text.includes(id)))return o;
      }
      return null;
    }

    function inject(){
      if(stopped)return;
      const table=findTable();if(!table)return;
      const headers=[...table.querySelectorAll('thead th')].map(x=>(x.textContent||'').trim().toUpperCase());
      const paymentIndex=headers.findIndex(x=>x==='PAYMENT');
      if(paymentIndex<0)return;
      for(const row of [...table.querySelectorAll('tbody tr')] as HTMLTableRowElement[]){
        const o=findOrder(row);if(!o)continue;
        const cell=row.querySelectorAll('td')[paymentIndex] as HTMLTableCellElement|undefined;
        if(!cell||cell.querySelector(`[data-payment-collect="${o.id}"]`))continue;

        const wrap=document.createElement('div');
        wrap.dataset.paymentCollect=o.id;
        wrap.style.cssText='margin-top:6px;display:grid;gap:5px;min-width:145px';

        if(Number(o.balance||0)<=0){
          const paid=document.createElement('span');
          paid.textContent='✓ Payment Complete';
          paid.style.cssText='display:inline-flex;width:max-content;padding:4px 7px;border-radius:999px;background:#dcfce7;color:#166534;border:1px solid #86efac;font-size:9px;font-weight:900';
          wrap.append(paid);cell.append(wrap);continue;
        }

        const button=document.createElement('button');
        button.type='button';
        button.textContent=`Collect ${money(o.balance)}`;
        button.style.cssText='border:0;border-radius:6px;background:#0f766e;color:white;padding:6px 8px;font-size:10px;font-weight:900;cursor:pointer;width:max-content';

        const panel=document.createElement('div');
        panel.style.cssText='display:none;grid-template-columns:1fr 82px;gap:5px;padding:7px;border:1px solid #dbe7e5;border-radius:7px;background:#f8fffd';

        const amount=document.createElement('input');
        amount.type='number';amount.min='1';amount.max=String(o.balance);amount.value=String(o.balance);amount.placeholder='Amount';
        amount.style.cssText='width:100%;box-sizing:border-box;padding:6px;border:1px solid #cbd5e1;border-radius:5px;font-size:11px';

        const mode=document.createElement('select');
        mode.style.cssText='width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:5px;font-size:11px;background:white';
        for(const x of ['CASH','UPI','CARD']){const op=document.createElement('option');op.value=x;op.textContent=x==='CASH'?'Cash':x==='UPI'?'UPI':'Card';mode.append(op)}

        const reference=document.createElement('input');
        reference.placeholder='Reference / UTR (optional)';
        reference.style.cssText='grid-column:1/-1;width:100%;box-sizing:border-box;padding:6px;border:1px solid #cbd5e1;border-radius:5px;font-size:10px';

        const waLabel=document.createElement('label');
        waLabel.style.cssText='grid-column:1/-1;display:flex;align-items:center;gap:5px;font-size:9px;font-weight:800;color:#334155';
        const waCheck=document.createElement('input');waCheck.type='checkbox';waCheck.checked=true;
        waLabel.append(waCheck,document.createTextNode('Send WhatsApp payment confirmation'));

        const save=document.createElement('button');
        save.type='button';save.textContent='Record Payment';
        save.style.cssText='grid-column:1/-1;border:0;border-radius:6px;background:#15803d;color:white;padding:7px;font-size:10px;font-weight:900;cursor:pointer';

        const message=document.createElement('div');
        message.style.cssText='grid-column:1/-1;font-size:9px;font-weight:800;color:#b91c1c;display:none';

        button.addEventListener('click',()=>{panel.style.display=panel.style.display==='grid'?'none':'grid'});
        save.addEventListener('click',async()=>{
          const value=Math.round(Number(amount.value)||0);
          if(value<=0||value>Number(o.balance)){message.textContent=`Enter an amount from ₹1 to ${money(o.balance)}.`;message.style.display='block';return}
          save.disabled=true;save.textContent='Saving…';message.style.display='none';
          try{
            const r=await fetch(`/api/admin/thyrocare/orders/${encodeURIComponent(o.id)}/payment`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:value,mode:mode.value,reference:reference.value})});
            const d=await r.json();
            if(!r.ok)throw new Error(d.error||'Unable to record payment.');
            if(waCheck.checked){
              const status=Number(d.balance)<=0?'PAID':'PARTIALLY PAID';
              const text=`Dear ${o.patient.name},\n\nPayment received successfully.\nBill No: ${o.billNumber||'-'}\nOrder ID: ${o.orderId||o.id}\nAmount received: ${money(d.amount)}\nTotal bill: ${money(o.netAmount)}\nTotal paid: ${money(d.paidAmount)}\nBalance: ${money(d.balance)}\nPayment mode: ${mode.options[mode.selectedIndex]?.text||mode.value}\nPayment status: ${status}${reference.value.trim()?`\nReference: ${reference.value.trim()}`:''}\n\nThank you.\nThyrocare Support: 9701162302`;
              window.open(`https://wa.me/91${String(o.patient.phone||'').replace(/\D/g,'').slice(-10)}?text=${encodeURIComponent(text)}`,'_blank');
            }
            window.setTimeout(()=>window.location.reload(),350);
          }catch(e){message.textContent=e instanceof Error?e.message:'Unable to record payment.';message.style.display='block';save.disabled=false;save.textContent='Record Payment'}
        });

        panel.append(amount,mode,reference,waLabel,save,message);
        wrap.append(button,panel);
        cell.append(wrap);
      }
    }

    async function load(){
      try{
        const r=await fetch('/api/admin/thyrocare/orders',{cache:'no-store'});const d=await r.json();
        if(!r.ok)return;
        orders.clear();
        for(const o of d.orders||[])orders.set(String(o.id),o);
        inject();
      }catch{}
    }

    load();
    const timer=window.setInterval(()=>{inject()},1200);
    const onChange=()=>window.setTimeout(load,300);
    document.addEventListener('change',onChange,true);
    return()=>{stopped=true;window.clearInterval(timer);document.removeEventListener('change',onChange,true)};
  },[pathname]);
  return null;
}
