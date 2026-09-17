import type { ReactNode } from 'react';

export type DashboardPanelProps = { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string };

export function DashboardPanel({ title, subtitle, action, children, className = '' }: DashboardPanelProps) {
  return <section className={`tgDashPanel ${className}`.trim()}><header className="tgDashPanelHead"><div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div>{action}</header><div>{children}</div></section>;
}
