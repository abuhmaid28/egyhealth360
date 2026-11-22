import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedPharmacy,pharmacyCounts,pharmacyReject,prescriptionBody} from '../support/pharmacy.mjs';
import {createRelationshipPersistence} from '../../packages/db/dist/index.js';
test('I3S2 explicit route, exact artifact acceptance, full-item dispense and immutable corrected/reversed history',()=>isolatedPharmacy(async f=>{
 const r=await f.createRoute();assert.equal(r.data.state,'PENDING');assert.equal(r.data.items.length,1);assert.equal((await f.pharmacy.read(f.actors.pharmacy,f.pharmacyOrg.id)).meta.total,1);
 await pharmacyReject(f.dispense(r),'PHARMACY_CONFLICT');const a=await f.accept(r);assert.equal(a.data.state,'ACCEPTED');const key=randomUUID(),d=await f.dispense(a,{operationKey:key});assert.equal(d.data.state,'COMPLETED');assert.equal(d.data.items[0].fulfillmentState,'FULLY_DISPENSED');assert.equal(d.data.items[0].quantity,f.signed.data.items[0].quantity);
 const before=await pharmacyCounts(f);assert.deepEqual((await f.dispense(a,{operationKey:key})).data,d.data);assert.deepEqual(await pharmacyCounts(f),before);await pharmacyReject(f.dispense(a),'PHARMACY_CONFLICT');
 assert.equal((await f.pharmacy.read(f.actors.pharmacy,f.pharmacyOrg.id)).meta.total,0);await pharmacyReject(f.pharmacy.read(f.actors.pharmacy,f.pharmacyOrg.id,r.data.id));const history=await f.pharmacy.read(f.actors.pharmacy,f.pharmacyOrg.id,r.data.id,{purpose:'history'});assert.equal(history.data.patientDisplayName,null);assert.equal(history.data.items[0].instructions,null);
 const fact=d.data.items[0].dispense;const corrected=await f.staff('CORRECT',a,{dispenseId:fact.id,expectedVersion:0,reason:'Explicit synthetic correction'});assert.equal(corrected.data.items[0].dispense.corrections[0].kind,'CORRECTION');
 const reversed=await f.staff('REVERSE',a,{dispenseId:fact.id,expectedVersion:1,reason:'Erroneous synthetic dispense'});assert.equal(reversed.data.items[0].dispense.reversed,true);assert.equal(reversed.data.items[0].fulfillmentState,'FULLY_DISPENSED');await pharmacyReject(f.dispense(a),'PHARMACY_CONFLICT');
 const patient=await f.prescriptions.signedRead(f.actors.patient,null,f.signed.data.id);assert.equal(patient.data.items[0].fulfillmentState,'FULLY_DISPENSED');assert.equal(patient.data.items[0].dispense.corrections.length,2);
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM pharmacy_dispenses')).rows[0].n,1);assert.ok((await f.pool.query("SELECT safe_metadata FROM audit_logs WHERE entity_type='pharmacy_route'")).rows.every(x=>JSON.stringify(x.safe_metadata)==='{}'));
 for(const t of ['pharmacy_routes','pharmacy_route_items','pharmacy_route_versions','pharmacy_dispenses','pharmacy_dispense_corrections','pharmacy_operations'])await assert.rejects(f.pool.query(`DELETE FROM public.${t} WHERE false`),e=>e.code==='23514');
}));
test('I3S2 pre-acceptance withdrawal and atomic reroute preserve destinations and prevent accepted transfer',()=>isolatedPharmacy(async f=>{
 const r=await f.createRoute();await pharmacyReject(f.createRoute(),'PHARMACY_CONFLICT');const next=await f.clinician('REROUTE',r,{destinationId:f.pharmacy2.id,reason:'Explicit destination correction'});assert.notEqual(next.data.id,r.data.id);assert.equal(next.data.pharmacyId,f.pharmacy2.id);assert.equal((await f.pharmacy.read(f.actors.pharmacy,f.pharmacyOrg.id)).meta.total,0);await pharmacyReject(f.pharmacy.read(f.actors.pharmacy,f.pharmacyOrg.id,r.data.id,{purpose:'history'}));
 const a=await f.accept(next);await pharmacyReject(f.clinician('REROUTE',a,{destinationId:f.pharmacyOrg.id,reason:'No accepted transfer'}),'PHARMACY_CONFLICT');
 const source=await f.prescriptions.signedRead(f.actors.patient,null,f.signed.data.id);assert.equal(source.data.items[0].routingHistory.length,2);assert.equal(source.data.items[0].routingHistory.find(r=>r.id===next.data.id).state,'ACCEPTED');
}));
test('I3S2 staff role/membership/artifact scope never grants a patient record or ADMIN fulfillment',()=>isolatedPharmacy(async f=>{
 const r=await f.createRoute();
 for(const key of ['admin','patient','clinician','lab','other']){await pharmacyReject(f.pharmacy.read(f.actors[key],f.pharmacyOrg.id));await pharmacyReject(f.staff('ACCEPT',r,{},f.actors[key]));}
 await pharmacyReject(f.pharmacy.read(f.actors.pharmacy,f.organization.id));await pharmacyReject(f.pharmacy.read(f.actors.pharmacy,f.pharmacy2.id,r.data.id));
 for(const method of ['authorRead','signedRead'])await assert.rejects(method==='authorRead'?f.prescriptions.authorRead(f.actors.pharmacy,f.c.id,f.signed.data.id):f.prescriptions.signedRead(f.actors.pharmacy,f.users.patient.profileId,f.signed.data.id),e=>e.code==='PRESCRIPTION_NOT_FOUND');
 const unrelated=await f.addStaff('unrelatedPharmacy');await f.grant(unrelated.user,f.pharmacy2);await pharmacyReject(f.pharmacy.read(unrelated.actor,f.pharmacyOrg.id));await pharmacyReject(f.staff('ACCEPT',r,{},unrelated.actor));
}));
test('I3S2 source cancellation blocks fulfillment but preserves committed facts and bounded correction authority',()=>isolatedPharmacy(async f=>{
 const a=await f.readyPharmacy(),d=await f.dispense(a),fact=d.data.items[0].dispense;
 await f.command(f.c,f.signed,'CANCEL',{reason:'Synthetic source cancellation'});await pharmacyReject(f.dispense(a));assert.equal((await f.pharmacy.read(f.actors.pharmacy,f.pharmacyOrg.id)).meta.total,0);
 const corrected=await f.staff('REVERSE',a,{dispenseId:fact.id,expectedVersion:0,reason:'Synthetic correction after source cancel'});assert.equal(corrected.data.items[0].dispense.reversed,true);const source=await f.prescriptions.signedRead(f.actors.patient,null,f.signed.data.id);assert.equal(source.data.state,'CANCELLED');assert.equal(source.data.items[0].fulfillmentState,'FULLY_DISPENSED');
}));
test('I3S2 ending prescriber assignment denies clinician access without cancelling valid routed artifact',()=>isolatedPharmacy(async f=>{
 const r=await f.createRoute(),rel=createRelationshipPersistence(f.url);try{const assignment=(await f.pool.query('SELECT assignment_id FROM prescriptions WHERE id=$1',[f.signed.data.id])).rows[0].assignment_id;await rel.end(f.actors.patient,{assignmentId:assignment});}finally{await rel.close();}
 await pharmacyReject(f.clinician('WITHDRAW',r,{reason:'Ended source-author authority'}));const a=await f.accept(r),d=await f.dispense(a);assert.equal(d.data.items[0].fulfillmentState,'FULLY_DISPENSED');
}));
test('I3S2 source lineage privacy masks pharmacy queue/detail/replay/conflicts and patient history',()=>isolatedPharmacy(async f=>{
 const routeBody=f.routeInput(),r=await f.pharmacy.execute('ROUTE',f.actors.clinician,routeBody),key=randomUUID(),a=await f.staff('ACCEPT',r,{operationKey:key});await f.dispense(a);
 await f.command(f.c,f.signed,'PRIVACY',{reason:'Wrong-patient synthetic source'});
 for(const purpose of ['fulfillment','history']){assert.equal((await f.pharmacy.read(f.actors.pharmacy,f.pharmacyOrg.id,null,{purpose})).meta.total,0);await pharmacyReject(f.pharmacy.read(f.actors.pharmacy,f.pharmacyOrg.id,r.data.id,{purpose}));}
 await pharmacyReject(f.staff('ACCEPT',r,{operationKey:key}));await pharmacyReject(f.staff('ACCEPT',r,{operationKey:key,expectedVersion:2}));await pharmacyReject(f.pharmacy.execute('ROUTE',f.actors.clinician,routeBody));await assert.rejects(f.prescriptions.signedRead(f.actors.patient,null,f.signed.data.id),e=>e.code==='PRESCRIPTION_NOT_FOUND');
}));

test('S1 context is own current active operational scope only, filtered before pagination and never a grant',()=>isolatedPharmacy(async f=>{
 const expected=[f.pharmacyOrg,f.pharmacy2].sort((a,b)=>a.id.localeCompare(b.id));
 const before=await pharmacyCounts(f),all=await f.pharmacy.context(f.actors.pharmacy);
 assert.deepEqual(all,{data:expected.map(o=>({id:o.id,name:o.name})),meta:{page:1,pageSize:20,total:2}});
 for(const page of [1,2,3]){const r=await f.pharmacy.context(f.actors.pharmacy,{page,pageSize:1});assert.deepEqual(r.data,all.data.slice(page-1,page));assert.equal(r.meta.total,2);}
 for(const role of ['patient','clinician','lab','admin'])await pharmacyReject(f.pharmacy.context(f.actors[role]));
 for(const input of [{purpose:'fulfillment'},{purpose:'history'},{userId:f.users.pharmacy.id},{page:0},{pageSize:101},Object.create({page:1})])await pharmacyReject(f.pharmacy.context(f.actors.pharmacy,input),'PHARMACY_INVALID');
 const other=await f.addStaff();assert.deepEqual((await f.pharmacy.context(other.actor)).data,[]);
 await pharmacyReject(f.pharmacy.read(other.actor,f.pharmacyOrg.id));
 await f.store.setOrganizationStatus(f.actors.admin2,{organizationId:f.pharmacy2.id,status:'SUSPENDED',expectedVersion:0});
 assert.deepEqual((await f.pharmacy.context(f.actors.pharmacy)).data,[{id:f.pharmacyOrg.id,name:f.pharmacyOrg.name}]);
 await f.store.endMembership(f.actors.admin2,{organizationId:f.pharmacyOrg.id,membershipId:f.pharmacyMember.id});
 assert.deepEqual(await f.pharmacy.context(f.actors.pharmacy),{data:[],meta:{page:1,pageSize:20,total:0}});
 assert.equal((await pharmacyCounts(f)).pharmacy_dispenses,before.pharmacy_dispenses);
}));
for(const kind of ['CANCEL','REPLACE','EXPIRE'])test('S1 terminal accepted zero-dispense history has canonical empty items: '+kind,()=>isolatedPharmacy(async f=>{
 let signed=f.signed;
 if(kind==='EXPIRE'){
  const now=(await f.pool.query('SELECT clock_timestamp() now')).rows[0].now;
  signed=await f.command(f.c,await f.draft(f.c,prescriptionBody({validUntil:new Date(now.getTime()+2500).toISOString()})),'SIGN');
 }
 const r=await f.createRoute({prescriptionId:signed.data.id,expectedVersion:signed.data.version,itemIds:signed.data.items.map(i=>i.id)});await f.accept(r);
 if(kind==='EXPIRE')await f.pool.query('SELECT pg_sleep(greatest(0,extract(epoch FROM ($1::timestamptz-clock_timestamp())))+0.02)',[signed.data.validUntil]);
 else await f.command(f.c,signed,kind,kind==='CANCEL'?{reason:'Synthetic no-dispense cancellation'}:prescriptionBody({reason:'Synthetic no-dispense replacement'}));
 const history=await f.pharmacy.read(f.actors.pharmacy,f.pharmacyOrg.id,null,{purpose:'history',pageSize:1});
 assert.equal(history.meta.total,1);assert.equal(history.data[0].id,r.data.id);assert.deepEqual(history.data[0].items,[]);
 const detail=await f.pharmacy.read(f.actors.pharmacy,f.pharmacyOrg.id,r.data.id,{purpose:'history'});
 assert.deepEqual(detail.data,history.data[0]);assert.equal(detail.data.patientDisplayName,null);assert.equal(detail.data.recordedState,'ACCEPTED');assert.equal(detail.data.state,kind==='EXPIRE'?'EXPIRED':kind==='CANCEL'?'CANCELLED':'REPLACED');
 assert.deepEqual((await f.pharmacy.read(f.actors.pharmacy,f.pharmacyOrg.id,null,{purpose:'history',page:2,pageSize:1})).data,[]);
 await pharmacyReject(f.pharmacy.read(f.actors.pharmacy,f.pharmacyOrg.id,r.data.id));
 assert.equal((await pharmacyCounts(f)).pharmacy_dispenses,0);
 await f.command(f.c,signed,'PRIVACY',{reason:'Synthetic wrong-patient restriction'});
 assert.equal((await f.pharmacy.read(f.actors.pharmacy,f.pharmacyOrg.id,null,{purpose:'history'})).meta.total,0);
 await pharmacyReject(f.pharmacy.read(f.actors.pharmacy,f.pharmacyOrg.id,r.data.id,{purpose:'history'}));
}));

test('S1 history shape fix preserves pending/withdrawn exclusion and partial immutable fact projection',()=>isolatedPharmacy(async f=>{
 const pending=await f.createRoute();await f.command(f.c,f.signed,'CANCEL',{reason:'Synthetic pending cancellation'});
 assert.equal((await f.pharmacy.read(f.actors.pharmacy,f.pharmacyOrg.id,null,{purpose:'history'})).meta.total,0);
 await pharmacyReject(f.pharmacy.read(f.actors.pharmacy,f.pharmacyOrg.id,pending.data.id,{purpose:'history'}));
 const c=f.c,signed=await f.command(c,await f.draft(c),'SIGN');
 const route=await f.pharmacy.execute('ROUTE',f.actors.clinician,{consultationId:c.id,prescriptionId:signed.data.id,expectedVersion:signed.data.version,itemIds:signed.data.items.map(i=>i.id),destinationId:f.pharmacyOrg.id,operationKey:randomUUID()});
 await f.pharmacy.execute('WITHDRAW',f.actors.clinician,{consultationId:c.id,prescriptionId:signed.data.id,routeId:route.data.id,expectedVersion:route.data.version,reason:'Synthetic withdrawn exclusion',operationKey:randomUUID()});
 assert.equal((await f.pharmacy.read(f.actors.pharmacy,f.pharmacyOrg.id,null,{purpose:'history'})).meta.total,0);
 const multi=await f.command(c,await f.draft(c,prescriptionBody({items:[...prescriptionBody().items,{...prescriptionBody().items[0],quantity:'3.5',instructions:'Other synthetic item'}]})),'SIGN');
 const r=await f.pharmacy.execute('ROUTE',f.actors.clinician,{consultationId:c.id,prescriptionId:multi.data.id,expectedVersion:multi.data.version,itemIds:multi.data.items.map(i=>i.id),destinationId:f.pharmacyOrg.id,operationKey:randomUUID()});
 const accepted=await f.accept(r),d=await f.dispense(accepted,{itemId:multi.data.items[0].id});
 assert.equal(d.data.items.filter(i=>i.fulfillmentState==='FULLY_DISPENSED').length,1);
 await f.command(c,multi,'CANCEL',{reason:'Synthetic partial cancellation'});
 const h=await f.pharmacy.read(f.actors.pharmacy,f.pharmacyOrg.id,r.data.id,{purpose:'history'});
 assert.equal(h.data.items.length,1);assert.equal(h.data.items[0].dispense.id,d.data.items.find(i=>i.dispense).dispense.id);assert.equal(h.data.items[0].quantity,multi.data.items[0].quantity);assert.equal(h.data.items[0].instructions,null);
}));
