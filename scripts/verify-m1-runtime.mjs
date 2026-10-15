import { Buffer } from 'node:buffer';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';

// One ephemeral secret for the entire disposable workflow; never an argument/output.
const password=randomBytes(32).toString('base64url');
const env={...process.env,NODE_ENV:'test',EH_DEMO_SEED_ENABLED:'1',EH_DEMO_PASSWORD:password};
async function run(script) {
  await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[script],{env,stdio:['ignore','pipe','pipe']});
    const output=[];
    child.stdout.on('data',chunk=>output.push(chunk));
    child.stderr.on('data',chunk=>output.push(chunk));
    child.on('error',()=>reject(new Error('M1_RUNTIME_FAILED')));
    child.on('close',code=>{
      // Do not forward arbitrary child output, even on failure.
      try {
        const text=Buffer.concat(output).toString('utf8');
        if(code!==0 || text.includes(password)) throw new Error();
        if(['scripts/verify-care-plan-runtime.mjs','scripts/verify-blood-pressure-runtime.mjs'].includes(script)) { if(!text.includes('runtime PASS')) throw new Error(); }
        else { const summary=JSON.parse(text); if(summary.result!=='PASS') throw new Error(); }
        resolve();
      } catch {reject(new Error('M1_RUNTIME_FAILED'));}
    });
  });
}
try {
  for(const script of ['scripts/demo-seed.mjs','scripts/verify-m1.mjs','scripts/demo-seed.mjs','scripts/verify-m1.mjs']) await run(script);
  const { createClinicalCatalogPersistence } = await import('../packages/db/dist/index.js');
  const catalog=createClinicalCatalogPersistence(env.DATABASE_URL);
  try {await catalog.bootstrapApprovedCatalog();} finally {await catalog.close();}
  await run('scripts/verify-care-plan-runtime.mjs');
  await run('scripts/verify-blood-pressure-runtime.mjs');
  console.log('EH-011 genuine BP HTTP runtime PASS');
  console.log('EH-010 synthetic service runtime PASS');
  console.log('M1 runtime seed/HTTP isolation/logout/repeat verification PASS');
} catch {console.error('M1_RUNTIME_FAILED');process.exitCode=1;}
