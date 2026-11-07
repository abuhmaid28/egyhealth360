import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';

// Keep full machine evidence while giving each case/pair a single reviewable line.
export async function writeRecordsReport(path,report,recordFields){
  const metadata=Object.fromEntries(Object.entries(report).filter(([key])=>!recordFields.includes(key)));
  const sections=[JSON.stringify(metadata,null,2).slice(0,-2)];
  for(const key of recordFields)sections.push(`  ${JSON.stringify(key)}: [\n${report[key].map(record=>'    '+JSON.stringify(record)).join(',\n')}\n  ]`);
  const contents=sections.join(',\n')+'\n}\n';
  assert.deepEqual(JSON.parse(contents),JSON.parse(JSON.stringify(report)));
  await writeFile(path,contents);
}
