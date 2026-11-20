import { availabilityExact, availabilityId, availabilityInteger, offsetMatches } from './availability-values.js';
import { documentText } from './documentation-values.js';
export class FollowUpIntentError extends Error {
  constructor(public readonly code: 'FOLLOW_UP_INTENT_INVALID' | 'FOLLOW_UP_INTENT_UNAUTHENTICATED' | 'FOLLOW_UP_INTENT_NOT_FOUND' | 'FOLLOW_UP_INTENT_CONFLICT' | 'FOLLOW_UP_INTENT_UNAVAILABLE') { super(code); }
}
export const intentFail = (code: FollowUpIntentError['code']): never => { throw new FollowUpIntentError(code); };
const invalid = (): never => intentFail('FOLLOW_UP_INTENT_INVALID');
export type IntentCommand = 'DRAFT' | 'RELEASE' | 'CORRECT' | 'LINK' | 'REPLACE' | 'PRIVACY';
export function intentWindow(value: unknown) {
  if (value === null) return null;
  availabilityExact(value, ['startAt','endAt','timeZone']);
  if (typeof value.timeZone !== 'string' || value.timeZone.length > 100 || !/^[A-Za-z][A-Za-z0-9_+/-]*$/.test(value.timeZone)) invalid();
  const timeZone = value.timeZone as string;
  const startAt = offsetMatches(value.startAt as string, timeZone).toISOString(), endAt = offsetMatches(value.endAt as string, timeZone).toISOString();
  if (startAt >= endAt) invalid();
  return { startAt, endAt, timeZone };
}
export function intentInput(command: IntentCommand, value: unknown) {
  try {
    if (!['DRAFT','RELEASE','CORRECT','LINK','REPLACE','PRIVACY'].includes(command)) invalid();
    const content = command === 'DRAFT' || command === 'CORRECT', versioned = command === 'RELEASE' || command === 'CORRECT', linked = command === 'LINK' || command === 'REPLACE';
    availabilityExact(value, ['consultationId','operationKey', ...(command === 'DRAFT' ? [] : ['intentId']), ...(content ? ['instruction','desiredWindow'] : []), ...(versioned ? ['expectedVersion'] : []), ...(command === 'CORRECT' ? ['predecessorId','reason'] : []), ...(linked ? ['bookingId','expectedLinkVersion'] : []), ...(command === 'REPLACE' ? ['previousLinkId'] : []), ...(command === 'PRIVACY' ? ['versionIds','reason'] : [])]);
    let versionIds: string[] = [];
    if (command === 'PRIVACY') {
      const v = value.versionIds;
      if (!Array.isArray(v) || Object.getPrototypeOf(v) !== Array.prototype || v.length < 1 || v.length > 100 || Reflect.ownKeys(v).length !== v.length + 1) invalid();
      versionIds = Array.from({length:(v as unknown[]).length}, (_, i) => { const d = Object.getOwnPropertyDescriptor(v, String(i)); return d?.enumerable && 'value' in d ? availabilityId(d.value) : invalid(); }).sort();
      if (new Set(versionIds).size !== versionIds.length) invalid();
    }
    return { command, consultationId: availabilityId(value.consultationId), operationKey: availabilityId(value.operationKey), intentId: command === 'DRAFT' ? null : availabilityId(value.intentId),
      instruction: content ? documentText(value.instruction, 2000, 1) : null, desiredWindow: content ? intentWindow(value.desiredWindow) : null,
      expectedVersion: versioned ? availabilityInteger(value.expectedVersion, 1, 2147483646) : null,
      predecessorId: command === 'CORRECT' ? availabilityId(value.predecessorId) : null,
      reason: command === 'CORRECT' || command === 'PRIVACY' ? documentText(value.reason,1000,1) : null,
      bookingId: linked ? availabilityId(value.bookingId) : null, expectedLinkVersion: linked ? availabilityInteger(value.expectedLinkVersion, command === 'LINK' ? 0 : 1, command === 'LINK' ? 0 : 2147483646) : null,
      previousLinkId: command === 'REPLACE' ? availabilityId(value.previousLinkId) : null, versionIds };
  } catch { return invalid(); }
}
export function intentJson(raw: string, command: IntentCommand) {
  try {
    const value: unknown = JSON.parse(raw), stack: (Set<string> | null)[] = [];
    for (const token of raw.matchAll(/"(?:[^"\\]|\\.)*"|[{}[\]]/g)) {
      const t = token[0];
      if (t === '{') stack.push(new Set()); else if (t === '[') stack.push(null); else if (t === '}' || t === ']') stack.pop();
      else if (/^[ \t\r\n]*:/.test(raw.slice(token.index + t.length))) { const key = JSON.parse(t), keys = stack.at(-1); if (!keys || keys.has(key)) return invalid(); keys.add(key); }
    }
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.hasOwn(value,'consultationId') || Object.hasOwn(value,'intentId')) return invalid();
    intentInput(command, { ...value, consultationId: '00000000-0000-4000-8000-000000000001', ...(command === 'DRAFT' ? {} : { intentId: '00000000-0000-4000-8000-000000000002' }) });
    return value;
  } catch { return invalid(); }
}
export function intentPage(value: unknown, detail = true) {
  try {
    if (!value || typeof value !== 'object' || ![Object.prototype,null].includes(Object.getPrototypeOf(value))) invalid();
    const allowed = detail ? ['page','pageSize','linkPage','linkPageSize'] : ['page','pageSize'], d = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(value as object).some(k => typeof k !== 'string' || !allowed.includes(k) || !d[k].enumerable || !('value' in d[k]))) invalid();
    const v = value as Record<string,unknown>, n = (key: string, fallback: number, max: number) => v[key] === undefined ? fallback : availabilityInteger(v[key],1,max);
    return { page:n('page',1,10000),pageSize:n('pageSize',20,100),linkPage:n('linkPage',1,10000),linkPageSize:n('linkPageSize',20,100) };
  } catch { return invalid(); }
}
