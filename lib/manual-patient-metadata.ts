type ManualPatientMeta={brand?:string;tests?:string[]};
export function manualPatientTests(createdByAdmin:string|null,adminNotes:string|null){
 if(createdByAdmin!=='THYROCARE_MANUAL'||!adminNotes)return [] as string[];
 try{const meta=JSON.parse(adminNotes) as ManualPatientMeta;if(meta.brand!=='THYROCARE'||!Array.isArray(meta.tests))return [];return meta.tests.filter((x):x is string=>typeof x==='string'&&!!x.trim()).map(x=>x.trim()).slice(0,40)}catch{return [] as string[]}
}
