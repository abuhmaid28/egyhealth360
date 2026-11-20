import { availabilityExact, availabilityId, availabilityInteger, availabilityPage, availabilityTime } from './availability-values.js';
import { documentText } from './documentation-values.js';
export class PrescriptionError extends Error {
  constructor(public readonly code: 'PRESCRIPTION_INVALID' | 'PRESCRIPTION_UNAUTHENTICATED' | 'PRESCRIPTION_NOT_FOUND' | 'PRESCRIPTION_CONFLICT' | 'PRESCRIPTION_UNAVAILABLE') { super(code); }
}
export const prescriptionFail = (code: PrescriptionError['code']): never => { throw new PrescriptionError(code); };
export const prescriptionDeny = (): never => prescriptionFail('PRESCRIPTION_NOT_FOUND');
const invalid = (): never => prescriptionFail('PRESCRIPTION_INVALID');
export type PrescriptionCommand = 'DRAFT' | 'EDIT' | 'SIGN' | 'CANCEL' | 'REPLACE' | 'PRIVACY';
export function prescriptionText(value: unknown, bound: number) { const text = documentText(value, bound, 1); if (!text.trim()) invalid(); return text; }
export function prescriptionContent(value: unknown) {
  availabilityExact(value, ['items', 'validFrom', 'validUntil']);
  const from = availabilityTime(value.validFrom).toISOString(), until = availabilityTime(value.validUntil).toISOString();
  if (from >= until) invalid();
  const items = value.items;
  if (!Array.isArray(items) || Object.getPrototypeOf(items) !== Array.prototype || items.length < 1 || items.length > 20 || Reflect.ownKeys(items).length !== items.length + 1) invalid();
  const parsed = Array.from({length:(items as unknown[]).length}, (_, index) => {
    const descriptor = Object.getOwnPropertyDescriptor(items, String(index));
    if (!descriptor?.enumerable || !('value' in descriptor)) invalid();
    const item: unknown = descriptor!.value;
    availabilityExact(item, ['medicationId', 'quantity', 'unit', 'instructions']);
    // Decimal strings avoid binary rounding. Numeric(12,3): at most nine integer digits.
    if (typeof item.quantity !== 'string' || !/^(?:0|[1-9][0-9]{0,8})(?:\.[0-9]{1,3})?$/.test(item.quantity) || /^0(?:\.0+)?$/.test(item.quantity)) invalid();
    const quantity = (item.quantity as string).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
    return { medicationId: availabilityId(item.medicationId), quantity, unit: prescriptionText(item.unit, 40), instructions: prescriptionText(item.instructions, 2000) };
  });
  return { items: parsed, validFrom: from, validUntil: until };
}
export function prescriptionInput(command: PrescriptionCommand, value: unknown) {
  try {
    if (!['DRAFT','EDIT','SIGN','CANCEL','REPLACE','PRIVACY'].includes(command)) invalid();
    const content = ['DRAFT','EDIT','REPLACE'].includes(command), reasoned = ['CANCEL','REPLACE','PRIVACY'].includes(command);
    availabilityExact(value, ['consultationId','operationKey', ...(command === 'DRAFT' ? [] : ['prescriptionId']), ...(command === 'DRAFT' || command === 'PRIVACY' ? [] : ['expectedVersion']), ...(content ? ['items','validFrom','validUntil'] : []), ...(reasoned ? ['reason'] : [])]);
    return { consultationId: availabilityId(value.consultationId), operationKey: availabilityId(value.operationKey), prescriptionId: command === 'DRAFT' ? null : availabilityId(value.prescriptionId), expectedVersion: command === 'DRAFT' || command === 'PRIVACY' ? null : availabilityInteger(value.expectedVersion,1,2147483646), reason: reasoned ? prescriptionText(value.reason,1000) : null, content: content ? prescriptionContent({items:value.items,validFrom:value.validFrom,validUntil:value.validUntil}) : null };
  } catch { return invalid(); }
}
export function medicationInput(value: unknown) {
  try {
    availabilityExact(value,['medicationId','operationKey','expectedVersion','displayName','isActive','isPublished']);
    if (typeof value.isActive !== 'boolean' || typeof value.isPublished !== 'boolean') invalid();
    return {medicationId:availabilityId(value.medicationId),operationKey:availabilityId(value.operationKey),expectedVersion:availabilityInteger(value.expectedVersion,1,2147483646),displayName:prescriptionText(value.displayName,200),isActive:value.isActive as boolean,isPublished:value.isPublished as boolean};
  } catch {return invalid();}
}
export function prescriptionPage(value: unknown) { try { const {page,pageSize}=availabilityPage(value); return {page,pageSize}; } catch {return invalid();} }
export function prescriptionJson(raw: string, command: PrescriptionCommand | 'CATALOG') {
  try {
    const value: unknown = JSON.parse(raw), stack: (Set<string>|null)[]=[];
    for(const token of raw.matchAll(/"(?:[^"\\]|\\.)*"|[{}[\]]/g)) {
      const t=token[0]; if(t==='{')stack.push(new Set()); else if(t==='[')stack.push(null); else if(t==='}'||t===']')stack.pop();
      else if(/^[ \t\r\n]*:/.test(raw.slice(token.index+t.length))) {const key=JSON.parse(t),keys=stack.at(-1);if(!keys||keys.has(key))invalid();keys!.add(key);}
    }
    const fields = command==='CATALOG' ? ['operationKey','expectedVersion','displayName','isActive','isPublished'] : ['operationKey',...(command==='DRAFT'?[]:command==='PRIVACY'?['reason']:['expectedVersion']),...(['DRAFT','EDIT','REPLACE'].includes(command)?['items','validFrom','validUntil']:[]),...(['CANCEL','REPLACE'].includes(command)?['reason']:[])];
    availabilityExact(value,fields);
    const id='00000000-0000-4000-8000-000000000001';
    if(command==='CATALOG')medicationInput({...value,medicationId:id});else prescriptionInput(command,{...value,consultationId:id,...(command==='DRAFT'?{}:{prescriptionId:id})});
    return value;
  } catch {return invalid();}
}
