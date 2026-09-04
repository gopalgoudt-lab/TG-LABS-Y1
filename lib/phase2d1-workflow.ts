export const TECHNICIAN_WORKFLOW = [
  'TECHNICIAN_ASSIGNED',
  'TECHNICIAN_ACCEPTED',
  'ON_THE_WAY',
  'REACHED_PATIENT',
  'SAMPLE_COLLECTED',
  'SAMPLE_RECEIVED_AT_LAB',
] as const;

export type TechnicianWorkflowStatus = (typeof TECHNICIAN_WORKFLOW)[number];

const index = new Map<string, number>(TECHNICIAN_WORKFLOW.map((status, position) => [status, position]));

export function isTechnicianWorkflowStatus(value: string): value is TechnicianWorkflowStatus {
  return index.has(value);
}

export function canTechnicianTransition(from: string, to: TechnicianWorkflowStatus) {
  if (from === to) return true;
  const fromIndex = index.get(from);
  const toIndex = index.get(to);
  if (fromIndex === undefined || toIndex === undefined) return false;
  return toIndex === fromIndex + 1;
}

export function canChangeTechnicianAssignment(workflowStatus: string) {
  return workflowStatus === 'BOOKING_CREATED' || workflowStatus === 'BOOKING_CONFIRMED' || workflowStatus === 'TECHNICIAN_ASSIGNED';
}

export function technicianTimestamp(status: TechnicianWorkflowStatus, now: Date) {
  switch (status) {
    case 'TECHNICIAN_ACCEPTED': return { technicianAcceptedAt: now };
    case 'ON_THE_WAY': return { technicianOnTheWayAt: now };
    case 'REACHED_PATIENT': return { technicianReachedAt: now };
    case 'SAMPLE_COLLECTED': return { sampleCollectedAt: now };
    case 'SAMPLE_RECEIVED_AT_LAB': return { sampleReceivedAt: now };
    default: return {};
  }
}
