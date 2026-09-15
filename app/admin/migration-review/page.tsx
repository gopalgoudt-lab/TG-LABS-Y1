import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Migration Review | TG Labs', robots: { index: false, follow: false } };

export default async function MigrationReviewPage() {
  if (process.env.VERCEL_ENV !== 'preview') redirect('/');

  const bookings = await prisma.booking.findMany({
    where: { idempotencyKey: { startsWith: 'legacy:tglabsliv:' } },
    include: { patient: true },
    orderBy: { collectionDate: 'desc' },
    take: 100,
  });

  return <main style={{maxWidth:1200,margin:'0 auto',padding:24,fontFamily:'Arial,sans-serif'}}>
    <h1>Legacy Migration Review</h1>
    <p>Staging/Preview only. Production access is disabled. Migrated records: {bookings.length}</p>
    <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}>
      <thead><tr>{['Legacy booking','Patient','Phone','Collection date','Status','Workflow','Payment','Amount'].map(h=><th key={h} style={{textAlign:'left',padding:8,borderBottom:'1px solid #ccc'}}>{h}</th>)}</tr></thead>
      <tbody>{bookings.map(b=><tr key={b.id}>
        <td style={{padding:8,borderBottom:'1px solid #eee'}}>{b.id}</td>
        <td style={{padding:8,borderBottom:'1px solid #eee'}}>{b.patient.name}</td>
        <td style={{padding:8,borderBottom:'1px solid #eee'}}>{b.patient.phone.replace(/.(?=.{4})/g,'•')}</td>
        <td style={{padding:8,borderBottom:'1px solid #eee'}}>{b.collectionDate.toISOString().slice(0,10)}</td>
        <td style={{padding:8,borderBottom:'1px solid #eee'}}>{b.status}</td>
        <td style={{padding:8,borderBottom:'1px solid #eee'}}>{b.workflowStatus}</td>
        <td style={{padding:8,borderBottom:'1px solid #eee'}}>{b.paymentStatus}</td>
        <td style={{padding:8,borderBottom:'1px solid #eee'}}>₹{b.totalAmount}</td>
      </tr>)}</tbody>
    </table></div>
  </main>;
}
