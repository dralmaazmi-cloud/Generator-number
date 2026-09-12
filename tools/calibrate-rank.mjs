#!/usr/bin/env node
// Section 36. Statistical calibration of where the key sits among the sorted
// choices.
//
// Each template can only place the key in the range its real error paths allow:
// a template whose mistakes all produce smaller values can never put the key
// first. Those ranges overlap heavily around the middle, so drawing uniformly
// inside each one piles the key into ranks three and four across the corpus —
// which is the leak the audit measured.
//
// This tool probes the engine for the range every template can actually reach,
// then fits the draw weights that make the *corpus* flat. It invents nothing:
// the weights only decide which of the already-generated, provenance-carrying
// distractors are shown.
//
// Usage:
//   node tools/calibrate-rank.mjs [probesPerCell]      fit from a fresh probe
//   node tools/calibrate-rank.mjs --refine [corpus]    correct the current
//                                                      weights against a corpus
//                                                      that was actually produced
//
// The refine pass exists because the model is an approximation: a few draws take
// a fallback path the model does not describe. Measuring the corpus and nudging
// the weights closes that gap without changing what the weights are allowed to
// do — they still only choose among genuine distractors.

import {readFileSync} from 'node:fs';

import Engine from '../src/index.js';
import {RANK_DRAW_WEIGHTS} from '../src/qa/rank-calibration.js';

const REFINE = process.argv[2] === '--refine';
const PROBES = Number((REFINE ? 90 : process.argv[2]) || 90);
const engine = new Engine();

if (REFINE) {
  const corpusPath = process.argv[3] || new URL('../qa-artifacts/corpus.jsonl', import.meta.url).pathname;
  const observed = Array(7).fill(0);
  let n = 0;
  for (const line of readFileSync(corpusPath, 'utf8').trim().split('\n')) {
    if (!line) continue;
    const rank = JSON.parse(line).metadata?.correct_numeric_rank;
    if (rank >= 1 && rank <= 6) { observed[rank]++; n++; }
  }
  const weights = [0, ...RANK_DRAW_WEIGHTS];
  const target = 1 / 6;
  for (let r = 1; r <= 6; r++) {
    const achieved = observed[r] / n;
    if (achieved > 1e-9) weights[r] *= (target / achieved) ** 0.6;
  }
  const sum = weights.slice(1).reduce((a, b) => a + b, 0);
  const refined = weights.slice(1).map(w => Number((w / sum * 6).toFixed(4)));
  console.error(`refined against ${n} published questions`);
  console.error('observed %:', observed.slice(1).map(v => (100 * v / n).toFixed(1)).join(' '));
  console.error('refined weights:', refined.join(', '));
  console.log(`// Refined by tools/calibrate-rank.mjs --refine on ${new Date().toISOString().slice(0, 10)}
// against ${n} published questions. Section 36: these weights only decide which
// of the already-generated, provenance-carrying distractors are shown, so the
// key's position across a corpus is flat rather than piled into the middle.
// Re-run after adding or changing templates.
//
// Observed before this refinement: ${observed.slice(1).map(v => (100 * v / n).toFixed(1) + '%').join(' ')}
export const RANK_DRAW_WEIGHTS = [${refined.join(', ')}];
`);
  process.exit(0);
}
const families = engine.listFamilies().map(f => f.id);

// Probe with the same family x difficulty profile the stress corpus uses, so a
// template that shows up rarely is weighted as rarely here.
// Probe with the same family x difficulty profile the stress corpus uses, and
// record the range each *instance* could actually reach. Modelling the range as
// a fixed property of the template is not good enough: a template's error paths
// land differently for different parameter draws, and it is the per-instance
// range that the sampler clamps to.
const instances = [];
for (const family of families) {
  for (const difficulty of ['easy', 'medium', 'hard', 'mixed']) {
    for (let i = 0; i < PROBES; i++) {
      let q;
      try { q = engine.generateQuestion({family, difficulty, seed: `cal-${family}-${difficulty}-${i}`}); }
      catch { continue; }
      const range = q.metadata.feasible_rank_range;
      if (!range) continue;
      instances.push(range);
    }
  }
}
console.error(`probed ${instances.length} instances`);

// Collapse identical ranges into weighted cells.
const counts = new Map();
for (const [lo, hi] of instances) {
  const key = `${lo}-${hi}`;
  counts.set(key, (counts.get(key) || 0) + 1);
}
const cells = [...counts.entries()].map(([key, n]) => {
  const [lo, hi] = key.split('-').map(Number);
  return {lo, hi, n};
});
console.error('distinct feasible ranges:', cells.length);

/**
 * Aggregate rank distribution when every instance draws from `weights`,
 * clamped to its own feasible range.
 */
function aggregate(weights) {
  const agg = Array(7).fill(0);
  for (const {lo, hi, n} of cells) {
    let mass = 0;
    for (let r = lo; r <= hi; r++) mass += weights[r];
    if (mass <= 0) { for (let r = lo; r <= hi; r++) agg[r] += n / (hi - lo + 1); continue; }
    for (let r = lo; r <= hi; r++) agg[r] += n * weights[r] / mass;
  }
  const total = agg.reduce((a, b) => a + b, 0);
  return agg.map(v => v / total);
}

let weights = [0, 1, 1, 1, 1, 1, 1];
const target = 1 / 6;
for (let iteration = 0; iteration < 600; iteration++) {
  const agg = aggregate(weights);
  for (let r = 1; r <= 6; r++) {
    if (agg[r] > 1e-9) weights[r] *= (target / agg[r]) ** 0.35;
  }
  const sum = weights.slice(1).reduce((a, b) => a + b, 0);
  for (let r = 1; r <= 6; r++) weights[r] = weights[r] / sum * 6;
}

const finalAgg = aggregate(weights);
const rounded = weights.slice(1).map(w => Number(w.toFixed(4)));
console.error('fitted weights      :', rounded.join(', '));
console.error('resulting aggregate %:', finalAgg.slice(1).map(v => (100 * v).toFixed(1)).join(' '));

console.log(`// Generated by tools/calibrate-rank.mjs on ${new Date().toISOString().slice(0, 10)}.
// Section 36: the draw weights that make the corpus-wide position of the key
// flat, given the range of positions each template's real error paths allow.
// Re-run the tool after adding or changing templates.
//
// Aggregate with these weights: ${finalAgg.slice(1).map(v => (100 * v).toFixed(1) + '%').join(' ')}
export const RANK_DRAW_WEIGHTS = [${rounded.join(', ')}];
`);
