'use client';

import { useEffect, useMemo, useState } from 'react';

type Booking = {
  id: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  collectionDate: string;
  patient?: { name?: string };
  items?: { test?: { name?: string; diagnosticPartner?: string | null } }[];
};

type Test = { id: string; name: string };
type Pack = { id: string; name: string };
type LoadState = 'loading' | 'ready' | 'unavailable';

const panel: React.CSSProperties = { background: '#fff', border: '1px solid #dfe9e5', borderRadius: 18, padding: 20, boxShadow: '0 8px 28px rgba(12,71,61,.06)' };
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 };

function dayKey(value: string | Date) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function money(value: number) {
  return `₹${Math.round(value || 0).toLocaleString('en-IN')}`;
}

function pct(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function startOfDayOffset(daysAgo: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

export default function AdminAnalyticsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [packages, setPackages] = useState<Pack[]>([]);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/bookings', { cache: 'no-store' }),
      fetch('/api/admin/catalog/tests', { cache: 'no-store' }),
      fetch('/api/admin/catalog/packages', { cache: 'no-store' }),
    ])
      .then(async ([b, t, p]) => {
        if (!b.ok || !t.ok || !p.ok) {
          setState('unavailable');
          return;
        }
        setBookings((await b.json()).bookings || []);
        setTests((await t.json()).tests || []);
        setPackages((await p.json()).packages || []);
        setState('ready');
      })
      .catch(() => setState('unavailable'));
  }, []);

  const metrics = useMemo(() => {
    const paid = bookings.filter((b) => b.paymentStatus === 'PAID');
    const completed = bookings.filter((b) => ['COMPLETED', 'REPORT_DELIVERED'].includes(b.status));
    const cancelled = bookings.filter((b) => b.status === 'CANCELLED');
    const revenue = paid.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const averageOrderValue = paid.length ? revenue / paid.length : 0;
    const today = dayKey(new Date());
    const todayBookings = bookings.filter((b) => dayKey(b.collectionDate) === today);

    const sevenDayStart = startOfDayOffset(6);
    const previousSevenStart = startOfDayOffset(13);
    const previousSevenEnd = startOfDayOffset(7);
    previousSevenEnd.setHours(23, 59, 59, 999);

    const last7 = bookings.filter((b) => new Date(b.collectionDate) >= sevenDayStart);
    const previous7 = bookings.filter((b) => {
      const d = new Date(b.collectionDate);
      return d >= previousSevenStart && d <= previousSevenEnd;
    });
    const last7Revenue = last7.filter((b) => b.paymentStatus === 'PAID').reduce((s, b) => s + (b.totalAmount || 0), 0);
    const previous7Revenue = previous7.filter((b) => b.paymentStatus === 'PAID').reduce((s, b) => s + (b.totalAmount || 0), 0);

    const partnerMap = new Map<string, number>();
    const testMap = new Map<string, number>();
    bookings.forEach((b) => b.items?.forEach((item) => {
      const partner = item.test?.diagnosticPartner || 'TG Labs';
      const test = item.test?.name;
      partnerMap.set(partner, (partnerMap.get(partner) || 0) + 1);
      if (test) testMap.set(test, (testMap.get(test) || 0) + 1);
    }));

    const daily = Array.from({ length: 7 }, (_, index) => {
      const d = startOfDayOffset(6 - index);
      const key = dayKey(d);
      const rows = bookings.filter((b) => dayKey(b.collectionDate) === key);
      const paidValue = rows.filter((b) => b.paymentStatus === 'PAID').reduce((s, b) => s + (b.totalAmount || 0), 0);
      return { key, label: d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit' }), bookings: rows.length, revenue: paidValue };
    });

    return {
      paid,
      completed,
      cancelled,
      revenue,
      averageOrderValue,
      todayBookings,
      last7,
      previous7,
      last7Revenue,
      previous7Revenue,
      partners: [...partnerMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
      topTests: [...testMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
      daily,
    };
  }, [bookings]);

  const maxDaily = Math.max(1, ...metrics.daily.map((d) => d.bookings));
  const bookingDelta = metrics.previous7.length ? Math.round(((metrics.last7.length - metrics.previous7.length) / metrics.previous7.length) * 100) : metrics.last7.length ? 100 : 0;
  const revenueDelta = metrics.previous7Revenue ? Math.round(((metrics.last7Revenue - metrics.previous7Revenue) / metrics.previous7Revenue) * 100) : metrics.last7Revenue ? 100 : 0;
  const value = (v: React.ReactNode) => state === 'ready' ? v : '—';

  return <main style={{ padding: '28px', background: '#f4f8f6', minHeight: '100vh', color: '#12352f' }}>
    <div style={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gap: 20 }}>
      <section style={{ ...panel, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 900, color: '#087f6f', letterSpacing: 1.2 }}>TG LABS · PHASE 4H</div>
          <h1 style={{ margin: '6px 0 8px', fontSize: 30 }}>Reports & Business Intelligence</h1>
          <p style={{ margin: 0, color: '#60746f' }}>Read-only operational KPIs derived from the existing booking and catalog APIs. No data is modified from this screen.</p>
        </div>
        <a href="/admin" style={{ color: '#087f6f', fontWeight: 800 }}>← Admin dashboard</a>
      </section>

      {state === 'unavailable' && <section style={{ ...panel, borderColor: '#efcaca', color: '#8a2d2d' }}><b>Analytics data could not be loaded.</b> Sign in with an authorized TG Labs admin session and retry.</section>}

      <section style={grid}>
        <Kpi label="Total bookings" value={value(bookings.length)} />
        <Kpi label="Paid revenue" value={value(money(metrics.revenue))} />
        <Kpi label="Average order value" value={value(money(metrics.averageOrderValue))} />
        <Kpi label="Payment conversion" value={value(`${pct(metrics.paid.length, bookings.length)}%`)} />
        <Kpi label="Completion rate" value={value(`${pct(metrics.completed.length, bookings.length)}%`)} />
        <Kpi label="Cancellation rate" value={value(`${pct(metrics.cancelled.length, bookings.length)}%`)} />
        <Kpi label="Today's bookings" value={value(metrics.todayBookings.length)} />
        <Kpi label="Catalog size" value={value(`${tests.length} tests · ${packages.length} packages`)} small />
      </section>

      <section style={{ ...grid, gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' }}>
        <article style={panel}>
          <h2 style={{ marginTop: 0 }}>7-day performance</h2>
          <MetricRow label="Bookings" value={value(metrics.last7.length)} note={state === 'ready' ? `${bookingDelta >= 0 ? '+' : ''}${bookingDelta}% vs previous 7 days` : ''} />
          <MetricRow label="Paid revenue" value={value(money(metrics.last7Revenue))} note={state === 'ready' ? `${revenueDelta >= 0 ? '+' : ''}${revenueDelta}% vs previous 7 days` : ''} />
          <MetricRow label="Paid bookings" value={value(metrics.last7.filter((b) => b.paymentStatus === 'PAID').length)} note="Current 7-day window" />
        </article>

        <article style={panel}>
          <h2 style={{ marginTop: 0 }}>Payment mix</h2>
          <Progress label="Paid" value={metrics.paid.length} total={bookings.length} />
          <Progress label="Pending / unpaid" value={Math.max(0, bookings.length - metrics.paid.length)} total={bookings.length} />
        </article>

        <article style={panel}>
          <h2 style={{ marginTop: 0 }}>Booking outcomes</h2>
          <Progress label="Completed" value={metrics.completed.length} total={bookings.length} />
          <Progress label="Cancelled" value={metrics.cancelled.length} total={bookings.length} />
          <Progress label="In progress" value={Math.max(0, bookings.length - metrics.completed.length - metrics.cancelled.length)} total={bookings.length} />
        </article>
      </section>

      <section style={panel}>
        <h2 style={{ marginTop: 0 }}>Last 7 days — booking trend</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(70px,1fr))', gap: 10, alignItems: 'end', minHeight: 220, overflowX: 'auto' }}>
          {metrics.daily.map((d) => <div key={d.key} style={{ minWidth: 70, display: 'grid', gap: 8, alignItems: 'end' }}>
            <div title={`${d.bookings} bookings · ${money(d.revenue)}`} style={{ height: `${Math.max(8, Math.round((d.bookings / maxDaily) * 150))}px`, background: '#d7efe8', border: '1px solid #9fd1c5', borderRadius: 10, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 7, fontWeight: 900, color: '#087f6f' }}>{d.bookings}</div>
            <small style={{ textAlign: 'center', color: '#60746f' }}>{d.label}</small>
          </div>)}
        </div>
      </section>

      <section style={{ ...grid, gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))' }}>
        <RankPanel title="Top tests by booked items" rows={metrics.topTests} empty="No booking data yet." />
        <RankPanel title="Partner booking mix" rows={metrics.partners} empty="No partner booking data yet." />
      </section>
    </div>
  </main>;
}

function Kpi({ label, value, small = false }: { label: string; value: React.ReactNode; small?: boolean }) {
  return <article style={panel}><div style={{ fontSize: small ? 20 : 30, lineHeight: 1.15, fontWeight: 900, color: '#087f6f' }}>{value}</div><div style={{ marginTop: 7, color: '#687c76' }}>{label}</div></article>;
}

function MetricRow({ label, value, note }: { label: string; value: React.ReactNode; note: string }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '12px 0', borderBottom: '1px solid #edf2f0' }}><span>{label}<small style={{ display: 'block', color: '#71827d', marginTop: 3 }}>{note}</small></span><b style={{ color: '#087f6f' }}>{value}</b></div>;
}

function Progress({ label, value, total }: { label: string; value: number; total: number }) {
  const percentage = pct(value, total);
  return <div style={{ margin: '14px 0' }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>{label}</span><b>{value} ({percentage}%)</b></div><div style={{ height: 10, background: '#edf3f1', borderRadius: 999, overflow: 'hidden' }}><div style={{ height: '100%', width: `${percentage}%`, background: '#79c8b5' }} /></div></div>;
}

function RankPanel({ title, rows, empty }: { title: string; rows: [string, number][]; empty: string }) {
  return <article style={panel}><h2 style={{ marginTop: 0 }}>{title}</h2>{rows.length ? rows.map(([name, count], index) => <div key={name} style={{ display: 'grid', gridTemplateColumns: '34px 1fr auto', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #edf2f0' }}><span style={{ width: 28, height: 28, borderRadius: 999, background: '#e7f4f0', color: '#087f6f', display: 'grid', placeItems: 'center', fontWeight: 900 }}>{index + 1}</span><span>{name}</span><b>{count}</b></div>) : <div style={{ color: '#71827d' }}>{empty}</div>}</article>;
}
