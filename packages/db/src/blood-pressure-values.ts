/** Technical representation only; never clinical plausibility or eligibility. */
export type BpField = 'systolic' | 'diastolic' | 'unit' | 'measuredAt' | '$';
export type BpFieldError = Readonly<{ field: BpField; reason: 'required' | 'type' | 'integer' | 'representation' | 'format' | 'precision' | 'future' | 'unknown_fields' }>;
export class BloodPressureError extends Error {
  constructor(public readonly code: 'BP_MEASUREMENT_INVALID' | 'BP_UNAUTHENTICATED' | 'BP_NOT_FOUND' | 'BP_SERVICE_UNAVAILABLE', public readonly fields: readonly BpFieldError[] = []) { super(code); }
}
export function bpInvalid(field: BpField, reason: BpFieldError['reason']): never { throw new BloodPressureError('BP_MEASUREMENT_INVALID', [{ field, reason }]); }
export function exactBpKeys(value: unknown, keys: readonly string[]): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) bpInvalid('$', 'type');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(value).some(key => typeof key !== 'string' || !keys.includes(key))) bpInvalid('$', 'unknown_fields');
  for (const key of keys) {
    if (!Object.hasOwn(descriptors, key)) bpInvalid('$', 'required');
    if (!('value' in descriptors[key])) bpInvalid('$', 'type');
  }
}
export function bpInteger(value: unknown, field: 'systolic' | 'diastolic'): number {
  if (typeof value !== 'number') bpInvalid(field, 'type');
  if (!Number.isInteger(value) || !Number.isFinite(value)) bpInvalid(field, 'integer');
  if (Object.is(value, -0) || value < -2147483648 || value > 2147483647) bpInvalid(field, 'representation');
  return value;
}
export function bpTimestamp(value: unknown): Date {
  if (typeof value !== 'string') bpInvalid('measuredAt', 'type');
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!m || m[0] !== value || m[8] === '-00:00') bpInvalid('measuredAt', 'format');
  const [year, month, day, hour, minute, second] = m.slice(1, 7).map(Number);
  const days = [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1] || hour > 23 || minute > 59 || second > 59
    || (m[8] !== 'Z' && (Number(m[8].slice(1, 3)) > 23 || Number(m[8].slice(4)) > 59))) bpInvalid('measuredAt', 'format');
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) bpInvalid('measuredAt', 'format');
  return date;
}
export function validateBpValues(input: Record<string, unknown>) {
  const systolic = bpInteger(input.systolic, 'systolic'), diastolic = bpInteger(input.diastolic, 'diastolic');
  if (input.unit !== 'mmHg') bpInvalid('unit', 'format');
  return { systolic, diastolic, unit: 'mmHg' as const, measuredAt: bpTimestamp(input.measuredAt) };
}
