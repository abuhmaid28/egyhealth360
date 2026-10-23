import { canonicalizeEmail } from './persistence.js';

export class PatientEntryError extends Error {
  constructor(public readonly code: 'PATIENT_ENTRY_INVALID' | 'PATIENT_ENTRY_UNAUTHENTICATED' | 'PATIENT_ENTRY_NOT_FOUND' | 'PATIENT_ENTRY_UNAVAILABLE') { super(code); }
}
export const entryInvalid = (): never => { throw new PatientEntryError('PATIENT_ENTRY_INVALID'); };
export function entryKeys(value: unknown, keys: readonly string[]): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) entryInvalid();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(value as object).length !== keys.length || keys.some(k => !descriptors[k] || !('value' in descriptors[k]))) entryInvalid();
}
export function profileText(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.length || value.trim() !== value || [...value].length > max
    // Reject controls and unpaired surrogates; valid Unicode scalar names remain allowed.
    // eslint-disable-next-line no-control-regex
    || /[\u0000-\u001f\u007f-\u009f\ud800-\udfff]/u.test(value)) entryInvalid();
  return value as string;
}
export function registrationIdentity(value: unknown) {
  entryKeys(value, ['email', 'displayName']);
  if (typeof value.email !== 'string' || Buffer.byteLength(value.email, 'utf8') > 1024) entryInvalid();
  let email: string;
  try { email = canonicalizeEmail(value.email as string); } catch { return entryInvalid(); }
  return { email, displayName: profileText(value.displayName, 160) };
}
export type OwnProfile = Readonly<{ displayName: string; dateOfBirth: string | null; sex: string | null }>;
export function profileValues(value: unknown): OwnProfile {
  entryKeys(value, ['displayName', 'dateOfBirth', 'sex']);
  const displayName = profileText(value.displayName, 160);
  const sex = value.sex === null ? null : profileText(value.sex, 64);
  const date = value.dateOfBirth;
  if (date !== null && (typeof date !== 'string' || !/^(?!0000)[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)
    || !Number.isFinite(Date.parse(`${date}T00:00:00.000Z`)) || new Date(`${date}T00:00:00.000Z`).toISOString().slice(0, 10) !== date)) entryInvalid();
  return { displayName, dateOfBirth: date as string | null, sex };
}
