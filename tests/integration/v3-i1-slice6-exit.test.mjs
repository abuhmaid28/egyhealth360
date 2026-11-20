import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyI1Exit} from '../../scripts/verify-v3-i1-exit-runtime.mjs';
test('I1S6 combined registration, membership, directory, relationship, BP, revocation journey',async()=>{
 const result=await verifyI1Exit();assert.equal(result.result,'PASS');assert.equal(result.cases,25);console.log('I1S6_EXIT',JSON.stringify(result));
});
