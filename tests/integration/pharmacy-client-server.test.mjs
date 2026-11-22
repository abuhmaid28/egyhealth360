import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { isolatedPharmacy } from '../support/pharmacy.mjs';

const compile = (filePath, imports = {}) => {
  const out = {};
  new Function(
    'exports',
    'require',
    ts.transpileModule(readFileSync(filePath, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText,
  )(out, (id) => imports[id]);
  return out;
};

const s0 = compile('apps/web/src/lib/api/pharmacy-read.ts');
const liveModule = compile('apps/web/src/lib/api/pharmacy-live.ts', { './pharmacy-read': s0 });

const liveTransport = async (f, who) => {
  const headers = await f.rxLogin(who);
  const probe = await f.read('/auth/me', who);
  const baseOrigin = new URL(probe.response.url).origin;
  const requests = [];
  const fetcher = async (path, init) => {
    requests.push({ path, method: init.method });
    return fetch(`${baseOrigin}${path}`, {
      method: init.method,
      cache: init.cache,
      credentials: init.credentials,
      redirect: init.redirect,
      signal: init.signal,
      headers,
    });
  };
  return { fetcher, requests, headers, baseOrigin };
};

test('Combined client-server: GET/HEAD context, org discovery, selection, fulfillment, history with items:[], and fail-closed revocation', () =>
  isolatedPharmacy(async (f) => {
    // 1. S0 contract remains byte-exact inactive contract; Live adapter keeps S1 writes unavailable.
    assert.equal(
      createHash('sha256').update(readFileSync('apps/web/src/lib/api/pharmacy-read.ts')).digest('hex'),
      'e37f0f4861147cce3e387fa119b97d2c91a7bf4eb3945a52cceebde3a8fa0595',
    );
    const liveSrc = readFileSync('apps/web/src/lib/api/live.ts', 'utf8');
    assert.match(liveSrc, /fulfillment: unavailable/);
    assert.match(liveSrc, /updateFulfillment: unavailable/);
    assert.match(liveSrc, /artifacts: unavailable/);

    const { fetcher, requests, headers, baseOrigin } = await liveTransport(f, 'pharmacy');

    // 2. HEAD /api/v1/pharmacies/context matches GET headers and returns empty body.
    const headRes = await fetch(`${baseOrigin}/api/v1/pharmacies/context?page=1&pageSize=20`, {
      method: 'HEAD',
      headers,
    });
    assert.equal(headRes.status, 200);
    assert.equal(headRes.headers.get('cache-control'), 'no-store');
    assert.equal(await headRes.text(), '');

    // 3. PharmacyEngine discovers exact permitted organizations, never non-member/wrong-role orgs.
    const engine = new liveModule.PharmacyEngine(fetcher);
    engine.establishSession({ userId: f.users.pharmacy.id, role: 'PHARMACY_STAFF' });
    await engine.contexts(1, 20);
    const ctxSnap = engine.snapshot();
    assert.equal(ctxSnap.status, 'ready');
    assert.equal(ctxSnap.contexts.meta.total, 2);
    const discoveredIds = ctxSnap.contexts.data.map((o) => o.id).sort();
    assert.deepEqual(discoveredIds, [f.pharmacyOrg.id, f.pharmacy2.id].sort());

    // Wrong organization ID outside discovered scope fails closed locally without leaking.
    engine.selectOrganization('00000000-0000-4000-8000-000000000099');
    assert.equal(engine.snapshot().status, 'denied');
    assert.equal(engine.snapshot().scope, undefined);
    assert.equal(engine.snapshot().contexts, undefined);

    // Non-member staff sees empty context (total 0) and is denied on f.pharmacyOrg.
    const outsider = await f.addStaff('outsiderPharmacy');
    const outsiderTransport = await liveTransport(f, 'outsiderPharmacy');
    const outsiderEngine = new liveModule.PharmacyEngine(outsiderTransport.fetcher);
    outsiderEngine.establishSession({ userId: outsider.user.id, role: 'PHARMACY_STAFF' });
    await outsiderEngine.contexts(1, 20);
    assert.equal(outsiderEngine.snapshot().status, 'empty');
    assert.equal(outsiderEngine.snapshot().contexts.meta.total, 0);
    assert.equal((await f.read(f.queuePath, 'outsiderPharmacy')).response.status, 404);

    // Wrong roles fail closed (404) on /api/v1/pharmacies/context and queue routes.
    for (const role of ['patient', 'clinician', 'admin', 'lab']) {
      assert.equal((await f.read('/pharmacies/context?page=1&pageSize=20', role)).response.status, 404);
      assert.equal((await f.read(`${f.queuePath}?page=1&pageSize=1&purpose=fulfillment`, role)).response.status, 404);
    }

    // 4. Create + accept a route, read via PharmacyEngine (fulfillment), then cancel prescription -> history with items: [].
    const accepted = await f.readyPharmacy();
    await engine.contexts(1, 20);
    assert.equal(engine.snapshot().status, 'ready');
    engine.selectOrganization(f.pharmacyOrg.id);
    assert.equal(engine.snapshot().scope.orgId, f.pharmacyOrg.id);
    await engine.queue(1, 1);
    assert.equal(engine.snapshot().status, 'ready');
    assert.equal(engine.snapshot().queue.meta.total, 1);
    assert.equal(engine.snapshot().queue.data[0].id, accepted.data.id);

    await engine.detail(accepted.data.id, 1, 1);
    assert.equal(engine.snapshot().detail.data.purpose, 'FULFILLMENT');
    assert.equal(engine.snapshot().detail.data.items.length, 1);

    // Cancel prescription with 0 dispenses -> ACCEPTED route moves to CORRECTION_HISTORY with items: [].
    await f.command(f.c, f.signed, 'CANCEL', { reason: 'Synthetic client-server zero-dispense history' });
    engine.selectPurpose('history');
    await engine.queue(1, 1);
    const hQueue = engine.snapshot().queue;
    assert.equal(hQueue.meta.total, 1);
    assert.equal(hQueue.data[0].id, accepted.data.id);
    assert.deepEqual(hQueue.data[0].items, []);

    await engine.detail(accepted.data.id, 1, 1);
    const hDetail = engine.snapshot().detail.data;
    assert.equal(hDetail.purpose, 'CORRECTION_HISTORY');
    assert.equal(hDetail.patientDisplayName, null);
    assert.equal(hDetail.recordedState, 'ACCEPTED');
    assert.equal(hDetail.state, 'CANCELLED');
    assert.deepEqual(hDetail.items, []);

    // 5. Membership revocation clears prior contexts/queue/detail on subsequent read (fail-closed denied).
    await f.store.endMembership(f.actors.admin2, {
      organizationId: f.pharmacyOrg.id,
      membershipId: f.pharmacyMember.id,
    });
    await engine.queue(1, 1);
    assert.equal(engine.snapshot().status, 'denied');
    assert.equal(engine.snapshot().queue, undefined);
    assert.equal(engine.snapshot().detail, undefined);

    await engine.contexts(1, 20);
    assert.equal(engine.snapshot().contexts.meta.total, 1);
    assert.deepEqual(engine.snapshot().contexts.data.map((o) => o.id), [f.pharmacy2.id]);

    // 6. Session/user revocation returns 401 -> PharmacyEngine transitions synchronously to signed-out & clears payloads.
    await f.pool.query("UPDATE public.users SET status='DISABLED' WHERE id=$1", [f.users.pharmacy.id]);
    await engine.contexts(1, 20);
    assert.equal(engine.snapshot().status, 'signed-out');
    assert.equal(engine.snapshot().contexts, undefined);
    assert.equal(engine.snapshot().scope, undefined);

    // Every request sent by PharmacyEngine was GET only (zero S1 Live mutations triggered).
    assert.ok(requests.length > 0);
    assert.ok(requests.every((r) => r.method === 'GET' && r.path.startsWith('/api/v1/pharmacies/')));
  }));

test('Combined client-server: wrong-patient privacy restriction yields zero total and fail-closed detail denial', () =>
  isolatedPharmacy(async (f) => {
    const accepted = await f.readyPharmacy();
    const { fetcher } = await liveTransport(f, 'pharmacy');
    const engine = new liveModule.PharmacyEngine(fetcher);
    engine.establishSession({ userId: f.users.pharmacy.id, role: 'PHARMACY_STAFF' });
    await engine.contexts(1, 20);
    engine.selectOrganization(f.pharmacyOrg.id);
    await engine.queue(1, 1);
    assert.equal(engine.snapshot().queue.meta.total, 1);

    // Patient applies privacy restriction on prescription lineage.
    await f.command(f.c, f.signed, 'PRIVACY', { reason: 'Synthetic client-server wrong-patient check' });
    await engine.detail(accepted.data.id, 1, 1);
    assert.equal(engine.snapshot().status, 'denied');
    assert.equal(engine.snapshot().detail, undefined);
    assert.equal(engine.snapshot().queue, undefined);
    assert.equal(engine.snapshot().scope, undefined);
    assert.equal(engine.snapshot().contexts, undefined);

    await engine.contexts(1, 20);
    engine.selectOrganization(f.pharmacyOrg.id);
    await engine.queue(1, 1);
    assert.equal(engine.snapshot().status, 'empty');
    assert.equal(engine.snapshot().queue.meta.total, 0);
  }));
