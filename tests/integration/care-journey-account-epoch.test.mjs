import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { PrismaClient } from '../../packages/db/dist/generated/prisma/client.js';
import { observeApplicabilityQueries, waitBlocked } from '../support/observed-applicability.mjs';
import { isolatedOrganizations } from '../support/organizations.mjs';
import { isolatedBookings } from '../support/bookings.mjs';
import { pair, rejectsConstraint, withTransaction } from '../support/database.mjs';

const require = createRequire(new URL('../../packages/db/package.json', import.meta.url));
const { PrismaPg } = require('@prisma/adapter-pg');
const guardConstraint = 'users_account_epoch_guard';
const overflowConstraint = 'users_account_epoch_overflow';

const email = () => `${randomUUID()}@example.invalid`;
const insertUser = async connection => (await connection.query(
  "INSERT INTO public.users (email, password_hash, role) VALUES ($1,'synthetic-test-hash','ADMIN') RETURNING id, account_epoch",
  [email()],
)).rows[0];
const epoch = async (connection, id) => (await connection.query(
  'SELECT role, status, account_epoch FROM public.users WHERE id = $1', [id],
)).rows[0];

test('account epoch initializes at one and increments once per actual status or role transition', () =>
  withTransaction(async c => {
    const admin = await insertUser(c);
    assert.equal(admin.account_epoch, 1);
    const explicit = (await c.query(`
      INSERT INTO public.users (email, password_hash, role, account_epoch)
      VALUES ($1, 'synthetic-test-hash', 'ADMIN', 1) RETURNING account_epoch`, [email()])).rows[0];
    assert.equal(explicit.account_epoch, 1);
    for (const [suffix, status, role, accountEpoch] of [
      ["status = 'DISABLED'", 'DISABLED', 'ADMIN', 2],
      ["status = 'ACTIVE'", 'ACTIVE', 'ADMIN', 3],
      ["role = 'CLINICIAN'", 'ACTIVE', 'CLINICIAN', 4],
      ["role = 'ADMIN', status = 'DISABLED'", 'DISABLED', 'ADMIN', 5],
      ['role = role, status = status, account_epoch = account_epoch', 'DISABLED', 'ADMIN', 5],
      ['email = $2, updated_at = clock_timestamp()', 'DISABLED', 'ADMIN', 5],
    ]) {
      await c.query(`UPDATE public.users SET ${suffix} WHERE id = $1`,
        suffix.includes('$2') ? [admin.id, email()] : [admin.id]);
      assert.deepEqual(await epoch(c, admin.id), { status, role, account_epoch: accountEpoch });
    }
    const profile = await pair(c);
    await rejectsConstraint(c, "UPDATE public.users SET role = 'ADMIN' WHERE id = $1",
      [profile.patientUser.id], '23001', 'patient_profiles_user_role_fkey');
    assert.deepEqual(await epoch(c, profile.patientUser.id), { role: 'PATIENT', status: 'ACTIVE', account_epoch: 1 });
  }));

test('initialization, direct tampering and conflict updates fail closed without changing the old epoch', () =>
  withTransaction(async c => {
    const admin = await insertUser(c);
    const initialize = `
      INSERT INTO public.users (email, password_hash, role, account_epoch)
      VALUES ($1, 'synthetic-test-hash', 'ADMIN', $2)`;
    for (const value of [null, 0, -1, 2]) {
      await rejectsConstraint(c, initialize, [email(), value], '23514', guardConstraint);
    }
    await c.query("UPDATE public.users SET status = 'DISABLED' WHERE id = $1", [admin.id]);
    for (const update of [
      'account_epoch = NULL', 'account_epoch = 1', 'account_epoch = account_epoch - 1',
      'account_epoch = account_epoch + 1', "status = 'ACTIVE', account_epoch = account_epoch + 1",
      "status = 'ACTIVE', account_epoch = account_epoch + 2",
    ]) {
      await rejectsConstraint(c, `UPDATE public.users SET ${update} WHERE id = $1`, [admin.id], '23514', guardConstraint);
    }
    const upsert = `
      INSERT INTO public.users(id, email, password_hash, role, status, account_epoch)
      VALUES ($1, $2, 'synthetic-test-hash', 'ADMIN', 'ACTIVE', $3)
      ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status`;
    const newest = randomUUID();
    await c.query(upsert, [newest, email(), 1]);
    assert.equal((await epoch(c, newest)).account_epoch, 1);
    await rejectsConstraint(c, upsert, [admin.id, email(), 2], '23514', guardConstraint);
    await rejectsConstraint(c, `${upsert}, account_epoch = EXCLUDED.account_epoch`,
      [admin.id, email(), 1], '23514', guardConstraint);
    assert.deepEqual(await epoch(c, admin.id), { role: 'ADMIN', status: 'DISABLED', account_epoch: 2 });
    await c.query(upsert, [admin.id, email(), 1]);
    await c.query(upsert, [admin.id, email(), 1]);
    assert.deepEqual(await epoch(c, admin.id), { role: 'ADMIN', status: 'ACTIVE', account_epoch: 3 });
  }));

test('overflow rejects only the transition and preserves a privileged synthetic max-value fixture on rollback', () =>
  isolatedOrganizations(async f => {
    const c = await f.pool.connect();
    try {
      await c.query('BEGIN');
      const admin = await insertUser(c);
      // Only the disposable owner fixture may place the counter at the boundary.
      await c.query('ALTER TABLE public.users DISABLE TRIGGER cjp_users_account_epoch_write_guard');
      await c.query('UPDATE public.users SET account_epoch = 2147483647 WHERE id = $1', [admin.id]);
      await c.query('ALTER TABLE public.users ENABLE TRIGGER cjp_users_account_epoch_write_guard');
      const enabled = (await c.query(`
        SELECT tgenabled FROM pg_trigger WHERE tgrelid = 'public.users'::regclass
          AND tgname = 'cjp_users_account_epoch_write_guard'`)).rows[0];
      assert.equal(enabled.tgenabled, 'O');
      for (const statement of ["role = 'CLINICIAN'", "status = 'DISABLED'"]) {
        await rejectsConstraint(c, `UPDATE public.users SET ${statement} WHERE id = $1`,
          [admin.id], '23514', overflowConstraint);
      }
      await c.query('UPDATE public.users SET email = $2, status = status WHERE id = $1', [admin.id, email()]);
      assert.deepEqual(await epoch(c, admin.id), { role: 'ADMIN', status: 'ACTIVE', account_epoch: 2147483647 });
      await c.query('ROLLBACK');
      assert.equal(await epoch(f.pool, admin.id), undefined);
    } finally {
      await c.query('ROLLBACK');
      c.release();
    }
  }));

test('real concurrent role/status transitions wait and recompute under both commit and rollback orders', () =>
  isolatedOrganizations(async f => {
    const first = await f.pool.connect();
    const second = await f.pool.connect();
    const blocker = (await first.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
    const waiter = (await second.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
    const roleChange = "role = 'CLINICIAN'";
    const statusChange = "status = 'DISABLED'";
    const change = (client, statement, id) => client.query(
      `UPDATE public.users SET ${statement} WHERE id = $1 RETURNING account_epoch`, [id],
    );
    try {
      for (const roleFirst of [true, false]) {
        for (const rollBackFirst of [false, true]) {
          const { id } = await insertUser(f.pool);
          const [firstChange, secondChange] = roleFirst ? [roleChange, statusChange] : [statusChange, roleChange];
          await first.query('BEGIN');
          await second.query('BEGIN');
          let pending;
          try {
            assert.equal((await change(first, firstChange, id)).rows[0].account_epoch, 2);
            pending = change(second, secondChange, id);
            pending.catch(() => {});
            await waitBlocked(f.pool, waiter, 5000, blocker);
            await first.query(rollBackFirst ? 'ROLLBACK' : 'COMMIT');
            const expectedEpoch = rollBackFirst ? 2 : 3;
            assert.equal((await pending).rows[0].account_epoch, expectedEpoch);
            await second.query('COMMIT');
            assert.deepEqual(await epoch(f.pool, id), {
              role: rollBackFirst && roleFirst ? 'ADMIN' : 'CLINICIAN',
              status: rollBackFirst && !roleFirst ? 'ACTIVE' : 'DISABLED',
              account_epoch: expectedEpoch,
            });
          } finally {
            await first.query('ROLLBACK');
            await pending?.catch(() => {});
            await second.query('ROLLBACK');
          }
        }
      }
    } finally {
      first.release();
      second.release();
    }
  }));

test('Prisma scalar metadata and generated operations exclude the epoch, and logout and public projections stay dark', () =>
  isolatedBookings(async f => {
    const model = await readFile('packages/db/src/generated/prisma/models/User.ts', 'utf8');
    assert.doesNotMatch(model, /accountEpoch|account_epoch/);
    const generated = await readFile('packages/db/src/generated/prisma/internal/class.ts', 'utf8');
    const metadata = /^config\.runtimeDataModel = JSON\.parse\((".*")\)$/m.exec(generated);
    assert.ok(metadata, 'Generated runtime model metadata must be checked');
    const fields = JSON.parse(JSON.parse(metadata[1])).models.User.fields;
    assert.ok(fields.some(field => field.name === 'status'));
    assert.ok(fields.every(field => !/account.?epoch/i.test(field.name) && field.dbName !== 'account_epoch'));

    const client = new PrismaClient({ adapter: new PrismaPg(f.url), log: [] });
    const userSql = [];
    const stop = observeApplicabilityQueries((query, next) => {
      if (/\busers\b/i.test(query.text)) userSql.push(query.text);
      return next();
    });
    try {
      const created = await client.user.create({ data: { email: email(), passwordHash: f.hash, role: 'ADMIN' } });
      const read = await client.user.findUniqueOrThrow({ where: { id: created.id } });
      const updated = await client.user.update({ where: { id: created.id }, data: { status: 'DISABLED' } });
      for (const result of [created, read, updated]) {
        assert.equal(Object.hasOwn(result, 'accountEpoch'), false);
        assert.equal(Object.hasOwn(result, 'account_epoch'), false);
      }
      await assert.rejects(client.user.findUnique({ where: { id: created.id }, select: { accountEpoch: true } }),
        /Unknown field `accountEpoch`/);
      assert.ok(userSql.length >= 3);
      assert.ok(userSql.every(sql => !/account_epoch/i.test(sql)));
      assert.deepEqual(await epoch(f.pool, created.id), { role: 'ADMIN', status: 'DISABLED', account_epoch: 2 });
    } finally {
      stop();
      await client.$disconnect();
    }

    const headers = await f.login('patient');
    for (const path of ['/auth/me', `/patients/${f.users.patient.profileId}/profile`]) {
      const result = await f.request(path, { headers });
      assert.equal(result.response.status, 200);
      assert.doesNotMatch(result.raw, /account.?epoch|password.?hash/i);
    }
    const patientId = f.users.patient.id;
    const before = await epoch(f.pool, patientId);
    const tokenHash = randomBytes(32).toString('hex');
    const session = await f.auth.createSession({ userId: patientId, verifiedHash: f.hash, tokenHash, previousHash: null });
    assert.ok(session);
    assert.equal(await f.auth.revoke(tokenHash), true);
    assert.equal(await f.auth.resolve(tokenHash), null);
    assert.deepEqual(await epoch(f.pool, patientId), before);
  }));
