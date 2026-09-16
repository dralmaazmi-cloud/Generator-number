#!/usr/bin/env node
// RC2.9.6 §3.4. The in-sitting perceptual repeat, over enough sittings to have
// a rate rather than an anecdote.
//
// RC2.9.5 measured one repeat in 160 sittings of ten and its gate asked for
// zero. One in 160 is not a number you can act on: it is either a planner edge
// case at small counts, which is fixable, or the capacity floor of a
// ten-question sitting, which is not. This runs at least 400 sittings per count
// and reports the rate, the counts it happens at, and what repeated.
//
// Usage: node tools/audit/rc296-in-sitting.mjs [sittings] [counts] [out.json]

import Engine from '../../src/index.js';
import {generatePracticeForJourney} from '../../practice-journey.js';

const SITTINGS = Number(process.argv[2] ?? 400);
const COUNTS = (process.argv[3] ?? '10,20,30').split(',').map(Number);
const OUT = process.argv[4] ?? null;
const engine = new Engine();

const shim = () => {
  const m = new Map();
  return {getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k)};
};

export function measure(sittings = SITTINGS, counts = COUNTS) {
  const rows = [];
  for (const count of counts) {
    let withRepeat = 0, delivered = 0, refused = 0;
    const examples = [];
    const worstBy = {};
    // Journeys of four sittings, because the second sitting of a journey is
    // where the cooldown pressure is, and a fresh sitting every time would
    // measure an easier thing than the product does.
    const journeys = Math.ceil(sittings / 4);
    for (let j = 0; j < journeys; j++) {
      const storage = shim();
      for (let s = 0; s < 4 && delivered < sittings; s++) {
        let set;
        try {
          set = generatePracticeForJourney({
            engine, storage, continueJourney: s > 0,
            options: {count, seed: `rc296-sit-${count}-${j}-${s}`}
          });
        } catch { refused++; continue; }
        delivered++;
        const seen = new Map();
        for (const q of set.questions) {
          const k = q.metadata.user_perceptual_signature;
          seen.set(k, (seen.get(k) ?? 0) + 1);
        }
        const repeats = [...seen.entries()].filter(([, n]) => n > 1);
        if (repeats.length) {
          withRepeat++;
          worstBy[repeats[0][0]] = (worstBy[repeats[0][0]] ?? 0) + 1;
          if (examples.length < 5) {
            examples.push({sitting: `${j}-${s}`, signature: repeats[0][0], times: repeats[0][1],
              positionInJourney: s + 1});
          }
        }
      }
    }
    rows.push({
      count, sittingsMeasured: delivered, refused,
      sittingsWithARepeat: withRepeat,
      rate: Number((withRepeat / (delivered || 1)).toFixed(4)),
      repeatedSignatures: Object.entries(worstBy).sort((a, b) => b[1] - a[1]).slice(0, 5),
      examples
    });
  }
  return {schema: 'rc296-in-sitting-v1', sittingsRequested: sittings, rows};
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = measure();
  console.log('count  sittings  with a repeat   rate     refused');
  for (const row of r.rows) {
    console.log(`${String(row.count).padStart(5)}${String(row.sittingsMeasured).padStart(10)}${String(row.sittingsWithARepeat).padStart(15)}${String((100 * row.rate).toFixed(2) + '%').padStart(9)}${String(row.refused).padStart(12)}`);
  }
  for (const row of r.rows) {
    if (!row.examples.length) continue;
    console.log(`\ncount ${row.count} — what repeated:`);
    for (const e of row.examples) console.log(`  sitting ${e.positionInJourney} of its journey · ${e.times}× · ${e.signature}`);
  }
  if (OUT) (await import('node:fs')).writeFileSync(OUT, JSON.stringify(r, null, 2) + '\n');
}
