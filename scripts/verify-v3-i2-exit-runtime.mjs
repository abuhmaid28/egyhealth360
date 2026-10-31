import assert from 'node:assert/strict';
import {proveI2Journey} from '../tests/support/v3-i2-exit.mjs';
try {
  assert.ok(['development','test'].includes(process.env.NODE_ENV));
  console.log(JSON.stringify(await proveI2Journey()));
} catch (error) {
  console.error(JSON.stringify({manifest:'eh-v3-i2-slice7-combined-journey-proof-v1',result:'FAIL',error:error.code ?? 'PROOF_FAILED'}));
  process.exitCode=1;
}
