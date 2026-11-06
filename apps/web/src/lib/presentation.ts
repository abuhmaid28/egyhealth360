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
// Only authored directory taxonomy is localized; recorded names and clinical text stay exact.
const directoryLabels = new Set([
  'Internal medicine', 'Cardiology', 'Dermatology', 'Cairo', 'New Cairo',
]);
export const presentationName = (name: string, translate: (value: string) => string = value => value): string =>
  Object.hasOwn(names, name) ? translate(names[name]) : name;
export const directoryLabel = (value: string, translate: (value: string) => string): string =>
  directoryLabels.has(value) ? translate(value) : presentationName(value, translate);
export const timeZoneLabel = (zone: string, translate: (value: string) => string = value => value): string =>
  zone === 'Africa/Cairo' ? translate('Cairo time') : zone === 'UTC' ? translate('Coordinated Universal Time') : zone;

/** Distinguish both occurrences of a repeated wall-clock time without fixing a zone's offset. */
export function repeatedTimeOffset(value: string, zone: string): string | null {
  const instant = Date.parse(value);
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    timeZoneName: 'longOffset',
  });
  const describe = (at: number) => {
    const parts = formatter.formatToParts(new Date(at));
    const offset = parts.find(part => part.type === 'timeZoneName')!.value;
    const [hours = 0, minutes = 0, seconds = 0] = offset.slice(4).split(':').map(Number);
    return {
      clock: parts.filter(part => part.type !== 'timeZoneName').map(part => part.value).join(''),
      offset,
      milliseconds: (offset[3] === '-' ? -1 : 1) * (hours * 3600 + minutes * 60 + seconds) * 1000,
    };
  };
  const current = describe(instant);
  // Nearby offsets supply possible alternate instants, including non-hour DST changes.
  for (const distance of [-86_400_000, 86_400_000]) {
    const nearby = describe(instant + distance);
    const alternate = instant + current.milliseconds - nearby.milliseconds;
    if (alternate !== instant && describe(alternate).clock === current.clock)
      return current.offset.replace('GMT', 'UTC');
  }
  return null;
}
export const accountName = (session: Session, translate?: (value: string) => string): string =>
  session.mode === 'live' ? presentationName(session.name, translate) : session.name;

/** Only the appointment rows actually loaded; never infer completion or clinical authority. */
export function visitPriority<T extends { state: string; startAt: string }>(rows: readonly T[]): T[] {
  const rank = (state: string) => state === 'IN_CONSULTATION' ? 0 : state === 'BOOKED' ? 1 : 2;
  return [...rows].sort((a, b) => rank(a.state) - rank(b.state) ||
    (rank(a.state) < 2 ? Date.parse(a.startAt) - Date.parse(b.startAt) : Date.parse(b.startAt) - Date.parse(a.startAt)));
}
