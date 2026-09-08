import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

export type PaymentReceiptLine = { name: string; amount: number };
export type PaymentReceiptData = {
  receiptNumber: string; bookingReference: string; receiptDate: Date; patientName: string;
  age?: number | null; gender?: string | null; doctorName?: string | null; email?: string | null; phone?: string | null;
  collectionMode: string; paymentMode?: string | null; paymentStatus: string; transactionReference?: string | null;
  lines: PaymentReceiptLine[]; subtotal: number; discount: number; total: number; paidAmount: number; due: number; partners: string[];
};

const safe=(v?:string|null)=>v?.trim()||'-';
const amountText=(v:number)=>Math.max(0,v).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
export function isReceiptAvailable(paymentStatus:string){return paymentStatus==='PAID'}
export function receiptNumberForBooking(bookingId:string){return `TGR-${bookingId.slice(-10).toUpperCase()}`}

function drawRupee(page:PDFPage,x:number,y:number,size:number,color:ReturnType<typeof rgb>){
  const w=size*.62,h=size;
  page.drawLine({start:{x,y:y+h},end:{x:x+w,y:y+h},thickness:1,color});
  page.drawLine({start:{x,y:y+h*.73},end:{x:x+w*.82,y:y+h*.73},thickness:1,color});
  page.drawLine({start:{x:x+w*.08,y:y+h},end:{x:x+w*.54,y:y+h*.73},thickness:1,color});
  page.drawLine({start:{x:x+w*.54,y:y+h*.73},end:{x:x+w*.08,y:y+h*.48},thickness:1,color});
  page.drawLine({start:{x:x+w*.08,y:y+h*.48},end:{x:x+w*.66,y},thickness:1,color});
}

export async function createPaymentReceiptPdf(data:PaymentReceiptData):Promise<Uint8Array>{
 const pdf=await PDFDocument.create();
 const regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold),italic=await pdf.embedFont(StandardFonts.HelveticaOblique);
 const navy=rgb(.025,.20,.40),teal=rgb(0,.65,.62),dark=rgb(.05,.12,.20),muted=rgb(.36,.43,.47),border=rgb(.82,.89,.91),mint=rgb(.91,.985,.975),mint2=rgb(.80,.96,.94),white=rgb(1,1,1),green=rgb(.02,.56,.20),pale=rgb(.97,.99,.99);
 let page=pdf.addPage([595.28,841.89]);
 let logo:Awaited<ReturnType<typeof pdf.embedPng>>|null=null;
 try{logo=await pdf.embedPng(await readFile(path.join(process.cwd(),'public','brand','tg-labs-logo.png')))}catch{}

 const text=(s:string,x:number,y:number,size=9,font:PDFFont=regular,color=dark)=>page.drawText(s,{x,y,size,font,color});
 const box=(x:number,y:number,w:number,h:number,fill=white,stroke=border,bw=.8)=>page.drawRectangle({x,y,width:w,height:h,color:fill,borderColor:stroke,borderWidth:bw});
 const rule=(x1:number,y1:number,x2:number,y2:number,color=border,width=.8)=>page.drawLine({start:{x:x1,y:y1},end:{x:x2,y:y2},color,thickness:width});
 const money=(v:number,x:number,y:number,size=9,font:PDFFont=regular,color=navy)=>{drawRupee(page,x,y-1,size*.82,color);text(amountText(v),x+11,y,size,font,color)};
 const header=()=>{
   if(logo){const scaled=logo.scaleToFit(270,72);page.drawImage(logo,{x:34,y:758,width:scaled.width,height:scaled.height})}
   else{text('TG',38,786,31,bold,navy);text('LABS',86,786,31,bold,teal);text('DIAGNOSTICS  •  HOME COLLECTION',40,770,8,bold,navy)}
   text('Your Health',326,799,10,italic,navy);text('Our Priority',326,785,10,italic,navy);rule(390,771,390,816,border,.8);
   text('TRUSTED',402,800,7.5,bold,navy);text('LABS',411,786,7.5,bold,navy);rule(452,771,452,816,border,.8);
   text('HOME',467,800,7.5,bold,teal);text('COLLECTION',458,786,6.8,bold,navy);rule(522,771,522,816,border,.8);
   text('BETTER',531,800,7.5,bold,teal);text('TOMORROW',526,786,6.8,bold,navy);
 };
 const tableHeader=(y:number)=>{page.drawRectangle({x:34,y,width:527,height:34,color:navy});text('S.No.',52,y+12,9,bold,white);text('Investigation / Package',112,y+12,9,bold,white);text('Amount',490,y+12,9,bold,white)};
 header();
 box(34,696,527,58,mint,mint);text('PAYMENT RECEIPT',178,724,22,bold,navy);text('Thank you for choosing TG Labs',211,705,10,regular,navy);

 box(34,532,527,148,pale,border);rule(297,546,297,666,border,.8);
 const left:[string,string][]=[['Patient Name',data.patientName],['Age / Gender',`${data.age??'-'} / ${safe(data.gender)}`],['Doctor',safe(data.doctorName)==='-'?'Self':safe(data.doctorName)],['Email',safe(data.email)],['Phone',safe(data.phone)]];
 const right:[string,string][]=[['Receipt No.',data.receiptNumber],['Booking Ref.',data.bookingReference],['Receipt Date',data.receiptDate.toLocaleString('en-IN')],['Collection',data.collectionMode==='HOME'?'Home Collection':'Centre Visit'],['Payment Mode',safe(data.paymentMode)],['Payment Status',data.paymentStatus]];
 left.forEach(([k,v],i)=>{const yy=648-i*23;text(k,48,yy,8.5,bold,navy);text(':',132,yy,8.5,bold,navy);text(v.slice(0,31),145,yy,8.5,regular,dark)});
 right.forEach(([k,v],i)=>{const yy=648-i*19;text(k,314,yy,8.5,bold,navy);text(':',392,yy,8.5,bold,navy);if(k==='Payment Status'&&v==='PAID'){page.drawRectangle({x:405,y:yy-5,width:45,height:18,color:green});text('PAID',414,yy,8.5,bold,white)}else text(v.slice(0,28),405,yy,8.5,regular,dark)});

 tableHeader(482);let y=458;
 for(let i=0;i<data.lines.length;i++){
   if(y<282){page=pdf.addPage([595.28,841.89]);header();tableHeader(708);y=684}
   const item=data.lines[i];text(String(i+1),58,y,8.5);text(item.name.slice(0,55),112,y,8.5);money(item.amount,478,y,8.5,regular,dark);rule(34,y-12,561,y-12,border,.5);y-=24;
 }

 const baseY=Math.min(390,y-8);
 box(34,baseY-108,252,92,mint,mint);text('TG',49,baseY-68,18,bold,teal);text('Diagnostic Partner(s)',82,baseY-48,10,bold,navy);text((data.partners.length?data.partners.join(', '):'TG Labs').slice(0,38),82,baseY-68,9,regular,navy);
 box(307,baseY-138,254,122,white,border);
 const totals:[string,number][]=[['Subtotal',data.subtotal],['Discount',data.discount],['Total',data.total],['Paid Amount',data.paidAmount],['Due',data.due]];
 totals.forEach(([k,v],i)=>{const yy=baseY-40-i*20;if(k==='Total')page.drawRectangle({x:313,y:yy-6,width:242,height:20,color:mint2});const strong=k==='Total'||k==='Paid Amount';text(k,327,yy,9.5,strong?bold:regular,navy);money(v,466,yy,9.5,strong?bold:regular,navy)});

 text('Thank you for trusting TG Labs!',40,baseY-158,14,italic,teal);text('For a healthier tomorrow.',40,baseY-178,9.5,regular,navy);
 if(data.transactionReference)text(`Transaction reference: ${data.transactionReference.slice(0,55)}`,40,baseY-199,7.5,regular,muted);

 rule(34,82,561,82,teal,1.2);text('www.tglabs.in',40,61,8.5,regular,navy);text('info@tglabs.in',156,61,8.5,regular,navy);text('+91 9652603022',262,61,8.5,regular,navy);
 rule(388,45,388,75,border,.8);text('This is a system-generated payment receipt.',402,64,7.2,italic,muted);text('It does not require a seal or signature.',402,51,7.2,italic,muted);
 // Decorative teal footer treatment inspired by the approved portrait reference.
 page.drawRectangle({x:0,y:0,width:150,height:22,color:teal});page.drawRectangle({x:0,y:22,width:105,height:11,color:mint2});page.drawRectangle({x:0,y:33,width:58,height:7,color:mint});
 return pdf.save();
}
