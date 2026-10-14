import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient, type Prisma } from './generated/prisma/client.js';
import { APPROVED_CLINICAL_CATALOG as catalog, matchesClinicalValue, validateClinicalDefinition, type ApprovedClinicalDefinition } from '@egyhealth/clinical-rules';
import { appendAuditRecord } from './audit.js';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export type ClinicalTemplateVersionId = string & { readonly __clinicalTemplateVersionId: unique symbol };
export type ClinicalCatalogSnapshot = Readonly<{
  manifestId: typeof catalog.manifestId;
  source: typeof catalog.source & { id: string; createdAt: Date; updatedAt: Date };
  template: typeof catalog.template & {
    id: ClinicalTemplateVersionId; guidelineSourceId: string;
    status: 'DRAFT' | 'PUBLISHED' | 'RETIRED'; publishedAt: Date | null; retiredAt: Date | null; createdAt: Date; updatedAt: Date;
  };
  rule: { id: string; templateId: ClinicalTemplateVersionId; ruleKey: typeof catalog.rule.ruleKey; ruleVersion: typeof catalog.rule.ruleVersion;
    actionType: typeof catalog.rule.actionType; definition: ApprovedClinicalDefinition; createdAt: Date; updatedAt: Date };
}>;
export class ClinicalCatalogError extends Error {
  constructor(public readonly code: 'CLINICAL_CATALOG_CONFLICT' | 'CLINICAL_CATALOG_RETIRED' | 'CLINICAL_CATALOG_INVALID' | 'CLINICAL_CATALOG_MIGRATIONS_INVALID' | 'CLINICAL_CATALOG_UNAVAILABLE') { super(code); }
}
const conflict = (): never => { throw new ClinicalCatalogError('CLINICAL_CATALOG_CONFLICT'); };
const requiredMigrations = [
  ['20261012200810_eh005_identity_core_foundation', 'd8396ed97e82550866a44055f308fb039ed29d6c8cdcdd74d95da060f441749a'],
  ['20261013014000_eh006_auth_sessions', '2fb1704ab28b698bfcf6995f6120cb1b1f0138ab18fcf7db562517f47d53b79b'],
  ['20261013235221_eh009_clinical_definition_foundation', 'bf341361c12c50741987ee68d50c4ee7f80637adabc2f52f3fee77aa0c81af2a'],
];

async function migrations(tx: Prisma.TransactionClient) {
  const rows = await tx.$queryRaw<{ migration_name: string; checksum: string; finished_at: Date | null; rolled_back_at: Date | null }[]>`SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations`;
  for (const [name, checksum] of requiredMigrations) {
    const applied = rows.filter(row => row.migration_name === name);
    const sql = await readFile(new URL(`../prisma/migrations/${name}/migration.sql`, import.meta.url));
    if (applied.length !== 1 || applied[0].checksum !== checksum || createHash('sha256').update(sql).digest('hex') !== checksum) throw new ClinicalCatalogError('CLINICAL_CATALOG_MIGRATIONS_INVALID');
  }
  if (rows.some(row => !row.finished_at || row.rolled_back_at)) throw new ClinicalCatalogError('CLINICAL_CATALOG_MIGRATIONS_INVALID');
}
async function collect(tx: Prisma.TransactionClient, complete: boolean) {
  const sources = await tx.guidelineSource.findMany({ where: { OR: [
    { sourceKey: catalog.source.sourceKey },
    { publisher: catalog.source.publisher, title: catalog.source.title, publicationIdentity: catalog.source.publicationIdentity },
  ] } });
  const templates = await tx.carePlanTemplate.findMany({ where: { OR: [{ templateKey: catalog.template.templateKey }, { name: catalog.template.name }] } });
  const rules = await tx.careRuleDefinition.findMany({ where: { ruleKey: catalog.rule.ruleKey } });
  if (sources.length > 1 || templates.length > 1 || rules.length > 1) conflict();
  const source = sources[0], template = templates[0], rule = rules[0];
  if (source) {
    const content = Object.fromEntries(Object.keys(catalog.source).map(key => [key, source[key as keyof typeof source]]));
    if (!matchesClinicalValue(content, catalog.source)) conflict();
  }
  if (template) {
    const content = Object.fromEntries(Object.keys(catalog.template).map(key => [key, template[key as keyof typeof template]]));
    if (!source || template.guidelineSourceId !== source.id || !matchesClinicalValue(content, catalog.template)) conflict();
  }
  if (rule) {
    const content = Object.fromEntries(Object.keys(catalog.rule).map(key => [key, rule[key as keyof typeof rule]]));
    if (!template || rule.templateId !== template.id || !matchesClinicalValue(content, catalog.rule)) conflict();
    validateClinicalDefinition(rule.definition);
  }
  if (template && template.status !== 'DRAFT' && !rule) conflict();
  if (complete && (!source || !template || !rule)) conflict();
  return { source, template, rule };
}
function snapshot(state: Awaited<ReturnType<typeof collect>>): ClinicalCatalogSnapshot {
  const { source, template, rule } = state;
  if (!source || !template || !rule) return conflict();
  return {
    manifestId: catalog.manifestId,
    source: { ...source, ...catalog.source },
    template: { ...template, ...catalog.template, id: template.id as ClinicalTemplateVersionId },
    rule: { ...rule, ...catalog.rule, templateId: template.id as ClinicalTemplateVersionId, definition: validateClinicalDefinition(rule.definition) },
  };
}
async function lock(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`SET LOCAL lock_timeout = '10s'`;
  await tx.$executeRaw`SET LOCAL statement_timeout = '15s'`;
  await tx.$executeRaw`LOCK TABLE guideline_sources, care_plan_templates, care_rule_definitions IN SHARE ROW EXCLUSIVE MODE`;
  await tx.$executeRaw`SET LOCAL statement_timeout = '5s'`;
}

/** Trusted explicit catalog operations only. Never called by API/startup. */
export function createClinicalCatalogPersistence(connectionString: string | undefined) {
  if (!connectionString) throw new ClinicalCatalogError('CLINICAL_CATALOG_UNAVAILABLE');
  const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 3000, max: 2 });
  pool.on('error', () => {});
  const client = new PrismaClient({ adapter: new PrismaPg(pool), log: [] });
  return {
    async bootstrapApprovedCatalog() {
      validateClinicalDefinition(catalog.rule.definition);
      return client.$transaction(async tx => {
        await lock(tx); await migrations(tx);
        const state = await collect(tx, false);
        if (state.template?.status === 'RETIRED') throw new ClinicalCatalogError('CLINICAL_CATALOG_RETIRED');
        const created = { sources: 0, templates: 0, rules: 0 };
        let published = 0;
        const source = state.source ?? await tx.guidelineSource.create({ data: catalog.source });
        if (!state.source) created.sources++;
        const template = state.template ?? await tx.carePlanTemplate.create({ data: { ...catalog.template, guidelineSourceId: source.id } });
        if (!state.template) created.templates++;
        if (!state.rule) {
          await tx.careRuleDefinition.create({ data: { ...catalog.rule, definition: structuredClone(catalog.rule.definition) as Prisma.InputJsonValue, templateId: template.id } });
          created.rules++;
        }
        if (template.status === 'DRAFT') {
          await tx.carePlanTemplate.update({ where: { id: template.id }, data: { status: 'PUBLISHED' } });
          await appendAuditRecord(tx, { actorUserId: null, actionType: 'CLINICAL_TEMPLATE_PUBLISHED', entityType: 'care_plan_template', entityId: template.id });
          published = 1;
        }
        const result = snapshot(await collect(tx, true));
        if (result.template.status !== 'PUBLISHED') conflict();
        return { manifestId: catalog.manifestId, created, published, state: result };
      }, { maxWait: 5000, timeout: 30000 });
    },
    async inspectApprovedCatalog(): Promise<ClinicalCatalogSnapshot> {
      return client.$transaction(async tx => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        await tx.$executeRaw`SET LOCAL statement_timeout = '5s'`;
        await migrations(tx);
        return snapshot(await collect(tx, true));
      }, { isolationLevel: 'RepeatableRead', maxWait: 5000, timeout: 30000 });
    },
    async retireTemplateVersion(id: ClinicalTemplateVersionId): Promise<ClinicalCatalogSnapshot> {
      return client.$transaction(async tx => {
        await lock(tx); await migrations(tx);
        const current = snapshot(await collect(tx, true));
        if (id !== current.template.id || current.template.status !== 'PUBLISHED') conflict();
        await tx.carePlanTemplate.update({ where: { id }, data: { status: 'RETIRED' } });
        await appendAuditRecord(tx, { actorUserId: null, actionType: 'CLINICAL_TEMPLATE_RETIRED', entityType: 'care_plan_template', entityId: id });
        return snapshot(await collect(tx, true));
      }, { maxWait: 5000, timeout: 30000 });
    },
    async close(): Promise<void> { await client.$disconnect(); await pool.end(); },
  };
}
export type ClinicalCatalogPersistence = ReturnType<typeof createClinicalCatalogPersistence>;
