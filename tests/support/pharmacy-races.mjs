import assert from 'node:assert/strict';
import {observeApplicabilityQueries,signal,waitBlockedBy} from './observed-applicability.mjs';
export const pharmacyWrite=/INSERT INTO public\.pharmacy_(?:routes|route_versions|dispenses|dispense_corrections)/;
export async function pharmacyRace(f,first,second,{pattern=pharmacyWrite,rollback=false,expected=['COMMIT','PHARMACY_CONFLICT'],name='pharmacy'}={}){
 const entered=signal(),release=signal();let held=false,blocker,a,b;const stop=observeApplicabilityQueries((q,next)=>{if(!held&&pattern.test(q.text)){held=true;return Promise.resolve(next()).then(async r=>{blocker=q.pid;entered.resolve();await release.promise;if(rollback)throw Error('Synthetic pharmacy rollback');return r;});}return next();});
 try{a=first();a.catch(()=>{});await entered.promise;b=second();b.catch(()=>{});const waiter=await waitBlockedBy(f.pool,blocker);release.resolve();const values=await Promise.allSettled([a,b]),outcomes=values.map(v=>v.status==='fulfilled'?'COMMIT':v.reason.code??'ROLLBACK');assert.deepEqual(outcomes,expected);console.log('I3S2_POSTGRES_RACE',JSON.stringify({name,blockerPid:blocker,waiterPid:waiter,pgBlockingPidsObserved:true,rollback,outcomes}));return values;}
 finally{release.resolve();stop();await Promise.allSettled([a,b]);}
}
