import type { ReactNode } from 'react';

export type DashboardStatCardProps = { label: string; value: ReactNode; note?: string; icon?: ReactNode; trend?: string };

export function DashboardStatCard({ label, value, note, icon, trend }: DashboardStatCardProps) {
  return <article className="tgDashStat">{icon ? <span className="tgDashStatIcon" aria-hidden="true">{icon}</span> : null}<div className="tgDashStatBody"><span className="tgDashStatLabel">{label}</span><strong className="tgDashStatValue">{value}</strong>{note ? <small className="tgDashStatNote">{note}</small> : null}{trend ? <span className="tgDashStatTrend">{trend}</span> : null}</div></article>;
}
