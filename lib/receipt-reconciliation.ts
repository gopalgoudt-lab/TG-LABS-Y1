type ReceiptPartnerItem={partnerId?:string|null;partnerName?:string|null;offer?:{partner?:{name?:string|null}|null}|null};
export function receiptPartners(items:ReceiptPartnerItem[],packages:ReceiptPartnerItem[],partnerNamesById:Map<string,string>=new Map()){
 return [...new Set([...items,...packages].map(x=>x.offer?.partner?.name||(x.partnerId?partnerNamesById.get(x.partnerId):undefined)||x.partnerName).filter((v):v is string=>Boolean(v)))];
}
export function reconcilePaidReceipt(storedTotal:number,subtotal:number,paidTransactionAmount?:number|null){
 const total=Math.max(storedTotal,subtotal);
 const paidAmount=Math.max(paidTransactionAmount??storedTotal,total);
 return {total,paidAmount,due:Math.max(0,total-paidAmount)};
}
