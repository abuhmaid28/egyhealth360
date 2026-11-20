import { readFile } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import { Pool } from './database.mjs';
import { createClinicalCatalogPersistence } from '../../packages/db/dist/index.js';
import { APPROVED_CLINICAL_CATALOG as catalog } from '../../packages/clinical-rules/dist/index.js';
export { catalog };
export const migrationNames = ['20261012200810_eh005_identity_core_foundation', '20261013014000_eh006_auth_sessions', '20261013235221_eh009_clinical_definition_foundation'];
export async function isolatedCatalog(run) {
  const admin = new Pool({ connectionString: process.env.DATABASE_URL });
  const name = `eh009_${randomUUID().replaceAll('-', '')}`;
  const url = new URL(process.env.DATABASE_URL); url.pathname = `/${name}`;
  let pool, store;
  try {
    await admin.query(`CREATE DATABASE ${name}`);
    pool = new Pool({ connectionString: url.toString() });
    await pool.query('CREATE TABLE _prisma_migrations(id varchar(36) PRIMARY KEY, checksum varchar(64) NOT NULL, finished_at timestamptz, migration_name varchar(255) NOT NULL, logs text, rolled_back_at timestamptz, started_at timestamptz NOT NULL DEFAULT now(), applied_steps_count integer NOT NULL DEFAULT 0)');
    for (const name of migrationNames) {
      const sql = await readFile(`packages/db/prisma/migrations/${name}/migration.sql`, 'utf8');
      await pool.query(sql);
      await pool.query('INSERT INTO _prisma_migrations(id,checksum,finished_at,migration_name,applied_steps_count) VALUES($1,$2,now(),$3,1)', [randomUUID(), createHash('sha256').update(sql).digest('hex'), name]);
    }
    store = createClinicalCatalogPersistence(url.toString());
    await run({ pool, store, url: url.toString() });
  } finally {
    if (store) await store.close(); if (pool) await pool.end();
    await admin.query(`DROP DATABASE IF EXISTS ${name}`); await admin.end();
  }
}
export async function insertSource(pool, overrides = {}) {
  const s = { ...catalog.source, ...overrides };
  return (await pool.query('INSERT INTO guideline_sources(source_key,title,publisher,publication_identity,publication_year,reference_identifier,reference_url) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *', [s.sourceKey,s.title,s.publisher,s.publicationIdentity,s.publicationYear,s.referenceIdentifier,s.referenceUrl])).rows[0];
}
export async function insertTemplate(pool, sourceId, overrides = {}) {
  const t = { ...catalog.template, status: 'DRAFT', ...overrides };
  return (await pool.query('INSERT INTO care_plan_templates(template_key,name,condition_domain,version,guideline_source_id,status) VALUES($1,$2,$3,$4,$5,$6) RETURNING *', [t.templateKey,t.name,t.conditionDomain,t.version,sourceId,t.status])).rows[0];
}
export async function insertRule(pool, templateId, overrides = {}) {
  const r = { ...catalog.rule, ...overrides };
  return (await pool.query('INSERT INTO care_rule_definitions(template_id,rule_key,rule_version,action_type,definition) VALUES($1,$2,$3,$4,$5::jsonb) RETURNING *', [templateId,r.ruleKey,r.ruleVersion,r.actionType,JSON.stringify(r.definition)])).rows[0];
}
export async function draft(pool, overrides = {}) {
  const source = await insertSource(pool, overrides.source);
  const template = await insertTemplate(pool, source.id, overrides.template);
  const rule = await insertRule(pool, template.id, overrides.rule);
  return { source, template, rule };
}
export const publish = (pool, id) => pool.query("UPDATE care_plan_templates SET status='PUBLISHED' WHERE id=$1 RETURNING *", [id]);
export const snapshot = async pool => Object.fromEntries(await Promise.all(['guideline_sources','care_plan_templates','care_rule_definitions','audit_logs'].map(async table => [table,(await pool.query(`SELECT * FROM ${table} ORDER BY id`)).rows])));
