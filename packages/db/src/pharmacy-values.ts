import { availabilityExact, availabilityId, availabilityInteger } from './availability-values.js';
import { prescriptionPage, prescriptionText } from './prescription-values.js';
export class PharmacyError extends Error {
  constructor(public readonly code:'PHARMACY_INVALID'|'PHARMACY_UNAUTHENTICATED'|'PHARMACY_NOT_FOUND'|'PHARMACY_CONFLICT'|'PHARMACY_UNAVAILABLE'){super(code);}
}
export const pharmacyFail=(code:PharmacyError['code']):never=>{throw new PharmacyError(code);};
export const pharmacyDeny=():never=>pharmacyFail('PHARMACY_NOT_FOUND');
export type PharmacyCommand='ROUTE'|'WITHDRAW'|'REROUTE'|'ACCEPT'|'DISPENSE'|'CORRECT'|'REVERSE';
export function pharmacyInput(command:PharmacyCommand,value:unknown){
 try{
  if(!['ROUTE','WITHDRAW','REROUTE','ACCEPT','DISPENSE','CORRECT','REVERSE'].includes(command))pharmacyFail('PHARMACY_INVALID');
  const clinician=['ROUTE','WITHDRAW','REROUTE'].includes(command),reasoned=['WITHDRAW','REROUTE','CORRECT','REVERSE'].includes(command);
  availabilityExact(value,['operationKey','expectedVersion',...(clinician?['consultationId','prescriptionId']:['pharmacyId']),...(command==='ROUTE'?['itemIds','destinationId']:['routeId']),...(command==='REROUTE'?['destinationId']:[]),...(command==='DISPENSE'?['itemId']:[]),...(['CORRECT','REVERSE'].includes(command)?['dispenseId']:[]),...(reasoned?['reason']:[])]);
  let itemIds:string[]=[];
  if(command==='ROUTE'){
   const a=value.itemIds;if(!Array.isArray(a)||Object.getPrototypeOf(a)!==Array.prototype||a.length<1||a.length>20||Reflect.ownKeys(a).length!==a.length+1)pharmacyFail('PHARMACY_INVALID');
   itemIds=Array.from({length:(a as unknown[]).length},(_,i)=>{const d=Object.getOwnPropertyDescriptor(a,String(i));if(!d?.enumerable||!('value'in d))pharmacyFail('PHARMACY_INVALID');return availabilityId(d!.value);}).sort();
   if(new Set(itemIds).size!==itemIds.length)pharmacyFail('PHARMACY_INVALID');
  }
  return {operationKey:availabilityId(value.operationKey),expectedVersion:availabilityInteger(value.expectedVersion,['CORRECT','REVERSE'].includes(command)?0:1,2147483646),consultationId:clinician?availabilityId(value.consultationId):null,prescriptionId:clinician?availabilityId(value.prescriptionId):null,pharmacyId:clinician?null:availabilityId(value.pharmacyId),routeId:command==='ROUTE'?null:availabilityId(value.routeId),destinationId:['ROUTE','REROUTE'].includes(command)?availabilityId(value.destinationId):null,itemIds,itemId:command==='DISPENSE'?availabilityId(value.itemId):null,dispenseId:['CORRECT','REVERSE'].includes(command)?availabilityId(value.dispenseId):null,reason:reasoned?prescriptionText(value.reason,1000):null};
 }catch{return pharmacyFail('PHARMACY_INVALID');}
}
export function pharmacyPage(value:unknown){
 try{
  if(!value||typeof value!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(value)))pharmacyFail('PHARMACY_INVALID');
  const d=Object.getOwnPropertyDescriptors(value);if(Reflect.ownKeys(value as object).some(k=>typeof k!=='string'||!['page','pageSize','purpose'].includes(k)||!d[k].enumerable||!('value'in d[k])))pharmacyFail('PHARMACY_INVALID');
  const v=value as Record<string,unknown>,purpose=v.purpose??'fulfillment';if(!['fulfillment','history'].includes(purpose as string))pharmacyFail('PHARMACY_INVALID');
  return {...prescriptionPage(Object.fromEntries(['page','pageSize'].filter(k=>Object.hasOwn(v,k)).map(k=>[k,v[k]]))),purpose:purpose as 'fulfillment'|'history'};
 }catch{return pharmacyFail('PHARMACY_INVALID');}
}
export function pharmacyJson(raw:string,command:PharmacyCommand){
 try{
  const value:unknown=JSON.parse(raw),stack:(Set<string>|null)[]=[];
  for(const token of raw.matchAll(/"(?:[^"\\]|\\.)*"|[{}[\]]/g)){
   const t=token[0];if(t==='{')stack.push(new Set());else if(t==='[')stack.push(null);else if(t==='}'||t===']')stack.pop();else if(/^[ \t\r\n]*:/.test(raw.slice(token.index+t.length))){const key=JSON.parse(t),keys=stack.at(-1);if(!keys||keys.has(key))pharmacyFail('PHARMACY_INVALID');keys!.add(key);}
  }
  const fields=['operationKey','expectedVersion',...(command==='ROUTE'?['itemIds','destinationId']:command==='REROUTE'?['destinationId']:[]),...(['WITHDRAW','REROUTE','CORRECT','REVERSE'].includes(command)?['reason']:[])];availabilityExact(value,fields);
  const id='00000000-0000-4000-8000-000000000001';pharmacyInput(command,{...value,...(['ROUTE','WITHDRAW','REROUTE'].includes(command)?{consultationId:id,prescriptionId:id}:{pharmacyId:id}),...(command==='ROUTE'?{}:{routeId:id}),...(command==='DISPENSE'?{itemId:id}:{}),...(['CORRECT','REVERSE'].includes(command)?{dispenseId:id}:{})});return value;
 }catch{return pharmacyFail('PHARMACY_INVALID');}
}
