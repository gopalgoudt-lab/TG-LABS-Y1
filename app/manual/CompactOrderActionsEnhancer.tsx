'use client';

import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

// Fresh post-reconnect deployment trigger for compact Manual Dashboard layout.
export default function CompactOrderActionsEnhancer(){
  const pathname=usePathname();

  useEffect(()=>{
    if(pathname!=='/manual') return;
    let stopped=false;

    function findOrdersTable(){
      return [...document.querySelectorAll('table')].find(t=>{
        const h=(t.querySelector('thead')?.textContent||'').toUpperCase();
        return h.includes('ACTIONS')&&h.includes('BILL')&&h.includes('PAYMENT');
      })||null;
    }

    function styleControl(el:Element){
      const x=el as HTMLElement;
      x.style.minHeight='26px';
      x.style.height='auto';
      x.style.fontSize='9px';
      x.style.padding='4px 5px';
      x.style.lineHeight='1.1';
      x.style.margin='0';
      x.style.boxSizing='border-box';
    }

    function compact(){
      if(stopped)return;
      const table=findOrdersTable();
      if(!table)return;

      table.style.tableLayout='auto';

      const headCells=table.querySelectorAll('thead th');
      if(headCells[0]){
        const h=headCells[0] as HTMLElement;
        h.style.width='280px';
        h.style.minWidth='280px';
        h.style.maxWidth='280px';
      }

      for(const row of [...table.querySelectorAll('tbody tr')]){
        const cells=row.querySelectorAll('td');
        if(!cells.length)continue;
        const action=cells[0] as HTMLElement;
        action.style.width='280px';
        action.style.minWidth='280px';
        action.style.maxWidth='280px';
        action.style.padding='6px';
        action.style.verticalAlign='top';

        const base=action.firstElementChild as HTMLElement|null;
        if(base){
          base.style.display='grid';
          base.style.gridTemplateColumns='repeat(3,minmax(0,1fr))';
          base.style.gap='4px';
          base.style.alignItems='start';
          base.style.width='100%';
          base.style.maxWidth='280px';
          base.style.margin='0';

          [...base.children].forEach((child)=>{
            const x=child as HTMLElement;
            x.style.minWidth='0';
            x.style.maxWidth='100%';
            x.style.margin='0';
            x.style.gridColumn='auto';
            const text=(x.textContent||'').trim().toUpperCase();
            if(text.startsWith('UPLOADED REPORTS')){
              x.style.gridColumn='1 / -1';
              x.style.fontSize='9px';
              x.style.lineHeight='1.15';
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
          share.style.gridTemplateColumns='repeat(3,minmax(0,1fr))';
          share.style.gap='3px';
          share.style.width='100%';
          share.style.minWidth='0';
          share.style.gridColumn='1 / -1';
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
          del.style.gridColumn='1 / -1';
          [...del.children].forEach(ch=>{
            const x=ch as HTMLElement;
            x.style.width='100%';
            x.style.minWidth='0';
            x.style.margin='0';
          });
        }

        const flow=action.querySelector('[data-order-workflow]') as HTMLElement|null;
        if(flow){
          flow.style.display='grid';
          flow.style.gridTemplateColumns='repeat(3,minmax(0,1fr))';
          flow.style.gap='3px';
          flow.style.width='100%';
          flow.style.maxWidth='100%';
          flow.style.gridColumn='1 / -1';
          flow.querySelectorAll('*').forEach(el=>{
            const x=el as HTMLElement;
            x.style.fontSize='8px';
            x.style.lineHeight='1.1';
          });
        }

        // Uploaded report/bill captions and links take excessive vertical space in the original UI.
        action.querySelectorAll('div,p,span').forEach(el=>{
          const x=el as HTMLElement;
          const text=(x.textContent||'').trim().toUpperCase();
          if(text==='UPLOAD ORIGINAL BILL(S)' || text==='DELETE UPLOADED REPORT' || text.startsWith('UPLOADED REPORTS')){
            x.style.fontSize='8px';
            x.style.lineHeight='1.1';
            x.style.margin='1px 0';
          }
        });
      }
    }

    compact();
    const ob=new MutationObserver(compact);
    ob.observe(document.body,{childList:true,subtree:true});
    const timer=window.setInterval(compact,800);
    window.addEventListener('resize',compact);
    return()=>{
      stopped=true;
      ob.disconnect();
      window.clearInterval(timer);
      window.removeEventListener('resize',compact);
    };
  },[pathname]);

  return null;
}
