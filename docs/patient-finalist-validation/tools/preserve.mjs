import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const directory='docs/patient-finalist-validation';
const base='5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3',source='459037baa0d7c2e67fd95715bfca7999592dfd45';
const exceptions=['docs/CURRENT_STATUS.md','docs/SOURCE_OF_TRUTH.md','docs/IMPLEMENTATION_ROADMAP.md'];
const git=args=>execFileSync('git',args,{maxBuffer:32*1024*1024});
const digest=b=>createHash('sha256').update(b).digest('hex');
const baseline=git(['ls-tree','-r','--name-only','-z',base]).toString().split('\0').filter(Boolean),proof=[];
for(const path of baseline.filter(p=>!exceptions.includes(p))){
  const original=git(['show',`${base}:${path}`]),actual=await readFile(path);
  assert.ok(original.equals(actual),`Pre-existing bytes changed: ${path}`);proof.push({path,sha256:digest(actual)});
}
const changed=git(['diff','--name-only',base]).toString().trim().split('\n').filter(Boolean);
assert.ok(changed.every(p=>exceptions.includes(p)||p.startsWith(directory+'/')));
const untracked=git(['ls-files','--others','--exclude-standard']).toString().trim().split('\n').filter(Boolean);
assert.ok(untracked.every(p=>p.startsWith(directory+'/')));
const copied=[];
for(const name of ['nova.css','assets/manrope.ttf','assets/manrope-OFL.txt','assets/plex-arabic-regular.ttf','assets/plex-arabic-semibold.ttf','assets/plex-arabic-OFL.txt']){
  const original=git(['show',`${source}:docs/nova-evolution-refinement-04/${name}`]),actual=await readFile(`${directory}/${name}`);
  assert.ok(original.equals(actual),`Candidate source changed: ${name}`);copied.push({path:name,sha256:digest(actual)});
}
const report={base,soleCandidate:source,result:'PASS',preExistingFiles:baseline.length,explicitGovernanceExceptions:exceptions,byteIdenticalFiles:proof.length,proofInventorySHA256:digest(JSON.stringify(proof)),copiedCandidateBytes:copied,scope:'All pre-existing tracked bytes except the three governance summaries are identical: includes production frontend/backend, auth/security, contracts, APIs, schema/migrations, CI, dependencies and all historical evidence. New files confined to isolated validation folder. No deployment proof is inferred.'};
await writeFile(`${directory}/evidence/preservation.json`,JSON.stringify(report,null,2)+'\n');
const inventory=[];
async function visit(dir){for(const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const path=`${dir}/${entry.name}`;if(entry.isDirectory())await visit(path);else if(!path.endsWith('/artifact-hashes.json'))inventory.push({path:path.slice(directory.length+1),sha256:digest(await readFile(path))});}}
await visit(directory);await writeFile(`${directory}/evidence/artifact-hashes.json`,JSON.stringify({algorithm:'SHA256',excludes:'This manifest itself',files:inventory},null,2)+'\n');
console.log(JSON.stringify({base,result:report.result,preExistingFiles:baseline.length,byteIdenticalFiles:proof.length,copiedCandidateFiles:copied.length,artifactFiles:inventory.length},null,2));
