'use client';

import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';

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

export default function PatientPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [orders, setOrders] = useState<Booking[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/auth');
        return;
      }

      setPhone(user.phoneNumber ?? '');
      setLoading(true);
      setError('');

      try {
        const token = await user.getIdToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [bookingResponse, reportResponse] = await Promise.all([
          fetch('/api/patient/bookings', { headers, cache: 'no-store' }),
          fetch('/api/patient/reports', { headers, cache: 'no-store' }),
        ]);

        if (bookingResponse.status === 401 || reportResponse.status === 401) {
          await signOut(auth);
          router.replace('/auth');
          return;
        }

        if (!bookingResponse.ok || !reportResponse.ok) {
          throw new Error('Unable to load your TG Labs account right now. Please try again.');
        }

        const bookingData = await bookingResponse.json();
        const reportData = await reportResponse.json();
        setOrders(bookingData.orders ?? []);
        setReports(reportData.reports ?? []);
        setName(bookingData.patient?.name ?? '');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to load your account.');
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [router]);

  const upcoming = useMemo(
    () => orders.filter((order) => !['COMPLETED', 'CANCELLED'].includes(order.status)),
    [orders],
  );

  async function handleSignOut() {
    await signOut(auth);
    router.replace('/auth');
  }

  function readableDate(value: string) {
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f6faf9', color: '#15312c' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 20px 64px' }}>
        <header style={{ display: 'flex', gap: 20, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 28 }}>
          <div>
            <p style={{ margin: 0, color: '#087f6b', fontWeight: 800, letterSpacing: 1.2, fontSize: 13 }}>TG LABS PATIENT PORTAL</p>
            <h1 style={{ margin: '6px 0 4px', fontSize: 'clamp(30px, 5vw, 46px)', lineHeight: 1.05 }}>My TG Labs</h1>
            <p style={{ margin: 0, color: '#64748b' }}>{name ? `Welcome, ${name}` : 'Your secure diagnostic dashboard'} {phone ? `• ${phone}` : ''}</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href="/tests" style={secondaryButton}>Browse tests</a>
            <a href="/booking" style={primaryButton}>Book new test</a>
            <button type="button" onClick={handleSignOut} style={secondaryButton}>Sign out</button>
          </div>
        </header>

        {error && (
          <div role="alert" style={{ padding: 16, borderRadius: 14, background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239', marginBottom: 20 }}>
            {error}
          </div>
        )}

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 28 }}>
          <StatCard label="Total bookings" value={orders.length} helper="All diagnostic bookings" />
          <StatCard label="Upcoming" value={upcoming.length} helper="Collections in progress" />
          <StatCard label="Reports" value={reports.length} helper="Ready or delivered" />
        </section>

        {loading ? (
          <section style={panelStyle}>
            <h2 style={{ marginTop: 0 }}>Loading your account…</h2>
            <p style={{ color: '#64748b' }}>Securely retrieving bookings and reports.</p>
          </section>
        ) : (
          <div style={{ display: 'grid', gap: 22 }}>
            <section style={panelStyle}>
              <div style={sectionHeaderStyle}>
                <div>
                  <p style={eyebrowStyle}>BOOKINGS</p>
                  <h2 style={{ margin: '4px 0 0' }}>Recent bookings</h2>
                </div>
                <a href="/booking" style={{ color: '#087f6b', fontWeight: 800, textDecoration: 'none' }}>+ New booking</a>
              </div>

              {orders.length === 0 ? (
                <EmptyState title="No bookings yet" text="Book your first diagnostic test or health package with TG Labs." action="Book a test" href="/booking" />
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {orders.map((order) => (
                    <article key={order.id} style={rowStyle}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: 16 }}>{order.orderNumber}</strong>
                          <StatusBadge text={order.status} />
                          <StatusBadge text={order.paymentStatus} soft />
                        </div>
                        <p style={{ margin: '8px 0 4px', color: '#334155' }}>
                          {[...order.packages, ...order.tests].slice(0, 3).join(' • ') || 'Diagnostic booking'}
                        </p>
                        <small style={{ color: '#64748b' }}>{readableDate(order.collectionDate)} • {order.slot} • {order.mode === 'HOME' ? 'Home collection' : 'Centre visit'}</small>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ fontSize: 20 }}>₹{order.total.toLocaleString('en-IN')}</strong>
                        <div style={{ marginTop: 6, color: '#64748b', fontSize: 13 }}>{order.workflowStatus.replaceAll('_', ' ')}</div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section style={panelStyle}>
              <div style={sectionHeaderStyle}>
                <div>
                  <p style={eyebrowStyle}>REPORTS</p>
                  <h2 style={{ margin: '4px 0 0' }}>Diagnostic reports</h2>
                </div>
              </div>

              {reports.length === 0 ? (
                <EmptyState title="No reports available yet" text="Your completed diagnostic reports will appear here automatically." />
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {reports.map((report) => (
                    <article key={report.id} style={rowStyle}>
                      <div>
                        <strong>{report.name}</strong>
                        <p style={{ margin: '6px 0', color: '#64748b', fontSize: 14 }}>{report.orderNumber} • {[...report.packages, ...report.tests].slice(0, 3).join(' • ')}</p>
                        <StatusBadge text={report.status} />
                      </div>
                      {report.downloadUrl ? (
                        <a href={report.downloadUrl} target="_blank" rel="noreferrer" style={primaryButton}>View report</a>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: 14 }}>Processing</span>
                      )}
                    </article>
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

function StatCard({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <article style={{ ...panelStyle, padding: 20 }}>
      <p style={{ margin: 0, color: '#64748b', fontWeight: 700 }}>{label}</p>
      <strong style={{ display: 'block', fontSize: 34, margin: '8px 0 2px' }}>{value}</strong>
      <small style={{ color: '#94a3b8' }}>{helper}</small>
    </article>
  );
}

function StatusBadge({ text, soft = false }: { text: string; soft?: boolean }) {
  return (
    <span style={{ display: 'inline-block', padding: '5px 9px', borderRadius: 999, background: soft ? '#f1f5f9' : '#e7f7f3', color: soft ? '#475569' : '#087f6b', fontSize: 11, fontWeight: 800 }}>
      {text.replaceAll('_', ' ')}
    </span>
  );
}

function EmptyState({ title, text, action, href }: { title: string; text: string; action?: string; href?: string }) {
  return (
    <div style={{ padding: '30px 18px', textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: 16, background: '#fbfefd' }}>
      <strong style={{ display: 'block', fontSize: 18 }}>{title}</strong>
      <p style={{ color: '#64748b', margin: '8px auto 16px', maxWidth: 520 }}>{text}</p>
      {action && href ? <a href={href} style={primaryButton}>{action}</a> : null}
    </div>
  );
}

const panelStyle = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 20,
  padding: 22,
  boxShadow: '0 12px 35px rgba(15, 23, 42, 0.05)',
} as const;

const rowStyle = {
  display: 'flex',
  gap: 18,
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  padding: 18,
  border: '1px solid #e2e8f0',
  borderRadius: 16,
} as const;

const sectionHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  flexWrap: 'wrap',
  marginBottom: 18,
} as const;

const eyebrowStyle = {
  margin: 0,
  color: '#087f6b',
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 1.1,
} as const;

const primaryButton = {
  display: 'inline-block',
  border: 0,
  borderRadius: 12,
  padding: '11px 15px',
  background: '#087f6b',
  color: '#ffffff',
  fontWeight: 800,
  textDecoration: 'none',
  cursor: 'pointer',
  fontSize: 14,
} as const;

const secondaryButton = {
  display: 'inline-block',
  border: '1px solid #cbd5e1',
  borderRadius: 12,
  padding: '10px 14px',
  background: '#ffffff',
  color: '#334155',
  fontWeight: 800,
  textDecoration: 'none',
  cursor: 'pointer',
  fontSize: 14,
} as const;
