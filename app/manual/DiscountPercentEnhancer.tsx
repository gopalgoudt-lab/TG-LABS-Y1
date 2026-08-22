'use client';

import { useEffect } from 'react';

const OPTIONS = [5,10,15,20,25,30,35,40,45,50];

function numberFromText(value:string){
  const cleaned=value.replace(/[^0-9.]/g,'');
  return Number(cleaned)||0;
}

function setReactInputValue(input:HTMLInputElement,value:string){
  const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;
  setter?.call(input,value);
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.dispatchEvent(new Event('change',{bubbles:true}));
}

function grossFor(input:HTMLInputElement){
  const form=input.closest('form');
  if(!form)return 0;
  const labels=Array.from(form.querySelectorAll('label'));
  const grossLabel=labels.find(label=>label.childNodes[0]?.textContent?.trim().startsWith('Gross Total'));
  if(!grossLabel)return 0;
  return numberFromText(grossLabel.textContent||'');
}

function apply(select:HTMLSelectElement,input:HTMLInputElement){
  if(select.value==='MANUAL')return;
  const percent=Number(select.value)||0;
  const gross=grossFor(input);
  const discount=Math.round(gross*percent/100);
  if(Number(input.value)!==discount)setReactInputValue(input,String(discount));
}

export default function DiscountPercentEnhancer(){
  useEffect(()=>{
    let stopped=false;
    function enhance(){
      if(stopped)return;
      const labels=Array.from(document.querySelectorAll('form label'));
      for(const label of labels){
        const heading=label.childNodes[0]?.textContent?.trim()||'';
        if(heading!=='Discount'&&heading!=='Discount (₹)')continue;
        const input=label.querySelector('input[type="number"]') as HTMLInputElement|null;
        if(!input||label.querySelector('[data-discount-percent="1"]'))continue;
        const select=document.createElement('select');
        select.dataset.discountPercent='1';
        select.setAttribute('aria-label','Discount percentage');
        select.style.display='block';
        select.style.width='100%';
        select.style.boxSizing='border-box';
        select.style.marginTop='6px';
        select.style.padding='9px 10px';
        select.style.border='1px solid #cfd8dc';
        select.style.borderRadius='7px';
        select.style.background='#fff';
        select.style.fontWeight='700';
        select.style.color='#0d5f54';
        select.innerHTML='<option value="MANUAL">Manual Discount Amount</option><option value="0">0% Discount</option>'+OPTIONS.map(p=>`<option value="${p}">${p}% Discount</option>`).join('');
        select.addEventListener('change',()=>apply(select,input));
        input.insertAdjacentElement('beforebegin',select);
      }
      document.querySelectorAll('select[data-discount-percent="1"]').forEach(node=>{
        const select=node as HTMLSelectElement;
        const input=select.parentElement?.querySelector('input[type="number"]') as HTMLInputElement|null;
        if(input)apply(select,input);
      });
    }
    enhance();
    const observer=new MutationObserver(()=>enhance());
    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
    const timer=window.setInterval(enhance,800);
    return()=>{stopped=true;observer.disconnect();window.clearInterval(timer)};
  },[]);
  return null;
}
