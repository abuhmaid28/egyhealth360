import { stagingSeedCommand } from './lib/staging-seed.mjs';
try { console.log(JSON.stringify(await stagingSeedCommand(process.env))); }
catch { console.error(JSON.stringify({ error: { code: 'STAGING_INITIALIZATION_FAILED' } })); process.exitCode = 1; }
