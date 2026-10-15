import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool, withTransaction } from '../support/database.mjs';
import { PrismaClient } from '../../packages/db/dist/generated/prisma/client.js';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../packages/db/package.json', import.meta.url));
const { PrismaPg } = require('@prisma/adapter-pg');

test('migration catalog contains exactly the approved custom contract', () => withTransaction(async connection => {
  const tables = (await connection.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`)).rows.map(row => row.tablename);
  assert.deepEqual(tables, ['_prisma_migrations', 'audit_logs', 'care_plan_templates', 'care_plans', 'care_rule_definitions', 'clinician_patient_assignments', 'clinician_profiles', 'guideline_sources', 'patient_profiles', 'sessions', 'users']);
  const enums = (await connection.query(`SELECT t.typname, array_agg(e.enumlabel::text ORDER BY e.enumsortorder) AS labels
    FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' GROUP BY t.typname ORDER BY t.typname`)).rows;
  assert.deepEqual(enums.map(row => [row.typname, row.labels]), [
    ['assignment_status', ['ACTIVE', 'ENDED']], ['care_plan_status', ['DRAFT', 'ACTIVE', 'CANCELLED']], ['clinical_definition_status', ['DRAFT', 'PUBLISHED', 'RETIRED']], ['user_role', ['PATIENT', 'CLINICIAN', 'ADMIN']], ['user_status', ['ACTIVE', 'DISABLED']],
  ]);
  const checks = (await connection.query(`SELECT conname, convalidated, pg_get_constraintdef(oid) AS definition FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace AND contype = 'c' ORDER BY conname`)).rows;
  assert.deepEqual(checks.map(row => row.conname), [
    'assignments_lifecycle_check', 'audit_logs_action_type_nonblank_check', 'audit_logs_entity_type_nonblank_check',
    'audit_logs_metadata_object_check',
    'care_plans_lifecycle_check', 'care_plan_templates_domain_check', 'care_plan_templates_lifecycle_check', 'care_plan_templates_text_check', 'care_plan_templates_version_check',
    'care_rule_definitions_definition_check', 'care_rule_definitions_identity_check', 'care_rule_definitions_timestamps_check', 'care_rule_definitions_version_check',
    'clinician_profiles_role_check', 'guideline_sources_text_check', 'guideline_sources_timestamps_check', 'guideline_sources_year_check', 'patient_profiles_role_check',
    'sessions_expiry_check', 'sessions_revocation_check', 'sessions_token_hash_format_check',
    'users_email_canonical_check', 'users_email_shape_check', 'users_password_hash_nonblank_check',
  ].sort());
  assert.ok(checks.every(row => row.convalidated));
  const fk = (await connection.query(`SELECT conname, confdeltype, confupdtype, pg_get_constraintdef(oid) AS definition
    FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND contype = 'f' ORDER BY conname`)).rows;
  assert.deepEqual(fk.map(row => row.conname), ['assignments_clinician_fkey', 'assignments_patient_fkey', 'audit_logs_actor_fkey', 'care_plan_templates_source_fkey', 'care_rule_definitions_template_fkey', 'care_plans_creator_fkey', 'care_plans_patient_fkey', 'care_plans_rule_template_fkey', 'care_plans_template_fkey', 'clinician_profiles_user_role_fkey', 'patient_profiles_user_role_fkey', 'sessions_user_fkey'].sort());
  assert.ok(fk.every(row => row.confdeltype === 'r' && row.confupdtype === 'r'));
  assert.ok(fk.filter(row => row.conname.includes('user_role')).every(row => row.definition.includes('FOREIGN KEY (user_id, user_role) REFERENCES users(id, role)')));
  const partial = (await connection.query(`SELECT i.indisunique, i.indisvalid, pg_get_indexdef(i.indexrelid) AS definition,
    pg_get_expr(i.indpred, i.indrelid) AS predicate FROM pg_index i
    WHERE i.indexrelid = 'clinician_patient_assignments_active_pair_key'::regclass`)).rows[0];
  assert.equal(partial.indisunique, true);
  assert.equal(partial.indisvalid, true);
  assert.match(partial.definition, /\(clinician_id, patient_id\)/);
  assert.match(partial.predicate, /status = 'ACTIVE'::assignment_status/);
  const triggers = (await connection.query(`SELECT tgname, tgtype::int, tgenabled, p.proname FROM pg_trigger t
    JOIN pg_proc p ON p.oid = t.tgfoid JOIN pg_class c ON c.oid = t.tgrelid
    WHERE c.relnamespace = 'public'::regnamespace AND NOT t.tgisinternal ORDER BY tgname`)).rows;
  assert.deepEqual(triggers, [
    { tgname: 'care_plans_write_guard', tgtype: 23, tgenabled: 'O', proname: 'eh010_guard_care_plan' },
    { tgname: 'care_plans_removal_guard', tgtype: 42, tgenabled: 'O', proname: 'eh010_reject_care_plan_removal' },
    { tgname: 'assignments_history_guard', tgtype: 27, tgenabled: 'O', proname: 'guard_assignment_history' },
    { tgname: 'assignments_truncate_guard', tgtype: 34, tgenabled: 'O', proname: 'guard_assignment_history' },
    { tgname: 'audit_logs_append_only_guard', tgtype: 58, tgenabled: 'O', proname: 'reject_audit_mutation' },
    { tgname: 'care_plan_templates_removal_guard', tgtype: 42, tgenabled: 'O', proname: 'eh009_reject_catalog_removal' },
    { tgname: 'care_plan_templates_write_guard', tgtype: 23, tgenabled: 'O', proname: 'eh009_guard_template' },
    { tgname: 'care_rule_definitions_removal_guard', tgtype: 42, tgenabled: 'O', proname: 'eh009_reject_catalog_removal' },
    { tgname: 'care_rule_definitions_write_guard', tgtype: 23, tgenabled: 'O', proname: 'eh009_guard_rule' },
    { tgname: 'guideline_sources_removal_guard', tgtype: 42, tgenabled: 'O', proname: 'eh009_reject_catalog_removal' },
    { tgname: 'guideline_sources_write_guard', tgtype: 23, tgenabled: 'O', proname: 'eh009_guard_guideline_source' },

  ].sort((a,b)=>a.tgname.localeCompare(b.tgname)));
  const functions = (await connection.query(`SELECT proname, prosecdef FROM pg_proc WHERE pronamespace = 'public'::regnamespace ORDER BY proname`)).rows;
  assert.deepEqual(functions, ['eh009_guard_guideline_source', 'eh009_guard_rule', 'eh009_guard_template', 'eh009_is_htn_fu_v1', 'eh009_reject_catalog_removal', 'eh010_guard_care_plan', 'eh010_reject_care_plan_removal', 'guard_assignment_history', 'reject_audit_mutation'].sort().map(proname => ({ proname, prosecdef: false })));
  const columns = (await connection.query(`SELECT table_name, column_name, udt_name, column_default, is_nullable
    FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'id' AND table_name <> '_prisma_migrations'`)).rows;
  assert.equal(columns.length, 10);
  assert.ok(columns.every(row => row.udt_name === 'uuid' && row.column_default === 'gen_random_uuid()' && row.is_nullable === 'NO'));
  const sex = (await connection.query(`SELECT udt_name, is_nullable FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'patient_profiles' AND column_name = 'sex'`)).rows[0];
  assert.deepEqual(sex, { udt_name: 'text', is_nullable: 'YES' });
}));

test('Prisma mutations cannot bypass audit guards; Prisma maintains updatedAt', async () => {
  // Internal generated client is used only to exercise bypass attempts in tests.
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = new PrismaClient({ adapter: new PrismaPg(pool), log: [] });
  try {
    await client.$transaction(async transaction => {
      const user = await transaction.user.create({ data: { email: `prisma-${Date.now()}@example.invalid`, passwordHash: 'synthetic-test-hash', role: 'ADMIN', updatedAt: new Date('2000-01-01') } });
      const updated = await transaction.user.update({ where: { id: user.id }, data: { status: 'DISABLED' } });
      assert.ok(updated.updatedAt > user.updatedAt);
      // Roll back this fixture without deleting retained/auditable rows.
      throw new Error('rollback fixture');
    }).catch(error => { assert.equal(error.message, 'rollback fixture'); });
    for (const operation of [
      () => client.auditLog.updateMany({ data: { actionType: 'REWRITE' } }),
      () => client.auditLog.deleteMany(),
      () => client.$executeRawUnsafe('TRUNCATE audit_logs'),
    ]) {
      await assert.rejects(operation(), error => {
        // Driver/Prisma wrapping differs between ORM and raw SQL; require the guard's diagnostic.
        assert.match(String(error), /Audit logs are append-only/);
        return true;
      });
    }
  } finally { await client.$disconnect(); await pool.end(); }
});
