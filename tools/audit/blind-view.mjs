#!/usr/bin/env node
// MANUAL BLIND REVIEW — shows only what a candidate sees.
// Prints the stem, the display expression and the six options. Never the key,
// the oracle result, the explanation, the provenance or the verdict.
// Usage: node tools/audit/blind-view.mjs <family> [--ids]
import {readFileSync} from 'node:fs';
const rows = readFileSync('audit-rc1/blind-audit-250.jsonl', 'utf8').trim().split('\n').map(l => JSON.parse(l));
const family = process.argv[2];
const sel = rows.filter(r => r.family === family);
for (const r of sel) {
  console.log(`### ${r.sessionId}/${String(r.questionNumber).padStart(2,'0')}  ${r.templateId}  [${r.difficulty}]`);
  console.log(r.stem);
  if (r.displayExpression) console.log(`    ${r.displayExpression}`);
  console.log(['A','B','C','D','E','F'].map(l => `${l}) ${r.options[l]}`).join('   '));
  console.log('');
}
console.log(`-- ${sel.length} questions in ${family} --`);
