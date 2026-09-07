'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

type Test = { id: string; name: string; price: number };
type Pack = { id: string; name: string; price: number; tests: { test: Test }[] };
type History = {
  id: string;
  collectionDate: string;
  slot: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  technician?: string | null;
  items: { test: { name: string } }[];
};
type ReportType = 'PARTIAL' | 'FULL';

const FLOW = [
  ['BOOKING_CREATED', 'Booking Created'],
  ['BOOKING_CONFIRMED', 'Booking Confirmed'],
  ['TECHNICIAN_ASSIGNED', 'Technician Assigned'],
  ['SAMPLE_COLLECTED', 'Sample Collected'],
  ['SAMPLE_RECEIVED_AT_LAB', 'Sample Received at Lab'],
  ['PROCESSING', 'Processing'],
  ['REPORT_READY', 'Report Ready'],
  ['REPORT_DELIVERED', 'Report Delivered'],
] as const;

function fmt(n: number) {
  const h = Math.floor(n / 60), m = n % 60, p = h >= 12 ? 'PM' : 'AM', hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')} ${p}`;
}
const SLOTS = Array.from({ length: 26 }, (_, i) => `${fmt(360 + i * 30)} - ${fmt(390 + i * 30)}`);
const input = { width: '100%', padding: '12px 14px', border: '1px solid #cddbd6', borderRadius: 10, boxSizing: 'border-box' as const };
const box = { background: '#fff', border: '1px solid #dfe9e5', borderRadius: 18, padding: 20, boxShadow: '0 8px 24px rgba(12,71,61,.05)' };
const stampKeys: Record<string, string> = {
  BOOKING_CONFIRMED: 'bookingConfirmedAt',
  TECHNICIAN_ASSIGNED: 'technicianAssignedAt',
  SAMPLE_COLLECTED: 'sampleCollectedAt',
  SAMPLE_RECEIVED_AT_LAB: 'sampleReceivedAt',
  PROCESSING: 'processingStartedAt',
  REPORT_READY: 'reportReadyAt',
  REPORT_DELIVERED: 'reportDeliveredAt',
};
function when(v?: string | null) { return v ? new Date(v).toLocaleString('en-IN') : 'Pending'; }
function fileAsDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read report'));
    reader.readAsDataURL(file);
  });
}
async function correctPageNumbers(pdf: PDFDocument) {
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages(), total = pages.length;
  pages.forEach((page, index) => {
    const { width } = page.getSize();
    const label = `Page ${index + 1} of ${total}`;
    const size = 9;
    const textWidth = font.widthOfTextAtSize(label, size);
    // Cover only the source page-number text itself. Do not mask signatures,
    // stamps, QR codes, borders or other report content.
    page.drawRectangle({ x: Math.max(0, width - 104), y: 132, width: 100, height: 22, color: rgb(1, 1, 1) });
    // If a PDF was previously renumbered, clear only the small final-number zone.
    page.drawRectangle({ x: Math.max(0, width - 116), y: 0, width: 112, height: 28, color: rgb(1, 1, 1) });
    page.drawText(label, { x: Math.max(8, width - textWidth - 14), y: 12, size, font, color: rgb(.15, .15, .15) });
  });
}

export default function EditBookingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [packages, setPackages] = useState<Pack[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishingReport, setPublishingReport] = useState(false);
  const [reportPrepared, setReportPrepared] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('FULL');
  const [msg, setMsg] = useState('');
  const [q, setQ] = useState('');
  const [pq, setPq] = useState('');
  const [renumberPages, setRenumberPages] = useState(false);
  const [f, setF] = useState<any>({
    name: '', phone: '', email: '', age: '', gender: 'Male', mode: 'HOME', address: '', pincode: '',
    date: '', slot: SLOTS[0], testIds: [], packageIds: [], technician: '', totalAmount: 0, status: 'PENDING',
    paymentStatus: 'PENDING', workflowStatus: 'BOOKING_CREATED', adminNotes: '', reportName: '', reportData: ''
  });
  const [times, setTimes] = useState<any>({});
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));

  useEffect(() => {
    (async () => {
      const [b, t, p] = await Promise.all([
        fetch(`/api/admin/bookings/${id}`),
        fetch('/api/admin/catalog/tests'),
        fetch('/api/admin/catalog/packages'),
      ]);
      const bj = await b.json(), tj = await t.json(), pj = await p.json();
      if (!b.ok) { setMsg(bj.error || 'Unable to load booking'); setLoading(false); return; }
      const x = bj.booking;
      setTests(tj.tests || []);
      setPackages(pj.packages || []);
      setHistory(x.patient.bookings || []);
      setTimes(x);
      setReportType(String(x.reportName || '').startsWith('PARTIAL -') ? 'PARTIAL' : 'FULL');
      setF({
        name: x.patient.name,
        phone: x.patient.phone,
        email: x.patient.email || '',
        age: x.patient.age ?? '',
        gender: x.patient.gender || 'Male',
        mode: x.mode,
        address: x.address || '',
        pincode: x.pincode || '',
        date: new Date(x.collectionDate).toISOString().slice(0, 10),
        slot: x.slot,
        testIds: x.items.map((i: any) => i.test.id),
        packageIds: [],
        technician: x.technician || '',
        totalAmount: x.totalAmount,
        status: x.status,
        paymentStatus: x.paymentStatus,
        workflowStatus: x.workflowStatus || 'BOOKING_CREATED',
        adminNotes: x.adminNotes || '',
        reportName: x.reportName || '',
        reportData: x.reportData || '',
      });
      setLoading(false);
    })();
  }, [id]);

  const shownTests = useMemo(() => tests.filter(t => t.name.toLowerCase().includes(q.toLowerCase())), [tests, q]);
  const shownPacks = useMemo(() => packages.filter(p => (p.name + ' ' + p.tests.map(x => x.test.name).join(' ')).toLowerCase().includes(pq.toLowerCase())), [packages, pq]);
  const selectedCatalogTotal = useMemo(() =>
    tests.filter(t => f.testIds.includes(t.id)).reduce((s, t) => s + t.price, 0) +
    packages.filter(p => f.packageIds.includes(p.id)).reduce((s, p) => s + p.price, 0),
    [tests, packages, f.testIds, f.packageIds]
  );

  async function report(files?: FileList | null) {
    const selected = Array.from(files || []);
    if (!selected.length) return;
    setMsg('');
    for (const file of selected) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { setMsg('Please select PDF diagnostic reports only.'); return; }
      if (file.size > 3 * 1024 * 1024) { setMsg(`${file.name} is larger than 3 MB.`); return; }
    }
    try {
      if (selected.length === 1 && !renumberPages) {
        const file = selected[0], data = await fileAsDataUrl(file);
        setF((x: any) => ({ ...x, reportName: file.name, reportData: data }));
        setReportPrepared(true);
        setMsg('1 PDF prepared. Review the report type, then click Publish Report.');
        return;
      }
      const merged = await PDFDocument.create();
      for (const file of selected) {
        const src = await PDFDocument.load(await file.arrayBuffer());
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach(page => merged.addPage(page));
      }
      if (renumberPages) await correctPageNumbers(merged);
      const bytes = await merged.save();
      if (bytes.byteLength > 3 * 1024 * 1024) { setMsg('The final PDF is larger than 3 MB. Please use smaller source PDFs.'); return; }
      const data = await fileAsDataUrl(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
      const name = selected.length === 1
        ? (renumberPages ? `TG-Labs-Corrected-Pages-${selected[0].name}` : selected[0].name)
        : `TG-Labs-Merged-Report-${selected.length}-files${renumberPages ? '-renumbered' : ''}.pdf`;
      setF((x: any) => ({ ...x, reportName: name, reportData: data }));
      setReportPrepared(true);
      setMsg(`${selected.length} PDF${selected.length > 1 ? 's' : ''} prepared${renumberPages ? ' with corrected final page numbering' : ''}. Review the report type, then click Publish Report.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Unable to prepare the selected PDFs');
    }
  }

  function openReport() {
    if (!f.reportData) return;
    try {
      const [meta, payload] = String(f.reportData).split(',', 2);
      if (!payload) throw new Error('Invalid report data');
      const mime = /data:([^;]+)/.exec(meta)?.[1] || 'application/pdf';
      const raw = atob(payload), bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (!win) { setMsg('Browser blocked the report tab. Allow pop-ups for this Preview site and try again.'); URL.revokeObjectURL(url); return; }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Unable to open report');
    }
  }

  async function publishPreparedReport() {
    if (!reportPrepared || !f.reportData || !f.reportName) { setMsg('Choose one or more PDF files before publishing.'); return; }
    setPublishingReport(true);
    setMsg('');
    try {
      const baseName = String(f.reportName).replace(/^(PARTIAL|FULL)\s+-\s+/i, '');
      const r = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: id, fileName: baseName, fileData: f.reportData, reportType }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Unable to publish report');
      setF((x: any) => ({ ...x, reportName: j.reportName, workflowStatus: j.workflowStatus }));
      setTimes((x: any) => ({ ...x, reportReadyAt: j.reportReadyAt || null }));
      setReportPrepared(false);
      setMsg(reportType === 'PARTIAL'
        ? 'Partial report published. Patient can access it and the booking remains in Processing.'
        : 'Full report published. Patient can access it and the booking is Report Ready.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Unable to publish report');
    } finally {
      setPublishingReport(false);
    }
  }

  async function save() {
    setSaving(true); setMsg('');
    try {
      const r = await fetch(`/api/admin/bookings/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, age: f.age === '' ? null : Number(f.age), totalAmount: Number(f.totalAmount) })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Unable to update booking');
      setMsg('Booking and sample workflow updated successfully.');
      setTimes(j.booking);
      setTimeout(() => router.push('/admin/bookings'), 900);
    } catch (e: any) { setMsg(e.message); }
    finally { setSaving(false); }
  }

  if (loading) return <main style={{ padding: 30 }}>Loading booking…</main>;

  return <main style={{ minHeight: '100vh', background: '#f4f8f6', padding: 28, color: '#12352f', fontFamily: 'Arial,sans-serif' }}>
    <div style={{ maxWidth: 1250, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div><div style={{ fontSize: 12, fontWeight: 900, color: '#087f6f' }}>TG LABS • PHASE 2</div><h1 style={{ marginBottom: 5 }}>Manage Booking</h1><div style={{ color: '#687c76' }}>Patient, collection, lab workflow, payment and report control.</div></div>
        <a href="/admin/bookings" style={{ color: '#087f6f', fontWeight: 800 }}>← Booking Management</a>
      </div>
      {msg && <div style={{ ...box, margin: '15px 0' }}>{msg}</div>}

      <section style={{ ...box, marginTop: 18 }}>
        <h2>Sample Processing Workflow</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, marginBottom: 16 }}>
          {FLOW.map(([code, label], i) => { const current = FLOW.findIndex(x => x[0] === f.workflowStatus); const reached = i <= current; const key = stampKeys[code]; return <div key={code} style={{ padding: 12, borderRadius: 12, border: `1px solid ${reached ? '#8bcbbb' : '#dfe9e5'}`, background: reached ? '#eff9f6' : '#fafcfc' }}><div style={{ fontWeight: 900, color: reached ? '#087f6f' : '#758681' }}>{i + 1}. {label}</div><small>{code === 'BOOKING_CREATED' ? when(times.createdAt) : when(times[key])}</small></div>; })}
        </div>
        <label style={{ fontWeight: 800 }}>Update workflow stage<select style={{ ...input, marginTop: 6 }} value={f.workflowStatus} onChange={e => set('workflowStatus', e.target.value)}>{FLOW.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
        <div style={{ fontSize: 12, color: '#687c76', marginTop: 8 }}>When you save a new stage, TG Labs records its timestamp automatically. Report Delivered will also mark the booking Completed.</div>
      </section>

      <section style={{ ...box, marginTop: 18 }}>
        <h2>Patient & Collection</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
          <label>Name<input style={input} value={f.name} onChange={e => set('name', e.target.value)} /></label>
          <label>Age<input type="number" min="0" max="120" style={input} value={f.age} onChange={e => set('age', e.target.value)} /></label>
          <label>Gender<select style={input} value={f.gender} onChange={e => set('gender', e.target.value)}><option>Male</option><option>Female</option><option>Others</option></select></label>
          <label>Mobile Number<input style={input} maxLength={10} value={f.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, ''))} /></label>
          <label>Email ID<input type="email" style={input} value={f.email} onChange={e => set('email', e.target.value)} /></label>
          <label>Collection Type<select style={input} value={f.mode} onChange={e => set('mode', e.target.value)}><option value="HOME">Home Collection</option><option value="CENTRE">Lab Centre</option></select></label>
          <label>Date<input type="date" style={input} value={f.date} onChange={e => set('date', e.target.value)} /></label>
          <label>Time Slot<select style={input} value={f.slot} onChange={e => set('slot', e.target.value)}>{SLOTS.map(s => <option key={s}>{s}</option>)}</select></label>
          <label>Technician<input style={input} value={f.technician} onChange={e => set('technician', e.target.value)} placeholder="Assign technician" /></label>
        </div>
        {f.mode === 'HOME' && <><label style={{ display: 'block', marginTop: 14 }}>Address<textarea style={{ ...input, minHeight: 80 }} value={f.address} onChange={e => set('address', e.target.value)} /></label><label style={{ display: 'block', marginTop: 14 }}>Pincode<input style={{ ...input, maxWidth: 300 }} maxLength={6} value={f.pincode} onChange={e => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} /></label></>}
      </section>

      <section style={{ ...box, marginTop: 18 }}>
        <h2>Tests & Packages</h2>
        <input style={{ ...input, maxWidth: 500 }} placeholder="Search test..." value={q} onChange={e => setQ(e.target.value)} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 8, maxHeight: 300, overflowY: 'auto', marginTop: 12 }}>{shownTests.map(t => <label key={t.id} style={{ padding: 9, border: '1px solid #e1eae7', borderRadius: 9 }}><input type="checkbox" checked={f.testIds.includes(t.id)} onChange={e => set('testIds', e.target.checked ? [...f.testIds, t.id] : f.testIds.filter((x: string) => x !== t.id))} /> <b>{t.name}</b> • ₹{t.price}</label>)}</div>
        <h3>Add Package</h3>
        <input style={{ ...input, maxWidth: 500 }} placeholder="Search package..." value={pq} onChange={e => setPq(e.target.value)} />
        <div>{shownPacks.map(p => <label key={p.id} style={{ display: 'block', padding: 8 }}><input type="checkbox" checked={f.packageIds.includes(p.id)} onChange={e => set('packageIds', e.target.checked ? [...f.packageIds, p.id] : f.packageIds.filter((x: string) => x !== p.id))} /> <b>{p.name}</b> • ₹{p.price}</label>)}</div>
        <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: '#eff9f6' }}><b>Catalog total: ₹{selectedCatalogTotal.toLocaleString('en-IN')}</b></div>
      </section>

      <section style={{ ...box, marginTop: 18 }}>
        <h2>Price, Status & Report</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
          <label>Final Price / Extra Discount<input type="number" min="0" style={input} value={f.totalAmount} onChange={e => set('totalAmount', e.target.value)} /></label>
          <label>Booking Status<select style={input} value={f.status} onChange={e => set('status', e.target.value)}><option>PENDING</option><option>CONFIRMED</option><option>CANCELLED</option><option>COMPLETED</option></select></label>
          <label>Payment Status<select style={input} value={f.paymentStatus} onChange={e => set('paymentStatus', e.target.value)}><option>PENDING</option><option>PAID</option><option>FAILED</option><option>REFUNDED</option></select></label>
          <label>Report type<select style={input} value={reportType} onChange={e => setReportType(e.target.value as ReportType)}><option value="PARTIAL">Partial Report</option><option value="FULL">Full Report</option></select><small style={{ display: 'block', marginTop: 6, color: '#687c76' }}>Partial keeps the booking in Processing. Full publishes the final report and moves it to Report Ready.</small></label>
          <label>Replace / Upload Report<input type="file" accept="application/pdf,.pdf" multiple style={input} onChange={e => { report(e.target.files); e.currentTarget.value = ''; }} /><small style={{ display: 'block', marginTop: 6, color: '#687c76' }}>Select one or multiple PDFs. Multiple files are merged in selection order into one final report.</small></label>
        </div>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 12, padding: '10px 12px', border: '1px solid #d7e5e0', borderRadius: 10, background: '#f8fcfa', maxWidth: 620 }}><input type="checkbox" checked={renumberPages} onChange={e => setRenumberPages(e.target.checked)} style={{ marginTop: 2 }} /><span><b>Replace / correct final page numbers</b><small style={{ display: 'block', marginTop: 3, color: '#687c76' }}>When selected, TG Labs masks the inherited right-edge page-number area across a larger vertical band plus the final footer, then writes one clean Page 1 of N, Page 2 of N… sequence after merge.</small></span></label>
        {f.reportName && <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}><b>{reportPrepared ? 'Prepared report:' : 'Current report:'}</b> {f.reportName} {f.reportData && <button type="button" onClick={openReport} style={{ border: 0, background: 'transparent', padding: 0, color: '#087f6f', fontWeight: 800, textDecoration: 'underline', cursor: 'pointer' }}>Open report</button>}</div>}
        {reportPrepared && <button type="button" disabled={publishingReport} onClick={publishPreparedReport} style={{ marginTop: 12, padding: '11px 16px', border: 0, borderRadius: 10, background: reportType === 'PARTIAL' ? '#9b6b16' : '#087f6f', color: '#fff', fontWeight: 900, cursor: publishingReport ? 'wait' : 'pointer' }}>{publishingReport ? 'Publishing…' : `Publish ${reportType === 'PARTIAL' ? 'Partial' : 'Full'} Report`}</button>}
        <label style={{ display: 'block', marginTop: 14 }}>Admin Notes<textarea style={{ ...input, minHeight: 100 }} value={f.adminNotes} onChange={e => set('adminNotes', e.target.value)} /></label>
      </section>

      <section style={{ ...box, marginTop: 18 }}>
        <h2>Patient Booking History</h2>
        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}><thead><tr>{['Date', 'Tests', 'Slot', 'Technician', 'Payment', 'Status', 'Amount'].map(h => <th key={h} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #dce7e3' }}>{h}</th>)}</tr></thead><tbody>{history.map(h => <tr key={h.id}><td style={{ padding: 10 }}>{new Date(h.collectionDate).toLocaleDateString('en-IN')}</td><td>{h.items.map(i => i.test.name).join(', ')}</td><td>{h.slot}</td><td>{h.technician || '—'}</td><td>{h.paymentStatus}</td><td>{h.status}</td><td>₹{h.totalAmount}</td></tr>)}</tbody></table></div>
      </section>

      <button disabled={saving} onClick={save} style={{ marginTop: 20, width: '100%', padding: 15, border: 0, borderRadius: 12, background: '#087f6f', color: '#fff', fontWeight: 900, fontSize: 16 }}>{saving ? 'Saving Changes…' : 'Save Booking & Workflow Changes'}</button>
    </div>
  </main>;
}