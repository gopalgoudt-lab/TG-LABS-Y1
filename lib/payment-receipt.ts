import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export type PaymentReceiptLine = {
  name: string;
  amount: number;
};

export type PaymentReceiptData = {
  receiptNumber: string;
  bookingReference: string;
  receiptDate: Date;
  patientName: string;
  age?: number | null;
  gender?: string | null;
  doctorName?: string | null;
  email?: string | null;
  phone?: string | null;
  collectionMode: string;
  paymentMode?: string | null;
  paymentStatus: string;
  transactionReference?: string | null;
  lines: PaymentReceiptLine[];
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  due: number;
  partners: string[];
};

const money = (value: number) => `Rs. ${Math.max(0, value).toLocaleString('en-IN')}`;
const safe = (value?: string | null) => value?.trim() || '-';

export function isReceiptAvailable(paymentStatus: string) {
  return paymentStatus === 'PAID';
}

export function receiptNumberForBooking(bookingId: string) {
  return `TGR-${bookingId.slice(-10).toUpperCase()}`;
}

export async function createPaymentReceiptPdf(data: PaymentReceiptData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.02, 0.18, 0.38);
  const teal = rgb(0.0, 0.61, 0.58);
  const dark = rgb(0.08, 0.15, 0.18);
  const muted = rgb(0.38, 0.46, 0.48);
  const line = rgb(0.84, 0.88, 0.88);
  let y = 790;

  const text = (value: string, x: number, size = 10, font = regular, color = dark) => {
    page.drawText(value, { x, y, size, font, color });
  };
  const rule = (yy: number) => page.drawLine({ start: { x: 40, y: yy }, end: { x: 555, y: yy }, thickness: 0.8, color: line });

  text('TG', 40, 28, bold, navy);
  text('LABS', 83, 28, bold, teal);
  text('DIAGNOSTICS • HOME COLLECTION', 40, 9, bold, navy);
  text('PAYMENT RECEIPT', 405, 16, bold, navy);
  y -= 44;
  rule(y);
  y -= 24;

  const left = [
    ['Patient Name', data.patientName],
    ['Age / Gender', `${data.age ?? '-'} / ${safe(data.gender)}`],
    ['Doctor', safe(data.doctorName) === '-' ? 'Self' : safe(data.doctorName)],
    ['Email', safe(data.email)],
    ['Phone', safe(data.phone)],
  ];
  const right = [
    ['Receipt No.', data.receiptNumber],
    ['Booking Ref.', data.bookingReference],
    ['Receipt Date', data.receiptDate.toLocaleString('en-IN')],
    ['Collection', data.collectionMode === 'HOME' ? 'Home Collection' : 'Centre Visit'],
    ['Payment Mode', safe(data.paymentMode)],
    ['Payment Status', data.paymentStatus],
  ];
  const startY = y;
  left.forEach(([label, value], i) => {
    const yy = startY - i * 18;
    page.drawText(`${label}:`, { x: 40, y: yy, size: 9, font: bold, color: muted });
    page.drawText(value.slice(0, 44), { x: 112, y: yy, size: 9, font: regular, color: dark });
  });
  right.forEach(([label, value], i) => {
    const yy = startY - i * 18;
    page.drawText(`${label}:`, { x: 310, y: yy, size: 9, font: bold, color: muted });
    page.drawText(value.slice(0, 35), { x: 390, y: yy, size: 9, font: regular, color: dark });
  });
  y = startY - Math.max(left.length, right.length) * 18 - 10;
  rule(y);
  y -= 24;

  text('S.No.', 40, 10, bold, navy);
  text('Investigation / Package', 95, 10, bold, navy);
  text('Amount', 490, 10, bold, navy);
  y -= 15;
  rule(y);
  y -= 20;

  for (let i = 0; i < data.lines.length; i += 1) {
    if (y < 180) {
      page = pdf.addPage([595.28, 841.89]);
      y = 790;
    }
    const item = data.lines[i];
    text(String(i + 1), 48, 9);
    text(item.name.slice(0, 62), 95, 9);
    text(money(item.amount), 485, 9);
    y -= 18;
  }

  y -= 6;
  rule(y);
  y -= 24;
  const totals: Array<[string, number]> = [
    ['Subtotal', data.subtotal],
    ['Discount', data.discount],
    ['Total', data.total],
    ['Paid Amount', data.paidAmount],
    ['Due', data.due],
  ];
  totals.forEach(([label, amount]) => {
    text(`${label}:`, 390, 10, label === 'Total' || label === 'Paid Amount' ? bold : regular, muted);
    text(money(amount), 485, 10, label === 'Total' || label === 'Paid Amount' ? bold : regular, dark);
    y -= 18;
  });

  y -= 8;
  text(`Diagnostic Partner(s): ${data.partners.length ? data.partners.join(', ').slice(0, 70) : 'TG Labs'}`, 40, 9, regular, dark);
  y -= 18;
  if (data.transactionReference) {
    text(`Transaction reference: ${data.transactionReference.slice(0, 60)}`, 40, 8, regular, muted);
    y -= 18;
  }

  rule(62);
  page.drawText('www.tglabs.in  •  info@tglabs.in', { x: 40, y: 44, size: 8, font: regular, color: muted });
  page.drawText('This is a system-generated payment receipt and does not require a seal or signature.', { x: 40, y: 28, size: 8, font: regular, color: muted });

  return pdf.save();
}
