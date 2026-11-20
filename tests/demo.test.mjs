import test from 'node:test';
import assert from 'node:assert/strict';
import { demoConfiguration, verificationConfiguration, safeFailure } from '../scripts/lib/m1-demo.mjs';
import { DEMO_FIXTURES } from '../packages/db/dist/index.js';
import { randomBytes } from 'node:crypto';

const env={NODE_ENV:'test',EH_DEMO_SEED_ENABLED:'1',EH_DEMO_PASSWORD:randomBytes(32).toString('base64url'),DATABASE_URL:'postgresql://local:local@localhost/demo',AUTH_BROWSER_ORIGIN:'http://localhost:3000'};
test('demo credential/execution/topology guard has no fallback and preserves password bytes',()=>{
  const password='  private synthetic credential  ';
  const config=demoConfiguration({...env,EH_DEMO_PASSWORD:password});assert.equal(config.password.toString('utf8'),password);config.password.fill(0);
  for(const overrides of [{NODE_ENV:'production'},{NODE_ENV:undefined},{EH_DEMO_SEED_ENABLED:undefined},{EH_DEMO_SEED_ENABLED:'true'},{EH_DEMO_PASSWORD:undefined},{EH_DEMO_PASSWORD:' '.repeat(32)},{EH_DEMO_PASSWORD:'é'.repeat(513)},{EH_DEMO_PASSWORD:'short'},{DATABASE_URL:undefined},{DATABASE_URL:'postgresql://remote.invalid/demo'},{DATABASE_URL:'postgresql://localhost/'},{DATABASE_URL:'postgresql://localhost/demo?host=evil.invalid'},{DATABASE_URL:'http://localhost/demo'}]) assert.throws(()=>demoConfiguration({...env,...overrides}),/DEMO_CONFIG_INVALID/);
  for(const host of ['localhost','127.0.0.1','[::1]','postgres']) {const c=demoConfiguration({...env,DATABASE_URL:`postgresql://${host}/demo`});c.password.fill(0);}
});
test('verification URL rejects remote/redirect-target-like configuration',()=>{
  assert.equal(verificationConfiguration(env).base,'http://127.0.0.1:3001');
  for(const url of ['http://remote.invalid','http://user:secret@localhost','http://localhost/path','http://localhost?x=1','http://localhost#x','https://localhost']) assert.throws(()=>verificationConfiguration({...env,M1_API_BASE_URL:url}));
});
test('fixed manifest and safe failures never expose arbitrary exception data',()=>{
  assert.equal(DEMO_FIXTURES.length,5);assert.equal(new Set(DEMO_FIXTURES.map(f=>f.email)).size,5);
  assert.ok(Object.isFrozen(DEMO_FIXTURES));assert.ok(DEMO_FIXTURES.every(f=>Object.isFrozen(f)&&f.email.endsWith('@example.invalid')&&f.label.startsWith('Synthetic Demo')));
  const secret=randomBytes(32).toString('base64url');assert.equal(JSON.stringify(safeFailure(new Error(secret))).includes(secret),false);
});
