'use client';

import { usePathname,useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';

export default function AdminLayout({children}:{children:React.ReactNode}){
 const pathname=usePathname(),router=useRouter();
 if(pathname==='/admin/login')return <>{children}</>;
 async function logout(){try{await fetch('/api/admin/session',{method:'DELETE'});try{await signOut(getFirebaseAuth())}catch{}}finally{router.replace('/admin/login');router.refresh()}}
 return <><div style={{position:'sticky',top:0,zIndex:50,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap',padding:'10px 18px',background:'#102f29',color:'#fff',fontFamily:'Arial,sans-serif',boxShadow:'0 5px 20px rgba(0,0,0,.12)'}}><div style={{fontWeight:900}}>TG Labs • Secure Admin</div><nav style={{display:'flex',gap:13,alignItems:'center',flexWrap:'wrap'}}><a href="/admin" style={link}>Dashboard</a><a href="/admin/bookings" style={link}>Bookings</a><a href="/admin/operations" style={link}>Operations</a><a href="/admin/technicians" style={link}>Technicians</a><a href="/admin/audit" style={link}>Audit Log</a><a href="/manual" style={link}>Thyrocare Manual</a><button onClick={logout} style={{padding:'7px 10px',borderRadius:9,border:'1px solid #64817a',background:'#fff',color:'#102f29',fontWeight:900,cursor:'pointer'}}>Sign out</button></nav></div>{children}</>
}
const link={color:'#fff',fontWeight:800,textDecoration:'none',fontSize:13} as const;
