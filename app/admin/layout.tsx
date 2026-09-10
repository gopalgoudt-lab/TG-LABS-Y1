import DashboardChrome from '@/components/DashboardChrome';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <DashboardChrome role="admin">{children}</DashboardChrome>;
}
