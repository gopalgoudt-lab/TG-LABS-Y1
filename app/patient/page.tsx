'use client';

import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut, type Auth } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { getFirebaseAuth } from '@/lib/firebase';
import { firebaseAuthErrorMessage } from '@/lib/firebase-auth-errors';
import AiReportView from '@/components/AiReportView';

const FLOW = [
  ['BOOKING_CREATED', 'Booking created'],
  ['BOOKING_CONFIRMED', 'Confirmed'],
  ['TECHNICIAN_ASSIGNED', 'Technician assigned'],
  ['TECHNICIAN_ACCEPTED', 'Accepted'],
  ['ON_THE_WAY', 'On the way'],
  ['REACHED_PATIENT', 'Reached'],
  ['SAMPLE_COLLECTED', 'Sample collected'],
  ['SAMPLE_RECEIVED_AT_LAB', 'At lab'],
  ['PROCESSING', 'Processing'],
  ['REPORT_READY', 'Report ready'],
  ['REPORT_DELIVERED', 'Delivered'],
] as const;

type Booking = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  workflowStatus: string;
  total: number;
  mode: string;
  collectionDate: string;
  slot: string;
  tests: string[];
  packages: string[];
  doctorName?: string | null;
  printedReport?: boolean;
  printedReportFee?: number;
  technician?: string | null;
  timeline: Record<string, string | null>;
};

type Report = {
  id: string;
  orderNumber: string;
  name: string;
  status: string;
  publishedAt: string | null;
  tests: string[];
  packages: string[];
  downloadUrl: string | null;
};

type AiReport = {
  analysis: string;
  generatedAt: string;
  disclaimer: string;
  language?: string;
  languageName?: string;
  cached?: boolean;
};

type AiLanguage = 'en' | 'te' | 'hi';
const LANGUAGE_LABELS: Record<AiLanguage, string> = { en: 'English', te: 'తెలుగు', hi: 'हिन्दी' };

export default function PatientPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [orders, setOrders] = useState<Booking[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiReports, setAiReports] = useState<Record<string, AiReport>>({});
  const [aiBusy, setAiBusy] = useState('');
  const [aiError, setAiError] = useState<Record<string, string>>({});
  const [viewBusy, setViewBusy] = useState('');

  function authOrRedirect(): Auth | null {
    try {
      return getFirebaseAuth();
    } catch {
      setError('Secure patient sign-in is temporarily unavailable. Please try again later.');
      return null;
    }
  }

  useEffect(() => {
    let auth: Auth;
    try {
      auth = getFirebaseAuth();
    } catch {
      setError('Secure patient sign-in is temporarily unavailable. Please try again later.');
      setLoading(false);
      return;
    }

    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/auth');
        return;
      }

      setPhone(user.phoneNumber ?? '');
      setLoading(true);
      try {
        const token = await user.getIdToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [br, rr] = await Promise.all([
          fetch('/api/patient/bookings', { headers, cache: 'no-store' }),
          fetch('/api/patient/reports', { headers, cache: 'no-store' }),
        ]);

        if (br.status === 401 || rr.status === 401) {
          await signOut(auth);
          router.replace('/auth');
          return;
        }
        if (!br.ok || !rr.ok) throw new Error('Unable to load your TG Labs account right now.');

        const b = await br.json();
        const r = await rr.json();
        setOrders(b.orders ?? []);
        setReports(r.reports ?? []);
        setName(b.patient?.name ?? '');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to load your account.');
      } finally {
        setLoading(false);
      }
    });
  }, [router]);

  const upcoming = useMemo(() => orders.filter((o) => !['COMPLETED', 'CANCELLED'].includes(o.status)), [orders]);
  const tracking = upcoming[0] || orders[0];
  const date = (v: string) => new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v));
  const stamp = (v?: string | null) => v ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Pending';

  async function handleSignOut() {
    const auth = authOrRedirect();
    if (!auth) return;
    setError('');
    try {
      await signOut(auth);
    } catch (error) {
      setError(firebaseAuthErrorMessage(error, 'The local session could not be cleared cleanly. The sign-in page has been reopened for safety.'));
    } finally {
      router.replace('/auth');
      router.refresh();
    }
  }

  async function viewReport(report: Report) {
    const auth = authOrRedirect();
    if (!auth) return;
    const user = auth.currentUser;
    if (!user) return router.replace('/auth');

    setViewBusy(report.id);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/patient/reports/${report.id}/file`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Unable to open this report.');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (!w) {
        const a = document.createElement('a');
        a.href = url;
        a.download = report.name || 'diagnostic-report.pdf';
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setAiError((x) => ({ ...x, [report.id]: e instanceof Error ? e.message : 'Unable to open report.' }));
    } finally {
      setViewBusy('');
    }
  }

  async function generateAiReport(report: Report, language: AiLanguage = 'en', askConsent = true) {
    if (!report.downloadUrl) return;
    if (askConsent && !window.confirm('AI Report will use this diagnostic report for an educational explanation. Saved explanations are reused on future visits. It is not a diagnosis or a substitute for your doctor. Continue?')) return;

    const auth = authOrRedirect();
    if (!auth) return;
    const user = auth.currentUser;
    if (!user) return router.replace('/auth');

    setAiBusy(`${report.id}:${language}`);
    setAiError((x) => ({ ...x, [report.id]: '' }));
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/patient/reports/${report.id}/ai`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to generate AI Report.');
      setAiReports((x) => ({ ...x, [report.id]: data }));
    } catch (e) {
      setAiError((x) => ({ ...x, [report.id]: e instanceof Error ? e.message : 'Unable to generate AI Report.' }));
    } finally {
      setAiBusy('');
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f6faf9', color: '#15312c' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 20px 64px' }}>
        <header style={{ display: 'flex', gap: 20, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 28 }}>
          <div>
            <p style={ey}>TG LABS PATIENT PORTAL</p>
            <h1 style={{ margin: '6px 0 4px', fontSize: 'clamp(30px,5vw,46px)' }}>My TG Labs</h1>
            <p style={{ margin: 0, color: '#64748b' }}>{name ? `Welcome, ${name}` : 'Your secure diagnostic dashboard'} {phone ? `• ${phone}` : ''}</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href="/tests" style={secondary}>Browse tests</a>
            <a href="/booking" style={primary}>Book new test</a>
            <button onClick={handleSignOut} style={secondary}>Sign out</button>
          </div>
        </header>

        {error && <div style={err}>{error}</div>}

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 16, marginBottom: 22 }}>
          <Stat label="Total bookings" value={orders.length} />
          <Stat label="Active" value={upcoming.length} />
          <Stat label="Reports" value={reports.length} />
        </section>

        {!loading && tracking && (
          <section style={{ ...panel, marginBottom: 22, border: '1px solid #b7ddd4' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <p style={ey}>LIVE BOOKING TRACKER</p>
                <h2 style={{ margin: '4px 0' }}>{tracking.orderNumber}</h2>
                <div style={{ color: '#64748b' }}>{date(tracking.collectionDate)} • {tracking.slot} • {tracking.mode === 'HOME' ? 'Home collection' : 'Centre visit'}</div>
              </div>
              <Status text={tracking.workflowStatus} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10, marginTop: 18 }}>
              {FLOW.map(([code, label], i) => {
                const current = FLOW.findIndex((x) => x[0] === tracking.workflowStatus);
                const done = i <= current;
                return (
                  <div key={code} style={{ padding: 12, borderRadius: 12, border: `1px solid ${done ? '#9ed2c6' : '#e2e8f0'}`, background: done ? '#effaf7' : '#fafcfc' }}>
                    <b style={{ color: done ? '#087f6b' : '#94a3b8' }}>{i + 1}. {label}</b>
                    <small style={{ display: 'block', color: '#64748b' }}>{stamp(tracking.timeline?.[code])}</small>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 12, marginTop: 16 }}>
              <Info label="Technician" value={tracking.technician || 'Not assigned yet'} />
              <Info label="Doctor" value={tracking.doctorName || 'Not provided'} />
              <Info label="Printed report" value={tracking.printedReport ? `Yes • ₹${tracking.printedReportFee || 100} • 24–48 hrs` : 'No'} />
              <Info label="Payment" value={`${tracking.paymentStatus} • ₹${tracking.total.toLocaleString('en-IN')}`} />
            </div>
          </section>
        )}

        {loading ? (
          <section style={panel}><h2>Loading your account…</h2></section>
        ) : (
          <div style={{ display: 'grid', gap: 22 }}>
            <section style={panel}>
              <p style={ey}>BOOKINGS</p>
              <h2>Recent bookings</h2>
              {orders.length === 0 ? <Empty title="No bookings yet" /> : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {orders.map((o) => (
                    <article key={o.id} style={row}>
                      <div>
                        <strong>{o.orderNumber}</strong>
                        <p>{[...o.packages, ...o.tests].slice(0, 3).join(' • ') || 'Diagnostic booking'}</p>
                        <small>{date(o.collectionDate)} • {o.slot}</small>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <Status text={o.status} />
                        <strong style={{ display: 'block', fontSize: 20, marginTop: 7 }}>₹{o.total.toLocaleString('en-IN')}</strong>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section style={panel}>
              <p style={ey}>REPORTS</p>
              <h2 style={{ marginBottom: 5 }}>Diagnostic reports</h2>
              <p style={{ margin: '0 0 18px', color: '#64748b', fontSize: 13 }}>View the original laboratory PDF or open your saved AI explanation in English, Telugu or Hindi.</p>

              {reports.length === 0 ? <Empty title="No reports available yet" /> : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {reports.map((r) => (
                    <div key={r.id} style={{ display: 'grid', gap: 10 }}>
                      <article style={row}>
                        <div>
                          <strong>{r.name}</strong>
                          <p style={{ color: '#64748b', fontSize: 14 }}>{r.orderNumber} • {[...r.packages, ...r.tests].slice(0, 3).join(' • ')}</p>
                          <Status text={r.status} />
                        </div>
                        {r.downloadUrl ? (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button onClick={() => viewReport(r)} style={primary}>{viewBusy === r.id ? 'Opening…' : 'View / Download report'}</button>
                            <button onClick={() => generateAiReport(r, 'en')} style={aiButton}>✨ AI Health Report</button>
                          </div>
                        ) : <span>Processing</span>}
                      </article>

                      {aiError[r.id] && <div style={err}>{aiError[r.id]}</div>}

                      {aiReports[r.id] && (
                        <section style={aiPanel}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                            <div>
                              <p style={{ ...ey, color: '#5b3cc4' }}>TG LABS • AI HEALTH REPORT</p>
                              <h3 style={{ margin: '4px 0' }}>Your report, explained clearly</h3>
                              <small style={{ color: '#64748b' }}>{aiReports[r.id].cached ? 'Saved report • ' : ''}Generated {stamp(aiReports[r.id].generatedAt)} • {aiReports[r.id].languageName || 'English'}</small>
                            </div>
                            <button onClick={() => setAiReports((x) => { const n = { ...x }; delete n[r.id]; return n; })} style={secondary}>Close</button>
                          </div>

                          <div style={{ marginTop: 14, padding: 12, borderRadius: 14, background: '#f7f5ff', border: '1px solid #ddd6fe' }}>
                            <b style={{ fontSize: 13 }}>Choose language</b>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                              {(['en', 'te', 'hi'] as AiLanguage[]).map((lang) => (
                                <button key={lang} disabled={!!aiBusy} onClick={() => generateAiReport(r, lang, false)} style={{ ...languageButton, background: aiReports[r.id].language === lang ? '#5b3cc4' : '#fff', color: aiReports[r.id].language === lang ? '#fff' : '#5038a8' }}>
                                  {aiBusy === `${r.id}:${lang}` ? 'Loading…' : LANGUAGE_LABELS[lang]}
                                </button>
                              ))}
                            </div>
                          </div>

                          <AiReportView text={aiReports[r.id].analysis} language={aiReports[r.id].language} />
                          <div style={{ marginTop: 14, padding: 13, borderRadius: 12, background: '#fff8e7', border: '1px solid #f0d89a', fontSize: 13, color: '#6b4e10' }}>
                            <b>Important:</b> {aiReports[r.id].disclaimer}
                          </div>
                        </section>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <article style={{ ...panel, padding: 20 }}><p style={{ margin: 0, color: '#64748b', fontWeight: 700 }}>{label}</p><strong style={{ display: 'block', fontSize: 34, marginTop: 8 }}>{value}</strong></article>;
}
function Status({ text }: { text: string }) {
  return <span style={{ display: 'inline-block', padding: '5px 9px', borderRadius: 999, background: '#e7f7f3', color: '#087f6b', fontSize: 11, fontWeight: 800 }}>{text.replaceAll('_', ' ')}</span>;
}
function Info({ label, value }: { label: string; value: string }) {
  return <div style={{ padding: 12, borderRadius: 12, background: '#f8fbfa' }}><small style={{ display: 'block', color: '#64748b', fontWeight: 800 }}>{label}</small><b>{value}</b></div>;
}
function Empty({ title }: { title: string }) {
  return <div style={{ padding: 28, textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: 16, color: '#64748b' }}>{title}</div>;
}

const panel = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 22, boxShadow: '0 12px 35px rgba(15,23,42,.05)' } as const;
const row = { display: 'flex', gap: 18, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', padding: 18, border: '1px solid #e2e8f0', borderRadius: 16 } as const;
const ey = { margin: 0, color: '#087f6b', fontSize: 12, fontWeight: 800, letterSpacing: 1.1 } as const;
const primary = { display: 'inline-block', border: 0, borderRadius: 12, padding: '11px 15px', background: '#087f6b', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 14, textDecoration: 'none' } as const;
const secondary = { border: '1px solid #cbd5e1', borderRadius: 12, padding: '10px 14px', background: '#fff', color: '#334155', fontWeight: 800, textDecoration: 'none', cursor: 'pointer', fontSize: 14 } as const;
const aiButton = { border: '1px solid #c8bff2', borderRadius: 12, padding: '10px 14px', background: '#f4f1ff', color: '#5038a8', fontWeight: 900, cursor: 'pointer', fontSize: 14 } as const;
const languageButton = { border: '1px solid #c8bff2', borderRadius: 10, padding: '8px 13px', fontWeight: 900, cursor: 'pointer', fontSize: 13 } as const;
const aiPanel = { background: '#fbfaff', border: '1px solid #d9d2f7', borderRadius: 18, padding: 20, boxShadow: '0 10px 28px rgba(80,56,168,.06)' } as const;
const err = { padding: 12, borderRadius: 12, background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239' } as const;
