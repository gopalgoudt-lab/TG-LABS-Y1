import type { ReactNode } from 'react';
import DashboardChrome from '@/components/DashboardChrome';

export default function PatientLayout({ children }: { children: ReactNode }) {
  return <DashboardChrome role="patient">{children}</DashboardChrome>;
}
