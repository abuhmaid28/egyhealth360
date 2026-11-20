import {randomUUID,randomBytes} from 'node:crypto';
import {isolatedPrescriptions,prescriptionBody,medicationId} from './prescriptions.mjs';
export {prescriptionBody,medicationId};
export const pharmacyTables=['pharmacy_routes','pharmacy_route_items','pharmacy_route_versions','pharmacy_dispenses','pharmacy_dispense_corrections','pharmacy_operations'];
export const pharmacyCounts=async f=>Object.fromEntries(await Promise.all([...pharmacyTables,'audit_logs'].map(async t=>[t,(await f.pool.query(`SELECT count(*)::int n FROM public.${t}`)).rows[0].n])));
export const pharmacyReject=(p,code='PHARMACY_NOT_FOUND')=>import('node:assert/strict').then(({default:a})=>a.rejects(p,e=>e.code===code));
export async function isolatedPharmacy(run,options={}){return isolatedPrescriptions(async f=>{
 const pharmacy=f.prescriptions.pharmacy,pharmacyOrg=await f.org('PHARMACY'),pharmacy2=await f.org('PHARMACY'),pharmacyMember=(await f.grant(f.users.pharmacy,pharmacyOrg)).membership,otherMember=(await f.grant(f.users.pharmacy2??f.users.pharmacy,pharmacy2)).membership;
 const addStaff=async(name='newPharmacyStaff')=>{const user=await f.identities.createUser({email:randomUUID()+'@example.invalid',passwordHash:f.hash,role:'PHARMACY_STAFF'}),actor=await f.auth.createSession({userId:user.id,verifiedHash:f.hash,tokenHash:randomBytes(32).toString('hex'),previousHash:null});f.users[name]=user;f.actors[name]=actor;return{user,actor};};
 const c=await f.readyRx(),draft=await f.draft(c),signed=await f.command(c,draft,'SIGN');
 const routeInput=(extra={})=>({consultationId:c.id,prescriptionId:signed.data.id,expectedVersion:signed.data.version,itemIds:signed.data.items.map(i=>i.id),destinationId:pharmacyOrg.id,operationKey:randomUUID(),...extra});
 const createRoute=(extra={},actor=f.actors.clinician)=>pharmacy.execute('ROUTE',actor,routeInput(extra));
 const clinician=(kind,r,extra={},actor=f.actors.clinician)=>pharmacy.execute(kind,actor,{consultationId:c.id,prescriptionId:signed.data.id,routeId:r.data.id,expectedVersion:r.data.version,operationKey:randomUUID(),...extra});
 const staff=(kind,r,extra={},actor=f.actors.pharmacy)=>pharmacy.execute(kind,actor,{pharmacyId:r.data.pharmacyId,routeId:r.data.id,expectedVersion:r.data.version,operationKey:randomUUID(),...extra});
 const accept=r=>staff('ACCEPT',r);
 const dispense=(r,extra={})=>staff('DISPENSE',r,{itemId:signed.data.items[0].id,...extra});
 const ready=async()=>accept(await createRoute());
 const sourcePath='/consultations/'+c.id+'/prescriptions/'+signed.data.id,queuePath='/pharmacies/'+pharmacyOrg.id+'/routes';
 await run({...f,pharmacy,pharmacyOrg,pharmacy2,pharmacyMember,otherMember,c,signed,sourcePath,queuePath,addStaff,routeInput,createRoute,clinician,staff,accept,dispense,readyPharmacy:ready});
},options);}
