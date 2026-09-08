import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export type PaymentReceiptLine = { name: string; amount: number };
export type PaymentReceiptData = {
  receiptNumber: string; bookingReference: string; receiptDate: Date; patientName: string;
  age?: number | null; gender?: string | null; doctorName?: string | null; email?: string | null; phone?: string | null;
  collectionMode: string; paymentMode?: string | null; paymentStatus: string; transactionReference?: string | null;
  lines: PaymentReceiptLine[]; subtotal: number; discount: number; total: number; paidAmount: number; due: number; partners: string[];
};

const money=(v:number)=>`Rs. ${Math.max(0,v).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const safe=(v?:string|null)=>v?.trim()||'-';
export function isReceiptAvailable(paymentStatus:string){return paymentStatus==='PAID'}
export function receiptNumberForBooking(bookingId:string){return `TGR-${bookingId.slice(-10).toUpperCase()}`}

export async function createPaymentReceiptPdf(data:PaymentReceiptData):Promise<Uint8Array>{
 const pdf=await PDFDocument.create(); let page=pdf.addPage([595.28,841.89]);
 const regular=await pdf.embedFont(StandardFonts.Helvetica), bold=await pdf.embedFont(StandardFonts.HelveticaBold), italic=await pdf.embedFont(StandardFonts.HelveticaOblique);
 const navy=rgb(.02,.20,.40),teal=rgb(0,.63,.60),dark=rgb(.05,.12,.20),muted=rgb(.34,.42,.46),border=rgb(.80,.88,.90),mint=rgb(.91,.98,.97),white=rgb(1,1,1),green=rgb(.02,.55,.20);
 const t=(s:string,x:number,y:number,size=9,font=regular,color=dark)=>page.drawText(s,{x,y,size,font,color});
 const box=(x:number,y:number,w:number,h:number,fill=white,stroke=border)=>page.drawRectangle({x,y,width:w,height:h,color:fill,borderColor:stroke,borderWidth:.8});
 const line=(x1:number,y1:number,x2:number,y2:number,color=border,width=.8)=>page.drawLine({start:{x:x1,y:y1},end:{x:x2,y:y2},color,thickness:width});

 // Official TG Labs artwork used by the website, rather than reconstructing the logo as text.
 try {
   const logoBytes=await readFile(path.join(process.cwd(),'public','brand','tg-labs-logo.png'));
   const logo=await pdf.embedPng(logoBytes);
   const scaled=logo.scaleToFit(275,72);
   page.drawImage(logo,{x:34,y:760,width:scaled.width,height:scaled.height});
 } catch {
   t('TG',38,785,31,bold,navy); t('LABS',86,785,31,bold,teal); t('DIAGNOSTICS  •  HOME COLLECTION',40,770,8,bold,navy);
 }
 t('Your Health',326,795,10,italic,navy); t('Our Priority',326,781,10,italic,navy);
 line(388,767,388,815,border,.8); t('TRUSTED',402,797,8,bold,navy);t('LABS',411,784,8,bold,navy);
 line(452,767,452,815,border,.8);t('HOME',467,797,8,bold,teal);t('COLLECTION',458,784,7,bold,navy);
 line(522,767,522,815,border,.8);t('BETTER',532,797,8,bold,teal);t('TOMORROW',526,784,7,bold,navy);

 box(34,700,527,54,mint,mint); t('PAYMENT RECEIPT',180,726,22,bold,navy); t('Thank you for choosing TG Labs',211,708,10,regular,navy);
 box(34,530,527,154,white,border); line(297,545,297,668,border,.8);
 const left:[string,string][]=[['Patient Name',data.patientName],['Age / Gender',`${data.age??'-'} / ${safe(data.gender)}`],['Doctor',safe(data.doctorName)==='-'?'Self':safe(data.doctorName)],['Email',safe(data.email)],['Phone',safe(data.phone)]];
 const right:[string,string][]=[['Receipt No.',data.receiptNumber],['Booking Ref.',data.bookingReference],['Receipt Date',data.receiptDate.toLocaleString('en-IN')],['Collection',data.collectionMode==='HOME'?'Home Collection':'Centre Visit'],['Payment Mode',safe(data.paymentMode)],['Payment Status',data.paymentStatus]];
 left.forEach(([k,v],i)=>{const y=650-i*24;t(k,48,y,8.5,bold,navy);t(':',132,y,8.5,bold,navy);t(v.slice(0,31),145,y,8.5,regular,dark)});
 right.forEach(([k,v],i)=>{const y=650-i*20;t(k,314,y,8.5,bold,navy);t(':',392,y,8.5,bold,navy);if(k==='Payment Status'&&v==='PAID'){page.drawRectangle({x:405,y:y-4,width:43,height:17,color:green});t('PAID',414,y,8.5,bold,white)}else t(v.slice(0,28),405,y,8.5,regular,dark)});

 page.drawRectangle({x:34,y:482,width:527,height:34,color:navy});t('S.No.',52,494,9,bold,white);t('Investigation / Package',112,494,9,bold,white);t('Amount',488,494,9,bold,white);
 let y=458;
 for(let i=0;i<data.lines.length;i++){
   if(y<290){page=pdf.addPage([595.28,841.89]);y=790;page.drawRectangle({x:34,y:y-10,width:527,height:30,color:navy});t('S.No.',52,y,9,bold,white);t('Investigation / Package',112,y,9,bold,white);t('Amount',488,y,9,bold,white);y-=35;}
   const item=data.lines[i];t(String(i+1),57,y,8.5);t(item.name.slice(0,55),112,y,8.5);t(money(item.amount),475,y,8.5);line(34,y-12,561,y-12,border,.5);y-=24;
 }

 const baseY=Math.min(360,y-10);
 box(34,baseY-116,255,100,mint,mint);t('Diagnostic Partner(s)',78,baseY-44,10,bold,navy);t((data.partners.length?data.partners.join(', '):'TG Labs').slice(0,42),78,baseY-62,9,regular,navy);t('TG',48,baseY-62,17,bold,teal);
 box(314,baseY-142,247,126,white,border);
 const totals:[string,number][]=[['Subtotal',data.subtotal],['Discount',data.discount],['Total',data.total],['Paid Amount',data.paidAmount],['Due',data.due]];
 totals.forEach(([k,v],i)=>{const yy=baseY-42-i*21;if(k==='Total')page.drawRectangle({x:320,y:yy-5,width:235,height:20,color:mint});t(k,334,yy,9.5,k==='Total'||k==='Paid Amount'?bold:regular,navy);t(money(v),476,yy,9.5,k==='Total'||k==='Paid Amount'?bold:regular,navy)});
 t('Thank you for trusting TG Labs!',40,baseY-166,14,italic,teal);t('For a healthier tomorrow.',40,baseY-185,9.5,regular,navy);
 if(data.transactionReference)t(`Transaction reference: ${data.transactionReference.slice(0,55)}`,40,baseY-207,7.5,regular,muted);

 line(34,76,561,76,teal,1.2);t('www.tglabs.in',40,56,8.5,regular,navy);t('info@tglabs.in',150,56,8.5,regular,navy);
 t('This is a system-generated payment receipt.',330,57,7.5,italic,muted);t('It does not require a seal or signature.',330,45,7.5,italic,muted);
 page.drawRectangle({x:0,y:0,width:595.28,height:22,color:mint});
 return pdf.save();
}
