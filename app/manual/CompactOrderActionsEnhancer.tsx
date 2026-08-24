'use client';

import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

export default function CompactOrderActionsEnhancer(){
  const pathname=usePathname();

  useEffect(()=>{
    if(pathname!=='/manual') return;
    let stopped=false;
    let raf=0;

    function findOrdersTable(){
      return [...document.querySelectorAll('table')].find(t=>{
        const h=(t.querySelector('thead')?.textContent||'').toUpperCase();
        return h.includes('ACTIONS')&&h.includes('BILL')&&h.includes('PAYMENT');
      })||null;
    }

    function styleControl(el:Element){
      const x=el as HTMLElement;
      x.style.minHeight='24px';
      x.style.height='auto';
      x.style.fontSize='9px';
      x.style.padding='3px 5px';
      x.style.lineHeight='1.05';
      x.style.margin='0';
      x.style.boxSizing='border-box';
      x.style.maxWidth='100%';
    }

    function compactNow(){
      raf=0;
      if(stopped)return;
      const table=findOrdersTable();
      if(!table)return;

      table.style.tableLayout='auto';
      table.setAttribute('data-compact-orders','true');

      const headCells=table.querySelectorAll('thead th');
      if(headCells[0]){
        const h=headCells[0] as HTMLElement;
        h.style.width='330px';
        h.style.minWidth='330px';
        h.style.maxWidth='330px';
      }

      for(const row of [...table.querySelectorAll('tbody tr')]){
        const cells=row.querySelectorAll('td');
        if(!cells.length)continue;
        const action=cells[0] as HTMLElement;
        action.style.width='330px';
        action.style.minWidth='330px';
        action.style.maxWidth='330px';
        action.style.padding='5px';
        action.style.verticalAlign='top';

        const base=action.firstElementChild as HTMLElement|null;
        if(base){
          base.style.display='grid';
          base.style.gridTemplateColumns='repeat(4,minmax(0,1fr))';
          base.style.gap='3px';
          base.style.alignItems='start';
          base.style.width='100%';
          base.style.maxWidth='330px';
          base.style.margin='0';
          base.style.lineHeight='1.05';

          [...base.children].forEach((child)=>{
            const x=child as HTMLElement;
            x.style.minWidth='0';
            x.style.maxWidth='100%';
            x.style.margin='0';
            x.style.gridColumn='auto';
            x.style.lineHeight='1.05';
            const text=(x.textContent||'').trim().toUpperCase();
            if(text.startsWith('UPLOADED REPORTS')){
              x.style.gridColumn='1 / -1';
              x.style.fontSize='8px';
              x.style.lineHeight='1.05';
              x.style.maxHeight='28px';
              x.style.overflow='hidden';
            }
            if(text==='UPLOAD ORIGINAL BILL(S)'||text==='DELETE UPLOADED REPORT'){
              x.style.fontSize='8px';
              x.style.lineHeight='1';
            }
          });
        }

        action.querySelectorAll('button,a,label,select,input').forEach(styleControl);
        action.querySelectorAll('select,input').forEach(el=>{
          const x=el as HTMLElement;
          x.style.width='100%';
          x.style.minWidth='0';
        });

        const share=action.querySelector('[data-bill-share]') as HTMLElement|null;
        if(share){
          share.style.display='grid';
          share.style.gridTemplateColumns='repeat(2,minmax(0,1fr))';
          share.style.gap='3px';
          share.style.width='100%';
          share.style.minWidth='0';
          share.style.gridColumn='span 2';
          [...share.children].forEach(ch=>{
            const x=ch as HTMLElement;
            x.style.width='100%';
            x.style.minWidth='0';
            x.style.margin='0';
          });
        }

        const del=action.querySelector('[data-delete-files-for]') as HTMLElement|null;
        if(del){
          del.style.display='grid';
          del.style.gridTemplateColumns='repeat(2,minmax(0,1fr))';
          del.style.gap='3px';
          del.style.width='100%';
          del.style.minWidth='0';
          del.style.gridColumn='span 2';
          [...del.children].forEach(ch=>{
            const x=ch as HTMLElement;
            x.style.width='100%';
            x.style.minWidth='0';
            x.style.margin='0';
          });
        }

        const flow=action.querySelector('[data-order-workflow]') as HTMLElement|null;
        if(flow){
          flow.style.display='flex';
          flow.style.flexWrap='wrap';
          flow.style.gap='2px';
          flow.style.width='100%';
          flow.style.maxWidth='100%';
          flow.style.gridColumn='1 / -1';
          flow.style.margin='1px 0 0';
          flow.querySelectorAll('*').forEach(el=>{
            const x=el as HTMLElement;
            x.style.fontSize='7px';
            x.style.lineHeight='1';
            x.style.margin='0';
            x.style.padding='2px 4px';
            x.style.minHeight='0';
          });
        }

        action.querySelectorAll('div,p,span').forEach(el=>{
          const x=el as HTMLElement;
          const text=(x.textContent||'').trim().toUpperCase();
          if(text==='UPLOAD ORIGINAL BILL(S)'||text==='DELETE UPLOADED REPORT'||text.startsWith('UPLOADED REPORTS')){
            x.style.fontSize='8px';
            x.style.lineHeight='1';
            x.style.margin='0';
          }
        });
      }
    }

    function scheduleCompact(){
      if(stopped||raf)return;
      raf=window.requestAnimationFrame(compactNow);
    }

    scheduleCompact();
    const ob=new MutationObserver(scheduleCompact);
    ob.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('resize',scheduleCompact);
    return()=>{
      stopped=true;
      ob.disconnect();
      if(raf)window.cancelAnimationFrame(raf);
      window.removeEventListener('resize',scheduleCompact);
    };
  },[pathname]);

  return null;
}
