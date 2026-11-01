import assert from 'node:assert/strict';
import {observeApplicabilityQueries,signal,waitBlockedBy} from './observed-applicability.mjs';
export const rxWrite=/INSERT INTO public\.prescription_(?:versions|privacy_restrictions)/;
export async function rxRace(f,first,second,{pattern=rxWrite,rollback=false,expected=['COMMIT','PRESCRIPTION_CONFLICT'],name='source'}={}) {
 const entered=signal(),release=signal();let held=false,blocker,a,b;
 const stop=observeApplicabilityQueries((q,next)=>{if(!held&&pattern.test(q.text)){held=true;return Promise.resolve(next()).then(async r=>{blocker=q.pid;entered.resolve();await release.promise;if(rollback)throw Error('Synthetic rollback');return r;});}return next();});
 try {a=first();a.catch(()=>{});await entered.promise;b=second();b.catch(()=>{});const waiter=await waitBlockedBy(f.pool,blocker);release.resolve();const values=await Promise.allSettled([a,b]),outcomes=values.map(v=>v.status==='fulfilled'?'COMMIT':v.reason.code??'ROLLBACK');assert.deepEqual(outcomes,expected);console.log('I3S1_POSTGRES_RACE',JSON.stringify({name,blockerPid:blocker,waiterPid:waiter,pgBlockingPidsObserved:true,rollback,outcomes}));return values;}
 finally {release.resolve();stop();await Promise.allSettled([a,b]);}
}
