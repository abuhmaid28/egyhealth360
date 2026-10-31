import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {observeApplicabilityQueries,signal,waitBlockedBy} from './observed-applicability.mjs';
export const closeCommand=(c,key=randomUUID())=>({consultationId:c.id,expectedVersion:1,operationKey:key});
export const closeSnapshot=async f=>Object.fromEntries(await Promise.all(['consultations','bookings','booking_events','booking_operations','booking_attendance','audit_logs'].map(async t=>[t,(await f.pool.query(`SELECT to_jsonb(x) value FROM public.${t} x ORDER BY to_jsonb(x)::text`)).rows])));
export async function closeRace(f,first,second,{pattern=/UPDATE public\.consultations SET state='CLOSED'/,rollback=false,expected=['COMMIT','BOOKING_CONFLICT'],name='close'}={}) {
  const entered=signal(),release=signal();let held=false,blocker,a,b;
  const stop=observeApplicabilityQueries((q,next)=>{
    if(!held&&pattern.test(q.text)){held=true;return Promise.resolve(next()).then(async value=>{blocker=q.pid;entered.resolve();await release.promise;if(rollback)throw Error('Synthetic winner rollback');return value;});}
    return next();
  });
  try {
    a=first();a.catch(()=>{});await entered.promise;b=second();b.catch(()=>{});
    const waiter=await waitBlockedBy(f.pool,blocker);release.resolve();
    const values=await Promise.allSettled([a,b]),outcomes=values.map(r=>r.status==='fulfilled'?'COMMIT':r.reason.code);
    assert.deepEqual(outcomes,expected);assert.notEqual(blocker,waiter);
    console.log('I2S7_CLOSE_POSTGRES_RACE',JSON.stringify({name,blockerPid:blocker,waiterPid:waiter,pgBlockingPidsObserved:true,rollback,outcomes}));return values;
  } finally {release.resolve();stop();await Promise.allSettled([a,b]);}
}
