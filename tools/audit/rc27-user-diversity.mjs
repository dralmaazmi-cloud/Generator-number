#!/usr/bin/env node
// RC2.7-D. The validation the brief asks for: what a USER sees.
//
// Every measure here is taken on the scenario-independent core identity, and the
// surface measures are reported BESIDE it rather than folded into it, so surface
// variation cannot inflate a diversity claim. Verbatim questions are printed for
// the largest repeated groups, because "do these feel like different questions?"
// is a question about questions, not about signature ids.

import {writeFileSync, mkdirSync} from 'node:fs';

import Engine from '../../src/index.js';
import {REASON} from '../../src/qa/reasons.js';
import {nearDuplicateKey} from '../../src/qa/core-construction.js';
import {entityWordsIn} from '../../src/compose/entities.js';
import {renderedItem} from '../../src/qa/construction.js';

const meta = (q, k) => q.metadata?.[k] ?? null;
const tally = (rows, keyOf) => {
  const m = new Map();
  for (const r of rows) { const k = keyOf(r); if (k == null) continue; m.set(k, (m.get(k) ?? 0) + 1); }
  return m;
};
const inRepeats = m => [...m.values()].filter(v => v > 1).reduce((a, v) => a + v, 0);
const largest = m => Math.max(0, ...m.values());

/** Consecutive questions that share most of what a reader notices. */
function longestSimilarRun(rows) {
  const dims = ['user_construction_signature', 'target_signature', 'scenario_signature', 'stem_skeleton'];
  let best = 0, run = 0;
  for (let i = 1; i < rows.length; i++) {
    let same = 0;
    for (const d of dims) if (meta(rows[i - 1], d) === meta(rows[i], d)) same++;
    if (same >= 3) { run += 1; best = Math.max(best, run + 1); } else run = 0;
  }
  return best;
}

export function measure(rows) {
  const n = rows.length;
  const core = tally(rows, q => meta(q, 'user_construction_signature'));
  const near = tally(rows, q => nearDuplicateKey(meta(q, 'user_construction_signature')));
  const rt = tally(rows, q => meta(q, 'reasoning_target_pair'));
  const paramOnly = tally(rows, q => `${meta(q, 'template_id')}|${meta(q, 'asked_unknown')}`);
  return {
    items: n,
    core: {distinct: core.size, largestGroup: largest(core), itemsInARepeatedGroup: inRepeats(core),
      perHundred: n ? Number((100 * core.size / n).toFixed(1)) : 0},
    nearDuplicates: {distinct: near.size, largestGroup: largest(near), itemsInARepeatedGroup: inRepeats(near)},
    reasoningTarget: {distinct: rt.size, largestGroup: largest(rt), itemsInARepeatedGroup: inRepeats(rt)},
    parameterOnly: {groups: paramOnly.size, largestGroup: largest(paramOnly), itemsInARepeatedGroup: inRepeats(paramOnly)},
    targets: {distinct: tally(rows, q => meta(q, 'target_signature')).size},
    scenarios: {distinct: tally(rows, q => meta(q, 'scenario_signature')).size},
    stemSkeletons: {distinct: tally(rows, q => meta(q, 'stem_skeleton')).size,
      largestGroup: largest(tally(rows, q => meta(q, 'stem_skeleton')))},
    stemStructures: {distinct: tally(rows, q => meta(q, 'stem_structure')).size},
    entities: (() => {
      const t = tally(rows.flatMap(q => entityWordsIn(q.question)), x => x);
      return {distinct: t.size, largestGroup: largest(t),
        mostUsed: [...t.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w, c]) => `${w}×${c}`)};
    })(),
    exactDuplicates: inRepeats(tally(rows, renderedItem)),
    semanticDuplicates: inRepeats(tally(rows, q => meta(q, 'semantic_fingerprint'))),
    longestSimilarRun: longestSimilarRun(rows),
    gates: (() => {
      let wrongKeys = 0, ambiguous = 0, dupOptions = 0;
      for (const q of rows) {
        const om = meta(q, 'options_meta') ?? {};
        const correct = Object.entries(om).filter(([, m]) => m.correct).map(([l]) => l);
        if (correct.length !== 1 || correct[0] !== q.correct_option) wrongKeys++;
        if (q.options?.[q.correct_option] !== q.correct_value) wrongKeys++;
        const v = meta(q, 'ambiguity_verdict');
        if (v && v !== 'CLEAN' && v !== 'BORDERLINE') ambiguous++;
        const vals = Object.values(q.options ?? {}).map(String);
        if (new Set(vals).size !== vals.length) dupOptions++;
      }
      return {wrongKeys, ambiguous, duplicateOptions: dupOptions};
    })()
  };
}

/** The largest repeated core groups, with the questions written out. */
export function repeatedGroups(rows, {groups = 3, examples = 3} = {}) {
  const byCore = new Map();
  for (const q of rows) {
    const k = meta(q, 'user_construction_signature');
    if (!byCore.has(k)) byCore.set(k, []);
    byCore.get(k).push(q);
  }
  return [...byCore.entries()]
    .filter(([, v]) => v.length > 1)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, groups)
    .map(([sig, items]) => ({
      coreSignature: sig,
      occurrences: items.length,
      target: meta(items[0], 'target_signature'),
      examples: items.slice(0, examples).map(q => ({
        family: q.family, template: q.generator_id, band: q.difficulty,
        scenario: meta(q, 'scenario_signature'), structure: meta(q, 'stem_structure'),
        question: q.question, stimulus: q.display_expression ?? null,
        answer: `${q.correct_option}) ${q.options[q.correct_option]}`
      }))
    }));
}

/** Questions testing one broad skill that clearly differ — the positive evidence. */
export function contrastingExamples(rows, family, take = 4) {
  const inFamily = rows.filter(q => q.family === family);
  const seen = new Set();
  const out = [];
  for (const q of inFamily) {
    const k = meta(q, 'user_construction_signature');
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({template: q.generator_id, target: meta(q, 'target_signature'),
      scenario: meta(q, 'scenario_signature'), structure: meta(q, 'stem_structure'),
      question: q.question, stimulus: q.display_expression ?? null,
      answer: `${q.correct_option}) ${q.options[q.correct_option]}`});
    if (out.length >= take) break;
  }
  return out;
}

const SHAPES = {
  session50: [{count: 50, difficulty: 'mixed', family: 'random'}],
  sitting100: [{count: 50, difficulty: 'mixed', family: 'random'}, {count: 50, difficulty: 'mixed', family: 'random'}],
  batch230: [{count: 50, difficulty: 'mixed', family: 'random'}, {count: 50, difficulty: 'mixed', family: 'random'},
    {count: 50, difficulty: 'mixed', family: 'random'}, {count: 50, difficulty: 'mixed', family: 'random'},
    {count: 30, difficulty: 'hard', family: 'random'}]
};

export function build({seeds = ['RC27D-1', 'RC27D-2', 'RC27D-3']} = {}) {
  const runs = [];
  for (const [shape, plan] of Object.entries(SHAPES)) {
    for (const seed of seeds) {
      const e = new Engine();
      e.resetTelemetry();
      let batch = null, refusal = null;
      try { batch = e.generateMockBatch({seed: `${shape}-${seed}`, sessions: plan}); }
      catch (err) { refusal = {code: err.code ?? null, message: String(err.message).slice(0, 240)}; }
      if (!batch) { runs.push({shape, seed, refused: true, refusal}); continue; }
      const rows = batch.sessions.flatMap(s => s.questions);
      const t = e.getTelemetry();
      const warnings = batch.sessions.flatMap(s => s.validation.diversity_warnings ?? []);
      runs.push({
        shape, seed, refused: false,
        measures: measure(rows),
        coreRelaxations: batch.sessions.reduce((a, s) => a + s.validation.novelty.core.relaxations, 0),
        surfaceRelaxations: warnings.filter(w => w.reason === REASON.NOVELTY_SURFACE_FALLBACK).length,
        relaxationsByDimension: warnings.reduce((a, w) => (a[w.dimension ?? w.reason] = (a[w.dimension ?? w.reason] ?? 0) + 1, a), {}),
        telemetryBalanced: Boolean(t.reconciliation?.balanced && t.sessionReconciliation?.balanced),
        perSession: batch.sessions.map(s => ({
          delivered: s.questions.length,
          coreIdeas: s.validation.novelty.core.distinctConstructions,
          coreRelaxations: s.validation.novelty.core.relaxations
        })),
        repeatedGroups: repeatedGroups(rows),
        contrasting: Object.fromEntries(['averages', 'sequences', 'speed', 'relational']
          .map(f => [f, contrastingExamples(rows, f)]))
      });
    }
  }
  const clean = runs.filter(r => !r.refused);
  return {
    schema: 'rc27-user-diversity-v1',
    generatedAt: new Date().toISOString(),
    accepted: clean.length === runs.length
      && clean.every(r => r.coreRelaxations === 0
        && r.measures.exactDuplicates === 0 && r.measures.semanticDuplicates === 0
        && r.measures.gates.wrongKeys === 0 && r.measures.gates.ambiguous === 0
        && r.measures.gates.duplicateOptions === 0 && r.telemetryBalanced),
    runs
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = build();
  mkdirSync('rc2', {recursive: true});
  writeFileSync('rc2/RC27_USER_DIVERSITY.json', JSON.stringify(r, null, 2) + '\n');
  console.log(JSON.stringify({
    accepted: r.accepted,
    runs: r.runs.map(x => x.refused ? {shape: x.shape, seed: x.seed, refused: true, refusal: x.refusal} : {
      shape: x.shape, seed: x.seed, items: x.measures.items,
      coreIdeas: x.measures.core.distinct, largestCoreGroup: x.measures.core.largestGroup,
      itemsRepeated: x.measures.core.itemsInARepeatedGroup,
      targets: x.measures.targets.distinct, scenarios: x.measures.scenarios.distinct,
      skeletons: x.measures.stemSkeletons.distinct, entities: x.measures.entities.distinct,
      longestSimilarRun: x.measures.longestSimilarRun,
      exact: x.measures.exactDuplicates, semantic: x.measures.semanticDuplicates,
      coreRelaxations: x.coreRelaxations, surfaceRelaxations: x.surfaceRelaxations
    })
  }, null, 2));
}
