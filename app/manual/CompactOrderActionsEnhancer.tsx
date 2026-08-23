'use client';

import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

// Compact Manual Dashboard action-column layout. Deployment retrigger: 2026-08-23.
export default function CompactOrderActionsEnhancer(){
  const pathname=usePathname();
  useEffect(()=>{
    if(pathname!=='/manual')return;
    let stopped=false;

    function findOrdersTable(){
      return [...document.querySelectorAll('table')].find(t=>{
        const h=(t.querySelector('thead')?.textContent||'').toUpperCase();
        return h.includes('ACTIONS')&&h.includes('BILL')&&h.includes('PAYMENT')&&h.includes('REPORT');
      })||null;
    }

    function compact(){
      if(stopped)return;
      const table=findOrdersTable();
      if(!table)return;
      const head=table.querySelector('thead tr');
      const headCells=head?.querySelectorAll('th');
      if(headCells?.[0]){
        const first=headCells[0] as HTMLElement;
        first.style.minWidth='300px';first.style.width='300px';first.style.maxWidth='300px';
      }
      if(headCells?.[1]){
        const second=headCells[1] as HTMLElement;
        second.style.left='300px';
      }

      for(const row of [...table.querySelectorAll('tbody tr')]){
        const cells=row.querySelectorAll('td');
        if(cells.length<2)continue;
        const action=cells[0] as HTMLTableCellElement;
        action.style.minWidth='300px';action.style.width='300px';action.style.maxWidth='300px';action.style.padding='8px';
        (cells[1] as HTMLElement).style.left='300px';

        const base=action.firstElementChild as HTMLElement|null;
        if(base&&!base.dataset.billShare&&!base.dataset.deleteFilesFor&&!base.dataset.orderWorkflow&&!base.dataset.paymentCollect){
          base.style.display='grid';
          base.style.gridTemplateColumns='repeat(2,minmax(0,1fr))';
          base.style.gap='5px';
          base.style.alignItems='start';
          base.style.width='100%';
          const kids=[...base.children] as HTMLElement[];
          if(kids[0]){kids[0].style.gridColumn='1 / -1';kids[0].style.display='flex';kids[0].style.flexWrap='wrap';kids[0].style.gap='4px'}
          for(const el of kids.slice(1)){
            const text=(el.textContent||'').toUpperCase();
            if(text.includes('UPLOADED REPORTS'))el.style.gridColumn='1 / -1';
            else el.style.minWidth='0';
          }
          base.querySelectorAll('button,a,label,select').forEach(el=>{
            const node=el as HTMLElement;
            node.style.minHeight='30px';
            node.style.fontSize='10px';
            node.style.padding='5px 7px';
            node.style.lineHeight='1.15';
          });
        }

        const share=action.querySelector('[data-bill-share]') as HTMLElement|null;
        if(share){
          share.style.display='grid';share.style.gridTemplateColumns='repeat(3,minmax(0,1fr))';share.style.gap='4px';share.style.width='100%';share.style.minWidth='0';
          share.querySelectorAll('button,label').forEach(el=>{const x=el as HTMLElement;x.style.width='100%';x.style.minHeight='30px';x.style.padding='5px 4px';x.style.fontSize='9px';});
        }

        const del=action.querySelector('[data-delete-files-for]') as HTMLElement|null;
        if(del){
          del.style.display='grid';del.style.gridTemplateColumns='repeat(2,minmax(0,1fr))';del.style.gap='4px 6px';del.style.width='100%';del.style.minWidth='0';
          [...del.children].forEach((el,i)=>{const x=el as HTMLElement;if(i===0&&x.tagName==='DIV'&&!x.querySelector('button'))x.style.gridColumn='1 / -1';else{x.style.minWidth='0';x.style.width='100%'}});
          del.querySelectorAll('button').forEach(el=>{const x=el as HTMLElement;x.style.minHeight='28px';x.style.padding='4px 6px';x.style.fontSize='9px'});
        }

        const flow=action.querySelector('[data-order-workflow]') as HTMLElement|null;
        if(flow){flow.style.width='100%';flow.style.maxWidth='100%';flow.style.gridTemplateColumns='repeat(3,minmax(0,1fr))';flow.style.gap='3px'}
      }
    }

    compact();
    const ob=new MutationObserver(compact);ob.observe(document.body,{childList:true,subtree:true});
    const timer=window.setInterval(compact,1200);
    return()=>{stopped=true;ob.disconnect();window.clearInterval(timer)};
  },[pathname]);
  return null;
}
