#!/usr/bin/env node
// RC2.9.6 §4.4. The frozen surface.
//
// RC2.9.6 changes narration (§3.3) and four parameter draws (§3.1). Everything
// else must render byte-identical to RC2.9.5 on the 10,000 reference seeds.
// This compares two zero-diff manifests and attributes every changed seed to
// the template that moved it, so "narration only" is a table rather than a
// claim — and so a seed moved by a template NOT on the intended list is
// reported as a finding rather than folded into a total.
//
// Usage: node tools/audit/rc296-frozen-surface.mjs <a.json> <b.json> [out.json]

import {readFileSync, writeFileSync} from 'node:fs';

const [A, B, OUT] = process.argv.slice(2);
const a = JSON.parse(readFileSync(A, 'utf8'));
const b = JSON.parse(readFileSync(B, 'utf8'));

/** The templates this release deliberately changed, and why. */
export const INTENDED = Object.freeze({
  // §3.1 — the parameter draw was constrained, so these seeds land on
  // different numbers of the SAME construction. These four are the only
  // templates this release is allowed to move.
  SPD_H_MEET_DELAY: '3.1 meeting time constrained to a whole hour, a half or a quarter',
  PCT_M_SUCCESSIVE: '3.1 net change constrained to a whole percent',
  PCT_H_REVERSE_CHAIN: '3.1 printed net factor constrained to two decimal places',
  PROP_M_FRAC_UNIT: '3.1 target count drawn from the counts that land on a whole answer'
  // §3.3 is NOT here: the integer-path narration was reverted because
  // `operation_kinds` is derived from the printed steps, so rewriting them
  // moves the construction signatures and the complexity score. See §7 and §13
  // of rc2/RC296_REPORT.md.
});

const byA = new Map(a.rows.map(r => [r.seed, r]));
const changed = [];
let identical = 0;
for (const r of b.rows) {
  const o = byA.get(r.seed);
  if (!o) { changed.push({seed: r.seed, why: 'missing in A', template: r.template}); continue; }
  if (o.hash === r.hash && o.exhausted === r.exhausted) { identical++; continue; }
  changed.push({seed: r.seed, why: r.template === o.template ? 'same template, rendering moved' : 'different template',
    a: o.template ?? o.exhausted, b: r.template ?? r.exhausted, template: r.template});
}
// Two very different things are both "a changed seed", and folding them
// together is how a frozen-surface table stops meaning anything:
//
//   RENDERING_MOVED   the seed lands on the SAME template and that template
//                     renders differently. This is the change, and every one
//                     must be a template on the intended list.
//   POOL_DISPLACEMENT the seed lands on a DIFFERENT template. No template
//                     changed — the draw moved, because a constrained template
//                     earlier in the stream now resamples and spends a
//                     different number of rng draws. The template named in the
//                     row is the one that received the seed, not the one that
//                     changed.
const rendering = changed.filter(c => c.why === 'same template, rendering moved');
const displaced = changed.filter(c => c.why !== 'same template, rendering moved');
const byTemplate = {};
for (const c of rendering) byTemplate[c.template ?? '(exhausted)'] = (byTemplate[c.template ?? '(exhausted)'] ?? 0) + 1;
const unintended = Object.keys(byTemplate).filter(t => !(t in INTENDED));

const report = {
  schema: 'rc296-frozen-surface-v1',
  a: {root: a.root, drawn: a.rows.length, digest: a.digest},
  b: {root: b.root, drawn: b.rows.length, digest: b.digest},
  identical, changed: changed.length,
  renderingMoved: rendering.length,
  poolDisplacement: displaced.length,
  changedByTemplate: Object.fromEntries(Object.entries(byTemplate).sort((x, y) => y[1] - x[1])
    .map(([t, n]) => [t, {seeds: n, intended: INTENDED[t] ?? null}])),
  templatesChangedOutsideTheIntendedList: unintended,
  samples: changed.slice(0, 6)
};
if (OUT) writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n');
console.log(`identical                               : ${identical} / ${b.rows.length}`);
console.log(`changed                                 : ${changed.length}`);
console.log(`  rendering moved (same template)       : ${rendering.length}`);
console.log(`  pool displacement (different template): ${displaced.length}`);
console.log(`templates whose RENDERING moved outside the intended list : ${unintended.length}   <- must be 0`);
console.log('\ntemplate                     seeds  why');
for (const [t, v] of Object.entries(report.changedByTemplate)) {
  console.log(`${t.padEnd(28)}${String(v.seeds).padStart(6)}  ${v.intended ?? 'NOT INTENDED'}`);
}
