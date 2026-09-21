import type { ReactNode } from 'react';

export type DashboardShellProps = { header: ReactNode; sidebar: ReactNode; children: ReactNode; footer?: ReactNode };

export function DashboardShell({ header, sidebar, children, footer }: DashboardShellProps) {
  return <div className="dashShell">{header}<div className="dashFrame">{sidebar}<div className="dashContent">{children}{footer}</div></div></div>;
}
