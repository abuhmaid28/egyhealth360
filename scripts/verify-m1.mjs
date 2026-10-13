import { verifyCommand } from './lib/m1-verify.mjs';
import { safeFailure } from './lib/m1-demo.mjs';
try {console.log(JSON.stringify(await verifyCommand(process.env)));}
catch(error) {console.error(JSON.stringify(safeFailure(error)));process.exitCode=1;}
