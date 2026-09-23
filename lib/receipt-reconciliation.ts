type ReceiptPartnerItem={partnerName?:string|null;offer?:{partner?:{name?:string|null}|null}|null};
export function receiptPartners(items:ReceiptPartnerItem[],packages:ReceiptPartnerItem[]){
 return [...new Set([...items,...packages].map(x=>x.partnerName||x.offer?.partner?.name).filter((v):v is string=>Boolean(v)))];
}
export function reconcilePaidReceipt(storedTotal:number,subtotal:number,paidTransactionAmount?:number|null){
 const total=Math.max(storedTotal,subtotal);
 const paidAmount=Math.max(paidTransactionAmount??storedTotal,total);
 return {total,paidAmount,due:Math.max(0,total-paidAmount)};
}
