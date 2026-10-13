import { seedCommand, safeFailure } from './lib/m1-demo.mjs';
try { console.log(JSON.stringify(await seedCommand(process.env))); }
catch (error) { console.error(JSON.stringify(safeFailure(error))); process.exitCode = 1; }
