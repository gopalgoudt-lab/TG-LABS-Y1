'use client';

import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { auth } from '../../lib/firebase';

type Booking = {
  id: string;
  orderNumber: string;
  state: string;
  paymentStatus: string;
  total: number;
  collectionDate?: string;
  slot?: string;
};

type Report = {
  id: string;
  name: string;
  status: string;
  publishedAt?: string | null;
};

export default function PatientPage() {
  const router = useRouter();
  const [data, setData] = useState<{ orders: Booking[]; reports: Report[] }>({ orders: [], reports: [] });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        router.replace('/auth');
        return;
      }

      setPhone(user.phoneNumber || '');

      try {
        const token = await user.getIdToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [bookingsResponse, reportsResponse] = await Promise.all([
          fetch('/api/patient/bookings', { headers, cache: 'no-store' }),
          fetch('/api/patient/reports', { headers, cache: 'no-store' }),
        ]);

        if (!bookingsResponse.ok || !reportsResponse.ok) {
          throw new Error('Unable to load your patient dashboard. Please sign in again.');
        }

        const bookings = await bookingsResponse.json();
        const reports = await reportsResponse.json();
        setData({ orders: bookings.orders || [], reports: reports.reports || [] });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to load your dashboard.');
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [router]);

  async function logout() {
    await signOut(auth);
    router.replace('/auth');
  }

  if (loading) {
    return <main className="dashboard"><h1>My TG Labs</h1><p>Loading your patient dashboard…</p></main>;
  }

  return (
    <main className="dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
        <div>
          <h1>My TG Labs</h1>
          {phone && <p>Signed in as {phone}</p>}
        </div>
        <button className="btn" onClick={logout}>Sign out</button>
      </div>

      {error && <p className="error">{error}</p>}

      <section className="cards">
        <article><b>{data.orders.length}</b><span>Bookings</span></article>
        <article><b>{data.reports.length}</b><span>Reports</span></article>
      </section>

      <h2>Recent bookings</h2>
      {data.orders.length === 0 && <p>No bookings found for this mobile number yet.</p>}
      {data.orders.map((o) => (
        <div className="row" key={o.id}>
          <div>
            <strong>Booking {o.orderNumber}</strong>
            <small>{o.state} · {o.paymentStatus}</small>
          </div>
          <b>₹{o.total}</b>
        </div>
      ))}

      <h2>Reports</h2>
      {data.reports.length === 0 && <p>No reports are available yet.</p>}
      {data.reports.map((r) => (
        <div className="row" key={r.id}>
          <div>
            <strong>{r.name}</strong>
            <small>{r.status}</small>
          </div>
          <span>{r.publishedAt ? 'Ready' : 'Processing'}</span>
        </div>
      ))}
    </main>
  );
}
