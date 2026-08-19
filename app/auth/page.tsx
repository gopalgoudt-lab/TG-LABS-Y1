'use client';

import { FormEvent, useState } from 'react';

export default function Auth() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const e164 = `+91${phone.replace(/\D/g, '').slice(-10)}`;

  async function sendOtp(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('');
    const res = await fetch('/api/auth/otp/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: e164 }) });
    const data = await res.json(); setBusy(false);
    if (!res.ok) return setMessage(data.error || 'Unable to send OTP');
    setSent(true); setMessage('OTP sent by SMS.');
  }

  async function verifyOtp(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('');
    const res = await fetch('/api/auth/otp/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: e164, code }) });
    const data = await res.json(); setBusy(false);
    if (!res.ok) return setMessage(data.error || 'Unable to verify OTP');
    window.location.href = data.redirect || '/patient';
  }

  return <main className="wrap" style={{padding:'70px 16px',maxWidth:520}}>
    <div className="card" style={{padding:28}}>
      <p style={{fontWeight:700,letterSpacing:1,fontSize:12}}>TG LABS SECURE LOGIN</p>
      <h1>Patient sign in</h1>
      <p>Use your mobile number to securely access bookings and reports.</p>
      {!sent ? <form onSubmit={sendOtp}>
        <label>Mobile number</label>
        <div style={{display:'flex',gap:8,margin:'8px 0 16px'}}><span className="btn" style={{cursor:'default'}}>+91</span><input required inputMode="numeric" maxLength={10} value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,''))} placeholder="10-digit mobile number" style={{flex:1,padding:14,border:'1px solid #d7dde3',borderRadius:10}} /></div>
        <button className="btn primary" disabled={busy || phone.length!==10}>{busy?'Sending…':'Send OTP'}</button>
      </form> : <form onSubmit={verifyOtp}>
        <label>OTP sent to +91 {phone}</label>
        <input required inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} placeholder="Enter OTP" style={{width:'100%',padding:14,border:'1px solid #d7dde3',borderRadius:10,margin:'8px 0 16px',boxSizing:'border-box'}} />
        <button className="btn primary" disabled={busy}>{busy?'Verifying…':'Verify & sign in'}</button>{' '}
        <button type="button" className="btn" onClick={()=>{setSent(false);setCode('');setMessage('')}}>Change number</button>
      </form>}
      {message && <p style={{marginTop:16}}>{message}</p>}
      <p style={{fontSize:12,marginTop:24}}>By continuing, you consent to receiving a one-time authentication SMS from TG Labs.</p>
    </div>
  </main>;
}
