export type DashboardStateKind = 'loading' | 'empty' | 'error';
export type DashboardStateProps = { state: DashboardStateKind; title: string; message: string };

export function DashboardState({ state, title, message }: DashboardStateProps) {
  return <section className={`tgDashState tgDashState-${state}`} role={state === 'error' ? 'alert' : 'status'} aria-live="polite"><span className="tgDashStateLabel">{state}</span><h3>{title}</h3><p>{message}</p></section>;
}
