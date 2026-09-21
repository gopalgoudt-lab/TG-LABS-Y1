export type DashboardStatus = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export type DashboardStatusBadgeProps = { status: DashboardStatus; label: string };

export function DashboardStatusBadge({ status, label }: DashboardStatusBadgeProps) {
  return <span className={`tgDashStatus tgDashStatus-${status}`} aria-label={`${label} status`}>{label}</span>;
}
