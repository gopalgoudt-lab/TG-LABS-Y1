import Link from 'next/link';

const required = [
  ['META_APP_ID', process.env.META_APP_ID],
  ['META_EMBEDDED_SIGNUP_CONFIG_ID', process.env.META_EMBEDDED_SIGNUP_CONFIG_ID],
  ['WHATSAPP_ACCESS_TOKEN', process.env.WHATSAPP_ACCESS_TOKEN],
  ['WHATSAPP_PHONE_NUMBER_ID', process.env.WHATSAPP_PHONE_NUMBER_ID],
  ['WHATSAPP_VERIFY_TOKEN', process.env.WHATSAPP_VERIFY_TOKEN],
] as const;

export default function WhatsAppCoexistencePage() {
  const checks = required.map(([name, value]) => ({ name, configured: Boolean(value) }));
  const ready = checks.every(x => x.configured);
  return (
    <main style={{maxWidth:900,margin:'0 auto',padding:24,fontFamily:'Arial, sans-serif'}}>
      <Link href="/admin">← Admin</Link>
      <h1>WhatsApp Coexistence Readiness</h1>
      <p>This page is a read-only readiness gate. It does not start Embedded Signup, register a number, exchange tokens, or trigger SMB App Data synchronization.</p>
      <div style={{border:'1px solid #dfe9e5',borderRadius:14,padding:18,background:'#fff'}}>
        <h2>Configuration checks</h2>
        {checks.map(x => <div key={x.name} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid #edf2f0'}}>
          <code>{x.name}</code><strong>{x.configured ? 'Configured' : 'Missing'}</strong>
        </div>)}
      </div>
      <div style={{marginTop:16,padding:16,borderRadius:12,background:ready?'#eef9f4':'#fff7e8'}}>
        <strong>{ready ? 'Base configuration present.' : 'Not ready to start onboarding.'}</strong>
        <div style={{marginTop:6}}>Existing WhatsApp Business App registration must remain intact. Production onboarding stays disabled until Preview validation and the post-onboarding data-sync procedure are ready.</div>
      </div>
    </main>
  );
}
