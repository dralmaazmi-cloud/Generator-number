#!/usr/bin/env node
// RC2.2-4 — repetition, measured as three separate things.
//
// The independent review of Holdout C found 65 instances of the same reasoning
// repeated with nothing changed but the numbers. Conflating that with ordinary
// template reuse would be the wrong diagnosis and the wrong fix, so the three
// kinds are counted apart:
//
//   EXACT      the same generated instance, down to display order
//   SEMANTIC   the same mathematical instance, display order removed
//   REASONING  the same reasoning path, incidental numbers removed
//
// Exact and semantic repetition are defects. Reasoning repetition is a
// QUANTITY: some is unavoidable — the hard band offers 45 distinct paths and a
// hard session asks for 50 questions — and only an excess of it is a defect.

import {writeFileSync, mkdirSync} from 'node:fs';
import Engine, {ENGINE_VERSION} from '../../src/index.js';

const tally = xs => {
  const c = new Map();
  for (const x of xs) if (x) c.set(x, (c.get(x) ?? 0) + 1);
  return c;
};

export function measureBatch({seed, plan}) {
  const engine = new Engine();
  const batch = engine.generateMockBatch({seed, sessions: plan});
  const qs = batch.sessions.flatMap(s => s.questions);

  const exact = tally(qs.map(q => q.metadata.fingerprint));
  const semantic = tally(qs.map(q => q.metadata.semantic_fingerprint));
  const reasoning = tally(qs.map(q => q.metadata.structural_reasoning_signature));
  const templates = tally(qs.map(q => q.generator_id));
  const warnings = batch.sessions.reduce(
    (a, s) => a + (s.validation.diversity_warnings ?? []).filter(w => w.reason === 'REPEATED_REASONING_PATTERN').length, 0);

  const over = (c, n) => [...c.values()].filter(v => v >= n).reduce((a, b) => a + b, 0);
  return {
    seed, questions: qs.length,
    exact: {distinct: exact.size, repeats: qs.length - exact.size, max: Math.max(0, ...exact.values())},
    semantic: {distinct: semantic.size, repeats: qs.length - semantic.size, max: Math.max(0, ...semantic.values())},
    reasoning: {
      distinct: reasoning.size,
      max: Math.max(0, ...reasoning.values()),
      questionsOnPathsUsedFourOrMore: over(reasoning, 4),
      capBreachesWarned: warnings
    },
    templateReuse: {
      distinct: templates.size,
      max: Math.max(0, ...templates.values()),
      note: 'reuse is expected and is not a defect; it is reported so that a fix which merely suppressed it would be visible'
    }
  };
}

export function build({seeds = ['RC22-REP-A', 'RC22-REP-B', 'RC22-REP-C']} = {}) {
  const plan = [
    {count: 50, difficulty: 'mixed'}, {count: 50, difficulty: 'mixed'},
    {count: 50, difficulty: 'mixed'}, {count: 50, difficulty: 'mixed'},
    {count: 30, difficulty: 'hard'}
  ];
  const batches = seeds.map(seed => measureBatch({seed, plan}));
  const engine = new Engine();
  const pathsPerBand = {};
  for (const band of ['easy', 'medium', 'hard']) {
    const s = new Set();
    for (let i = 0; i < 1200; i++) {
      try { s.add(engine.generateQuestion({family: 'random', difficulty: band, seed: `RC22-PATHS-${band}-${i}`}).metadata.structural_reasoning_signature); }
      catch { /* skip */ }
    }
    pathsPerBand[band] = s.size;
  }
  return {
    schema: 'rc22-repetition-v1',
    section: 'RC2.2-4',
    generatedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
    caps: {
      perSession: engine.config.maxReasoningRepeatsPerSession,
      perBatch: engine.config.maxReasoningRepeatsPerBatch
    },
    distinctReasoningPathsAvailable: pathsPerBand,
    feasibilityNote: `a 50-question hard session draws from ${pathsPerBand.hard} distinct reasoning paths, so the best achievable maximum repetition is ${Math.ceil(50 / pathsPerBand.hard)}; an absolute ban is not satisfiable and was never the goal`,
    batches
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = build();
  mkdirSync('rc2', {recursive: true});
  writeFileSync('rc2/RC22_REPETITION.json', JSON.stringify(r, null, 2) + '\n');
  console.log(`caps: ${JSON.stringify(r.caps)} | paths available: ${JSON.stringify(r.distinctReasoningPathsAvailable)}`);
  for (const b of r.batches) {
    console.log(`${b.seed}: exact ${b.exact.distinct}/${b.questions} (max ${b.exact.max}) | semantic ${b.semantic.distinct} (max ${b.semantic.max}) | reasoning ${b.reasoning.distinct} paths (max ${b.reasoning.max}, ${b.reasoning.questionsOnPathsUsedFourOrMore} q on paths used 4+) | templates ${b.templateReuse.distinct} (max ${b.templateReuse.max})`);
  }
}
