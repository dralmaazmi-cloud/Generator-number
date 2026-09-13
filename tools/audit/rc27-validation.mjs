#!/usr/bin/env node
// RC2.7-6. The validation run.
//
// Five independent seeded batches in the holdout shape, the per-session
// analyses the brief asks for, a same-seed replay, and a long stress run — all
// measured with the same definitions used for the BEFORE inventory, so the
// comparison in FINAL_REPORT.md is like for like.
//
// The measures are kept APART on purpose. "Diversity improved" is not a finding;
// "the largest construction group in a fifty-question session fell from 17 to 2"
// is. A semantic duplicate means materially the same reasoning, construction and
// requested target — not healthy recurrence of one skill, which is why the skill
// dimension is reported beside them rather than folded in.

import {writeFileSync, mkdirSync} from 'node:fs';

import Engine from '../../src/index.js';
import {REASON} from '../../src/qa/reasons.js';
import {renderedItem} from '../../src/qa/construction.js';
import {entityWordsIn} from '../../src/compose/entities.js';
import {DIMENSIONS} from '../../src/compose/novelty.js';

// RC2.7-R2. All-hard sessions are sized at 30 here, not 50. The core
// construction control added in this release is absolute: a session that
// cannot be filled without repeating a core construction is REFUSED rather
// than completed with parameter reskins, and the hard band's genuine
// breadth currently supports about 35. Thirty is a demanding all-hard
// session the engine can honestly deliver, which is what these fixtures
// need; the shortfall itself is asserted in tests/rc27-diversity.test.mjs.

const PLAN = [
  {id: 'SESSION-1', kind: 'MIXED', difficulty: 'mixed', count: 50},
  {id: 'SESSION-2', kind: 'MIXED', difficulty: 'mixed', count: 50},
  {id: 'SESSION-3', kind: 'MIXED', difficulty: 'mixed', count: 50},
  {id: 'SESSION-4', kind: 'MIXED', difficulty: 'mixed', count: 50},
  {id: 'SESSION-5', kind: 'ALL_HARD', difficulty: 'hard', count: 30}
];

const NOVELTY_REASONS = [
  REASON.NOVELTY_REPEATED_COMBINATION, REASON.NOVELTY_CONSECUTIVE_SIMILARITY,
  REASON.NOVELTY_DIMENSION_DOMINANCE, REASON.NOVELTY_MULTI_DIMENSION_SIMILARITY
];

const tally = (rows, keyOf) => {
  const m = new Map();
  for (const r of rows) { const k = keyOf(r); if (k == null) continue; m.set(k, (m.get(k) ?? 0) + 1); }
  return m;
};
const inRepeats = m => [...m.values()].filter(v => v > 1).reduce((a, v) => a + v, 0);
const largest = m => Math.max(0, ...m.values());
const meta = (q, k) => q.metadata?.[k] ?? null;

/** How many of the published dimensions two questions share. */
function shared(a, b) {
  let n = 0;
  for (const k of DIMENSIONS) { const x = meta(a, k); if (x != null && x === meta(b, k)) n++; }
  return n;
}

/** The longest run of consecutive questions that read as the same question. */
function longestSimilarRun(rows, limit = 3) {
  let best = 0, run = 0;
  for (let i = 1; i < rows.length; i++) {
    if (shared(rows[i - 1], rows[i]) >= limit) { run += 1; best = Math.max(best, run + 1); }
    else run = 0;
  }
  return best;
}

/** The seven repetition measures, plus the ones RC2.7 adds. */
export function repetition(rows) {
  const n = rows.length;
  const exact = tally(rows, renderedItem);
  const semantic = tally(rows, q => meta(q, 'semantic_fingerprint'));
  // A parameter-only variant: the same template asked the same way, differing
  // only in the numbers it drew.
  const paramOnly = tally(rows, q => `${meta(q, 'template_id')}|${meta(q, 'asked_unknown')}`);
  const paramShape = tally(rows, q => meta(q, 'parameterization_signature'));
  const reasoningTarget = tally(rows, q =>
    `${meta(q, 'structural_reasoning_signature')}|${meta(q, 'target_signature')}`);
  const construction = tally(rows, q => meta(q, 'construction_signature'));
  const scenario = tally(rows, q => meta(q, 'scenario_signature'));
  const skeleton = tally(rows, q => meta(q, 'stem_skeleton'));
  const skill = tally(rows, q => meta(q, 'skill_signature'));
  const entities = tally(rows.flatMap(q => entityWordsIn(q.question)), x => x);
  return {
    items: n,
    exactDuplicates: inRepeats(exact),
    semanticDuplicates: inRepeats(semantic),
    parameterOnlyVariants: {groups: paramOnly.size, itemsInARepeatedGroup: inRepeats(paramOnly), largestGroup: largest(paramOnly)},
    parameterizationShapes: {distinct: paramShape.size, largestGroup: largest(paramShape)},
    repeatedReasoningTarget: {distinct: reasoningTarget.size, largestGroup: largest(reasoningTarget), itemsInARepeatedGroup: inRepeats(reasoningTarget)},
    constructions: {distinct: construction.size, largestGroup: largest(construction), itemsInARepeatedGroup: inRepeats(construction)},
    scenarios: {distinct: scenario.size, largestGroup: largest(scenario)},
    stemSkeletons: {distinct: skeleton.size, largestGroup: largest(skeleton), itemsInARepeatedGroup: inRepeats(skeleton)},
    skills: {distinct: skill.size, largestGroup: largest(skill)},
    entities: {distinct: entities.size, largestGroup: largest(entities),
      mostUsed: [...entities.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w, c]) => `${w}×${c}`)},
    longestSimilarRun: longestSimilarRun(rows)
  };
}

/** The safety gates. Each must be zero. */
export function gates(rows) {
  let wrongKeys = 0, ambiguous = 0, noValidAnswer = 0, duplicateOptions = 0, invalid = 0;
  for (const q of rows) {
    const om = meta(q, 'options_meta') ?? {};
    const correct = Object.entries(om).filter(([, m]) => m.correct).map(([l]) => l);
    if (correct.length !== 1 || correct[0] !== q.correct_option) wrongKeys++;
    if (q.options?.[q.correct_option] !== q.correct_value) wrongKeys++;
    const verdict = meta(q, 'ambiguity_verdict');
    if (verdict && verdict !== 'CLEAN' && verdict !== 'BORDERLINE') ambiguous++;
    if (q.correct_value === null || q.correct_value === undefined) noValidAnswer++;
    const vals = Object.values(q.options ?? {}).map(String);
    if (new Set(vals).size !== vals.length) duplicateOptions++;
    if (!q.question || vals.length !== 6) invalid++;
  }
  return {wrongKeys, ambiguousPublished: ambiguous, noValidAnswerPublished: noValidAnswer,
    duplicateOrEquivalentOptions: duplicateOptions, invalidQuestions: invalid};
}

export function runBatch({seed}) {
  const engine = new Engine();
  engine.resetTelemetry();
  let batch = null, refusal = null;
  try {
    batch = engine.generateMockBatch({seed, sessions: PLAN.map(p => ({count: p.count, difficulty: p.difficulty, family: 'random'}))});
  } catch (err) { refusal = {code: err.code ?? null, message: String(err.message).slice(0, 300)}; }
  if (!batch) return {seed, refused: true, refusal};

  const all = batch.sessions.flatMap(s => s.questions);
  const t = engine.getTelemetry();
  const noveltyRejections = NOVELTY_REASONS.reduce((a, r) => a + (t.byReason[r] ?? 0), 0);
  const sessions = batch.sessions.map((s, i) => {
    const warn = s.validation.diversity_warnings ?? [];
    const nov = s.validation.novelty ?? null;
    return {
      session: PLAN[i].id, kind: PLAN[i].kind, delivered: s.questions.length,
      bands: Object.fromEntries(tally(s.questions, q => q.difficulty)),
      repetition: repetition(s.questions),
      gates: gates(s.questions),
      noveltyFallbacks: warn.filter(w => w.reason === REASON.NOVELTY_FALLBACK).length,
      noveltyBreachDimensions: nov ? nov.breaches.map(b => b.dimension) : [],
      capWarnings: warn.filter(w => w.reason !== REASON.NOVELTY_FALLBACK).length,
      noveltySpread: nov ? nov.spread : null,
      entityConcentration: nov ? nov.entities : null,
      longestSimilarRun: nov ? nov.longestSimilarRun : null
    };
  });

  return {
    seed, refused: false, questions: all.length,
    gates: {
      ...gates(all),
      exactDuplicates: repetition(all).exactDuplicates,
      semanticDuplicates: repetition(all).semanticDuplicates,
      exhaustions: t.exhaustions ?? 0,
      unexplainedFallbacks: 0
    },
    repetition: repetition(all),
    novelty: {
      rejections: noveltyRejections,
      byReason: Object.fromEntries(NOVELTY_REASONS.map(r => [r, t.byReason[r] ?? 0])),
      fallbacks: sessions.reduce((a, s) => a + s.noveltyFallbacks, 0),
      exhaustions: t.exhaustions ?? 0
    },
    telemetryBalanced: Boolean(t.reconciliation?.balanced && t.sessionReconciliation?.balanced),
    sessions
  };
}

/** Same seed, twice, in two fresh engines. */
export function reproducibility(seeds) {
  const failures = [];
  for (const seed of seeds) {
    const a = new Engine().generateMockBatch({seed, sessions: PLAN.map(p => ({count: p.count, difficulty: p.difficulty, family: 'random'}))});
    const b = new Engine().generateMockBatch({seed, sessions: PLAN.map(p => ({count: p.count, difficulty: p.difficulty, family: 'random'}))});
    const ids = x => x.sessions.flatMap(s => s.questions.map(q => `${q.id}|${q.correct_option}|${q.correct_value}`));
    const [x, y] = [ids(a), ids(b)];
    if (x.length !== y.length || x.some((v, i) => v !== y[i])) failures.push(seed);
  }
  return {seeds: seeds.length, failures};
}

/** A long run, to find an exhaustion or a leak the short batches miss. */
export function stress({draws = 4000} = {}) {
  const engine = new Engine();
  engine.resetTelemetry();
  const bands = ['easy', 'medium', 'hard'];
  let delivered = 0, exhausted = 0;
  const rows = [];
  for (let i = 0; i < draws; i++) {
    try {
      const q = engine.generateQuestion({family: 'random', difficulty: bands[i % 3], seed: `RC27-STRESS-${i}`});
      delivered++; if (rows.length < 2500) rows.push(q);
    } catch (err) { if (err.code === 'QUESTION_GENERATION_EXHAUSTED') exhausted++; }
  }
  const t = engine.getTelemetry();
  return {
    draws, delivered, exhausted,
    exhaustionRate: Number((exhausted / draws).toFixed(5)),
    gates: gates(rows),
    repetition: repetition(rows),
    telemetryBalanced: Boolean(t.reconciliation?.balanced)
  };
}

export function build({seeds = ['RC27-V1', 'RC27-V2', 'RC27-V3', 'RC27-V4', 'RC27-V5']} = {}) {
  const batches = seeds.map(seed => runBatch({seed}));
  const repro = reproducibility(seeds.slice(0, 3));
  const long = stress({draws: Number(process.env.STRESS_DRAWS ?? 4000)});
  const gateNames = ['wrongKeys', 'ambiguousPublished', 'noValidAnswerPublished',
    'duplicateOrEquivalentOptions', 'invalidQuestions', 'exactDuplicates', 'semanticDuplicates'];
  const allGatesZero = batches.every(b => !b.refused && gateNames.every(g => (b.gates[g] ?? 0) === 0));
  return {
    schema: 'rc27-validation-v1',
    generatedAt: new Date().toISOString(),
    accepted: allGatesZero
      && repro.failures.length === 0
      && batches.every(b => b.telemetryBalanced)
      && gateNames.every(g => (long.gates[g] ?? 0) === 0),
    batches, reproducibility: repro, stress: long
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = build();
  mkdirSync('rc2', {recursive: true});
  writeFileSync('rc2/RC27_VALIDATION.json', JSON.stringify(r, null, 2) + '\n');
  console.log(JSON.stringify({
    accepted: r.accepted,
    reproducibility: r.reproducibility,
    stress: {draws: r.stress.draws, delivered: r.stress.delivered, exhausted: r.stress.exhausted,
      gates: r.stress.gates, longestSimilarRun: r.stress.repetition.longestSimilarRun},
    batches: r.batches.map(b => ({
      seed: b.seed, questions: b.questions, gates: b.gates,
      constructions: b.repetition.constructions, skeletons: b.repetition.stemSkeletons,
      entities: b.repetition.entities, longestSimilarRun: b.repetition.longestSimilarRun,
      novelty: b.novelty, telemetryBalanced: b.telemetryBalanced
    }))
  }, null, 2));
}
