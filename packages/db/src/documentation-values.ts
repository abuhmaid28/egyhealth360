import { availabilityExact, availabilityId, availabilityInteger, availabilityPage } from './availability-values.js';
export class DocumentationError extends Error {
  constructor(public readonly code: 'DOCUMENT_INVALID' | 'DOCUMENT_UNAUTHENTICATED' | 'DOCUMENT_NOT_FOUND' | 'DOCUMENT_CONFLICT' | 'DOCUMENT_UNAVAILABLE') { super(code); }
}
export const documentFail = (code: DocumentationError['code']): never => { throw new DocumentationError(code); };
const invalid = (): never => documentFail('DOCUMENT_INVALID');
export type DocumentCommand = 'DRAFT' | 'SIGN' | 'RELEASE' | 'ADDENDUM' | 'CORRECT' | 'PRIVACY';
export function documentText(v: unknown, bound: number, min = 0): string {
  if (typeof v !== 'string' || /\p{Cs}/u.test(v) || [...v].length < min || [...v].length > bound || /[\p{Cc}]/u.test(v.replaceAll('\n', ''))) invalid();
  return v as string;
}
function exact(value: unknown, required: string[], optional: string[] = []): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) invalid();
  const d = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(value as object).some(k => typeof k !== 'string' || ![...required, ...optional].includes(k) || !d[k].enumerable || !('value' in d[k])) || required.some(k => !d[k])) invalid();
}
function array<T>(value: unknown, max: number, item: (v: unknown) => T): T[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > max || Reflect.ownKeys(value).length !== value.length + 1) invalid();
  return Array.from({ length: (value as unknown[]).length }, (_, i) => { const d = Object.getOwnPropertyDescriptor(value, String(i)); return d?.enumerable && 'value' in d ? item(d.value) : invalid(); });
}
export function documentContent(value: unknown) {
  exact(value, ['content', 'patientInstructions'], ['complaint', 'problems', 'diagnoses', 'allergyReview']);
  const content = documentText(value.content, 8000), patientInstructions = documentText(value.patientInstructions, 8000);
  const complaint = value.complaint === undefined || value.complaint === null ? null : documentText(value.complaint, 2000);
  const problems = array(value.problems === undefined ? [] : value.problems, 20, v => documentText(v, 500)), diagnoses = array(value.diagnoses === undefined ? [] : value.diagnoses, 20, v => documentText(v, 500));
  const review = value.allergyReview === undefined ? { state: 'NOT_REVIEWED', items: [] } : value.allergyReview;
  availabilityExact(review, ['state', 'items']);
  if (!['REVIEWED_POSITIVE', 'REVIEWED_NO_KNOWN', 'UNKNOWN', 'NOT_REVIEWED'].includes(review.state as string)) invalid();
  const items = array(review.items, 20, v => { availabilityExact(v, ['kind', 'text', 'reaction']); if (!['ALLERGY', 'INTOLERANCE'].includes(v.kind as string)) invalid(); return { kind: v.kind as string, text: documentText(v.text, 500, 1), reaction: v.reaction === null ? null : documentText(v.reaction, 500, 1) }; });
  if ((review.state === 'REVIEWED_POSITIVE') !== (items.length > 0)) invalid();
  return { content, patientInstructions, complaint, problems, diagnoses, allergyReview: { state: review.state as string, items } };
}
export function documentationInput(command: DocumentCommand, value: unknown) {
  try {
    const fields = ['consultationId', 'operationKey', ...(command === 'DRAFT' ? ['kind', 'content', 'patientInstructions'] : ['documentId']), ...(['SIGN', 'RELEASE', 'ADDENDUM', 'CORRECT'].includes(command) ? ['expectedVersion'] : []), ...(['ADDENDUM', 'CORRECT'].includes(command) ? ['predecessorId', 'reason', 'content', 'patientInstructions'] : []), ...(command === 'PRIVACY' ? ['versionIds', 'reason'] : [])];
    const hasContent = ['DRAFT', 'ADDENDUM', 'CORRECT'].includes(command);
    exact(value, fields, hasContent ? ['complaint', 'problems', 'diagnoses', 'allergyReview'] : []);
    const consultationId = availabilityId(value.consultationId), operationKey = availabilityId(value.operationKey);
    const documentId = command === 'DRAFT' ? null : availabilityId(value.documentId);
    const expectedVersion = ['SIGN', 'RELEASE', 'ADDENDUM', 'CORRECT'].includes(command) ? availabilityInteger(value.expectedVersion, 1, 2147483646) : null;
    const predecessorId = ['ADDENDUM', 'CORRECT'].includes(command) ? availabilityId(value.predecessorId) : null;
    const reason = ['ADDENDUM', 'CORRECT', 'PRIVACY'].includes(command) ? documentText(value.reason, 1000, 1) : null;
    const versionIds = command === 'PRIVACY' ? array(value.versionIds, 100, availabilityId).sort() : [];
    if (command === 'PRIVACY' && (!versionIds.length || new Set(versionIds).size !== versionIds.length)) invalid();
    const kind = command === 'DRAFT' ? value.kind as string : null;
    if (command === 'DRAFT' && !['PRIVATE_NOTE', 'PATIENT_SUMMARY'].includes(kind!)) invalid();
    const body = hasContent ? documentContent(Object.fromEntries(['content', 'patientInstructions', 'complaint', 'problems', 'diagnoses', 'allergyReview'].filter(k => Object.hasOwn(value, k)).map(k => [k, value[k]]))) : null;
    if (kind === 'PRIVATE_NOTE' && body!.patientInstructions !== '') invalid();
    return { consultationId, operationKey, documentId, expectedVersion, predecessorId, reason, versionIds, kind, body };
  } catch { return invalid(); }
}
export function documentationJson(raw: string, command: DocumentCommand) {
  try {
    const value: unknown = JSON.parse(raw), stack: (Set<string> | null)[] = [];
    for (const token of raw.matchAll(/"(?:[^"\\]|\\.)*"|[{}[\]]/g)) {
      const t = token[0];
      if (t === '{') stack.push(new Set()); else if (t === '[') stack.push(null); else if (t === '}' || t === ']') stack.pop();
      else if (/^[ \t\r\n]*:/.test(raw.slice(token.index + t.length))) { const key = JSON.parse(t); const keys = stack.at(-1); if (!keys) return invalid(); if (keys.has(key)) invalid(); keys.add(key); }
    }
    exact(value, [] , ['kind', 'content', 'patientInstructions', 'complaint', 'problems', 'diagnoses', 'allergyReview', 'operationKey', 'expectedVersion', 'predecessorId', 'reason', 'versionIds']);
    documentationInput(command, { ...value, consultationId: '00000000-0000-4000-8000-000000000001', ...(command === 'DRAFT' ? {} : { documentId: '00000000-0000-4000-8000-000000000002' }) });
    return value;
  } catch { return invalid(); }
}
export function documentationPage(value: unknown) { try { return availabilityPage(value); } catch { return invalid(); } }
