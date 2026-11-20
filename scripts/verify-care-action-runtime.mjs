import { verifyInitialCareActionProof } from './lib/m2-action-proof.mjs';
try { console.log(JSON.stringify(await verifyInitialCareActionProof())); }
catch { console.error('CARE_ACTION_RUNTIME_FAILED');process.exitCode=1; }
