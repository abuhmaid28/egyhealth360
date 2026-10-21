import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient, Prisma } from './generated/prisma/client.js';
import type { AuthPrincipal } from './auth.js';
import { appendAuditRecord } from './audit.js';
import { evidenceUuid } from './followup-common.js';

type Code = 'CARE_ACTION_INVALID' | 'CARE_ACTION_UNAUTHENTICATED' | 'CARE_ACTION_NOT_FOUND' | 'CARE_ACTION_STALE_SELECTION' | 'CARE_ACTION_CONFLICT' | 'CARE_ACTION_UNAVAILABLE';
export class CareActionError extends Error { constructor(public readonly code: Code) { super(code); } }
const fail = (code: Code): never => { throw new CareActionError(code); };
type Tx = Prisma.TransactionClient;
export type CareActionTarget = Readonly<{ patientId: string; planId: string }>;
export type CareActionSelection = CareActionTarget & Readonly<{ bpId: string; applicabilityId: string }>;
export type GenerateInitialCareActionInput = CareActionSelection & Readonly<{ operationId: string; accepted: true; expectedInputs: unknown }>;
export type CareActionSnapshot = Readonly<{ id: string; patientId: string; carePlanId: string; templateId: string; ruleDefinitionId: string; occurrence: 'INITIAL'; actionType: 'HTN_BP_FOLLOWUP'; triggerAt: Date; recommendedAt: Date; dueBy: Date; createdAt: Date }>;

function shape(raw: unknown, keys: string[]): asserts raw is Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || ![Object.prototype, null].includes(Object.getPrototypeOf(raw))) return fail('CARE_ACTION_INVALID');
  if (Reflect.ownKeys(raw).length !== keys.length || Reflect.ownKeys(raw).some(k => typeof k !== 'string' || !keys.includes(k))
    || keys.some(k => !Object.hasOwn(raw,k) || !('value' in Object.getOwnPropertyDescriptor(raw,k)!))) fail('CARE_ACTION_INVALID');
}
// Copy only strict JSON data, before any await. No getters, hidden keys, toJSON or clinical extension bag.
function copyJson(raw: unknown, depth = 0, budget = { n: 0 }): unknown {
  if (++budget.n > 20000 || depth > 16) fail('CARE_ACTION_INVALID');
  if (raw === null || typeof raw === 'boolean' || typeof raw === 'string') return raw;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (!raw || typeof raw !== 'object') return fail('CARE_ACTION_INVALID');
  if (Array.isArray(raw)) {
    if (Object.getPrototypeOf(raw)!==Array.prototype || Reflect.ownKeys(raw).length !== raw.length+1) fail('CARE_ACTION_INVALID');
    return Array.from({ length: raw.length }, (_,i) => {
      const d=Object.getOwnPropertyDescriptor(raw,String(i)); if (!d || !d.enumerable || !('value' in d)) return fail('CARE_ACTION_INVALID');
      return copyJson(d.value,depth+1,budget);
    });
  }
  if (![Object.prototype,null].includes(Object.getPrototypeOf(raw))) return fail('CARE_ACTION_INVALID');
  return Object.fromEntries(Reflect.ownKeys(raw).map(k => {
    const d=Object.getOwnPropertyDescriptor(raw,k)!;
    if (typeof k !== 'string' || !d.enumerable || !('value' in d)) fail('CARE_ACTION_INVALID');
    return [k,copyJson(d.value,depth+1,budget)];
  }));
}
function target(raw: unknown, keys: string[]) {
  shape(raw,keys);
  const r: Record<string,unknown>={};
  for (const k of keys) {
    if (k==='expectedInputs') { r[k]=copyJson(raw[k]); if (JSON.stringify(r[k]).length>262144) fail('CARE_ACTION_INVALID'); }
    else if (k==='accepted') { if (raw[k]!==true) fail('CARE_ACTION_INVALID'); r[k]=true; }
    else if (k==='page' || k==='pageSize') r[k]=raw[k];
    else { if (!evidenceUuid(raw[k])) fail('CARE_ACTION_INVALID'); r[k]=(raw[k] as string).toLowerCase(); }
  }
  return r;
}
// Correction lineage can contain now-private predecessor IDs. It is protected persistence only.
function selectionView(inputs: unknown) {
  return Object.fromEntries(Object.entries(inputs as Record<string,unknown>).filter(([key])=>key!=='bpOrigin'));
}
const projection = Prisma.sql`a.id,a.patient_id AS "patientId",a.care_plan_id AS "carePlanId",a.template_id AS "templateId",a.rule_definition_id AS "ruleDefinitionId",a.occurrence,a.action_type AS "actionType",a.trigger_at AS "triggerAt",a.recommended_at AS "recommendedAt",a.due_by AS "dueBy",a.created_at AS "createdAt"`;
async function session(tx: Tx, actor: AuthPrincipal) {
  const rows=await tx.$queryRaw<{role:string}[]>`SELECT u.role::text role FROM public.users u JOIN public.sessions s ON s.user_id=u.id WHERE u.id=${actor.userId}::uuid AND s.id=${actor.sessionId}::uuid AND u.status='ACTIVE' AND s.revoked_at IS NULL AND s.expires_at>pg_catalog.clock_timestamp()`;
  if (rows.length!==1) fail('CARE_ACTION_UNAUTHENTICATED');
  if (rows[0].role!==actor.role || !['PATIENT','CLINICIAN'].includes(actor.role)) fail('CARE_ACTION_NOT_FOUND');
}
export function createCareActionPersistence(connectionString: string | undefined) {
  if (!connectionString) fail('CARE_ACTION_UNAVAILABLE');
  const pool=new pg.Pool({connectionString,connectionTimeoutMillis:3000,max:4}); pool.on('error',()=>{});
  const client=new PrismaClient({adapter:new PrismaPg(pool),log:[]});
  async function run<T>(principal: AuthPrincipal, patientId: string, write: boolean, fn:(tx:Tx,actor:AuthPrincipal,assignmentId:string|null)=>Promise<T>):Promise<T> {
    const actor={...principal};
    if (!evidenceUuid(actor.userId) || !evidenceUuid(actor.sessionId)) fail('CARE_ACTION_UNAUTHENTICATED');
    try {
      return await client.$transaction(async tx=>{
        await tx.$executeRaw`SET LOCAL lock_timeout='5s'`; await tx.$executeRaw`SET LOCAL statement_timeout='10s'`;
        await tx.$queryRaw`SELECT id FROM public.users WHERE id=${actor.userId}::uuid FOR NO KEY UPDATE`;
        await tx.$queryRaw`SELECT id FROM public.sessions WHERE id=${actor.sessionId}::uuid FOR UPDATE`;
        await session(tx,actor);
        if (write && actor.role!=='CLINICIAN') fail('CARE_ACTION_NOT_FOUND');
        let assignmentId:string|null=null;
        if (actor.role==='CLINICIAN') {
          const cs=await tx.$queryRaw<{id:string}[]>`SELECT id FROM public.clinician_profiles WHERE user_id=${actor.userId}::uuid AND user_role='CLINICIAN' FOR SHARE`;
          if (cs.length!==1) fail('CARE_ACTION_NOT_FOUND');
          const as=await tx.$queryRaw<{id:string}[]>`SELECT id FROM public.clinician_patient_assignments WHERE clinician_id=${cs[0].id}::uuid AND patient_id=${patientId}::uuid AND status='ACTIVE' AND ended_at IS NULL FOR SHARE`;
          if (as.length!==1) fail('CARE_ACTION_NOT_FOUND'); assignmentId=as[0].id;
        }
        // Acquire the exclusive scope initially; never upgrade SHARE after taking evidence locks.
        const ps=await tx.$queryRaw<{userId:string}[]>(Prisma.sql`SELECT user_id AS "userId" FROM public.patient_profiles WHERE id=${patientId}::uuid AND user_role='PATIENT' ${write?Prisma.sql`FOR UPDATE`:Prisma.sql`FOR SHARE`}`);
        if (ps.length!==1 || (actor.role==='PATIENT' && ps[0].userId!==actor.userId.toLowerCase())) fail('CARE_ACTION_NOT_FOUND');
        const result=await fn(tx,actor,assignmentId); await session(tx,actor); return result;
      },{isolationLevel:'ReadCommitted',maxWait:5000,timeout:30000});
    } catch(e) { if(e instanceof CareActionError)throw e; return fail('CARE_ACTION_UNAVAILABLE'); }
  }
  async function lockPlan(tx:Tx,c:Record<string,unknown>) {
    const ps=await tx.$queryRaw<{templateId:string}[]>`SELECT template_id AS "templateId" FROM public.care_plans WHERE id=${c.planId}::uuid AND patient_id=${c.patientId}::uuid FOR UPDATE`;
    if(ps.length!==1)fail('CARE_ACTION_NOT_FOUND');
    await tx.$queryRaw`SELECT id FROM public.care_plan_templates WHERE id=${ps[0].templateId}::uuid FOR SHARE`;
  }
  async function lockBp(tx:Tx,c:Record<string,unknown>) {
    const bs=await tx.$queryRaw<{id:string}[]>`SELECT id FROM public.blood_pressure_measurements WHERE id=${c.bpId}::uuid AND patient_id=${c.patientId}::uuid FOR UPDATE`;
    if(bs.length!==1)fail('CARE_ACTION_NOT_FOUND');
    const ds=await tx.$queryRaw<{ok:boolean}[]>`SELECT public.bp31_disclosable(${c.bpId}::uuid) ok`;
    if(!ds[0].ok)fail('CARE_ACTION_NOT_FOUND');
    const linkage=await tx.$queryRaw<{ok:boolean}[]>`SELECT public.eh014_bp_linkage(${c.bpId}::uuid) ok`;
    if(!linkage[0].ok)fail('CARE_ACTION_UNAVAILABLE');
  }
  async function inputs(tx:Tx,c:Record<string,unknown>) {
    const rows=await tx.$queryRaw<{inputs:unknown}[]>`SELECT public.eh014_inputs(${c.planId}::uuid,${c.bpId}::uuid,${c.applicabilityId}::uuid) inputs`;
    if(!rows[0]?.inputs)fail('CARE_ACTION_NOT_FOUND'); return rows[0].inputs;
  }
  async function coherent(tx:Tx,patientId:string) {
    const rs=await tx.$queryRaw<{bad:boolean}[]>`SELECT EXISTS(SELECT 1 FROM public.care_actions a WHERE a.patient_id=${patientId}::uuid AND NOT public.eh014_coherent(a.id)) bad`;
    if(rs[0].bad)fail('CARE_ACTION_UNAVAILABLE');
  }
  async function action(tx:Tx,patientId:string,id:string) {
    await coherent(tx,patientId);
    const rows=await tx.$queryRaw<CareActionSnapshot[]>(Prisma.sql`SELECT ${projection} FROM public.care_actions a JOIN public.care_action_decisions d ON d.id=a.decision_id WHERE a.id=${id}::uuid AND a.patient_id=${patientId}::uuid AND public.bp31_disclosable(d.bp_id)`);
    if(rows.length!==1)fail('CARE_ACTION_NOT_FOUND');return rows[0];
  }
  return {
    async previewSelection(principal:AuthPrincipal,raw:CareActionSelection) {
      const c=target(raw,['patientId','planId','bpId','applicabilityId']);
      return run(principal,c.patientId as string,true,async tx=>{await lockPlan(tx,c);await lockBp(tx,c);return {expectedInputs:selectionView(await inputs(tx,c))};});
    },
    async generateInitialAction(principal:AuthPrincipal,raw:GenerateInitialCareActionInput) {
      const c=target(raw,['patientId','planId','bpId','applicabilityId','operationId','accepted','expectedInputs']);
      return run(principal,c.patientId as string,true,async(tx,actor,assignmentId)=>{
        await lockPlan(tx,c);await lockBp(tx,c);
        const used=await tx.$queryRaw<{carePlanId:string}[]>`SELECT care_plan_id AS "carePlanId" FROM public.care_action_decisions WHERE selecting_user_id=${actor.userId}::uuid AND operation_key=${c.operationId}::uuid`;
        if(used.length && used[0].carePlanId!==c.planId)fail('CARE_ACTION_CONFLICT');
        const old=await tx.$queryRaw<{actionId:string;exact:boolean;disclosable:boolean}[]>`SELECT action_id AS "actionId",public.bp31_disclosable(bp_id) disclosable,(bp_id=${c.bpId}::uuid AND applicability_id=${c.applicabilityId}::uuid AND (inputs - 'bpOrigin')=${JSON.stringify(c.expectedInputs)}::jsonb AND operation_key=${c.operationId}::uuid AND accepted) exact FROM public.care_action_decisions WHERE care_plan_id=${c.planId}::uuid`;
        if(old.length) { if(!old[0].disclosable)fail('CARE_ACTION_NOT_FOUND'); if(!old[0].exact)fail('CARE_ACTION_CONFLICT');return {action:await action(tx,c.patientId as string,old[0].actionId),created:false}; }
        const current=await inputs(tx,c);
        const eq=await tx.$queryRaw<{ok:boolean}[]>`SELECT ${JSON.stringify(selectionView(current))}::jsonb=${JSON.stringify(c.expectedInputs)}::jsonb ok`;
        if(!eq[0].ok)fail('CARE_ACTION_STALE_SELECTION');
        // Guarded INSERT rechecks all derivable clinical/lifecycle facts under retained locks.
        const ids={decision:randomUUID(),action:randomUUID()};
        try {
          await tx.$executeRaw`INSERT INTO public.care_action_decisions(id,action_id,patient_id,care_plan_id,template_id,rule_definition_id,bp_id,applicability_id,selecting_user_id,assignment_id,operation_key,accepted,inputs,trigger_at,recommended_at,due_by)
          SELECT ${ids.decision}::uuid,${ids.action}::uuid,p.patient_id,p.id,p.template_id,p.rule_definition_id,${c.bpId}::uuid,${c.applicabilityId}::uuid,${actor.userId}::uuid,${assignmentId}::uuid,${c.operationId}::uuid,true,${JSON.stringify(current)}::jsonb,b.measured_at,b.measured_at,b.measured_at FROM public.care_plans p JOIN public.blood_pressure_measurements b ON b.id=${c.bpId}::uuid WHERE p.id=${c.planId}::uuid`;
        } catch(e) {
          const error=e as {meta?:{code?:string;driverAdapterError?:{cause?:{originalCode?:string}}}};
          if((error?.meta?.code ?? error?.meta?.driverAdapterError?.cause?.originalCode)==='23514')return fail('CARE_ACTION_STALE_SELECTION');
          throw e;
        }
        await tx.$executeRaw`INSERT INTO public.care_actions(id,patient_id,care_plan_id,template_id,rule_definition_id,decision_id,occurrence,action_type,trigger_at,recommended_at,due_by) SELECT action_id,patient_id,care_plan_id,template_id,rule_definition_id,id,'INITIAL','HTN_BP_FOLLOWUP',trigger_at,recommended_at,due_by FROM public.care_action_decisions WHERE id=${ids.decision}::uuid`;
        await tx.$executeRaw`INSERT INTO public.care_action_applicability_inputs(decision_id,snapshot_id,patient_id) SELECT d.id,(x->>'id')::uuid,d.patient_id FROM public.care_action_decisions d CROSS JOIN LATERAL pg_catalog.jsonb_array_elements(d.inputs->'point') x WHERE d.id=${ids.decision}::uuid`;
        await appendAuditRecord(tx,{actorUserId:actor.userId,actionType:'CARE_ACTION_TRIGGER_SELECTED',entityType:'care_action_decision',entityId:ids.decision});
        await appendAuditRecord(tx,{actorUserId:null,actionType:'CARE_ACTION_CREATED',entityType:'care_action',entityId:ids.action});
        return {action:await action(tx,c.patientId as string,ids.action),created:true};
      });
    },
    async inspectAction(principal:AuthPrincipal,raw:Readonly<{patientId:string;actionId:string}>) {
      const c=target(raw,['patientId','actionId']);return run(principal,c.patientId as string,false,tx=>action(tx,c.patientId as string,c.actionId as string));
    },
    async listActions(principal:AuthPrincipal,raw:Readonly<{patientId:string;page:number;pageSize:number}>) {
      const c=target(raw,['patientId','page','pageSize']);const page=c.page as number,pageSize=c.pageSize as number;
      if(!Number.isInteger(page)||page<1||page>2147483647||!Number.isInteger(pageSize)||pageSize<1||pageSize>100)fail('CARE_ACTION_INVALID');
      return run(principal,c.patientId as string,false,async tx=>{
        await coherent(tx,c.patientId as string);
        const rs=await tx.$queryRaw<{total:number;actions:CareActionSnapshot[]}[]>(Prisma.sql`WITH visible AS (SELECT ${projection} FROM public.care_actions a JOIN public.care_action_decisions d ON d.id=a.decision_id WHERE a.patient_id=${c.patientId}::uuid AND public.bp31_disclosable(d.bp_id)), page AS (SELECT * FROM visible ORDER BY "createdAt" DESC,id DESC LIMIT ${pageSize} OFFSET ${(page-1)*pageSize}) SELECT (SELECT count(*)::int FROM visible) total,COALESCE((SELECT jsonb_agg(to_jsonb(page) ORDER BY "createdAt" DESC,id DESC) FROM page),'[]'::jsonb) actions`);
        return {total:rs[0].total,actions:rs[0].actions.map(a=>({...a,triggerAt:new Date(a.triggerAt),recommendedAt:new Date(a.recommendedAt),dueBy:new Date(a.dueBy),createdAt:new Date(a.createdAt)}))};
      });
    },
    async close(){try{await client.$disconnect();await pool.end();}catch{fail('CARE_ACTION_UNAVAILABLE');}}
  };
}
export type CareActionPersistence=ReturnType<typeof createCareActionPersistence>;
