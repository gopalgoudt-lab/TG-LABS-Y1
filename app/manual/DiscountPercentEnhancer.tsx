'use client';

import { useEffect } from 'react';

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

export default function DiscountPercentEnhancer(){
  useEffect(()=>{
    let stopped=false;

    function enhance(){
      if(stopped)return;
      const labels=Array.from(document.querySelectorAll('form label'));
      for(const label of labels){
        const heading=label.childNodes[0]?.textContent?.trim()||'';
        if(heading!=='Discount'&&heading!=='Discount (₹)')continue;
        const hiddenDiscountInput=label.querySelector('input[type="number"]') as HTMLInputElement|null;
        if(!hiddenDiscountInput||label.querySelector('[data-discount-checkbox-ui="1"]'))continue;

        hiddenDiscountInput.style.display='none';

        const wrap=document.createElement('div');
        wrap.dataset.discountCheckboxUi='1';
        wrap.style.cssText='display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;margin-top:6px';

        const valueInput=document.createElement('input');
        valueInput.type='number';
        valueInput.min='0';
        valueInput.step='1';
        valueInput.placeholder='0';
        valueInput.setAttribute('aria-label','Discount value');
        valueInput.style.cssText='width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid #cfd8dc;border-radius:7px;background:#fff;font-weight:700;color:#111827';

        const percentLabel=document.createElement('label');
        percentLabel.style.cssText='display:flex;align-items:center;gap:5px;font-weight:800;color:#0d5f54;cursor:pointer;white-space:nowrap;margin:0';
        const percentCheckbox=document.createElement('input');
        percentCheckbox.type='checkbox';
        percentCheckbox.setAttribute('aria-label','Use percentage discount');
        percentCheckbox.style.cssText='width:18px;height:18px;accent-color:#0d9488;cursor:pointer';
        const percentText=document.createElement('span');
        percentText.textContent='%';
        percentLabel.append(percentCheckbox,percentText);

        const hint=document.createElement('div');
        hint.style.cssText='grid-column:1 / -1;font-size:11px;color:#64748b;margin-top:-2px';

        let percentMode=false;
        let manualValue=Number(hiddenDiscountInput.value)||0;
        let percentValue=0;

        function renderHint(){
          if(percentMode){
            const gross=grossFor(hiddenDiscountInput);
            const amount=Math.round(gross*percentValue/100);
            hint.textContent=`${percentValue || 0}% of ₹${gross.toLocaleString('en-IN')} = ₹${amount.toLocaleString('en-IN')} discount`;
          }else{
            hint.textContent='Enter any discount amount, or tick % to enter a percentage.';
          }
        }

        function apply(){
          if(percentMode){
            percentValue=Math.max(0,Math.min(100,Number(valueInput.value)||0));
            if(String(percentValue)!==valueInput.value&&valueInput.value!=='')valueInput.value=String(percentValue);
            const gross=grossFor(hiddenDiscountInput);
            const amount=Math.round(gross*percentValue/100);
            setReactInputValue(hiddenDiscountInput,String(amount));
          }else{
            manualValue=Math.max(0,Number(valueInput.value)||0);
            setReactInputValue(hiddenDiscountInput,String(manualValue));
          }
          renderHint();
        }

        valueInput.value=String(manualValue||0);
        valueInput.addEventListener('input',apply);
        percentCheckbox.addEventListener('change',()=>{
          percentMode=percentCheckbox.checked;
          if(percentMode){
            percentValue=0;
            valueInput.value='0';
            valueInput.max='100';
          }else{
            valueInput.removeAttribute('max');
            valueInput.value=String(manualValue||0);
          }
          apply();
        });

        wrap.append(valueInput,percentLabel,hint);
        hiddenDiscountInput.insertAdjacentElement('afterend',wrap);
        renderHint();
      }

      document.querySelectorAll('[data-discount-checkbox-ui="1"]').forEach(node=>{
        const wrap=node as HTMLElement;
        const label=wrap.parentElement;
        const hidden=label?.querySelector('input[type="number"]') as HTMLInputElement|null;
        const valueInput=wrap.querySelector('input[type="number"]') as HTMLInputElement|null;
        const checkbox=wrap.querySelector('input[type="checkbox"]') as HTMLInputElement|null;
        const hint=wrap.querySelector('div') as HTMLDivElement|null;
        if(!hidden||!valueInput||!checkbox||!hint||!checkbox.checked)return;
        const pct=Math.max(0,Math.min(100,Number(valueInput.value)||0));
        const gross=grossFor(hidden);
        const amount=Math.round(gross*pct/100);
        if(Number(hidden.value)!==amount)setReactInputValue(hidden,String(amount));
        hint.textContent=`${pct}% of ₹${gross.toLocaleString('en-IN')} = ₹${amount.toLocaleString('en-IN')} discount`;
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
