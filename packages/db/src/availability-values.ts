import { bpTimestamp } from './blood-pressure-values.js';
export class AvailabilityError extends Error {
    constructor(public readonly code: 'AVAILABILITY_INVALID' | 'AVAILABILITY_UNAUTHENTICATED' | 'AVAILABILITY_NOT_FOUND' | 'AVAILABILITY_CONFLICT' | 'AVAILABILITY_UNAVAILABLE') { super(code); }
}
export const availabilityFail = (code: AvailabilityError['code']): never => { throw new AvailabilityError(code); };
export function availabilityExact(value: unknown, keys: readonly string[]): asserts value is Record<string, unknown> {
    if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value)))
        availabilityFail('AVAILABILITY_INVALID');
    const d = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(value as object).length !== keys.length || keys.some(k => !d[k]?.enumerable || !('value' in d[k])))
        availabilityFail('AVAILABILITY_INVALID');
}
export function availabilityId(v: unknown): string { if (typeof v !== 'string' || v.length !== 36 || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v))
    availabilityFail('AVAILABILITY_INVALID'); return v as string; }
export function availabilityInteger(v: unknown, min: number, max: number) { if (typeof v !== 'number' || !Number.isInteger(v) || Object.is(v, -0) || v < min || v > max)
    availabilityFail('AVAILABILITY_INVALID'); return v as number; }
export function availabilityTime(v: unknown): Date { try {
    return bpTimestamp(v);
}
catch {
    return availabilityFail('AVAILABILITY_INVALID');
} }
export function schedulingZone(v: unknown): string {
    if (typeof v !== 'string' || v.length > 100 || !/^[A-Za-z][A-Za-z0-9_+/-]*$/.test(v))
        availabilityFail('AVAILABILITY_INVALID');
    try {
        return new Intl.DateTimeFormat('en', { timeZone: v as string }).resolvedOptions().timeZone;
    }
    catch {
        return availabilityFail('AVAILABILITY_INVALID');
    }
}
export function schedulingValues(v: unknown) { availabilityExact(v, ['timeZone', 'durationMinutes', 'minimumBookingLead', 'publicationHorizonDays']); return { timeZone: schedulingZone(v.timeZone), durationMinutes: availabilityInteger(v.durationMinutes, 5, 240), minimumBookingLead: availabilityInteger(v.minimumBookingLead, 0, 10080), publicationHorizonDays: availabilityInteger(v.publicationHorizonDays, 1, 90) }; }
export function offsetMatches(value: string, zone: string) {
    const date = availabilityTime(value), m = /(Z|([+-])(\d{2}):(\d{2}))$/.exec(value)!;
    const supplied = m[1] === 'Z' ? 0 : (m[2] === '-' ? -1 : 1) * (Number(m[3]) * 60 + Number(m[4]));
    const offset = new Intl.DateTimeFormat('en', { timeZone: zone, timeZoneName: 'longOffset' }).formatToParts(date).find(p => p.type === 'timeZoneName')!.value;
    const z = /^GMT(?:([+-])(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(offset);
    if (!z || Number(z[4] ?? 0) !== 0 || supplied !== (z[1] ? (z[1] === '-' ? -1 : 1) * (Number(z[2]) * 60 + Number(z[3])) : 0))
        availabilityFail('AVAILABILITY_INVALID');
    return date;
}
export function availabilityPage(input: unknown, publicRead = false) {
    const d = input && typeof input === 'object' ? Object.getOwnPropertyDescriptors(input) : {};
    const allowed = publicRead ? ['page', 'pageSize', 'clinic', 'from', 'to'] : ['page', 'pageSize'];
    if (!input || typeof input !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(input)) || Reflect.ownKeys(input).some(k => typeof k !== 'string' || !allowed.includes(k) || !d[k].enumerable || !('value' in d[k])))
        availabilityFail('AVAILABILITY_INVALID');
    const r = input as Record<string, unknown>;
    const integer = (v: unknown, fallback: number, max: number) => v === undefined ? fallback : typeof v === 'string' && /^[1-9][0-9]*$/.test(v) ? availabilityInteger(Number(v), 1, max) : availabilityInteger(v, 1, max);
    const page = integer(r.page, 1, 10000), pageSize = integer(r.pageSize, 20, 100);
    const clinic = r.clinic === undefined ? null : availabilityId(r.clinic), from = r.from === undefined ? null : availabilityTime(r.from), to = r.to === undefined ? null : availabilityTime(r.to);
    if (publicRead && ((from === null) !== (to === null) || (from && to && (to.getTime() <= from.getTime() || to.getTime() - from.getTime() > 90 * 86400000))))
        availabilityFail('AVAILABILITY_INVALID');
    return { page, pageSize, clinic, from, to };
}
