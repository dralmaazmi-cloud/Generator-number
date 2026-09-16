#!/usr/bin/env node
// RC2.9.5 §3/§7. The REALISED band split, over at least a thousand questions
// delivered through the product's own path, at every session size the product
// offers. The declared weights are not evidence: RC2.9.5 found that the mix
// constants were never read by the schedule builder, so what a learner meets
// is measured here rather than quoted from a constant.

import Engine from '../../src/index.js';
import {MIXED_DIFFICULTY_WEIGHTS} from '../../src/index.js';

const engine = new Engine();
const COUNTS = (process.argv[2] ?? '10,20,30,50').split(',').map(Number);
const TOTAL = Number(process.argv[3] ?? 1200);
const rows = [];
for (const count of COUNTS) {
  const tally = {easy: 0, medium: 0, hard: 0};
  let delivered = 0, sittings = 0;
  for (let i = 0; delivered < TOTAL; i++) {
    const s = engine.generatePractice({count, difficulty: 'mixed', family: 'random', seed: `rc295-split-${count}-${i}`});
    for (const q of s.questions) tally[q.difficulty]++;
    delivered += s.questions.length;
    sittings++;
  }
  rows.push({count, sittings, delivered, ...tally,
    easyPct: +(100 * tally.easy / delivered).toFixed(2),
    mediumPct: +(100 * tally.medium / delivered).toFixed(2),
    hardPct: +(100 * tally.hard / delivered).toFixed(2)});
}
console.log('declared weights:', JSON.stringify(MIXED_DIFFICULTY_WEIGHTS));
console.log('count  sittings  delivered   easy%  medium%  hard%');
for (const r of rows) console.log(`${String(r.count).padStart(5)} ${String(r.sittings).padStart(9)} ${String(r.delivered).padStart(11)} ${String(r.easyPct).padStart(7)} ${String(r.mediumPct).padStart(8)} ${String(r.hardPct).padStart(6)}`);
const out = process.env.RC295_SPLIT_OUT;
if (out) (await import('node:fs')).writeFileSync(out, JSON.stringify({schema: 'rc295-band-split-v1', declared: MIXED_DIFFICULTY_WEIGHTS, rows}, null, 2) + '\n');
