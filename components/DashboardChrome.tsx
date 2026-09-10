'use client';

import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import BrandLogo from '@/components/BrandLogo';
import { getFirebaseAuth } from '@/lib/firebase';
import '@/app/dashboard-shell.css';
import '@/app/dashboard-insights.css';

type Role = 'patient' | 'technician' | 'admin';
type Item = { label: string; href: string; icon: string };
type Quick = { label: string; href: string; icon: string; note: string };

const NAV: Record<Role, Item[]> = {
  patient: [
    {label:'Dashboard',href:'/patient',icon:'⌂'},
    {label:'My Bookings',href:'/patient#bookings',icon:'▣'},
    {label:'Reports',href:'/patient#reports',icon:'▤'},
    {label:'Addresses',href:'/patient#addresses',icon:'●'},
    {label:'My Profile',href:'/patient#profile',icon:'●'},
    {label:'Family Members',href:'/patient#family',icon:'♟'},
    {label:'Health Records',href:'/patient#records',icon:'▥'},
    {label:'Offers & Packages',href:'/packages',icon:'◉'},
    {label:'Support',href:'/contact-us',icon:'◌'},
  ],
  technician: [
    {label:'Dashboard',href:'/technician',icon:'⌂'},
    {label:"Today's Assignments",href:'/technician#assignments',icon:'▣'},
    {label:'Scan & Collect',href:'/technician#scan',icon:'⌗'},
    {label:'My Visits',href:'/technician#visits',icon:'●'},
    {label:'Update Status',href:'/technician#status',icon:'↻'},
    {label:'Sample Handover',href:'/technician#handover',icon:'⬡'},
    {label:'Reports',href:'/technician#reports',icon:'▤'},
    {label:'Messages',href:'/technician#messages',icon:'▢'},
    {label:'My Profile',href:'/technician#profile',icon:'●'},
    {label:'Change PIN',href:'/technician/change-pin',icon:'⚿'},
    {label:'Support',href:'/contact-us',icon:'◌'},
  ],
  admin: [
    {label:'Dashboard',href:'/admin',icon:'⌂'},
    {label:'Bookings',href:'/admin/bookings',icon:'▣'},
    {label:'Patients',href:'/admin#patients',icon:'●'},
    {label:'Technicians',href:'/admin/technicians',icon:'♟'},
    {label:'Catalog & Tests',href:'/admin/partner-catalog',icon:'▤'},
    {label:'Partners',href:'/admin/partner-catalog',icon:'⌘'},
    {label:'Offers & Packages',href:'/admin/partner-catalog',icon:'◉'},
    {label:'Payments',href:'/admin#payments',icon:'▱'},
    {label:'Reports & Analytics',href:'/admin#analytics',icon:'▥'},
    {label:'Notifications',href:'/admin#notifications',icon:'◧'},
    {label:'Users & Roles',href:'/admin#users',icon:'♟'},
    {label:'Settings',href:'/admin#settings',icon:'⚙'},
    {label:'Audit Logs',href:'/admin/audit',icon:'◉'},
    {label:'Support',href:'/contact-us',icon:'◌'},
  ],
};

const QUICK: Record<Role, Quick[]> = {
  patient: [
    {label:'Book a New Test',href:'/tests',icon:'⚕',note:'Search tests, packages & health conditions'},
    {label:'View Reports',href:'/patient#reports',icon:'▤',note:'Open and download diagnostic reports'},
    {label:'Manage Family',href:'/patient#family',icon:'♟',note:'Keep family health in one account'},
    {label:'Manage Addresses',href:'/patient#addresses',icon:'⌖',note:'Save locations for home collection'},
  ],
  technician: [
    {label:"Today's Assignments",href:'/technician#assignments',icon:'▣',note:'Review scheduled collections'},
    {label:'Scan & Collect',href:'/technician#scan',icon:'⌗',note:'Sample collection workflow'},
    {label:'Update Status',href:'/technician#status',icon:'↻',note:'Keep patient and operations updated'},
    {label:'Navigate',href:'/technician#assignments',icon:'⌖',note:'Open patient address in Maps'},
  ],
  admin: [
    {label:'Bookings',href:'/admin/bookings',icon:'▣',note:'View and manage diagnostic bookings'},
    {label:'Catalog & Tests',href:'/admin/partner-catalog',icon:'▤',note:'Maintain tests, packages and partner offers'},
    {label:'Technicians',href:'/admin/technicians',icon:'♟',note:'Manage field collection operations'},
    {label:'Reports & Audit',href:'/admin/audit',icon:'▥',note:'Review activity and operational history'},
  ],
};

export default function DashboardChrome({ role, children }: { role: Role; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  if ((role === 'admin' && pathname === '/admin/login') || (role === 'technician' && pathname === '/technician/login')) return <>{children}</>;
  const title = role === 'admin' ? 'Admin' : role === 'technician' ? 'Field Technician' : 'Patient';
  const initials = role === 'admin' ? 'A' : role === 'technician' ? 'FT' : 'TG';
  const isRoot = pathname === `/${role}`;
  const today = new Intl.DateTimeFormat('en-IN',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}).format(new Date());
  const welcome = role === 'admin' ? 'Welcome Admin!' : role === 'technician' ? 'Collection operations, organised for today.' : 'Welcome back to your health dashboard.';
  const subtitle = role === 'admin' ? 'Complete visibility across bookings, partners, technicians and reports.' : role === 'technician' ? 'Manage assignments, sample collection and handover from one secure workspace.' : 'Book tests, track collections, manage family health and access reports in one place.';

  async function logout() {
    try {
      if (role === 'admin') await fetch('/api/admin/session', { method: 'DELETE' });
      try { await signOut(getFirebaseAuth()); } catch {}
    } finally {
      router.replace(role === 'admin' ? '/admin/login' : role === 'technician' ? '/technician/login' : '/auth');
      router.refresh();
    }
  }

  return <div className="dashShell">
    <header className="dashTop">
      <a href="/" className="dashBrand"><BrandLogo priority /></a>
      <div className="dashSearch"><span>⌕</span><input aria-label="Dashboard search" placeholder={role === 'admin' ? 'Search patients, bookings, tests, partners, technicians…' : role === 'technician' ? 'Search by patient name, booking ID or phone number…' : 'Search tests, packages or health conditions…'} /></div>
      <div className="dashProfile"><div className="dashBell">♧<b>{role === 'admin' ? '5' : role === 'technician' ? '3' : '2'}</b></div><div className="dashAvatar">{initials}</div><div className="dashWho"><strong>{title}</strong><small>{role === 'admin' ? 'Super Admin' : role === 'technician' ? 'Collection Operations' : 'My TG Labs'}</small></div></div>
    </header>
    <div className="dashFrame">
      <aside className="dashSide"><nav>{NAV[role].map((item) => <a key={`${item.label}-${item.href}`} className={pathname === item.href ? 'active' : ''} href={item.href}><span>{item.icon}</span>{item.label}</a>)}<button className="danger" onClick={logout}><span>↪</span>Logout</button></nav><div className="dashPromo"><strong>{role === 'admin' ? 'Quality Partnerships' : role === 'technician' ? 'Quality Collection' : 'Healthier Families'}</strong><small>{role === 'admin' ? 'Healthier Communities' : role === 'technician' ? 'Every sample handled with care' : 'Better care, stronger tomorrows'}</small></div></aside>
      <div className="dashContent">
        {isRoot && <section className={`dashOverview ${role}`}>
          <div className="dashWelcome"><div><span className="dashEyebrow">TG LABS · {title.toUpperCase()} DASHBOARD</span><h1>{welcome}</h1><p>{subtitle}</p></div><div className="dashDate"><b>{today}</b><span>{role === 'admin' ? 'Monitor · Manage · Grow' : role === 'technician' ? 'Collect · Update · Complete' : 'Book · Track · Stay Healthy'}</span></div></div>
          <div className="dashQuickGrid">{QUICK[role].map((item)=><a href={item.href} key={item.label} className="dashQuick"><span>{item.icon}</span><div><b>{item.label}</b><small>{item.note}</small></div><i>→</i></a>)}</div>
        </section>}
        {children}
        <footer className="dashFooterStrip"><div><strong>{role === 'admin' ? 'Better Insights. Healthier Communities.' : role === 'technician' ? 'Every Sample Brings Hope.' : 'Your Health. Our Priority.'}</strong><span> TG Labs · Trusted Diagnostics · Healthier Tomorrow.</span></div><div className="dashPills"><b>♢ Trusted Labs</b><b>▣ Secure Platform</b><b>♡ Quality Care</b><b>▥ Better Health</b></div></footer>
      </div>
    </div>
  </div>;
}
