#!/usr/bin/env node
// MANUAL BLIND REVIEW — reveal step. Compares my independently recorded answers
// against the published keys. Answers are supplied as a JSON map id -> value
// recorded BEFORE this script is run.
import {readFileSync} from 'node:fs';
const mine = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const family = process.argv[3];
const rows = readFileSync('audit-rc1/blind-audit-250.jsonl', 'utf8').trim().split('\n')
  .map(l => JSON.parse(l)).filter(r => !family || r.family === family);
const num = s => { const m = /-?\d+(?:\.\d+)?/.exec(String(s).replace(/[٠-٩]/g, c => c.codePointAt(0) - 0x0660)); return m ? Number(m[0]) : null; };
let ok = 0, bad = [];
for (const r of rows) {
  const id = `${r.sessionId}/${String(r.questionNumber).padStart(2,'0')}`;
  if (!(id in mine)) continue;
  const pub = r.publishedCorrectValue;
  const m = String(mine[id]);
  const agree = String(pub).trim() === m || (num(pub) !== null && num(m) !== null && Math.abs(num(pub) - num(m)) < 1e-9);
  if (agree) ok++; else bad.push({id, templateId: r.templateId, manual: m, published: pub, stem: r.stem});
  console.log(`${id.padEnd(7)} ${r.templateId.padEnd(20)} manual=${m.padEnd(10)} published=${String(pub).padEnd(18)} ${agree ? 'AGREE' : '*** DISAGREE ***'}`);
}
console.log(`\n${family || 'all'}: ${ok}/${ok + bad.length} agree`);
for (const b of bad) console.log(`\nDISAGREEMENT ${b.id} ${b.templateId}\n  stem: ${b.stem}\n  manual: ${b.manual}\n  published: ${b.published}`);
