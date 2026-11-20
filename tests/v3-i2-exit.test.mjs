import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';

test('I2S7 exact authorized-base migration 1–19 SQL bytes and lockfile remain unchanged',async () => {
  const pinned=JSON.parse(await readFile('tests/fixtures/v3-i2-slice7-migration-checksums.json','utf8'));
  assert.equal(pinned.baseSha,'b8ed01e4546ac94e52f9fcbec2f23e90b6fc6262');
  const root='packages/db/prisma/migrations/';
  assert.deepEqual((await readdir(root)).filter(n=>n!=='migration_lock.toml').sort().slice(0,19),Object.keys(pinned.migrations));
  assert.equal(Object.keys(pinned.migrations).length,19);
  const sha=async path=>createHash('sha256').update(await readFile(path)).digest('hex');
  for(const [name,expected] of Object.entries(pinned.migrations))assert.equal(await sha(root+name+'/migration.sql'),expected,name);
  assert.equal(await sha(root+'migration_lock.toml'),pinned.migrationLockSha256);
});
