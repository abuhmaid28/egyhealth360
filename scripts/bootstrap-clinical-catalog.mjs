import { createClinicalCatalogPersistence, ClinicalCatalogError } from '../packages/db/dist/index.js';

async function bootstrap() {
  if (process.argv.length !== 2) throw new ClinicalCatalogError('CLINICAL_CATALOG_INVALID');
  const store = createClinicalCatalogPersistence(process.env.DATABASE_URL);
  try {
    const { manifestId, created, published } = await store.bootstrapApprovedCatalog();
    return { manifestId, result: 'PASS', created, published };
  } finally { await store.close(); }
}
try { console.log(JSON.stringify(await bootstrap())); }
catch (error) {
  console.error(JSON.stringify({ error: { code: error instanceof ClinicalCatalogError ? error.code : 'CLINICAL_CATALOG_UNAVAILABLE' } }));
  process.exitCode = 1;
}
