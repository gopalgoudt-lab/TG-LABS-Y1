import type { ReactNode } from 'react';

export type DashboardQuickActionProps = { href: string; label: string; note: string; icon?: ReactNode };

export function DashboardQuickAction({ href, label, note, icon }: DashboardQuickActionProps) {
  return <a className="tgDashAction" href={href}>{icon ? <span className="tgDashActionIcon" aria-hidden="true">{icon}</span> : null}<span className="tgDashActionBody"><strong>{label}</strong><small>{note}</small></span><i className="tgDashActionArrow" aria-hidden="true">→</i></a>;
}
