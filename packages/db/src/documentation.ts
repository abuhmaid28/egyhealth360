import pg from 'pg';
import { createHash, randomUUID } from 'node:crypto';
import type { AuthPrincipal } from './auth.js';
import { availabilityId } from './availability-values.js';
import { DocumentationError, documentFail, documentationInput, documentationPage, type DocumentCommand } from './documentation-values.js';
type Actor = { userId: string; sessionId: string; role: string };
type Scope = { id: string; patient_id: string; patient_user_id: string; treating_clinician_id: string; treating_clinician_user_id: string; encounter_id: string; organization_id: string; membership_id: string; provider_id: string; affiliation_id: string; specialty_id: string };
const deny = (): never => documentFail('DOCUMENT_NOT_FOUND');
function principal(value: AuthPrincipal): Actor {
  try { const d = Object.getOwnPropertyDescriptors(value); if (['userId', 'sessionId', 'role'].some(k => !d[k]?.enumerable || !('value' in d[k])) || typeof d.role.value !== 'string' || !['PATIENT','CLINICIAN','ADMIN','LAB_STAFF','PHARMACY_STAFF'].includes(d.role.value)) documentFail('DOCUMENT_UNAUTHENTICATED'); return { userId: availabilityId(d.userId.value), sessionId: availabilityId(d.sessionId.value), role: d.role.value as string }; }
  catch { return documentFail('DOCUMENT_UNAUTHENTICATED'); }
}
/** Purpose-built consultation documents. No legacy service nesting or assignment writer. */
export function createDocumentationPersistence(connectionString: string | undefined) {
  if (!connectionString) documentFail('DOCUMENT_UNAVAILABLE');
  const pool = new pg.Pool({ connectionString, max: 4, connectionTimeoutMillis: 5000, lock_timeout: 5000, statement_timeout: 10000 });
  pool.on('error', () => {});
  async function current(tx: pg.PoolClient, a: Actor) {
    if (!(await tx.query(`SELECT u.id FROM public.users u JOIN public.sessions s ON s.user_id=u.id WHERE u.id=$1 AND s.id=$2 AND u.status='ACTIVE' AND u.role=$3 AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp()`, [a.userId, a.sessionId, a.role])).rowCount) documentFail('DOCUMENT_UNAUTHENTICATED');
  }
  async function scope(id: string) { return (await pool.query<Scope>('SELECT c.*,p.specialty_id FROM public.consultations c JOIN public.clinician_directory p ON p.id=c.provider_id WHERE c.id=$1', [id])).rows[0]; }
  async function run<T>(a: Actor, patientId: string | null, source: Scope | undefined, write: boolean, author: boolean, action: (tx: pg.PoolClient, clinicianId: string | null, final: () => Promise<void>) => Promise<T>) {
    let tx: pg.PoolClient | undefined;
    try {
      const pp = (await pool.query('SELECT id,user_id FROM public.patient_profiles WHERE '+(patientId ? 'id=$1' : 'user_id=$1'), [patientId ?? a.userId])).rows[0];
      tx = await pool.connect(); await tx.query('BEGIN');
      await tx.query("SET LOCAL transaction_timeout='30s'"); await tx.query("SET LOCAL lock_timeout='5s'"); await tx.query("SET LOCAL statement_timeout='10s'");
      if (['CLINICIAN', 'PATIENT'].includes(a.role)) await tx.query('LOCK TABLE public.users,public.patient_profiles,public.clinician_profiles,public.clinician_patient_assignments IN ROW EXCLUSIVE MODE');
      for (const id of [...new Set([a.userId, ...(pp ? [pp.user_id] : [])])].sort()) await tx.query('SELECT id FROM public.users WHERE id=$1 FOR NO KEY UPDATE', [id]);
      await tx.query('SELECT id FROM public.sessions WHERE id=$1 FOR UPDATE', [a.sessionId]); await current(tx, a);
      if (!pp || !['CLINICIAN', 'PATIENT'].includes(a.role) || (write || author) && a.role !== 'CLINICIAN') deny();
      if (source && (source.patient_id !== pp.id || author && source.treating_clinician_user_id !== a.userId)) deny();
      let clinicianId: string | null = null, grantId: string | null = null;
      if (a.role === 'CLINICIAN') {
        const cp = (await tx.query("SELECT id FROM public.clinician_profiles WHERE user_id=$1 AND user_role='CLINICIAN' FOR SHARE", [a.userId])).rows[0]; if (!cp) deny(); clinicianId = cp.id;
        const grant = (await tx.query("SELECT id FROM public.clinician_patient_assignments WHERE clinician_id=$1 AND patient_id=$2 AND status='ACTIVE' AND ended_at IS NULL FOR SHARE", [cp.id, pp.id])).rows[0]; if (!grant) deny(); grantId = grant.id;
      } else if (pp.user_id !== a.userId) deny();
      if (!(await tx.query("SELECT id FROM public.patient_profiles WHERE id=$1 AND user_id=$2 AND user_role='PATIENT' FOR SHARE", [pp.id, pp.user_id])).rowCount) deny();
      if (write) {
        if (!source || source.treating_clinician_id !== clinicianId) return deny();
        const stages = [['specialties', 'id', source.specialty_id], ['organizations', 'id', source.organization_id], ['clinic_directory', 'organization_id', source.organization_id], ['organization_memberships', 'id', source.membership_id], ['clinician_directory', 'id', source.provider_id], ['directory_affiliations', 'id', source.affiliation_id]];
        for (const [table, column, id] of stages) await tx.query(`SELECT ${column} FROM public.${table} WHERE ${column}=$1 FOR SHARE`, [id]);
        if (!(await tx.query('SELECT version FROM public.clinic_scheduling_settings WHERE organization_id=$1 ORDER BY version DESC LIMIT 1 FOR SHARE', [source.organization_id])).rowCount) deny();
      }
      const final = async () => {
        await current(tx!, a);
        if (!(await tx!.query("SELECT id FROM public.users WHERE id=$1 AND role='PATIENT' AND status='ACTIVE'", [pp.user_id])).rowCount) deny();
        if (clinicianId && !(await tx!.query("SELECT g.id FROM public.clinician_patient_assignments g JOIN public.clinician_profiles cp ON cp.id=g.clinician_id AND cp.user_id=$4 AND cp.user_role='CLINICIAN' WHERE g.id=$1 AND g.patient_id=$2 AND g.clinician_id=$3 AND g.status='ACTIVE' AND g.ended_at IS NULL", [grantId, pp.id, clinicianId, a.userId])).rowCount) deny();
        if (write && source && !(await tx!.query(`SELECT c.id FROM public.consultations c
          JOIN public.organizations o ON o.id=c.organization_id AND o.kind='CLINIC' AND o.status='ACTIVE'
          JOIN public.organization_memberships m ON m.id=c.membership_id AND m.organization_id=o.id AND m.user_id=c.treating_clinician_user_id AND m.user_role='CLINICIAN' AND m.organization_kind='CLINIC' AND m.status='ACTIVE' AND m.ended_at IS NULL
          JOIN public.clinician_directory p ON p.id=c.provider_id AND p.clinician_id=c.treating_clinician_id AND p.clinician_user_id=c.treating_clinician_user_id
          JOIN public.specialties sp ON sp.id=p.specialty_id
          JOIN public.clinic_directory cd ON cd.organization_id=o.id
          JOIN public.directory_affiliations af ON af.id=c.affiliation_id AND af.provider_id=p.id AND af.organization_id=o.id AND af.membership_id=m.id AND af.clinician_user_id=c.treating_clinician_user_id AND af.specialty_id=p.specialty_id AND af.withdrawn_at IS NULL
          WHERE c.id=$1 AND c.patient_id=$2 AND c.encounter_id=$3 AND c.treating_clinician_user_id=$4`, [source.id, pp.id, source.encounter_id, a.userId])).rowCount) deny();
      };
      await final();
      await tx.query('SELECT pg_catalog.pg_advisory_xact_lock(1162359376,pg_catalog.hashtext($1::text))', [pp.id]);
      if (clinicianId) await tx.query('SELECT pg_catalog.pg_advisory_xact_lock(1162359363,pg_catalog.hashtext($1::text))', [clinicianId]);
      if (source) { await tx.query('SELECT id FROM public.consultations WHERE id=$1 FOR SHARE', [source.id]); await tx.query('SELECT id FROM public.clinical_encounters WHERE id=$1 FOR SHARE', [source.encounter_id]); }
      await final(); const result = await action(tx, clinicianId, final); await final(); await tx.query('COMMIT'); return result;
    } catch (e) {
      if (tx) await tx.query('ROLLBACK').catch(() => {});
      if (e instanceof DocumentationError) throw e;
      if (e && typeof e === 'object' && 'code' in e && ['23505', '23P01'].includes(String(e.code))) documentFail('DOCUMENT_CONFLICT');
      return documentFail('DOCUMENT_UNAVAILABLE');
    } finally { tx?.release(); }
  }
  async function projection(tx: pg.PoolClient, a: Actor, patientId: string, documentId: string | null, consultationId: string | null, released: boolean, page = 1, pageSize = 20, maxVersion: number | null = null) {
    // Privacy and visibility filter precede count/page. Never project private or
    // draft identities, counts, predecessors or structured fields to released viewers.
    const row = (await tx.query(`WITH visible AS MATERIALIZED (
      SELECT v.*,d.created_at root_created FROM public.consultation_document_versions v JOIN public.consultation_documents d ON d.id=v.document_id
      WHERE d.patient_id=$1 AND ($2::uuid IS NULL OR d.id=$2) AND ($3::uuid IS NULL OR d.consultation_id=$3)
      AND CASE WHEN $4::boolean THEN d.kind='PATIENT_SUMMARY' AND v.state='SIGNED_RELEASED' ELSE d.author_user_id=$5 END
      AND ($8::int IS NULL OR v.version<=$8)
      AND NOT EXISTS(SELECT 1 FROM public.consultation_privacy_restrictions pr WHERE pr.document_id=d.id)
    ), ranked AS (SELECT v.*,row_number() OVER(PARTITION BY document_id ORDER BY version DESC) history_row,count(*) OVER(PARTITION BY document_id) history_total FROM visible v), roots AS (SELECT DISTINCT document_id,root_created FROM visible), selected AS (
      SELECT * FROM roots ORDER BY root_created DESC,document_id ASC LIMIT CASE WHEN $2::uuid IS NULL THEN $6 ELSE 1 END OFFSET CASE WHEN $2::uuid IS NULL THEN $7 ELSE 0 END
    ) SELECT (SELECT count(*)::int FROM roots) total, COALESCE((SELECT jsonb_agg(doc ORDER BY root_created DESC,document_id ASC) FROM (
      SELECT s.root_created,s.document_id,jsonb_build_object('id',s.document_id,'consultationId',max(v.consultation_id::text),'kind',max(v.document_kind),'history',jsonb_build_object('page',CASE WHEN $2::uuid IS NULL THEN 1 ELSE $9 END,'pageSize',CASE WHEN $2::uuid IS NULL THEN 1 ELSE $6 END,'total',max(v.history_total)),'versions',jsonb_agg(
        (CASE WHEN $4::boolean THEN '{}'::jsonb ELSE jsonb_build_object('version',v.version) END)||jsonb_build_object('id',v.id,'kind',v.kind,'state',v.state,'content',v.content,'patientInstructions',v.patient_instructions,'complaint',v.complaint,'problems',v.problems,'diagnoses',v.diagnoses,
        'allergyReview',jsonb_build_object('state',v.allergy_state,'items',v.allergy_items,'reviewerId',CASE WHEN v.reviewer_user_id IS NOT NULL THEN (SELECT p.public_id FROM public.clinician_directory p WHERE p.clinician_user_id=v.reviewer_user_id) ELSE NULL END,'reviewedAt',to_char(v.reviewed_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
        'createdAt',to_char(v.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'signedAt',to_char(v.signed_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'releasedAt',to_char(v.released_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'reason',v.reason,'predecessorId',CASE WHEN EXISTS(SELECT 1 FROM visible p WHERE p.id=v.predecessor_id) THEN v.predecessor_id ELSE NULL END,
        'effective',v.state<>'DRAFT' AND NOT EXISTS(SELECT 1 FROM public.consultation_document_versions later WHERE later.document_id=v.document_id AND later.version>v.version AND later.kind='CORRECT')) ORDER BY v.version)) doc
      FROM selected s JOIN ranked v ON v.document_id=s.document_id AND v.history_row>CASE WHEN $2::uuid IS NULL THEN 0 ELSE $7 END AND v.history_row<=CASE WHEN $2::uuid IS NULL THEN 1 ELSE $7+$6 END GROUP BY s.root_created,s.document_id
    ) entries),'[]'::jsonb) data`, [patientId, documentId, consultationId, released, a.userId, pageSize, (page - 1) * pageSize, maxVersion, page])).rows[0];
    if (documentId) { if (!row.data.length) deny(); return { data: row.data[0] }; }
    return { data: row.data, meta: { page, pageSize, total: row.total } };
  }
  async function execute(command: DocumentCommand, actor: AuthPrincipal, value: unknown) {
    const input = documentationInput(command, value), a = principal(actor), s = await scope(input.consultationId);
    const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    return run(a, s?.patient_id ?? input.consultationId, s, true, true, async (tx, clinicianId, final) => {
      if (!s) deny();
      const root = input.documentId ? (await tx.query('SELECT * FROM public.consultation_documents WHERE id=$1 AND consultation_id=$2 AND author_user_id=$3 FOR UPDATE', [input.documentId, s.id, a.userId])).rows[0] : null;
      if (input.documentId && !root) deny();
      if (root) await tx.query('SELECT id FROM public.consultation_document_versions WHERE document_id=$1 ORDER BY version FOR SHARE', [root.id]);
      const prior = (await tx.query('SELECT * FROM public.consultation_document_operations WHERE actor_user_id=$1 AND command=$2 AND operation_key=$3 FOR SHARE', [a.userId, command, input.operationKey])).rows[0];
      if (prior) {
        if (prior.fingerprint !== fingerprint) documentFail('DOCUMENT_CONFLICT');
        await final();
        if (command === 'PRIVACY') return { data: { restricted: true } };
        if ((await tx.query('SELECT id FROM public.consultation_privacy_restrictions WHERE document_id=$1', [prior.document_id])).rowCount) deny();
        const retained = (await tx.query('SELECT version FROM public.consultation_document_versions WHERE id=$1', [prior.result_version_id])).rows[0];
        return projection(tx, a, s.patient_id, prior.document_id, s.id, false, 1, 20, retained.version);
      }
      let head = root ? (await tx.query('SELECT * FROM public.consultation_document_versions WHERE document_id=$1 ORDER BY version DESC LIMIT 1', [root.id])).rows[0] : null;
      if (root && command !== 'PRIVACY' && (await tx.query('SELECT id FROM public.consultation_privacy_restrictions WHERE document_id=$1', [root.id])).rowCount) deny();
      if (root && command !== 'PRIVACY' && (head.version !== input.expectedVersion || input.predecessorId !== null && input.predecessorId !== head.id)) documentFail('DOCUMENT_CONFLICT');
      if (command === 'SIGN' && root.kind !== 'PRIVATE_NOTE' || command === 'RELEASE' && root.kind !== 'PATIENT_SUMMARY' || ['SIGN', 'RELEASE'].includes(command) && head.state !== 'DRAFT' || ['ADDENDUM', 'CORRECT'].includes(command) && head.state === 'DRAFT') documentFail('DOCUMENT_CONFLICT');
      await final();
      const id = root?.id ?? randomUUID(), op = randomUUID(), versionId = command === 'PRIVACY' ? null : randomUUID();
      if (command === 'DRAFT') await tx.query('INSERT INTO public.consultation_documents(id,consultation_id,encounter_id,patient_id,author_user_id,author_clinician_id,kind) VALUES($1,$2,$3,$4,$5,$6,$7)', [id, s.id, s.encounter_id, s.patient_id, a.userId, clinicianId, input.kind]);
      if (command === 'PRIVACY') {
        const targets = (await tx.query('SELECT id FROM public.consultation_document_versions WHERE document_id=$1 AND id=ANY($2::uuid[]) ORDER BY id FOR SHARE', [id, input.versionIds])).rows;
        if (targets.length !== input.versionIds.length) deny();
        if ((await tx.query('SELECT id FROM public.consultation_privacy_restrictions WHERE version_id=ANY($1::uuid[])', [input.versionIds])).rowCount) deny();
        for (const target of targets) await tx.query('INSERT INTO public.consultation_privacy_restrictions(document_id,version_id,actor_user_id,operation_id,reason) VALUES($1,$2,$3,$4,$5)', [id, target.id, a.userId, op, input.reason]);
      } else {
        const body = input.body ?? { content: head.content, patientInstructions: head.patient_instructions, complaint: head.complaint, problems: head.problems, diagnoses: head.diagnoses, allergyReview: { state: head.allergy_state, items: head.allergy_items } };
        const kind = root?.kind ?? input.kind;
        if (kind === 'PRIVATE_NOTE' && body.patientInstructions !== '') documentFail('DOCUMENT_INVALID');
        head = (await tx.query(`INSERT INTO public.consultation_document_versions(id,document_id,consultation_id,encounter_id,patient_id,author_user_id,author_clinician_id,document_kind,version,kind,state,predecessor_id,content,patient_instructions,complaint,problems,diagnoses,allergy_state,allergy_items,reviewer_user_id,reviewed_at,reason,operation_id)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) RETURNING *`, [versionId, id, s.id, s.encounter_id, s.patient_id, a.userId, clinicianId, kind, (head?.version ?? 0) + 1, command, command === 'DRAFT' ? 'DRAFT' : kind === 'PRIVATE_NOTE' ? 'SIGNED' : 'SIGNED_RELEASED', head?.id ?? null, body.content, body.patientInstructions, body.complaint, body.problems, body.diagnoses, body.allergyReview.state, JSON.stringify(body.allergyReview.items), head?.reviewer_user_id ?? null, head?.reviewed_at ?? null, input.reason, op])).rows[0];
      }
      await tx.query('INSERT INTO public.consultation_document_operations(id,actor_user_id,command,operation_key,fingerprint,document_id,result_version_id) VALUES($1,$2,$3,$4,$5,$6,$7)', [op, a.userId, command, input.operationKey, fingerprint, id, versionId]);
      const actions = { DRAFT: 'DOCUMENT_DRAFTED', SIGN: 'DOCUMENT_SIGNED', RELEASE: 'SUMMARY_RELEASED', ADDENDUM: 'DOCUMENT_ADDENDUM', CORRECT: 'DOCUMENT_CORRECTED', PRIVACY: 'DOCUMENT_PRIVACY_RESTRICTED' };
      await tx.query("INSERT INTO public.audit_logs(actor_user_id,action_type,entity_type,entity_id,safe_metadata,timestamp) VALUES($1,$2,'consultation_document',$3,'{}',clock_timestamp())", [a.userId, actions[command], id]);
      await final();
      return command === 'PRIVACY' ? { data: { restricted: true } } : projection(tx, a, s.patient_id, id, s.id, false, 1, 20, head.version);
    });
  }
  return {
    execute,
    async authorRead(actor: AuthPrincipal, consultationId: string, documentId: string | null, page: unknown = {}) {
      const a = principal(actor); let id: string, target: string | null; try { id = availabilityId(consultationId); target = documentId === null ? null : availabilityId(documentId); } catch { return deny(); }
      const s = await scope(id), p = documentationPage(page);
      return run(a, s?.patient_id ?? id, s, false, true, async tx => { if (!s) deny(); return projection(tx, a, s.patient_id, target, id, false, p.page, p.pageSize); });
    },
    async releasedRead(actor: AuthPrincipal, patientId: string | null, documentId: string | null, page: unknown = {}) {
      const a = principal(actor), p = documentationPage(page); let target: string | null, patient: string | null;
      try { patient = patientId === null ? null : availabilityId(patientId); target = documentId === null ? null : availabilityId(documentId); } catch { return deny(); }
      if (patient === null && a.role !== 'PATIENT' || patient !== null && a.role !== 'CLINICIAN') {
        // Still validate current actor before uniform resource denial.
        return run(a, patient, undefined, false, false, async () => deny());
      }
      return run(a, patient, undefined, false, false, async tx => {
        const pp = patient ?? (await tx.query('SELECT id FROM public.patient_profiles WHERE user_id=$1', [a.userId])).rows[0]?.id;
        if (!pp) deny(); return projection(tx, a, pp, target, null, true, p.page, p.pageSize);
      });
    },
    close: () => pool.end(),
  };
}
export type DocumentationPersistence = ReturnType<typeof createDocumentationPersistence>;
