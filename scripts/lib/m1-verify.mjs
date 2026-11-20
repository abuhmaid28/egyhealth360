import { createDemoPersistence, DEMO_DATASET } from '../../packages/db/dist/index.js';
import { demoConfiguration, verificationConfiguration, passwordCheck, seedDemo } from './m1-demo.mjs';

const expect = value => { if (!value) throw new Error('M1_HTTP_FAILED'); };
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const keys = (object,expected) => object && same(Object.keys(object).sort(), [...expected].sort());

export async function verifyCommand(env) {
  const config = demoConfiguration(env);
  let store;
  try {
    let http;
    try { http = verificationConfiguration(env); } catch { throw new Error('DEMO_CONFIG_INVALID'); }
    store = createDemoPersistence(config.databaseUrl);
    // Strict preflight before HTTP or repeat-seed: a verifier never repairs initial state.
    const state = await store.inspectIdentities({ acceptsExistingHash: passwordCheck(config.password) });
    const identities = new Map(state.identities.map(identity => [identity.key,identity]));
    const sessions = [];
    const request = async (path,{method='GET',body,cookie,csrf}={}) => {
      try {
        const response = await fetch(`${http.base}/api/v1${path}`, {
          method, redirect:'error', signal:globalThis.AbortSignal.timeout(10000),
          headers:{...(method==='POST'?{Origin:http.origin,'Content-Type':'application/json','X-EH-Login':'1'}:{}),...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{})},
          ...(body!==undefined?{body:JSON.stringify(body)}:{}),
        });
        const text = await response.text();
        let json = null;
        try { json = text ? JSON.parse(text) : null; } catch { /* retain issued cookie for cleanup even on malformed JSON */ }
        return {status:response.status,headers:response.headers,json};
      } catch { throw new Error('M1_HTTP_FAILED'); }
    };
    const logout = async session => {
      const response = await request('/auth/logout',{method:'POST',body:{},cookie:session.cookie,csrf:session.csrf});
      expect(response.status===204 && response.json===null && response.headers.get('cache-control')==='no-store');
      expect(/Max-Age=0/.test(response.headers.get('set-cookie')??''));
      session.closed = true;
    };
    const protectedRead = async (session,key,allowed) => {
      const target = identities.get(key);
      const response = await request(`/patients/${target.profileId}/profile`,{cookie:session.cookie});
      expect(response.headers.get('cache-control')==='no-store' && response.headers.get('set-cookie')===null);
      expect(response.status === (allowed?200:404));
      expect(same(response.json,allowed?{data:{id:target.profileId,displayName:target.label}}:{error:{code:'PATIENT_NOT_FOUND',message:'Not found.'}}));
    };
    let failure;
    let cleanupFailed = false;
    try {
      const health = await request('/health'); expect(health.status===200 && same(health.json,{data:{status:'ok'}}));
      for(const identity of state.identities) {
        const login = await request('/auth/login',{method:'POST',body:{email:identity.email,password:config.password.toString('utf8')}});
        // Register any issued credential before assertions, so failures still attempt cleanup.
        const cookie = login.headers.get('set-cookie')?.split(';',1)[0];
        if (cookie) sessions.push({key:identity.key,cookie,csrf:login.json?.data?.csrfToken,closed:false});
        expect(login.status===200 && login.headers.get('cache-control')==='no-store');
        expect(cookie?.startsWith(`${http.cookieName}=`));
        const data=login.json?.data;
        expect(keys(login.json,['data']) && keys(data,['user','session','csrfToken']));
        expect(same(data.user,{id:identity.userId,email:identity.email,role:identity.role}));
        expect(keys(data.session,['expiresAt']) && Number.isFinite(Date.parse(data.session.expiresAt)) && /^[A-Za-z0-9_-]{43}$/.test(data.csrfToken));
        const me=await request('/auth/me',{cookie});
        expect(me.status===200 && same(me.json,login.json) && me.headers.get('cache-control')==='no-store' && me.headers.get('set-cookie')===null);
      }
      for(const session of sessions) for(const target of ['patient-a','patient-b']) {
        const allowed=session.key===target || (session.key==='clinician-assigned' && target==='patient-a');
        await protectedRead(session,target,allowed);
      }
      for(const session of sessions) {
        await logout(session);
        for(const path of ['/auth/me',`/patients/${identities.get('patient-a').profileId}/profile`]) {
          const response=await request(path,{cookie:session.cookie});
          expect(response.status===401 && same(response.json,{error:{code:'AUTH_UNAUTHENTICATED',message:'Authentication required.'}}) && response.headers.get('cache-control')==='no-store');
        }
      }
    } catch (error) { failure = error; } finally {
      for(const session of sessions.filter(s=>!s.closed)) {
        try { await logout(session); } catch { cleanupFailed=true; }
      }
    }
    if (cleanupFailed) throw new Error('M1_CLEANUP_FAILED');
    if (failure) throw failure;
    const beforeRepeat=await store.inspectIdentities({acceptsExistingHash:passwordCheck(config.password)});
    if(!same(state,beforeRepeat)) throw new Error('M1_REPEAT_FAILED');
    // Require complete state again under the seed transaction's locks: even drift
    // between inspection and repeat cannot turn verification into a repair.
    const repeated=await seedDemo(store,config.password,{requireExisting:true});
    const after=await store.inspectIdentities({acceptsExistingHash:passwordCheck(config.password)});
    if(!same(repeated.created,{users:0,profiles:0,assignments:0}) || !same(state,repeated.state) || !same(state,after)) throw new Error('M1_REPEAT_FAILED');
    return {dataset:DEMO_DATASET,result:'PASS',identities:5,profiles:4,activeRelationships:1,http:'PASS',logout:'PASS',repeatCreated:repeated.created};
  } finally {config.password.fill(0);if(store) await store.close();}
}
