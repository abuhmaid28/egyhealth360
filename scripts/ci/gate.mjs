import { verifyGate } from './policy.mjs';
verifyGate(JSON.parse(process.env.CI_PLAN), JSON.parse(process.env.JOB_RESULTS));
console.log('validate: all selected lanes succeeded; all policy omissions are explicitly skipped');
