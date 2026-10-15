import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient, Prisma } from './generated/prisma/client.js';
import { APPROVED_CLINICAL_CATALOG as catalog, matchesClinicalValue, projectDeferredActionSpecification } from '@egyhealth/clinical-rules';
import type { AuthPrincipal } from './auth.js';
import type { PatientProfileId } from './authorization.js';
import type { ClinicalTemplateVersionId } from './clinical-catalog.js';
import { appendAuditRecord } from './audit.js';

export type CarePlanId = string & { readonly __carePlanId: unique symbol };
export type ClinicalRuleDefinitionId = string & { readonly __clinicalRuleDefinitionId: unique symbol };
export type CarePlanStatus = 'DRAFT' | 'ACTIVE' | 'CANCELLED';
export type PlanTarget = Readonly<{ patientId: PatientProfileId; planId: CarePlanId }>;
export type CarePlanSnapshot = Readonly<{
  id: CarePlanId; patientId: PatientProfileId; templateId: ClinicalTemplateVersionId;
  ruleDefinitionId: ClinicalRuleDefinitionId; createdByUserId: string; status: CarePlanStatus;
  createdAt: Date; startedAt: Date | null; cancelledAt: Date | null;
}>;
export type PlanMutationResult = Readonly<{ plan: CarePlanSnapshot; changed: boolean }>;
export type DeferredActionSpecification = Readonly<{
  planId: CarePlanId; patientId: PatientProfileId; templateId: ClinicalTemplateVersionId;
  ruleDefinitionId: ClinicalRuleDefinitionId; planStatus: CarePlanStatus;
}> & ReturnType<typeof projectDeferredActionSpecification>;
type Code = 'CARE_PLAN_INVALID' | 'CARE_PLAN_UNAUTHENTICATED' | 'CARE_PLAN_NOT_FOUND' | 'CARE_PLAN_INVALID_STATE'
  | 'CARE_PLAN_ACTIVE_CONFLICT' | 'CARE_PLAN_DEFINITION_UNAVAILABLE' | 'CARE_PLAN_SERVICE_UNAVAILABLE';
export class CarePlanError extends Error { constructor(public readonly code: Code) { super(code); } }
function fail(code: Code): never { throw new CarePlanError(code); }
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
function inputShape(value: unknown, keys: string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).length !== keys.length || !keys.every(key => Object.hasOwn(value, key) && uuid((value as Record<string, unknown>)[key]))) fail('CARE_PLAN_INVALID');
}
type Tx = Prisma.TransactionClient;
const planView = (row: { id: string; patientId: string; templateId: string; ruleDefinitionId: string; createdByUserId: string; status: CarePlanStatus; createdAt: Date; startedAt: Date | null; cancelledAt: Date | null }): CarePlanSnapshot => ({ ...row,
  id: row.id as CarePlanId, patientId: row.patientId as PatientProfileId,
  templateId: row.templateId as ClinicalTemplateVersionId, ruleDefinitionId: row.ruleDefinitionId as ClinicalRuleDefinitionId,
});

/** Fixed order: user -> session -> clinician profile -> assignment -> patient -> plan -> template.
 * SHARE protects mutable mappings/assignment status; NO KEY UPDATE user lock is compatible
 * with audit FK KEY SHARE and EH-006 login. All operations use this bounded transaction.
 * No automatic retry and no cached/reusable authorization ticket.
 */
async function authorize(tx: Tx, principal: AuthPrincipal, patientId: string) {
  if (!principal || !uuid(principal.userId) || !uuid(principal.sessionId)) fail('CARE_PLAN_UNAUTHENTICATED');
  await tx.$queryRaw`SELECT id FROM public.users WHERE id=${principal.userId}::uuid FOR NO KEY UPDATE`;
  await tx.$queryRaw`SELECT id FROM public.sessions WHERE id=${principal.sessionId}::uuid FOR UPDATE`;
  await checkSession(tx, principal);
  const clinicians = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM public.clinician_profiles
    WHERE user_id=${principal.userId}::uuid AND user_role='CLINICIAN' FOR SHARE`;
  if (clinicians.length !== 1) fail('CARE_PLAN_NOT_FOUND');
  const assignments = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM public.clinician_patient_assignments
    WHERE clinician_id=${clinicians[0].id}::uuid AND patient_id=${patientId}::uuid AND status='ACTIVE' AND ended_at IS NULL FOR SHARE`;
  if (assignments.length !== 1) fail('CARE_PLAN_NOT_FOUND');
  const patients = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM public.patient_profiles WHERE id=${patientId}::uuid AND user_role='PATIENT' FOR SHARE`;
  if (patients.length !== 1) fail('CARE_PLAN_NOT_FOUND');
}
async function checkSession(tx: Tx, principal: AuthPrincipal) {
  const rows = await tx.$queryRaw<{ role: string }[]>`SELECT u.role::text AS role FROM public.sessions s JOIN public.users u ON u.id=s.user_id
    WHERE s.id=${principal.sessionId}::uuid AND u.id=${principal.userId}::uuid AND u.status='ACTIVE'
      AND s.revoked_at IS NULL AND s.expires_at > clock_timestamp()`;
  if (rows.length !== 1) fail('CARE_PLAN_UNAUTHENTICATED');
  if (rows[0].role !== 'CLINICIAN' || principal.role !== rows[0].role) fail('CARE_PLAN_NOT_FOUND');
}
async function pinnedDefinition(tx: Tx, templateId: string, ruleId: string, published: boolean) {
  await tx.$queryRaw`SELECT id FROM public.care_plan_templates WHERE id=${templateId}::uuid FOR SHARE`;
  const template = await tx.carePlanTemplate.findUnique({ where: { id: templateId }, include: { guidelineSource: true, rules: true } });
  if (!template || (published && template.status !== 'PUBLISHED') || (!published && !['PUBLISHED', 'RETIRED'].includes(template.status))) fail('CARE_PLAN_DEFINITION_UNAVAILABLE');
  const content = (row: object, expected: object) => Object.fromEntries(Object.keys(expected).map(key => [key, (row as Record<string, unknown>)[key]]));
  if (!matchesClinicalValue(content(template, catalog.template), catalog.template)
    || !matchesClinicalValue(content(template.guidelineSource, catalog.source), catalog.source)
    || template.rules.length !== 1 || template.rules[0].id !== ruleId
    || !matchesClinicalValue(content(template.rules[0], catalog.rule), catalog.rule)) fail('CARE_PLAN_DEFINITION_UNAVAILABLE');
  return template.rules[0];
}
async function targetPlan(tx: Tx, target: PlanTarget) {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM public.care_plans
    WHERE id=${target.planId}::uuid AND patient_id=${target.patientId}::uuid FOR UPDATE`;
  if (rows.length !== 1) fail('CARE_PLAN_NOT_FOUND');
  return planView(await tx.carePlan.findUniqueOrThrow({ where: { id: rows[0].id } }));
}

export function createCarePlanPersistence(connectionString: string | undefined) {
  if (!connectionString) fail('CARE_PLAN_SERVICE_UNAVAILABLE');
  const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 3000, max: 4 });
  pool.on('error', () => {});
  const client = new PrismaClient({ adapter: new PrismaPg(pool), log: [] });
  async function run<T>(principal: AuthPrincipal, input: { patientId: PatientProfileId }, keys: string[], operation: (tx: Tx) => Promise<T>): Promise<T> {
    try {
      inputShape(input, keys);
      // Copy trusted identity scalars before awaiting; caller mutation cannot change attribution.
      const actor = { ...principal };
      return await client.$transaction(async tx => {
        await tx.$executeRaw`SET LOCAL lock_timeout = '5s'`;
        await tx.$executeRaw`SET LOCAL statement_timeout = '10s'`;
        await authorize(tx, actor, input.patientId);
        const result = await operation(tx);
        // Expiry is time-based and cannot be protected by row locks.
        await checkSession(tx, actor);
        return result;
      }, { isolationLevel: 'ReadCommitted', maxWait: 5000, timeout: 30000 });
    } catch (error) {
      if (error instanceof CarePlanError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') fail('CARE_PLAN_ACTIVE_CONFLICT');
      fail('CARE_PLAN_SERVICE_UNAVAILABLE');
    }
  }
  async function transition(principal: AuthPrincipal, target: PlanTarget, status: 'ACTIVE' | 'CANCELLED'): Promise<PlanMutationResult> {
    const actor = { ...principal }, scope = { ...target };
    return run(actor, scope, ['patientId', 'planId'], async tx => {
      const plan = await targetPlan(tx, scope);
      if (plan.status === status) return { plan, changed: false };
      if (plan.status === 'CANCELLED' || (status === 'ACTIVE' && plan.status !== 'DRAFT')) fail('CARE_PLAN_INVALID_STATE');
      if (status === 'ACTIVE') await pinnedDefinition(tx, plan.templateId, plan.ruleDefinitionId, true);
      const updated = await tx.carePlan.update({ where: { id: plan.id }, data: { status } });
      await appendAuditRecord(tx, { actorUserId: actor.userId, actionType: status === 'ACTIVE' ? 'CARE_PLAN_ACTIVATED' : 'CARE_PLAN_CANCELLED', entityType: 'care_plan', entityId: plan.id });
      return { plan: planView(updated), changed: true };
    });
  }
  return {
    async createDraftPlan(principal: AuthPrincipal, input: Readonly<{ patientId: PatientProfileId }>): Promise<CarePlanSnapshot> {
      const actor = { ...principal }, scope = { ...input };
      return run(actor, scope, ['patientId'], async tx => {
        const template = await tx.carePlanTemplate.findUnique({ where: { templateKey_version: { templateKey: catalog.template.templateKey, version: catalog.template.version } }, include: { rules: true } });
        if (!template || template.rules.length !== 1) fail('CARE_PLAN_DEFINITION_UNAVAILABLE');
        await pinnedDefinition(tx, template.id, template.rules[0].id, true);
        const plan = await tx.carePlan.create({ data: { patientId: scope.patientId, templateId: template.id, ruleDefinitionId: template.rules[0].id, createdByUserId: actor.userId } });
        await appendAuditRecord(tx, { actorUserId: actor.userId, actionType: 'CARE_PLAN_CREATED', entityType: 'care_plan', entityId: plan.id });
        return planView(plan);
      });
    },
    activatePlan: (principal: AuthPrincipal, target: PlanTarget) => transition(principal, target, 'ACTIVE'),
    cancelPlan: (principal: AuthPrincipal, target: PlanTarget) => transition(principal, target, 'CANCELLED'),
    async inspectPlan(principal: AuthPrincipal, target: PlanTarget): Promise<CarePlanSnapshot> {
      const scope = { ...target };
      return run(principal, scope, ['patientId', 'planId'], tx => targetPlan(tx, scope));
    },
    async inspectDeferredActionSpecification(principal: AuthPrincipal, target: PlanTarget): Promise<DeferredActionSpecification> {
      const scope = { ...target };
      return run(principal, scope, ['patientId', 'planId'], async tx => {
        const plan = await targetPlan(tx, scope);
        const rule = await pinnedDefinition(tx, plan.templateId, plan.ruleDefinitionId, false);
        return { planId: plan.id, patientId: plan.patientId, templateId: plan.templateId, ruleDefinitionId: plan.ruleDefinitionId, planStatus: plan.status,
          ...projectDeferredActionSpecification(rule.definition) };
      });
    },
    async close(): Promise<void> { try { await client.$disconnect(); await pool.end(); } catch { fail('CARE_PLAN_SERVICE_UNAVAILABLE'); } },
  };
}
export type CarePlanPersistence = ReturnType<typeof createCarePlanPersistence>;
