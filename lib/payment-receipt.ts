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
   if(logo){const scaled=logo.scaleToFit(282,76);page.drawImage(logo,{x:32,y:756,width:scaled.width,height:scaled.height})}
   else{text('TG',38,786,31,bold,navy);text('LABS',86,786,31,bold,teal);text('DIAGNOSTICS  •  HOME COLLECTION',40,770,8,bold,navy)}
   text('Your Health',326,799,10,italic,navy);text('Our Priority',326,785,10,italic,navy);rule(390,771,390,816,border,.8);
   text('TRUSTED',402,800,7.5,bold,navy);text('LABS',411,786,7.5,bold,navy);rule(452,771,452,816,border,.8);
   text('HOME',467,800,7.5,bold,teal);text('COLLECTION',458,786,6.8,bold,navy);rule(522,771,522,816,border,.8);
   text('BETTER',531,800,7.5,bold,teal);text('TOMORROW',526,786,6.8,bold,navy);
 };
 const tableHeader=(y:number)=>{page.drawRectangle({x:34,y,width:527,height:36,color:navy});text('S.No.',52,y+13,9.5,bold,white);text('Investigation / Package',112,y+13,9.5,bold,white);text('Amount',490,y+13,9.5,bold,white)};
 header();
 box(34,692,527,62,mint,mint);text('PAYMENT RECEIPT',172,722,23,bold,navy);text('Thank you for choosing TG Labs',209,702,10.5,regular,navy);

 box(34,519,527,158,pale,border);rule(297,535,297,661,border,.8);
 const left:[string,string][]=[['Patient Name',data.patientName],['Age / Gender',`${data.age??'-'} / ${safe(data.gender)}`],['Doctor',safe(data.doctorName)==='-'?'Self':safe(data.doctorName)],['Email',safe(data.email)],['Phone',safe(data.phone)]];
 const right:[string,string][]=[['Receipt No.',data.receiptNumber],['Booking Ref.',data.bookingReference],['Receipt Date',data.receiptDate.toLocaleString('en-IN')],['Collection',data.collectionMode==='HOME'?'Home Collection':'Centre Visit'],['Payment Mode',safe(data.paymentMode)],['Payment Status',data.paymentStatus]];
 left.forEach(([k,v],i)=>{const yy=641-i*24;text(k,48,yy,9,bold,navy);text(':',132,yy,9,bold,navy);text(v.slice(0,31),145,yy,9,regular,dark)});
 right.forEach(([k,v],i)=>{const yy=641-i*20;text(k,314,yy,9,bold,navy);text(':',392,yy,9,bold,navy);if(k==='Payment Status'&&v==='PAID'){page.drawRectangle({x:405,y:yy-5,width:47,height:19,color:green});text('PAID',415,yy,9,bold,white)}else text(v.slice(0,28),405,yy,9,regular,dark)});

 tableHeader(464);let y=436;
 for(let i=0;i<data.lines.length;i++){
   if(y<286){page=pdf.addPage([595.28,841.89]);header();tableHeader(704);y=673}
   const item=data.lines[i];text(String(i+1),58,y,9);text(item.name.slice(0,55),112,y,9);money(item.amount,475,y,9,regular,dark);rule(34,y-14,561,y-14,border,.5);y-=29;
 }

 const baseY=Math.min(358,y-10);
 box(34,baseY-122,252,106,mint,mint);text('TG',49,baseY-77,19,bold,teal);text('Diagnostic Partner(s)',82,baseY-52,10.5,bold,navy);text((data.partners.length?data.partners.join(', '):'TG Labs').slice(0,38),82,baseY-75,9.5,regular,navy);
 box(307,baseY-152,254,136,white,border);
 const totals:[string,number][]=[['Subtotal',data.subtotal],['Discount',data.discount],['Total',data.total],['Paid Amount',data.paidAmount],['Due',data.due]];
 totals.forEach(([k,v],i)=>{const yy=baseY-43-i*22;if(k==='Total')page.drawRectangle({x:313,y:yy-6,width:242,height:21,color:mint2});const strong=k==='Total'||k==='Paid Amount';text(k,327,yy,10,strong?bold:regular,navy);money(v,463,yy,10,strong?bold:regular,navy)});

 text('Thank you for trusting TG Labs!',40,baseY-177,15,italic,teal);text('For a healthier tomorrow.',40,baseY-199,10,regular,navy);
 if(data.transactionReference)text(`Transaction reference: ${data.transactionReference.slice(0,55)}`,40,baseY-221,8,regular,muted);

 rule(34,86,561,86,teal,1.3);text('www.tglabs.in',40,63,9,regular,navy);text('info@tglabs.in',156,63,9,regular,navy);text('+91 9652603022',262,63,9,regular,navy);
 rule(388,46,388,77,border,.8);text('This is a system-generated payment receipt.',402,66,7.6,italic,muted);text('It does not require a seal or signature.',402,52,7.6,italic,muted);
 page.drawRectangle({x:0,y:0,width:170,height:24,color:teal});page.drawRectangle({x:0,y:24,width:118,height:12,color:mint2});page.drawRectangle({x:0,y:36,width:66,height:8,color:mint});
 return pdf.save();
}
