import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool, withTransaction } from '../support/database.mjs';
import { PrismaClient } from '../../packages/db/dist/generated/prisma/client.js';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../packages/db/package.json', import.meta.url));
const { PrismaPg } = require('@prisma/adapter-pg');

test('migration catalog contains exactly the approved custom contract', () => withTransaction(async connection => {
  const tables = (await connection.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`)).rows.map(row => row.tablename);
  assert.deepEqual(tables, ['_prisma_migrations', 'assignment_end_provenance', 'audit_logs', 'availability_operations', 'availability_slots', 'blood_pressure_measurements', 'bp_amendment_operations', 'bp_exclusions', 'bp_privacy_targets', 'care_action_applicability_inputs', 'care_action_decisions', 'care_actions', 'care_plan_templates', 'care_plans', 'care_rule_definitions', 'clinic_directory', 'clinic_scheduling_settings', 'clinical_encounters', 'clinician_directory', 'clinician_patient_assignments', 'clinician_profiles', 'directory_affiliations', 'encounter_bp_associations', 'follow_up_appointments', 'guideline_sources', 'observed_applicability_retractions', 'observed_applicability_snapshots', 'organization_memberships', 'organizations', 'patient_profiles', 'record_coverage_windows', 'relationship_requests', 'sessions', 'specialties', 'users']);
  const enums = (await connection.query(`SELECT t.typname, array_agg(e.enumlabel::text ORDER BY e.enumsortorder) AS labels
    FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' GROUP BY t.typname ORDER BY t.typname`)).rows;
  assert.deepEqual(enums.map(row => [row.typname, row.labels]), [
    ['assignment_status', ['ACTIVE', 'ENDED']], ['bp_measurement_source_kind', ['PATIENT_SELF_ENTRY', 'CLINICIAN_ENTRY']], ['care_plan_status', ['DRAFT', 'ACTIVE', 'CANCELLED']], ['clinical_definition_status', ['DRAFT', 'PUBLISHED', 'RETIRED']], ['follow_up_appointment_status', ['SCHEDULED', 'CANCELLED']], ['observed_age_assertion_state', ['NO_ASSERTION', 'UNKNOWN', 'ASSERTED_VALUE']], ['observed_applicability_source_type', ['SYNTHETIC_OBSERVED_INPUT']], ['observed_condition_status', ['PRESENT', 'ABSENT', 'UNKNOWN']], ['observed_pregnancy_status', ['PREGNANT', 'NOT_PREGNANT', 'UNKNOWN']], ['organization_kind', ['CLINIC','LABORATORY','PHARMACY']], ['organization_membership_status', ['ACTIVE','ENDED']], ['organization_status', ['ACTIVE','SUSPENDED']], ['record_coverage_source_type', ['SYNTHETIC_BENCHMARK']], ['record_coverage_status', ['COMPLETE', 'INCOMPLETE', 'UNKNOWN']], ['relationship_request_status', ['PENDING','ACCEPTED','DECLINED','WITHDRAWN']], ['user_role', ['PATIENT', 'CLINICIAN', 'ADMIN', 'LAB_STAFF', 'PHARMACY_STAFF']], ['user_status', ['ACTIVE', 'DISABLED']],
  ]);
  const checks = (await connection.query(`SELECT conname, convalidated, pg_get_constraintdef(oid) AS definition FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace AND contype = 'c' ORDER BY conname`)).rows;
  assert.deepEqual(checks.map(row => row.conname), ['availability_lifecycle','availability_operations_command_check','availability_operations_fingerprint_check','availability_operations_result_check','availability_structure','scheduling_bounds','relationship_requests_lifecycle_check','relationship_requests_timestamps_check','assignment_end_provenance_role_check','assignment_end_provenance_timestamp_check',
    'directory_specialty_key_check','directory_specialty_name_check','specialties_admin_check','specialties_history_check','directory_clinic_kind_check','directory_clinic_locator_check','directory_clinic_text_check','clinic_directory_admin_check','clinic_directory_history_check','directory_provider_locator_check','directory_provider_text_check','clinician_directory_admin_check','clinician_directory_history_check','directory_affiliation_role_check','directory_affiliation_history_check',
    'care_action_decisions_accepted_check', 'care_actions_action_type_check', 'care_actions_occurrence_check', 'care_decision_calendar',
    'bp_amendment_operations_check', 'bp_amendment_operations_check1', 'bp_amendment_operations_check2', 'bp_amendment_operations_check3', 'bp_amendment_operations_check4', 'bp_amendment_operations_check5', 'bp_amendment_operations_check6', 'bp_amendment_operations_check7', 'bp_amendment_operations_check8', 'bp_amendment_operations_check9', 'bp_amendment_operations_kind_check', 'bp_amendment_operations_predecessor_ids_check', 'bp_amendment_operations_reason_code_check', 'bp_exclusions_check', 'bp_exclusions_reason_code_check', 'bp_privacy_targets_check', 'bp_privacy_targets_reason_code_check',
    'blood_pressure_measurements_unit_check', 'blood_pressure_measurements_measured_at_check', 'blood_pressure_measurements_created_at_check', 'blood_pressure_measurements_chronology_check',
    'follow_up_appointments_purpose_check', 'follow_up_appointments_scheduled_at_check', 'follow_up_appointments_chronology_check', 'follow_up_appointments_lifecycle_check', 'clinical_encounters_purpose_check', 'clinical_encounters_occurred_at_check', 'clinical_encounters_chronology_check', 'encounter_bp_associations_created_at_check',
    'record_coverage_windows_source_reference_check', 'record_coverage_windows_start_at_check', 'record_coverage_windows_end_at_check', 'record_coverage_windows_chronology_check', 'record_coverage_windows_created_at_check',
    'oa_snapshots_age_assertion_check', 'oa_snapshots_source_reference_check', 'oa_snapshots_assertion_reference_check', 'oa_snapshots_effective_at_check', 'oa_snapshots_asserted_at_check', 'oa_snapshots_recorded_at_check', 'oa_snapshots_chronology_check',
    'oa_retractions_source_reference_check', 'oa_retractions_retraction_reference_check', 'oa_retractions_asserted_at_check', 'oa_retractions_recorded_at_check', 'oa_retractions_chronology_check', 'oa_retractions_reason_check',
    'assignments_lifecycle_check', 'audit_logs_action_type_nonblank_check', 'audit_logs_entity_type_nonblank_check',
    'audit_logs_metadata_object_check',
    'care_plans_lifecycle_check', 'care_plan_templates_domain_check', 'care_plan_templates_lifecycle_check', 'care_plan_templates_text_check', 'care_plan_templates_version_check',
    'care_rule_definitions_definition_check', 'care_rule_definitions_identity_check', 'care_rule_definitions_timestamps_check', 'care_rule_definitions_version_check',
    'clinician_profiles_role_check', 'guideline_sources_text_check', 'guideline_sources_timestamps_check', 'guideline_sources_year_check', 'patient_profiles_role_check',
    'organizations_admin_role_check','organizations_name_check','organizations_lifecycle_check','memberships_admin_role_check','memberships_compatibility_check','memberships_actor_check','memberships_lifecycle_check',
    'sessions_expiry_check', 'sessions_revocation_check', 'sessions_token_hash_format_check',
    'users_email_canonical_check', 'users_email_shape_check', 'users_password_hash_nonblank_check',
  ].sort());
  assert.ok(checks.every(row => row.convalidated));
  const fk = (await connection.query(`SELECT conname, confdeltype, confupdtype, pg_get_constraintdef(oid) AS definition
    FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND contype = 'f' ORDER BY conname`)).rows;
  assert.deepEqual(fk.map(row => row.conname), ['availability_operations_actor_user_id_fkey','availability_operations_slot_id_fkey','availability_slots_affiliation_id_fkey','availability_slots_clinician_id_clinician_user_id_fkey','availability_slots_membership_id_clinician_user_id_organiz_fkey','availability_slots_organization_id_configuration_version_fkey','availability_slots_provider_id_clinician_user_id_fkey','availability_slots_published_by_user_id_user_role_fkey','availability_slots_withdrawn_by_user_id_user_role_fkey','clinic_scheduling_settings_changed_by_user_id_admin_role_fkey','clinic_scheduling_settings_organization_id_organization_ki_fkey','relationship_requests_patient_fk', 'relationship_requests_clinician_fk', 'relationship_requests_provider_fk', 'relationship_requests_assignment_fk', 'relationship_requests_context_fk', 'relationship_requests_acceptor_fk', 'relationship_requests_decliner_fk', 'relationship_requests_withdrawer_fk', 'assignment_end_provenance_assignment_fk', 'assignment_end_provenance_actor_fk','specialties_creator_fk','specialties_actor_fk','directory_clinic_organization_fk','clinic_directory_creator_fk','clinic_directory_actor_fk','directory_provider_profile_fk','directory_provider_specialty_fk','clinician_directory_creator_fk','clinician_directory_actor_fk','directory_affiliation_provider_fk','directory_affiliation_membership_fk','directory_affiliation_clinic_fk','directory_affiliation_specialty_fk','directory_affiliation_publisher_fk','directory_affiliation_withdrawer_fk','organizations_creator_fkey','organizations_status_actor_fkey','memberships_organization_kind_fkey','memberships_user_role_fkey','memberships_grant_actor_fkey','memberships_end_actor_fkey','care_action_applicability_inputs_decision_id_patient_id_fkey', 'care_action_applicability_inputs_snapshot_id_patient_id_fkey', 'care_action_decisions_assignment_id_fkey', 'care_action_decisions_selecting_user_id_fkey', 'care_actions_decision_fk', 'care_actions_plan_fk', 'care_decision_action_fk', 'care_decision_app_fk', 'care_decision_bp_fk', 'care_decision_plan_fk', 'bp_amendment_operations_actor_user_id_fkey', 'bp_amendment_operations_duplicate_of_bp_id_patient_id_fkey', 'bp_amendment_operations_new_bp_id_patient_id_fkey', 'bp_amendment_operations_patient_id_fkey', 'bp_amendment_operations_target_bp_id_patient_id_fkey', 'bp_exclusions_bp_id_patient_id_fkey', 'bp_exclusions_operation_id_patient_id_fkey', 'bp_exclusions_patient_id_fkey', 'bp_privacy_targets_bp_id_patient_id_fkey', 'bp_privacy_targets_operation_id_patient_id_fkey', 'bp_privacy_targets_patient_id_fkey', 'oa_snapshots_patient_fkey', 'oa_retractions_snapshot_scope_fkey', 'record_coverage_windows_patient_fkey','follow_up_appointments_patient_fkey','follow_up_appointments_creator_fkey','follow_up_appointments_canceller_fkey','clinical_encounters_patient_fkey','clinical_encounters_recorder_fkey','encounter_bp_associations_patient_fkey','encounter_bp_associations_recorder_fkey','encounter_bp_associations_encounter_patient_fkey','encounter_bp_associations_measurement_patient_fkey','blood_pressure_measurements_patient_fkey', 'blood_pressure_measurements_actor_fkey', 'assignments_clinician_fkey', 'assignments_patient_fkey', 'audit_logs_actor_fkey', 'care_plan_templates_source_fkey', 'care_rule_definitions_template_fkey', 'care_plans_creator_fkey', 'care_plans_patient_fkey', 'care_plans_rule_template_fkey', 'care_plans_template_fkey', 'clinician_profiles_user_role_fkey', 'patient_profiles_user_role_fkey', 'sessions_user_fkey'].sort());
  assert.ok(fk.every(row => row.confdeltype === 'r' && row.confupdtype === 'r'));
  for(const row of fk.filter(row=>row.conname.includes('user_role'))){
    const column=row.conname==='availability_slots_published_by_user_id_user_role_fkey'?'published_by_user_id':row.conname==='availability_slots_withdrawn_by_user_id_user_role_fkey'?'withdrawn_by_user_id':'user_id';
    assert.ok(row.definition.includes(`FOREIGN KEY (${column}, user_role) REFERENCES users(id, role)`));
  }
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
    {tgname:'scheduling_insert',tgtype:7,tgenabled:'O',proname:'i2_settings_insert'},
    {tgname:'scheduling_immutable',tgtype:58,tgenabled:'O',proname:'i2_immutable'},
    {tgname:'availability_write',tgtype:23,tgenabled:'O',proname:'i2_slot_guard'},
    {tgname:'availability_removal',tgtype:42,tgenabled:'O',proname:'i2_immutable'},
    {tgname:'availability_operation_immutable',tgtype:58,tgenabled:'O',proname:'i2_immutable'},

    {tgname:'relationship_requests_history_guard',tgtype:23,tgenabled:'O',proname:'i1_relationship_guard'},
    {tgname:'relationship_requests_removal_guard',tgtype:42,tgenabled:'O',proname:'i1_reject_removal'},
    {tgname:'assignment_end_provenance_participant_guard',tgtype:7,tgenabled:'O',proname:'i1_assignment_end_guard'},
    {tgname:'assignment_end_provenance_history_guard',tgtype:58,tgenabled:'O',proname:'i1_reject_removal'},
    {tgname:'assignment_end_provenance_commit_guard',tgtype:5,tgenabled:'O',proname:'i1_assignment_end_commit_guard'},
    {tgname:'specialties_write_guard',tgtype:23,tgenabled:'O',proname:'i1d_guard_source'},
    {tgname:'specialties_removal_guard',tgtype:42,tgenabled:'O',proname:'i1_reject_removal'},
    {tgname:'clinic_directory_write_guard',tgtype:23,tgenabled:'O',proname:'i1d_guard_source'},
    {tgname:'clinic_directory_removal_guard',tgtype:42,tgenabled:'O',proname:'i1_reject_removal'},
    {tgname:'clinician_directory_write_guard',tgtype:23,tgenabled:'O',proname:'i1d_guard_source'},
    {tgname:'clinician_directory_removal_guard',tgtype:42,tgenabled:'O',proname:'i1_reject_removal'},
    {tgname:'directory_affiliations_write_guard',tgtype:23,tgenabled:'O',proname:'i1d_guard_affiliation'},
    {tgname:'directory_affiliations_removal_guard',tgtype:42,tgenabled:'O',proname:'i1_reject_removal'},
    {tgname:'organizations_write_guard',tgtype:23,tgenabled:'O',proname:'i1_guard_organization'},
    {tgname:'organizations_removal_guard',tgtype:42,tgenabled:'O',proname:'i1_reject_removal'},
    {tgname:'memberships_write_guard',tgtype:23,tgenabled:'O',proname:'i1_guard_membership'},
    {tgname:'memberships_removal_guard',tgtype:42,tgenabled:'O',proname:'i1_reject_removal'},
    {tgname:'care_decision_insert',tgtype:7,tgenabled:'O',proname:'eh014_guard_decision'},
    {tgname:'care_action_insert',tgtype:7,tgenabled:'O',proname:'eh014_guard_action'},
    {tgname:'care_input_insert',tgtype:7,tgenabled:'O',proname:'eh014_guard_member'},
    {tgname:'care_decision_complete',tgtype:5,tgenabled:'O',proname:'eh014_complete'},
    {tgname:'care_decision_immutable',tgtype:58,tgenabled:'O',proname:'eh014_immutable'},
    {tgname:'care_action_immutable',tgtype:58,tgenabled:'O',proname:'eh014_immutable'},
    {tgname:'care_input_immutable',tgtype:58,tgenabled:'O',proname:'eh014_immutable'},
    {tgname:'bp_operation_insert',tgtype:7,tgenabled:'O',proname:'bp31_guard_operation'},
    {tgname:'bp_operation_complete',tgtype:5,tgenabled:'O',proname:'bp31_complete_operation'},
    {tgname:'bp_exclusion_insert',tgtype:7,tgenabled:'O',proname:'bp31_guard_child'},
    {tgname:'bp_privacy_insert',tgtype:7,tgenabled:'O',proname:'bp31_guard_child'},
    {tgname:'bp_operation_immutable',tgtype:58,tgenabled:'O',proname:'bp31_immutable'},
    {tgname:'bp_exclusion_immutable',tgtype:58,tgenabled:'O',proname:'bp31_immutable'},
    {tgname:'bp_privacy_immutable',tgtype:58,tgenabled:'O',proname:'bp31_immutable'},
    {tgname:'zz_bp31_association_insert',tgtype:7,tgenabled:'O',proname:'bp31_guard_association'},
    {tgname:'oa_snapshots_insert_guard',tgtype:7,tgenabled:'O',proname:'eh015_guard_snapshot_insert'},
    {tgname:'oa_snapshots_history_guard',tgtype:58,tgenabled:'O',proname:'eh015_reject_applicability_mutation'},
    {tgname:'oa_retractions_insert_guard',tgtype:7,tgenabled:'O',proname:'eh015_guard_retraction_insert'},
    {tgname:'oa_retractions_history_guard',tgtype:58,tgenabled:'O',proname:'eh015_reject_applicability_mutation'},
    {tgname:'record_coverage_windows_insert_guard',tgtype:7,tgenabled:'O',proname:'eh013_guard_coverage_insert'},
    {tgname:'record_coverage_windows_history_guard',tgtype:58,tgenabled:'O',proname:'eh013_reject_coverage_mutation'},
    {tgname:'follow_up_appointments_write_guard',tgtype:23,tgenabled:'O',proname:'eh012_guard_appointment'},
    {tgname:'follow_up_appointments_removal_guard',tgtype:42,tgenabled:'O',proname:'eh012_reject_appointment_removal'},
    {tgname:'clinical_encounters_insert_guard',tgtype:7,tgenabled:'O',proname:'eh012_guard_encounter_insert'},
    {tgname:'clinical_encounters_history_guard',tgtype:58,tgenabled:'O',proname:'eh012_reject_immutable_evidence_mutation'},
    {tgname:'encounter_bp_associations_insert_guard',tgtype:7,tgenabled:'O',proname:'eh012_guard_encounter_bp_insert'},
    {tgname:'encounter_bp_associations_history_guard',tgtype:58,tgenabled:'O',proname:'eh012_reject_immutable_evidence_mutation'},
    { tgname: 'blood_pressure_measurements_insert_guard', tgtype: 7, tgenabled: 'O', proname: 'eh011_guard_bp_insert' },
    { tgname: 'blood_pressure_measurements_history_guard', tgtype: 58, tgenabled: 'O', proname: 'eh011_reject_bp_mutation' },
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
  const functions = (await connection.query(`SELECT proname, prosecdef FROM pg_proc p WHERE pronamespace = 'public'::regnamespace AND NOT EXISTS(SELECT 1 FROM pg_depend d JOIN pg_extension e ON e.oid=d.refobjid WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e' AND e.extname='btree_gist') ORDER BY proname`)).rows;
  assert.deepEqual((await connection.query('SELECT extname FROM pg_extension ORDER BY extname')).rows.map(r=>r.extname),['btree_gist','plpgsql']);
  assert.deepEqual(functions, ['i2_settings_insert','i2_slot_guard','i2_immutable','i1_relationship_guard','i1_assignment_end_guard','i1_assignment_end_commit_guard','i1d_guard_source','i1d_guard_affiliation','i1_guard_organization','i1_guard_membership','i1_reject_removal','eh014_add_months','eh014_inputs','eh014_bp_linkage','eh014_guard_decision','eh014_guard_action','eh014_guard_member','eh014_complete','eh014_immutable','eh014_coherent','bp31_guard_operation', 'bp31_complete_operation', 'bp31_guard_child', 'bp31_immutable', 'bp31_disclosable', 'bp31_effective', 'bp31_guard_association', 'eh015_guard_retraction_insert', 'eh015_guard_snapshot_insert', 'eh015_reject_applicability_mutation', 'eh013_guard_coverage_insert','eh013_reject_coverage_mutation','eh012_lock_clinician','eh012_guard_appointment','eh012_guard_encounter_insert','eh012_guard_encounter_bp_insert','eh012_reject_appointment_removal','eh012_reject_immutable_evidence_mutation','eh011_guard_bp_insert', 'eh011_reject_bp_mutation', 'eh009_guard_guideline_source', 'eh009_guard_rule', 'eh009_guard_template', 'eh009_is_htn_fu_v1', 'eh009_reject_catalog_removal', 'eh010_guard_care_plan', 'eh010_reject_care_plan_removal', 'guard_assignment_history', 'reject_audit_mutation'].sort().map(proname => ({ proname, prosecdef: false })));
  const columns = (await connection.query(`SELECT table_name, column_name, udt_name, column_default, is_nullable
    FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'id' AND table_name <> '_prisma_migrations'`)).rows;
  assert.equal(columns.length, 30); // 34 models; four models use composite/existing identities.
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

test('I1S2 exact organization indexes, composite discriminators, columns and removal/history guards',()=>withTransaction(async c=>{
 const indexes=(await c.query("SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename IN ('organizations','organization_memberships') ORDER BY indexname")).rows;
 assert.deepEqual(indexes.map(x=>x.indexname),['memberships_active_pair_key','memberships_directory_scope_key','memberships_operation_key','memberships_user_history_idx','organization_memberships_pkey','organizations_id_kind_key','organizations_operation_key','organizations_pkey']);
 assert.match(indexes.find(x=>x.indexname==='memberships_active_pair_key').indexdef,/UNIQUE INDEX.*\(user_id, organization_id\).*WHERE.*status = 'ACTIVE'::organization_membership_status/);
 const expected={organizations:['id','kind','name','status','status_version','created_by_user_id','admin_role','operation_key','created_at','status_changed_by_user_id','status_changed_at'],organization_memberships:['id','organization_id','organization_kind','user_id','user_role','status','granted_by_user_id','admin_role','operation_key','granted_at','ended_by_user_id','ended_at']};
 for(const [table,columns] of Object.entries(expected))assert.deepEqual((await c.query('SELECT column_name FROM information_schema.columns WHERE table_schema=\'public\' AND table_name=$1 ORDER BY ordinal_position',[table])).rows.map(x=>x.column_name),columns);
 const partial=(await c.query("SELECT indisunique,indisvalid FROM pg_index WHERE indexrelid='memberships_active_pair_key'::regclass")).rows[0];assert.deepEqual(partial,{indisunique:true,indisvalid:true});
}));
