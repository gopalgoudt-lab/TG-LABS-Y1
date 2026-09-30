export type PaymentReceiptSnapshot={version:1;capturedAt:string;lines:{name:string;amount:number}[];subtotal:number;discount:number;total:number;partners:string[]};
export function parsePaymentReceiptSnapshot(value:unknown):PaymentReceiptSnapshot|null{
 if(!value||typeof value!=='object')return null;
 const v=value as Partial<PaymentReceiptSnapshot>;
 if(v.version!==1||!Array.isArray(v.lines)||typeof v.total!=='number'||typeof v.subtotal!=='number'||!Array.isArray(v.partners))return null;
 const lines=v.lines.filter((x):x is {name:string;amount:number}=>Boolean(x&&typeof x.name==='string'&&typeof x.amount==='number'));
 if(lines.length!==v.lines.length)return null;
 return {version:1,capturedAt:typeof v.capturedAt==='string'?v.capturedAt:'',lines,subtotal:v.subtotal,discount:typeof v.discount==='number'?v.discount:Math.max(0,v.subtotal-v.total),total:v.total,partners:v.partners.filter((x):x is string=>typeof x==='string')};
}
