type ReceiptPartnerItem={partnerId?:string|null;partnerName?:string|null;offer?:{partner?:{name?:string|null}|null}|null};
export function receiptPartners(items:ReceiptPartnerItem[],packages:ReceiptPartnerItem[],partnerNamesById:Map<string,string>=new Map()){
 return [...new Set([...items,...packages].map(x=>x.offer?.partner?.name||(x.partnerId?partnerNamesById.get(x.partnerId):undefined)||x.partnerName).filter((v):v is string=>Boolean(v)))];
}

/**
 * A paid receipt is a financial record. Its total must remain the amount stored
 * on the booking at payment time; catalog/package lines are display detail and
 * must never inflate or otherwise rewrite that authoritative total later.
 */
export function reconcilePaidReceipt(storedTotal:number,_subtotal:number,paidTransactionAmount?:number|null){
 const total=Math.max(0,storedTotal);
 const paidAmount=paidTransactionAmount==null?total:Math.max(0,paidTransactionAmount);
 return {total,paidAmount,due:Math.max(0,total-paidAmount)};
}
