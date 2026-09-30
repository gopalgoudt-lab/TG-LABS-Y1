export type ReceiptSource={items:{price:number;test:{name:string};partnerName?:string|null;offer?:{partner?:{name?:string|null}|null}|null}[];packages:{price:number;package:{name:string};partnerName?:string|null;offer?:{partner?:{name?:string|null}|null}|null}[];homeCollectionCharge:number;printedReportFee:number;totalAmount:number};
export type PaymentReceiptSnapshot={version:1;capturedAt:string;lines:{name:string;amount:number}[];subtotal:number;discount:number;total:number;partners:string[]};
export function buildPaymentReceiptSnapshot(b:ReceiptSource,at=new Date()):PaymentReceiptSnapshot{
 const lines=[...b.items.map(x=>({name:x.test.name,amount:x.price})),...b.packages.map(x=>({name:x.package.name,amount:x.price})),...(b.homeCollectionCharge>0?[{name:'Home Collection Charges',amount:b.homeCollectionCharge}]:[]),...(b.printedReportFee>0?[{name:'Printed report service',amount:b.printedReportFee}]:[])];
 const subtotal=lines.reduce((s,x)=>s+x.amount,0);
 const partners=[...new Set([...b.items,...b.packages].map(x=>x.offer?.partner?.name||x.partnerName).filter((x):x is string=>Boolean(x)))];
 return {version:1,capturedAt:at.toISOString(),lines,subtotal,discount:Math.max(0,subtotal-b.totalAmount),total:b.totalAmount,partners};
}
export function parsePaymentReceiptSnapshot(value:unknown):PaymentReceiptSnapshot|null{
 if(!value||typeof value!=='object')return null; const v=value as Partial<PaymentReceiptSnapshot>;
 if(v.version!==1||!Array.isArray(v.lines)||typeof v.total!=='number'||typeof v.subtotal!=='number'||!Array.isArray(v.partners))return null;
 const lines=v.lines.filter((x):x is {name:string;amount:number}=>Boolean(x&&typeof x.name==='string'&&typeof x.amount==='number'));
 if(lines.length!==v.lines.length)return null;
 return {version:1,capturedAt:typeof v.capturedAt==='string'?v.capturedAt:'',lines,subtotal:v.subtotal,discount:typeof v.discount==='number'?v.discount:Math.max(0,v.subtotal-v.total),total:v.total,partners:v.partners.filter((x):x is string=>typeof x==='string')};
}
