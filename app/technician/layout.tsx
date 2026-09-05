import type { ReactNode } from 'react';
import TechnicianPinShortcut from '@/components/TechnicianPinShortcut';

export default function TechnicianLayout({ children }: { children: ReactNode }) {
  return <>{children}<TechnicianPinShortcut /></>;
}
