type ManualPatientMeta={brand?:string;tests?:string[];grossAmount?:number;testAmount?:number;homeCollectionCharge?:number;discount?:number;paidAmount?:number;balance?:number;paymentMode?:string;paymentModes?:string[]};
function parseManual(createdByAdmin:string|null,adminNotes:string|null):ManualPatientMeta|null{
 if(createdByAdmin!=='THYROCARE_MANUAL'||!adminNotes)return null;
 try{const meta=JSON.parse(adminNotes) as ManualPatientMeta;return meta.brand==='THYROCARE'?meta:null}catch{return null}
}
export function manualPatientTests(createdByAdmin:string|null,adminNotes:string|null){
 const meta=parseManual(createdByAdmin,adminNotes);if(!meta||!Array.isArray(meta.tests))return [] as string[];
 return meta.tests.filter((x):x is string=>typeof x==='string'&&!!x.trim()).map(x=>x.trim()).slice(0,40);
}
export function manualPatientReceipt(createdByAdmin:string|null,adminNotes:string|null){
 const meta=parseManual(createdByAdmin,adminNotes);if(!meta)return null;
 const nonNegative=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
 const gross=nonNegative(meta.grossAmount),charge=nonNegative(meta.homeCollectionCharge)??0,discount=nonNegative(meta.discount)??0,paid=nonNegative(meta.paidAmount),balance=nonNegative(meta.balance);
 if(gross===null||discount>gross)return null;
 const testAmount=nonNegative(meta.testAmount)??Math.max(0,gross-charge);
 const total=Math.max(0,gross-discount);
 return {tests:manualPatientTests(createdByAdmin,adminNotes),testAmount,homeCollectionCharge:charge,discount,total,paidAmount:paid??Math.max(0,total-(balance??0)),balance:balance??Math.max(0,total-(paid??0)),paymentMode:meta.paymentMode||null,paymentModes:Array.isArray(meta.paymentModes)?meta.paymentModes.filter((x):x is string=>typeof x==='string'):[]};
}
