import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,cpSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
// Execute the real runner against an exact historical migration set. Never
// weaken old ledger assertions merely because a new authorized slice exists.
export function migrationRunner(url,command,count=13){
 const dir=mkdtempSync(join(tmpdir(),'eh-historical-migrations-'));
 try{
  cpSync('packages/db/prisma/schema.prisma',join(dir,'schema.prisma'));mkdirSync(join(dir,'migrations'));
  cpSync('packages/db/prisma/migrations/migration_lock.toml',join(dir,'migrations/migration_lock.toml'));
  const names=readdirSync('packages/db/prisma/migrations').filter(n=>n!=='migration_lock.toml').sort().slice(0,count);assert.equal(names.length,count);
  for(const name of names)cpSync('packages/db/prisma/migrations/'+name,join(dir,'migrations',name),{recursive:true});
  const r=spawnSync('pnpm',['--filter','@egyhealth/db','exec','prisma','migrate',command,'--schema',join(dir,'schema.prisma')],{encoding:'utf8',env:{...process.env,DATABASE_URL:url},timeout:30000});
  assert.equal(r.status,0,`real migration runner ${command} (${count}) failed: ${r.stderr}`);
 }finally{rmSync(dir,{recursive:true,force:true});}
}
