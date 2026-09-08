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
 const money=(v:number,x:number,y:number,size=9,font:PDFFont=regular,color=navy)=>{drawRupee(page,x,y-1,size*.82,color);text(amountText(v),x+12,y,size,font,color)};
 const header=()=>{
   if(logo){const scaled=logo.scaleToFit(305,82);page.drawImage(logo,{x:30,y:750,width:scaled.width,height:scaled.height})}
   else{text('TG',38,786,31,bold,navy);text('LABS',86,786,31,bold,teal);text('DIAGNOSTICS  •  HOME COLLECTION',40,770,8,bold,navy)}
   text('Your Health',325,800,11,italic,navy);text('Our Priority',325,785,11,italic,navy);rule(390,769,390,818,border,.9);
   text('TRUSTED',402,801,8,bold,navy);text('LABS',412,786,8,bold,navy);rule(453,769,453,818,border,.9);
   text('HOME',468,801,8,bold,teal);text('COLLECTION',458,786,7.2,bold,navy);rule(523,769,523,818,border,.9);
   text('BETTER',531,801,8,bold,teal);text('TOMORROW',526,786,7.2,bold,navy);
 };
 const tableHeader=(yy:number)=>{page.drawRectangle({x:34,y:yy,width:527,height:39,color:navy});text('S.No.',52,yy+14,10.5,bold,white);text('Investigation / Package',112,yy+14,10.5,bold,white);text('Amount',487,yy+14,10.5,bold,white)};
 header();
 box(34,688,527,66,mint,mint);text('PAYMENT RECEIPT',165,720,25,bold,navy);text('Thank you for choosing TG Labs',205,698,11.5,regular,navy);

 box(34,505,527,165,pale,border);rule(297,522,297,653,border,.9);
 const left:[string,string][]=[['Patient Name',data.patientName],['Age / Gender',`${data.age??'-'} / ${safe(data.gender)}`],['Doctor',safe(data.doctorName)==='-'?'Self':safe(data.doctorName)],['Email',safe(data.email)],['Phone',safe(data.phone)]];
 const right:[string,string][]=[['Receipt No.',data.receiptNumber],['Booking Ref.',data.bookingReference],['Receipt Date',data.receiptDate.toLocaleString('en-IN')],['Collection',data.collectionMode==='HOME'?'Home Collection':'Centre Visit'],['Payment Mode',safe(data.paymentMode)],['Payment Status',data.paymentStatus]];
 left.forEach(([k,v],i)=>{const yy=636-i*25;text(k,48,yy,10,bold,navy);text(':',136,yy,10,bold,navy);text(v.slice(0,30),150,yy,10,regular,dark)});
 right.forEach(([k,v],i)=>{const yy=636-i*21;text(k,314,yy,10,bold,navy);text(':',397,yy,10,bold,navy);if(k==='Payment Status'&&v==='PAID'){page.drawRectangle({x:410,y:yy-6,width:51,height:21,color:green});text('PAID',421,yy,10,bold,white)}else text(v.slice(0,27),410,yy,10,regular,dark)});

 tableHeader(446);let y=414;
 for(let i=0;i<data.lines.length;i++){
   if(y<300){page=pdf.addPage([595.28,841.89]);header();tableHeader(700);y=665}
   const item=data.lines[i];text(String(i+1),58,y,10);text(item.name.slice(0,52),112,y,10);money(item.amount,470,y,10,regular,dark);rule(34,y-15,561,y-15,border,.55);y-=31;
 }

 const baseY=Math.min(345,y-8);
 box(34,baseY-116,252,108,mint,mint);text('TG',49,baseY-78,20,bold,teal);text('Diagnostic Partner(s)',84,baseY-50,11.5,bold,navy);text((data.partners.length?data.partners.join(', '):'TG Labs').slice(0,38),84,baseY-76,10.5,regular,navy);
 box(307,baseY-145,254,137,white,border);
 const totals:[string,number][]=[['Subtotal',data.subtotal],['Discount',data.discount],['Total',data.total],['Paid Amount',data.paidAmount],['Due',data.due]];
 totals.forEach(([k,v],i)=>{const yy=baseY-39-i*23;if(k==='Total')page.drawRectangle({x:313,y:yy-7,width:242,height:23,color:mint2});const strong=k==='Total'||k==='Paid Amount';text(k,327,yy,11,strong?bold:regular,navy);money(v,458,yy,11,strong?bold:regular,navy)});

 text('Thank you for trusting TG Labs!',40,baseY-164,16,italic,teal);text('For a healthier tomorrow.',40,baseY-188,11,regular,navy);
 if(data.transactionReference)text(`Transaction reference: ${data.transactionReference.slice(0,55)}`,40,baseY-210,8.8,regular,muted);

 rule(34,95,561,95,teal,1.5);text('www.tglabs.in',40,69,10,regular,navy);text('info@tglabs.in',157,69,10,regular,navy);text('+91 9652603022',264,69,10,regular,navy);
 rule(392,48,392,83,border,.9);text('This is a system-generated payment receipt.',406,71,8.5,italic,muted);text('It does not require a seal or signature.',406,56,8.5,italic,muted);
 page.drawRectangle({x:0,y:0,width:188,height:26,color:teal});page.drawRectangle({x:0,y:26,width:132,height:13,color:mint2});page.drawRectangle({x:0,y:39,width:74,height:9,color:mint});
 return pdf.save();
}
