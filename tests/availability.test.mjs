import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {schedulingValues,schedulingZone,offsetMatches,availabilityExact,availabilityId,availabilityPage,availabilityTime} from '../packages/db/dist/index.js';
import {parseAvailabilityJson,parseAvailabilityQuery} from '../apps/api/dist/availability.js';
const settings={timeZone:'Africa/Cairo',durationMinutes:30,minimumBookingLead:0,publicationHorizonDays:30};
test('I2S2 configuration bounds and authoritative IANA zone',()=>{
 assert.equal(schedulingValues(settings).timeZone,'Africa/Cairo');
 for(const [field,bad] of Object.entries({durationMinutes:[4,241,1.5,'30',NaN,Infinity],minimumBookingLead:[-1,10081,0.5,-0],publicationHorizonDays:[0,91,1.2]}))for(const value of bad)assert.throws(()=>schedulingValues({...settings,[field]:value}));
 for(const value of ['+02:00','invalid','Africa/Cairo\n','',null])assert.throws(()=>schedulingZone(value));
 for(const v of [{...settings,role:'ADMIN'},Object.defineProperty({...settings},'secret',{value:1}),{...settings,[Symbol()]:1},Object.create(settings)])assert.throws(()=>schedulingValues(v));
 assert.throws(()=>availabilityExact({get a(){throw Error('getter');}},['a']));
});
test('I2S2 strict timestamps and IANA DST offsets at exact instants',()=>{
 for(const text of ['2026-02-30T12:00:00Z','2026-01-01T12:00:00','2026-13-01T12:00:00Z','2026-01-01T24:00:00Z','2026-01-01T12:00:00-00:00','2026-01-01T12:00:00.1234Z','Infinity'])assert.throws(()=>availabilityTime(text));
 for(const text of ['2026-03-08T01:30:00-05:00','2026-03-08T03:30:00-04:00','2026-11-01T01:30:00-04:00','2026-11-01T01:30:00-05:00'])assert.ok(offsetMatches(text,'America/New_York'));
 for(const text of ['2026-03-08T02:30:00-05:00','2026-03-08T03:30:00-05:00','2026-11-01T01:30:00Z'])assert.throws(()=>offsetMatches(text,'America/New_York'));
 assert.ok(offsetMatches('2026-01-01T12:00:00+05:45','Asia/Kathmandu'));
});
test('I2S2 strict operation UUID, flat JSON/duplicate decoded keys and publication identity injection',()=>{
 const v={clinicId:randomUUID(),startAt:'2026-12-01T12:00:00Z',endAt:'2026-12-01T12:30:00Z',operationKey:randomUUID()};assert.deepEqual(parseAvailabilityJson(JSON.stringify(v),true),v);
 for(const key of ['clinicianId','userId','profileId','membershipId','affiliationId','capacity','timeZone','configurationVersion','status','booking','assignmentId'])assert.throws(()=>parseAvailabilityJson(JSON.stringify({...v,[key]:'canary'}),true));
 for(const raw of ['null','[]','{"__proto__":{}}',JSON.stringify(v).replace('"clinicId":','"clinicId":"'+v.clinicId+'","\\u0063linicId":')])assert.throws(()=>parseAvailabilityJson(raw,true));
 for(const value of [v.operationKey.toUpperCase(),v.operationKey+'\n',null])assert.throws(()=>availabilityId(value));
 assert.deepEqual(parseAvailabilityJson(JSON.stringify({operationKey:v.operationKey,expectedVersion:1}),false),{operationKey:v.operationKey,expectedVersion:1});
});
test('I2S2 bounded public interval, exact query fields and deterministic pagination',()=>{
 assert.equal(availabilityPage({}).pageSize,20);
 for(const q of ['?','?page=0','?page=01','?pageSize=101','?page=10001','?page=1&page=2','?includePrivate=true','?status=PUBLISHED','?from=2026-01-01T00:00:00Z','?from=2026-01-01T00:00:00Z&to=2027-01-01T00:00:00Z'])assert.throws(()=>parseAvailabilityQuery(q,true));
 assert.throws(()=>parseAvailabilityQuery('?clinic='+randomUUID(),false));
 assert.equal(parseAvailabilityQuery('?page=2&pageSize=5',true).page,'2');
});
test('I2S2 exact additive schema/API/migration boundary preserves complete historical OpenAPI bytes',async()=>{
 const {readFile,readdir}=await import('node:fs/promises'),{createHash}=await import('node:crypto'),{beforeI2Slice2}=await import('./support/openapi-baseline.mjs');
 const raw=await readFile('docs/openapi.json','utf8'),old=beforeI2Slice2(raw),api=JSON.parse(raw),prior=JSON.parse(old);
 assert.equal(createHash('sha256').update(old).digest('hex'),'29929536d16f7c1abd21c21aed8dafbc97a1150f58bf9bcbc67d1e46dc02b48b');
 assert.deepEqual(Object.keys(api.paths),[...Object.keys(prior.paths),'/api/v1/directory/providers/{publicId}/availability','/api/v1/me/availability','/api/v1/me/availability/{slotId}/withdraw']);
 assert.deepEqual(Object.keys(api.components.schemas),[...Object.keys(prior.components.schemas),'AvailabilityPublish','AvailabilityWithdraw','PublicAvailabilitySlot','OwnAvailabilitySlot']);
 assert.deepEqual(Object.keys(api.components.schemas.PublicAvailabilitySlot.properties),['id','providerId','clinicId','startAt','endAt','timeZone','bookable']);
 const names=(await readdir('packages/db/prisma/migrations')).filter(n=>n!=='migration_lock.toml').sort();assert.equal(names.length,15);assert.equal(names[14],'20261027210000_v3_i2_availability');
 const schema=await readFile('packages/db/prisma/schema.prisma','utf8');assert.equal([...schema.matchAll(/^model /gm)].length,34);assert.doesNotMatch(schema,/model (Booking|BookingEvent|Consultation|ConsultationDocumentVersion|FollowUpIntent)\b/);
 const sql=await readFile('packages/db/prisma/migrations/'+names[14]+'/migration.sql','utf8');assert.match(sql,/EXCLUDE USING gist/);assert.match(sql,/tstzrange\(start_at,end_at,'\[\)'\)/);assert.doesNotMatch(sql,/INSERT INTO public\.(clinic_scheduling_settings|availability_slots)|UPDATE public\.(users|sessions|organization_memberships|clinician_patient_assignments)/);
});
