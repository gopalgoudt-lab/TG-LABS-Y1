'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function TechnicianChangePinPage() {
  const router = useRouter();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    if (newPin !== confirmPin) {
      setMessage('New PIN and confirmation do not match.');
      return;
    }
    setBusy(true);
    const response = await fetch('/api/technician/change-pin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPin, newPin }),
    });
    const data = await response.json();
    setBusy(false);
    if (response.status === 401 && data.error === 'Technician authentication required.') {
      router.replace('/technician/login');
      return;
    }
    if (!response.ok) {
      setMessage(data.error || 'Unable to change PIN.');
      return;
    }
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setMessage('PIN changed successfully.');
  }

  const inputStyle = { width: '100%', padding: 12, borderRadius: 10, border: '1px solid #cfded9', fontSize: 16, boxSizing: 'border-box' as const };

  return (
    <main style={{ minHeight: '100vh', background: '#f4f8f6', padding: 22, fontFamily: 'Arial,sans-serif', color: '#12352f' }}>
      <div style={{ maxWidth: 520, margin: '40px auto', background: '#fff', border: '1px solid #dfe9e5', borderRadius: 16, padding: 24, boxShadow: '0 8px 24px rgba(12,71,61,.05)' }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: '#087f6f' }}>TG LABS • TECHNICIAN PORTAL</div>
        <h1>Change PIN</h1>
        <p style={{ color: '#657973' }}>Use a private 4–6 digit PIN. Your PIN is stored only as a secure hash.</p>
        <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
          <label>Current PIN<input aria-label="Current PIN" type="password" inputMode="numeric" pattern="[0-9]{4,6}" value={currentPin} onChange={e => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 6))} required style={inputStyle} /></label>
          <label>New PIN<input aria-label="New PIN" type="password" inputMode="numeric" pattern="[0-9]{4,6}" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))} required style={inputStyle} /></label>
          <label>Confirm new PIN<input aria-label="Confirm new PIN" type="password" inputMode="numeric" pattern="[0-9]{4,6}" value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))} required style={inputStyle} /></label>
          {message && <div role="status" style={{ padding: 12, borderRadius: 10, background: '#f0f7f5' }}>{message}</div>}
          <button disabled={busy} type="submit" style={{ border: 0, borderRadius: 10, padding: '12px 14px', background: '#087f6f', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>{busy ? 'Updating…' : 'Change PIN'}</button>
          <Link href="/technician" style={{ textAlign: 'center', color: '#087f6f', fontWeight: 700 }}>Back to jobs</Link>
        </form>
      </div>
    </main>
  );
}
