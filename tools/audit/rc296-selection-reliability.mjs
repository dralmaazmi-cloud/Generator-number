#!/usr/bin/env node
// RC2.9.6 §4.1 companion. The delivery rate a capacity answer rests on.
//
// The matrix runs ten attempts per cell, and ten attempts cannot tell a cell
// that always works from one that works 98% of the time — which is the whole
// difference between a count the product may offer and a dead end a learner
// meets once in sixty sittings. This runs 120 independent seeds per cell and
// prints the rate beside what the UI offers, so the two can be compared
// directly: every offered cell must be at 1.000.
//
// Usage: node tools/audit/rc296-selection-reliability.mjs [seeds] [out.json]

import {writeFileSync} from 'node:fs';
import Engine from '../../src/index.js';

const SEEDS = Number(process.argv[2] ?? 120);
const OUT = process.argv[3] ?? null;
const LADDER = [5, 10, 14, 20, 30];
const engine = new Engine();

/** The cells worth asking about: the families the RC2.9.6 brief measured as
 *  dead ends, at the counts around their ceiling, plus a wide control. */
const CELLS = [
  [['ages'], 5], [['ages'], 10], [['ratios'], 10], [['ratios'], 5],
  [['direct_proportion'], 10], [['direct_proportion'], 5],
  [['relational'], 5], [['calendar'], 5], [['sequences'], 14],
  [['fractions'], 5], [['odd_one_out'], 5]
];

export function measure(seeds = SEEDS, cells = CELLS) {
  return cells.map(([families, count]) => {
    let delivered = 0;
    for (let i = 0; i < seeds; i++) {
      try {
        const s = engine.generatePractice({families, count, seed: `rc296-rel-${families.join('+')}-${count}-${i}`});
        if (s.questions.length === count) delivered++;
      } catch { /* a refusal is a non-delivery, which is the thing being counted */ }
    }
    const uiCap = engine.sessionCapacity({families, ladder: LADDER}).maxCount;
    return {families, count, seeds, delivered, rate: Number((delivered / seeds).toFixed(3)),
      uiOffersThisCount: count <= uiCap, uiCap};
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = measure();
  console.log('selection                 count  seeds  delivered  rate    UI offers it');
  for (const r of rows) {
    console.log(`${r.families.join('+').padEnd(24)}${String(r.count).padStart(5)}${String(r.seeds).padStart(7)}${String(r.delivered).padStart(11)}${String(r.rate).padStart(8)}   ${r.uiOffersThisCount ? 'yes' : 'no '} (cap ${r.uiCap})`);
  }
  const betrayed = rows.filter(r => r.uiOffersThisCount && r.rate < 1);
  console.log(`\noffered cells below a 1.000 delivery rate: ${betrayed.length}   <- must be 0`);
  if (OUT) writeFileSync(OUT, JSON.stringify({schema: 'rc296-selection-reliability-v1',
    note: 'Delivery rate over independent seeds per cell, beside what the UI offers. A cell the UI offers must be at 1.000.',
    rows}, null, 2) + '\n');
}
