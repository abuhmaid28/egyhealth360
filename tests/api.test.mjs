import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createApp } from '../apps/api/dist/app.js';

test('public health sanitizes database failures and matches OpenAPI', async () => {
  const app = await createApp({ check: async () => { throw new Error('postgresql://secret:password@private/db raw driver error'); }, close: async () => {} });
  try {
    await app.listen(0, '127.0.0.1');
    const response = await fetch(`${await app.getUrl()}/api/v1/health`);
    assert.equal(response.status, 503);
    const body = await response.json();
    const contract = JSON.parse(await readFile(new URL('../docs/openapi.json', import.meta.url)));
    assert.deepEqual(body, contract.paths['/api/v1/health'].get.responses['503'].content['application/json'].schema.const);
    assert.doesNotMatch(JSON.stringify(body), /secret|password|private|driver/);
  } finally { await app.close(); }
});
