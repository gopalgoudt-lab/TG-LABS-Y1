'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function TechnicianPinShortcut() {
  const pathname = usePathname();
  if (pathname === '/technician/login' || pathname === '/technician/change-pin') return null;
  return (
    <Link
      href="/technician/change-pin"
      style={{
        position: 'fixed',
        right: 18,
        bottom: 18,
        zIndex: 50,
        textDecoration: 'none',
        borderRadius: 999,
        padding: '11px 16px',
        background: '#17463d',
        color: '#fff',
        fontWeight: 800,
        boxShadow: '0 8px 24px rgba(12,71,61,.18)',
      }}
    >
      Change PIN
    </Link>
  );
}
