import type { Session } from './api/contracts';

/** Labels for the approved fictional fixtures only. Never change identity or clinical text. */
const names: Readonly<Record<string, string>> = {
  'eh-m1-patient-a@example.invalid': 'Demo patient A',
  'eh-m1-patient-b@example.invalid': 'Demo patient B',
  'eh-m1-clinician-assigned@example.invalid': 'Demo doctor A',
  'eh-m1-clinician-unassigned@example.invalid': 'Demo doctor B',
  'eh-m1-admin@example.invalid': 'Demo administrator',
  'Synthetic Demo Patient A': 'Demo patient A',
  'Synthetic Demo Patient B': 'Demo patient B',
  'Synthetic Staging Doctor': 'Demo doctor A',
  'Synthetic Staging Clinic': 'Demonstration clinic',
  'Synthetic Staging General': 'Demonstration specialty',
  'Synthetic City': 'Demonstration location',
  'Synthetic staging address': 'Demo clinic location',
};
export const presentationName = (name: string, translate: (value: string) => string = value => value): string =>
  Object.hasOwn(names, name) ? translate(names[name]) : name;
export const accountName = (session: Session, translate?: (value: string) => string): string =>
  session.mode === 'live' ? presentationName(session.name, translate) : session.name;

/** Only the appointment rows actually loaded; never infer completion or clinical authority. */
export function visitPriority<T extends { state: string; startAt: string }>(rows: readonly T[]): T[] {
  const rank = (state: string) => state === 'IN_CONSULTATION' ? 0 : state === 'BOOKED' ? 1 : 2;
  return [...rows].sort((a, b) => rank(a.state) - rank(b.state) ||
    (rank(a.state) < 2 ? Date.parse(a.startAt) - Date.parse(b.startAt) : Date.parse(b.startAt) - Date.parse(a.startAt)));
}
