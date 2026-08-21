'use client';

import { useEffect, useMemo, useState } from 'react';

const LAB='Thyrocare';
const SUPPORT='9701162302';

type FamilyMember={name:string;age:number|null;gender:string|null;phone:string;doctorName?:string};
type CatalogItem={key:string;name:string;price:number;mrp:number;type:'Test'|'Package'};
type Order={
  id:string;orderId:string;billNumber:string;createdAt:string;sampleEntryAt?:string;
  patient:{name:string;age:number|null;gender:string|null;phone:string};doctorName?:string;tests:string[];
  totalAmount:number;discount:number;paidAmount:number;balance:number;netAmount:number;paymentStatus:string;
  paymentMode?:string;paymentModes?:string[];reportName:string|null;reportReady:boolean;reportReadyAt:string|null;
};
type PaymentMode='CASH'|'UPI'|'CARD'|'MULTIPLE';
const empty={name:'',age:'',gender:'Female',phone:'',doctorName:'',customTests:'',totalAmount:'',discount:'0',paidAmount:'0',billNumber:'',paymentMode:'CASH' as PaymentMode,paymentModes:['CASH'] as string[]};
const NAV=[['⌂','Dashboard'],['▣','Order Entry'],['◉','Sample'],['⚙','In Process'],['✓','Completed Bills'],['↺','Previous Bills'],['👥','Patient List'],['🧪','Test / Price List'],['◫','Service Groups'],['▦','Lab Profiles'],['⚕','Doctors'],['📄','Reports'],['✉','Communications'],['⚙','Options / Settings'],['🔒','Audit Logs']];
const PAYMENT_OPTIONS=['CASH','UPI','CARD'] as const;

export default function ManualDashboard(){
 const[orders,setOrders]=useState<Order[]>([]);const[form,setForm]=useState(empty);const[loading,setLoading]=useState(true);const[saving,setSaving]=useState(false);const[error,setError]=useState('');const[query,setQuery]=useState('');const[uploading,setUploading]=useState('');const[statusFilter,setStatusFilter]=useState('All Status');
 const[family,setFamily]=useState<FamilyMember[]>([]);const[familyLoading,setFamilyLoading]=useState(false);const[familyMessage,setFamilyMessage]=useState('');
 const[catalog,setCatalog]=useState<CatalogItem[]>([]);const[testQuery,setTestQuery]=useState('');const[selected,setSelected]=useState<CatalogItem[]>([]);const[catalogLoading,setCatalogLoading]=useState(true);

 async function load(){setLoading(true);try{const r=await fetch('/api/admin/thyrocare/orders',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to load orders.');setOrders(d.orders||[])}catch(e){setError(e instanceof Error?e.message:'Unable to load orders.')}finally{setLoading(false)}}
 async function loadCatalog(){setCatalogLoading(true);try{const r=await fetch('/api/admin/thyrocare/catalog',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to load test catalogue.');const tests=(d.tests||[]).map((x:any)=>({key:`T:${x.id}`,name:x.name,price:Number(x.price)||0,mrp:Number(x.mrp)||Number(x.price)||0,type:'Test' as const}));const packages=(d.packages||[]).map((x:any)=>({key:`P:${x.id}`,name:x.name,price:Number(x.price)||0,mrp:Number(x.mrp)||Number(x.price)||0,type:'Package' as const}));setCatalog([...packages,...tests])}catch(e){setError(e instanceof Error?e.message:'Unable to load test catalogue.')}finally{setCatalogLoading(false)}}
 useEffect(()=>{load();loadCatalog()},[]);

 const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return orders.filter(o=>{const hit=!q||[o.billNumber,o.orderId,o.patient.name,o.patient.phone,o.doctorName||'',o.tests.join(' '),paymentLabel(o)].join(' ').toLowerCase().includes(q);const status=statusFilter==='All Status'||(statusFilter==='Reports Ready'?o.reportReady:!o.reportReady);return hit&&status})},[orders,query,statusFilter]);
 const totals=useMemo(()=>({orders:orders.length,pending:orders.filter(o=>!o.reportReady).length,ready:orders.filter(o=>o.reportReady).length,amount:orders.reduce((s,o)=>s+o.netAmount,0),balance:orders.reduce((s,o)=>s+o.balance,0)}),[orders]);
 const testMatches=useMemo(()=>{const q=testQuery.trim().toLowerCase();if(!q)return[];return catalog.filter(x=>x.name.toLowerCase().includes(q)&&!selected.some(s=>s.key===x.key)).slice(0,12)},[catalog,testQuery,selected]);

 function update<K extends keyof typeof form>(k:K,v:(typeof form)[K]){setForm(x=>({...x,[k]:v}))}
 function money(n:number){return `₹${Number(n||0).toLocaleString('en-IN')}`}
 function selectedTotal(next=selected){return next.reduce((s,x)=>s+x.price,0)}
 function addCatalogItem(item:CatalogItem){const next=[...selected,item];setSelected(next);setForm(x=>({...x,totalAmount:String(selectedTotal(next))}));setTestQuery('')}
 function removeCatalogItem(key:string){const next=selected.filter(x=>x.key!==key);setSelected(next);setForm(x=>({...x,totalAmount:String(selectedTotal(next))}))}
 function paymentLabel(o:Order){if(o.paymentMode==='MULTIPLE')return `Multiple: ${(o.paymentModes||[]).map(formatMode).join(' + ')}`;return formatMode(o.paymentMode||'OTHER')}
 function formatMode(mode:string){return mode==='CASH'?'Cash':mode==='UPI'?'UPI':mode==='CARD'?'Card':mode==='MULTIPLE'?'Multiple':mode}
 function setPaymentMode(mode:PaymentMode){setForm(x=>({...x,paymentMode:mode,paymentModes:mode==='MULTIPLE'?[]:[mode]}))}
 function togglePaymentMethod(mode:string){setForm(x=>({...x,paymentModes:x.paymentModes.includes(mode)?x.paymentModes.filter(m=>m!==mode):[...x.paymentModes,mode]}))}

 async function searchFamily(){const phone=form.phone.replace(/\D/g,'');setFamily([]);setFamilyMessage('');if(phone.length!==10){setFamilyMessage('Enter a valid 10-digit mobile number first.');return}setFamilyLoading(true);try{const r=await fetch(`/api/admin/thyrocare/orders?phone=${phone}`,{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to search family members.');const members=d.familyMembers||[];setFamily(members);setFamilyMessage(members.length?`${members.length} patient profile${members.length===1?'':'s'} found for this mobile number.`:'No previous patient found. Add the required patient details below.')}catch(e){setFamilyMessage(e instanceof Error?e.message:'Unable to search family members.')}finally{setFamilyLoading(false)}}
 function selectFamily(m:FamilyMember){setForm(x=>({...x,name:m.name,age:m.age==null?'':String(m.age),gender:m.gender||'Female',phone:m.phone,doctorName:m.doctorName||''}));setFamilyMessage(`${m.name} selected. Add tests/packages and complete billing.`)}
 function newFamilyMember(){setForm(x=>({...x,name:'',age:'',gender:'Female',doctorName:''}));setFamilyMessage('Enter the new family member details. The same mobile number is retained.')}
 function resetForm(){setForm(empty);setFamily([]);setFamilyMessage('');setSelected([]);setTestQuery('')}

 async function createOrder(e:React.FormEvent){
  e.preventDefault();setSaving(true);setError('');
  try{
   const custom=form.customTests.split(/[,\n]/).map(x=>x.trim()).filter(Boolean);const tests=[...selected.map(x=>x.name),...custom];
   if(!tests.length)throw new Error('Select at least one test/package or enter a custom test.');
   if(form.paymentMode==='MULTIPLE'&&new Set(form.paymentModes).size<2)throw new Error('For Multiple payment mode, select at least two methods.');
   const r=await fetch('/api/admin/thyrocare/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:form.name,age:form.age,gender:form.gender,phone:form.phone,doctorName:form.doctorName,tests,totalAmount:form.totalAmount,discount:form.discount,paidAmount:form.paidAmount,billNumber:form.billNumber,paymentMode:form.paymentMode,paymentModes:form.paymentModes})});
   const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to create order.');resetForm();await load();
  }catch(e){setError(e instanceof Error?e.message:'Unable to create order.')}finally{setSaving(false)}
 }

 function detailsMessage(o:Order){return `Dear ${o.patient.name},\n\nThyrocare Order Details\nOrder ID: ${o.orderId}\nBill No: ${o.billNumber}\nSample Entry: ${new Date(o.sampleEntryAt||o.createdAt).toLocaleString('en-IN')}\nAge/Gender: ${o.patient.age ?? '-'} / ${o.patient.gender ?? '-'}\nDoctor: ${o.doctorName||'Not provided'}\nTests: ${o.tests.join(', ')}\nTotal Amount: ${money(o.totalAmount)}\nDiscount: ${money(o.discount)}\nNet Amount: ${money(o.netAmount)}\nPaid: ${money(o.paidAmount)}\nBalance: ${money(o.balance)}\nPayment Mode: ${paymentLabel(o)}\n\nFor support call/WhatsApp: ${SUPPORT}\n- ${LAB}`}
 function reportMessage(o:Order){return `Dear ${o.patient.name},\n\nYour Thyrocare diagnostic report for Order ID ${o.orderId} is ready.\nTests: ${o.tests.join(', ')}\n\nPlease contact us on ${SUPPORT} if you need help.\n- ${LAB}`}
 function wa(o:Order,message:string){const p=o.patient.phone.replace(/\D/g,'');window.open(`https://wa.me/91${p}?text=${encodeURIComponent(message)}`,'_blank')}
 function printBill(o:Order){const w=window.open('','_blank','width=780,height=900');if(!w)return;w.document.write(`<!doctype html><html><head><title>${o.billNumber}</title><style>body{font-family:Arial;padding:32px;color:#1f2937}h1{color:#087f6f}.box{border:1px solid #ddd;padding:18px;border-radius:12px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #ddd;padding:9px;text-align:left}.right{text-align:right}.foot{margin-top:28px;font-size:13px;color:#555}</style></head><body><h1>Thyrocare</h1><div>${SUPPORT}</div><h2>Diagnostic Bill</h2><div class="box"><div class="grid"><div><b>Bill No:</b> ${o.billNumber}</div><div><b>Order ID:</b> ${o.orderId}</div><div><b>Patient:</b> ${o.patient.name}</div><div><b>Age / Gender:</b> ${o.patient.age ?? '-'} / ${o.patient.gender ?? '-'}</div><div><b>Mobile:</b> ${o.patient.phone}</div><div><b>Doctor:</b> ${o.doctorName||'Not provided'}</div><div><b>Sample Entry:</b> ${new Date(o.sampleEntryAt||o.createdAt).toLocaleString('en-IN')}</div><div><b>Payment:</b> ${paymentLabel(o)}</div></div><table><tr><th>Tests</th><td>${o.tests.join(', ')}</td></tr><tr><th>Total</th><td class="right">${money(o.totalAmount)}</td></tr><tr><th>Discount</th><td class="right">${money(o.discount)}</td></tr><tr><th>Net Amount</th><td class="right">${money(o.netAmount)}</td></tr><tr><th>Paid</th><td class="right">${money(o.paidAmount)}</td></tr><tr><th>Balance</th><td class="right">${money(o.balance)}</td></tr></table></div><div class="foot">For assistance call/WhatsApp ${SUPPORT}. Thank you for choosing Thyrocare.</div><script>window.onload=()=>window.print()</script></body></html>`);w.document.close()}
 async function uploadReport(o:Order,file:File){setUploading(o.id);setError('');try{if(file.type!=='application/pdf')throw new Error('Please select a PDF report.');const data=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(new Error('Unable to read PDF.'));r.readAsDataURL(file)});const res=await fetch(`/api/admin/thyrocare/orders/${encodeURIComponent(o.id)}/report`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fileName:file.name,fileData:data})});const d=await res.json();if(!res.ok)throw new Error(d.error||'Unable to upload report.');await load()}catch(e){setError(e instanceof Error?e.message:'Unable to upload report.')}finally{setUploading('')}}

 const net=Math.max(0,(Number(form.totalAmount)||0)-(Number(form.discount)||0));
 const paid=Math.max(0,Number(form.paidAmount)||0);
 const balance=Math.max(0,net-paid);

 return <main style={{minHeight:'100vh',background:'#f5f7f9',color:'#1f2937',fontFamily:'Arial,sans-serif'}}>
  <div style={{display:'grid',gridTemplateColumns:'220px minmax(0,1fr)',minHeight:'100vh'}}>
   <aside style={sidebar}>
    <div style={{padding:'22px 18px',borderBottom:'1px solid #edf0f2'}}><div style={{fontSize:24,fontWeight:900,color:'#0d5f54'}}>THYROCARE</div><div style={{fontSize:11,color:'#64748b',marginTop:2}}>Tests you can trust</div></div>
    <nav style={{padding:'12px 10px'}}>{NAV.map(([i,label])=><a key={label} href={label==='Dashboard'?'/admin':label==='Audit Logs'?'/admin/audit':label==='Test / Price List'?'/manual/catalog':'#'} style={{...navItem,...(label==='Order Entry'?activeNav:{})}}><span style={{width:22}}>{i}</span>{label}</a>)}</nav>
    <div style={{margin:'14px',padding:14,borderRadius:14,background:'#f8fbfa',border:'1px solid #dce9e4'}}><b>Need Help?</b><div style={{marginTop:10,color:'#087f6f',fontWeight:900}}>☎ {SUPPORT}</div><p style={{fontSize:12,color:'#64748b',lineHeight:1.5}}>Patient communications & support (Thyrocare)</p></div>
    <a href="/admin/logout" style={{...navItem,color:'#dc2626',margin:'4px 10px'}}>↪ Logout</a>
   </aside>

   <section style={{minWidth:0}}><div style={{padding:'18px 22px 40px'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}><button style={menuBtn}>☰</button><div style={{fontSize:14}}>Hi! &nbsp; <b>Thyrocare Lab</b></div></div>
    <header style={hero}><div><div style={{fontSize:12,fontWeight:900,letterSpacing:1}}>THYROCARE • MANUAL BILLING & REPORTS</div><h1 style={{margin:'6px 0 4px',fontSize:28}}>Manual Dashboard</h1><div>Patient communications and support: <b>{SUPPORT}</b></div></div><div style={{fontSize:13,border:'1px solid rgba(255,255,255,.28)',padding:'10px 12px',borderRadius:10}}>🛡 Secure Admin Access</div></header>
    {error&&<div style={err}>{error}</div>}

    <section style={{display:'grid',gridTemplateColumns:'420px minmax(0,1fr)',gap:16,marginTop:16}}>
     <form onSubmit={createOrder} style={card}>
      <h2 style={{margin:'0 0 10px',fontSize:18,color:'#0d5f54'}}>Add New Order</h2>
      <Field label="Mobile Number *"><div style={{display:'grid',gridTemplateColumns:'52px 1fr auto',gap:0}}><div style={prefix}>+91</div><input required maxLength={10} inputMode="tel" value={form.phone} onChange={e=>{update('phone',e.target.value.replace(/\D/g,''));setFamily([]);setFamilyMessage('')}} style={{...input,borderTopLeftRadius:0,borderBottomLeftRadius:0,borderTopRightRadius:0,borderBottomRightRadius:0}} placeholder="10-digit mobile"/><button type="button" onClick={searchFamily} style={{...primary,borderRadius:'0 7px 7px 0',whiteSpace:'nowrap'}}>{familyLoading?'Searching…':'Search Family'}</button></div></Field>
      {familyMessage&&<div style={{...infoBox,marginTop:8}}>{familyMessage}</div>}
      {family.length>0&&<div style={familyBox}><div style={{fontWeight:900,fontSize:12,color:'#0d5f54',marginBottom:7}}>Select patient for this order</div>{family.map((m,i)=><button key={`${m.name}-${i}`} type="button" onClick={()=>selectFamily(m)} style={familyBtn}><b>{m.name}</b><span style={{color:'#64748b'}}> • {m.age??'-'} yrs • {m.gender||'-'}</span>{m.doctorName&&<div style={{fontSize:11,color:'#64748b'}}>Doctor: {m.doctorName}</div>}</button>)}<button type="button" onClick={newFamilyMember} style={{...secondary,width:'100%'}}>＋ Add another family member</button></div>}
      <Field label="Patient Name *"><input required value={form.name} onChange={e=>update('name',e.target.value)} style={input} placeholder="Enter patient name"/></Field>
      <div style={grid2}><Field label="Age *"><input required type="number" min="0" max="120" value={form.age} onChange={e=>update('age',e.target.value)} style={input}/></Field><Field label="Gender *"><select value={form.gender} onChange={e=>update('gender',e.target.value)} style={input}><option>Female</option><option>Male</option><option>Others</option></select></Field></div>
      <Field label="Doctor Name"><input value={form.doctorName} onChange={e=>update('doctorName',e.target.value)} style={input} placeholder="Doctor name (optional)"/></Field>
      <Field label="Bill Number (optional)"><input value={form.billNumber} onChange={e=>update('billNumber',e.target.value)} style={input} placeholder="Auto-generated"/></Field>

      <Field label="Search Tests / Packages"><input value={testQuery} onChange={e=>setTestQuery(e.target.value)} style={input} placeholder={catalogLoading?'Loading catalogue…':'Type CBC, Thyroid, Aarogyam…'}/></Field>
      {testMatches.length>0&&<div style={catalogList}>{testMatches.map(item=><button key={item.key} type="button" onClick={()=>addCatalogItem(item)} style={catalogRow}><span><b>{item.name}</b><small style={{display:'block',color:'#64748b'}}>{item.type}{item.mrp>item.price?` • MRP ${money(item.mrp)}`:''}</small></span><b style={{color:'#087f6f'}}>{money(item.price)}</b></button>)}</div>}
      {selected.length>0&&<div style={{marginTop:8,display:'grid',gap:6}}>{selected.map(item=><div key={item.key} style={selectedRow}><span><b>{item.name}</b> <small>({item.type})</small></span><span><b>{money(item.price)}</b> <button type="button" onClick={()=>removeCatalogItem(item.key)} style={removeBtn}>×</button></span></div>)}</div>}
      <Field label="Other / Custom Tests"><textarea rows={2} value={form.customTests} onChange={e=>update('customTests',e.target.value)} style={{...input,resize:'vertical'}} placeholder="Optional custom tests, separated by comma"/></Field>

      <div style={grid2}><Field label="Total Amount (₹) *"><input required type="number" min="0" value={form.totalAmount} onChange={e=>update('totalAmount',e.target.value)} style={input}/></Field><Field label="Discount (₹)"><input type="number" min="0" value={form.discount} onChange={e=>update('discount',e.target.value)} style={input}/></Field><Field label="Net Amount (₹)"><div style={readonly}>{money(net)}</div></Field><Field label="Paid Amount (₹)"><input type="number" min="0" max={net} value={form.paidAmount} onChange={e=>update('paidAmount',e.target.value)} style={input}/></Field><Field label="Balance (₹)"><div style={{...readonly,color:balance>0?'#dc2626':'#0f766e'}}>{money(balance)}</div></Field><Field label="Payment Status"><div style={readonly}>{balance===0?'PAID':'BALANCE DUE'}</div></Field></div>

      <div style={paymentBox}>
       <div style={{fontWeight:900,color:'#0d5f54',fontSize:12}}>Payment Mode *</div>
       <select value={form.paymentMode} onChange={e=>setPaymentMode(e.target.value as PaymentMode)} style={input}><option value="CASH">Cash</option><option value="UPI">UPI</option><option value="CARD">Card</option><option value="MULTIPLE">Multiple</option></select>
       {form.paymentMode==='MULTIPLE'&&<div style={{marginTop:8}}><div style={{fontSize:11,color:'#64748b',marginBottom:6}}>Select at least two methods used for this payment:</div><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>{PAYMENT_OPTIONS.map(mode=><label key={mode} style={payOption}><input type="checkbox" checked={form.paymentModes.includes(mode)} onChange={()=>togglePaymentMethod(mode)}/>{formatMode(mode)}</label>)}</div></div>}
      </div>

      <div style={{display:'flex',gap:8,marginTop:16,flexWrap:'wrap'}}><button disabled={saving} style={primary}>▣ {saving?'Saving…':'Save Order & Generate Bill'}</button><button type="button" onClick={resetForm} style={secondary}>Clear</button><button type="button" onClick={resetForm} style={danger}>Cancel</button></div>
      <div style={infoBox}>ⓘ Sample entry date/time is recorded automatically when the order is saved. Payment mode is stored with the bill.</div>
     </form>

     <div style={card}>
      <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'}}><div><h2 style={{margin:'0 0 4px',fontSize:18,color:'#0d5f54'}}>Orders / Bills List</h2><div style={{fontSize:12,color:'#64748b'}}>Total Orders: {orders.length}</div></div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><input value={query} onChange={e=>setQuery(e.target.value)} style={{...input,width:245,marginTop:0}} placeholder="Search bill, patient, test, payment..."/><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{...input,width:150,marginTop:0}}><option>All Status</option><option>Pending Reports</option><option>Reports Ready</option></select><button style={secondary} type="button" onClick={()=>{setQuery('');setStatusFilter('All Status')}}>↺ Clear</button></div></div>
      <div style={{overflowX:'auto',marginTop:12}}><table style={{width:'100%',borderCollapse:'collapse',minWidth:1370,fontSize:12}}><thead><tr>{['Actions','Bill No / Barcode','Sample Entry','Patient Details','Doctor','Tests / Packages','Payment Mode','Amount','Discount','Net','Paid','Balance','Report'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead><tbody>
       {loading?<tr><td colSpan={13} style={td}>Loading…</td></tr>:filtered.length===0?<tr><td colSpan={13} style={td}>No manual orders found.</td></tr>:filtered.map(o=><tr key={o.id}>
        <td style={td}><div style={{display:'flex',gap:5,flexWrap:'wrap'}}><button title="WhatsApp details" onClick={()=>wa(o,detailsMessage(o))} style={iconBlue}>◉</button><button title="Print bill" onClick={()=>printBill(o)} style={iconGreen}>▣</button>{!o.reportReady&&<label title="Upload report" style={iconPurple}>↥<input hidden type="file" accept="application/pdf" disabled={uploading===o.id} onChange={e=>{const f=e.target.files?.[0];if(f)uploadReport(o,f)}}/></label>}{o.reportReady&&<a title="View report" href={`/api/admin/thyrocare/orders/${encodeURIComponent(o.id)}/report`} target="_blank" style={iconOrange}>▤</a>}</div></td>
        <td style={td}><b>{o.billNumber}</b><div style={sub}>{o.orderId}</div></td>
        <td style={td}>{new Date(o.sampleEntryAt||o.createdAt).toLocaleDateString('en-IN')}<div style={sub}>{new Date(o.sampleEntryAt||o.createdAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div></td>
        <td style={td}><b>{o.patient.name}</b><div>{o.patient.age ?? '-'} / {o.patient.gender ?? '-'}</div><div>{o.patient.phone}</div></td>
        <td style={td}>{o.doctorName||'—'}</td><td style={td}>{o.tests.join(', ')}</td><td style={td}><b>{paymentLabel(o)}</b></td><td style={td}>{money(o.totalAmount)}</td><td style={td}>{money(o.discount)}</td><td style={td}>{money(o.netAmount)}</td><td style={td}>{money(o.paidAmount||0)}</td><td style={{...td,color:o.balance>0?'#dc2626':'#0f766e',fontWeight:900}}>{money(o.balance)}</td>
        <td style={td}>{o.reportReady?<div style={{display:'grid',gap:5}}><span style={readyPill}>Report Ready</span><button onClick={()=>wa(o,reportMessage(o))} style={tinyBtn}>WhatsApp</button></div>:<span style={pendingPill}>Pending Report</span>}</td>
       </tr>)}
      </tbody></table></div>
     </div>
    </section>

    <section style={{display:'grid',gridTemplateColumns:'1.1fr .9fr 1.1fr',gap:14,marginTop:14}}>
     <div style={card}><h3 style={sectionTitle}>Today's Summary</h3><div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8}}><Metric label="Total Orders" value={totals.orders}/><Metric label="Pending Reports" value={totals.pending}/><Metric label="Reports Ready" value={totals.ready}/><Metric label="Total Amount" value={money(totals.amount)}/><Metric label="Balance Due" value={money(totals.balance)}/></div></div>
     <div style={card}><h3 style={sectionTitle}>Quick Actions</h3><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,textAlign:'center'}}><a href="/manual/catalog" style={{textDecoration:'none',color:'inherit'}}><div style={quickIcon}>🧪</div><div style={{fontSize:11,marginTop:5}}>Tests / Packages</div></a><div><div style={quickIcon}>＋</div><div style={{fontSize:11,marginTop:5}}>Add Order</div></div><div><div style={quickIcon}>👤</div><div style={{fontSize:11,marginTop:5}}>Add Patient</div></div></div></div>
     <div style={card}><h3 style={sectionTitle}>Recent Reports Uploaded</h3>{orders.filter(o=>o.reportReady).slice(0,3).map(o=><div key={o.id} style={{display:'flex',justifyContent:'space-between',gap:12,padding:'7px 0',borderBottom:'1px solid #edf0f2',fontSize:12}}><span>{o.reportName||o.billNumber}</span><span>{o.reportReadyAt?new Date(o.reportReadyAt).toLocaleString('en-IN'):'Ready'}</span></div>)}{orders.filter(o=>o.reportReady).length===0&&<div style={{fontSize:12,color:'#64748b'}}>No reports uploaded yet.</div>}</div>
    </section>
    <footer style={{marginTop:20,textAlign:'center',fontSize:11,color:'#64748b'}}>© 2026 Thyrocare Manual Dashboard. Support: <b>{SUPPORT}</b></footer>
   </div></section>
  </div>
 </main>
}

function Field({label,children}:{label:string;children:React.ReactNode}){return <label style={{display:'block',fontWeight:800,fontSize:12,marginTop:10}}>{label}{children}</label>}
function Metric({label,value}:{label:string;value:string|number}){return <div style={{padding:'12px 8px',borderRadius:10,background:'#f8fbfa',border:'1px solid #dfe8e5',textAlign:'center'}}><div style={{fontSize:16,fontWeight:900,color:'#0d5f54'}}>{value}</div><div style={{fontSize:10,color:'#64748b',marginTop:3}}>{label}</div></div>}
const sidebar={background:'#fff',borderRight:'1px solid #e5e7eb',display:'flex',flexDirection:'column' as const,position:'sticky' as const,top:0,height:'100vh',overflowY:'auto' as const};
const navItem={display:'flex',gap:8,alignItems:'center',padding:'10px 12px',borderRadius:9,color:'#334155',textDecoration:'none',fontSize:13,marginBottom:2};
const activeNav={background:'#eaf5f2',color:'#0d5f54',fontWeight:900};
const menuBtn={border:0,background:'transparent',fontSize:22,cursor:'pointer'};
const hero={background:'linear-gradient(135deg,#0c6b5d,#087f6f)',color:'#fff',borderRadius:12,padding:'18px 20px',display:'flex',justifyContent:'space-between',gap:18,flexWrap:'wrap' as const,alignItems:'center'};
const card={background:'#fff',border:'1px solid #dfe5e9',borderRadius:10,padding:14,boxShadow:'0 3px 14px rgba(15,23,42,.04)'} as const;
const grid2={display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 10px'} as const;
const input={display:'block',width:'100%',boxSizing:'border-box' as const,marginTop:5,padding:'9px 10px',border:'1px solid #cfd8df',borderRadius:7,font:'inherit',background:'#fff'} as const;
const prefix={marginTop:5,padding:'9px 10px',border:'1px solid #cfd8df',borderRight:0,borderRadius:'7px 0 0 7px',background:'#f8fafc'};
const readonly={marginTop:5,padding:'9px 10px',border:'1px solid #cfd8df',borderRadius:7,background:'#f3f8f6',color:'#0f766e',fontWeight:900};
const primary={border:0,borderRadius:7,padding:'9px 12px',background:'#087f6f',color:'#fff',fontWeight:900,cursor:'pointer',fontSize:12} as const;
const secondary={border:'1px solid #d5dce1',borderRadius:7,padding:'9px 12px',background:'#fff',color:'#334155',fontWeight:800,cursor:'pointer',fontSize:12} as const;
const danger={border:0,borderRadius:7,padding:'9px 12px',background:'#ef4444',color:'#fff',fontWeight:900,fontSize:12,cursor:'pointer'} as const;
const infoBox={marginTop:14,padding:11,borderRadius:8,background:'#eff8f5',border:'1px solid #d1e9e2',fontSize:11,color:'#35655d',lineHeight:1.5};
const err={marginTop:14,padding:12,borderRadius:10,background:'#fff1f2',border:'1px solid #fecdd3',color:'#9f1239'} as const;
const th={textAlign:'left' as const,padding:'9px 7px',borderBottom:'1px solid #dbe3e8',background:'#fafcfd',verticalAlign:'bottom' as const,fontSize:11};
const td={padding:'9px 7px',borderBottom:'1px solid #e5e7eb',verticalAlign:'top' as const,lineHeight:1.4};
const sub={fontSize:10,color:'#64748b',marginTop:2};
const iconBlue={width:25,height:25,border:0,borderRadius:5,background:'#1688e8',color:'#fff',cursor:'pointer'} as const;
const iconGreen={width:25,height:25,border:0,borderRadius:5,background:'#22a55b',color:'#fff',cursor:'pointer'} as const;
const iconPurple={width:25,height:25,borderRadius:5,background:'#8b5cf6',color:'#fff',display:'inline-flex',alignItems:'center',justifyContent:'center',cursor:'pointer'} as const;
const iconOrange={width:25,height:25,borderRadius:5,background:'#f59e0b',color:'#fff',display:'inline-flex',alignItems:'center',justifyContent:'center',textDecoration:'none'} as const;
const pendingPill={display:'inline-block',padding:'4px 7px',borderRadius:999,background:'#fff3bf',color:'#7c5d00',fontSize:10,fontWeight:900};
const readyPill={display:'inline-block',padding:'4px 7px',borderRadius:999,background:'#dcfce7',color:'#166534',fontSize:10,fontWeight:900};
const tinyBtn={border:0,borderRadius:5,padding:'5px 7px',background:'#0ea5e9',color:'#fff',fontSize:10,fontWeight:800,cursor:'pointer'};
const sectionTitle={margin:'0 0 10px',fontSize:14,color:'#0d5f54'};
const quickIcon={width:38,height:38,borderRadius:8,margin:'0 auto',background:'#eef7f4',display:'grid',placeItems:'center',fontSize:20,color:'#0d5f54'};
const familyBox={marginTop:10,padding:10,border:'1px solid #cfe5df',borderRadius:10,background:'#fbfefd'};
const familyBtn={display:'block',width:'100%',textAlign:'left' as const,padding:'9px 10px',marginBottom:6,border:'1px solid #dbe8e4',borderRadius:8,background:'#fff',cursor:'pointer'};
const catalogList={marginTop:5,border:'1px solid #dbe3e8',borderRadius:8,maxHeight:250,overflowY:'auto' as const,background:'#fff',boxShadow:'0 8px 22px rgba(15,23,42,.08)'};
const catalogRow={width:'100%',display:'flex',justifyContent:'space-between',gap:12,textAlign:'left' as const,padding:'9px 10px',border:0,borderBottom:'1px solid #edf0f2',background:'#fff',cursor:'pointer'};
const selectedRow={display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',padding:'8px 10px',border:'1px solid #dce9e4',borderRadius:8,background:'#f8fbfa',fontSize:12};
const removeBtn={border:0,borderRadius:999,width:22,height:22,background:'#fee2e2',color:'#b91c1c',fontWeight:900,cursor:'pointer'} as const;
const paymentBox={marginTop:12,padding:12,border:'1px solid #cfe5df',borderRadius:10,background:'#f8fbfa'} as const;
const payOption={display:'flex',alignItems:'center',gap:6,padding:'8px 9px',border:'1px solid #dbe8e4',borderRadius:8,background:'#fff',fontSize:12,fontWeight:800,cursor:'pointer'} as const;