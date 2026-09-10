import type { ReactNode } from 'react';
import TechnicianPinShortcut from '@/components/TechnicianPinShortcut';
import DashboardChrome from '@/components/DashboardChrome';

export default function TechnicianLayout({ children }: { children: ReactNode }) {
  return <DashboardChrome role="technician">{children}<TechnicianPinShortcut /></DashboardChrome>;
}
