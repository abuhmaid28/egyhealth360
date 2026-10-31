import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedI2Exit} from '../support/v3-i2-exit.mjs';
import {closeCommand,closeSnapshot} from '../support/consultation-close.mjs';

test('I2S7 SQL rejects partial close, unchanged/forged provenance and terminal reopening',()=>isolatedI2Exit(async f=>{
  const c=await f.readyIntent(),before=await closeSnapshot(f);
  await assert.rejects(f.pool.query("UPDATE bookings SET state='CONSULTED',version=version+1 WHERE id=$1",[c.bookingId]),e=>e.code==='23514');
  await assert.rejects(f.pool.query("UPDATE consultations SET state='CLOSED',version=2,closed_by_user_id=treating_clinician_user_id,close_assignment_id=assignment_id,close_command='CLOSE',close_operation_key=$2 WHERE id=$1",[c.id,randomUUID()]),e=>e.code==='23514');
  for(const sql of ["UPDATE consultations SET opened_at=opened_at+interval '1 second'","UPDATE consultations SET state=state",'DELETE FROM consultations','TRUNCATE consultations'])await assert.rejects(f.pool.query(sql),e=>['23514','0A000'].includes(e.code));
  assert.deepEqual(await closeSnapshot(f),before);
  const result=await f.consultations.closeConsultation(f.actors.clinician,closeCommand(c)),closed=await closeSnapshot(f);
  for(const sql of ["UPDATE consultations SET state='OPEN',version=3","UPDATE consultations SET closed_at=clock_timestamp()","UPDATE consultations SET closed_by_user_id=opened_by_user_id","UPDATE bookings SET state='IN_CONSULTATION',version=version+1","UPDATE booking_events SET command=command WHERE command='CLOSE'","DELETE FROM booking_operations WHERE command='CLOSE'"])await assert.rejects(f.pool.query(sql),e=>e.code==='23514');
  assert.deepEqual(await closeSnapshot(f),closed);assert.equal(result.state,'CLOSED');
}));

for(const missing of ['operation','audit','result'])test('I2S7 deferred SQL close completeness rejects missing '+missing+' and rolls back both states',()=>isolatedI2Exit(async f=>{
  const c=await f.readyIntent(),before=await closeSnapshot(f),key=randomUUID(),x=await f.pool.connect();
  try {
    await x.query('BEGIN');
    const b=(await x.query("UPDATE bookings SET state='CONSULTED',version=version+1 WHERE id=$1 RETURNING version",[c.bookingId])).rows[0];
    await x.query("INSERT INTO booking_events(booking_id,version,command,from_state,to_state,actor_user_id,operation_key) VALUES($1,$2,'CLOSE','IN_CONSULTATION','CONSULTED',$3,$4)",[c.bookingId,b.version,f.users.clinician.id,key]);
    const row=(await x.query("UPDATE consultations SET state='CLOSED',version=2,closed_by_user_id=treating_clinician_user_id,close_assignment_id=assignment_id,close_command='CLOSE',close_operation_key=$2,closed_at='2099-01-01T00:00:00Z' WHERE id=$1 RETURNING closed_at,opened_at",[c.id,key])).rows[0];
    assert.ok(row.closed_at>=row.opened_at);assert.ok(row.closed_at.getTime()<Date.now()+10000,'SQL clock override ignored');
    if(missing!=='operation') {
      const result={id:missing==='result'?randomUUID():c.id,encounterId:c.encounterId,bookingId:c.bookingId,state:'CLOSED',bookingState:'CONSULTED',version:2,closedAt:row.closed_at.toISOString()};
      await x.query("INSERT INTO booking_operations(actor_user_id,command,operation_key,fingerprint,booking_id,result) VALUES($1,'CLOSE',$2,$3,$4,$5)",[f.users.clinician.id,key,'a'.repeat(64),c.bookingId,JSON.stringify(result)]);
    }
    if(missing!=='audit')await x.query("INSERT INTO audit_logs(actor_user_id,action_type,entity_type,entity_id,safe_metadata) VALUES($1,'CONSULTATION_CLOSED','consultation',$2,'{}')",[f.users.clinician.id,c.id]);
    await assert.rejects(x.query('COMMIT'),e=>['23514','23503'].includes(e.code));
  } finally {await x.query('ROLLBACK');x.release();}
  assert.deepEqual(await closeSnapshot(f),before);
  await f.consultations.closeConsultation(f.actors.clinician,closeCommand(c,key));
}));

test('I2S7 SQL cannot manufacture OPEN/CLOSE booking history without a consultation/encounter',()=>isolatedI2Exit(async f=>{
  const b=await f.ready(),before=await closeSnapshot(f),x=await f.pool.connect(),opened=randomUUID(),closed=randomUUID(),fake=randomUUID();
  try {
    await x.query('BEGIN');
    await x.query("UPDATE bookings SET state='IN_CONSULTATION',version=2 WHERE id=$1",[b.id]);
    await x.query("INSERT INTO booking_events(booking_id,version,command,from_state,to_state,actor_user_id,operation_key) VALUES($1,2,'OPEN','BOOKED','IN_CONSULTATION',$2,$3)",[b.id,f.users.clinician.id,opened]);
    await x.query("INSERT INTO booking_attendance(booking_id,version,observation,actor_user_id) VALUES($1,2,'ATTENDED',$2)",[b.id,f.users.clinician.id]);
    await x.query("INSERT INTO booking_operations(actor_user_id,command,operation_key,fingerprint,booking_id,result) VALUES($1,'OPEN',$2,$3,$4,$5)",[f.users.clinician.id,opened,'a'.repeat(64),b.id,JSON.stringify({id:fake,bookingId:b.id})]);
    await x.query("UPDATE bookings SET state='CONSULTED',version=3 WHERE id=$1",[b.id]);
    await x.query("INSERT INTO booking_events(booking_id,version,command,from_state,to_state,actor_user_id,operation_key) VALUES($1,3,'CLOSE','IN_CONSULTATION','CONSULTED',$2,$3)",[b.id,f.users.clinician.id,closed]);
    await x.query("INSERT INTO booking_operations(actor_user_id,command,operation_key,fingerprint,booking_id,result) VALUES($1,'CLOSE',$2,$3,$4,$5)",[f.users.clinician.id,closed,'b'.repeat(64),b.id,JSON.stringify({id:fake,bookingId:b.id,state:'CLOSED',bookingState:'CONSULTED'})]);
    await assert.rejects(x.query('COMMIT'),e=>e.code==='23514');
  }finally{await x.query('ROLLBACK');x.release();}
  assert.deepEqual(await closeSnapshot(f),before);
}));
