#!/usr/bin/env node
// RC2.6-5. The acceptance run: fresh batches in the intended holdout shape,
// every zero the brief requires, and the construction-diversity measures beside
// the coverage ones.
//
// Shape: four mixed sessions of fifty and one all-hard session of fifty, all
// generated as ONE batch so the batch-level diversity controls apply exactly as
// they would for a holdout. 82 hard slots.

import {writeFileSync, mkdirSync} from 'node:fs';

import Engine from '../../src/index.js';
import {REASON} from '../../src/qa/reasons.js';
import {FAMILY_REGISTRY} from '../../src/registry.js';
import {TEMPLATE_STRUCTURE, templatesAtBand, structuralBandOf} from '../../src/qa/structure.js';
import {measureConstruction, renderedItem, CONSTRUCTION_CAP_PER_BATCH} from '../../src/qa/construction.js';

const PLAN = [
  {id: 'SESSION-1', kind: 'MIXED', difficulty: 'mixed', count: 50},
  {id: 'SESSION-2', kind: 'MIXED', difficulty: 'mixed', count: 50},
  {id: 'SESSION-3', kind: 'MIXED', difficulty: 'mixed', count: 50},
  {id: 'SESSION-4', kind: 'MIXED', difficulty: 'mixed', count: 50},
  {id: 'SESSION-5', kind: 'ALL_HARD', difficulty: 'hard', count: 50}
];

const FALLBACKS = Object.freeze({
  reasoningCap: REASON.REPEATED_REASONING_PATTERN,
  templateShare: REASON.SESSION_TEMPLATE_SHARE_CAP,
  relaxedCap: REASON.TEMPLATE_OVERUSE
});

const tally = xs => xs.reduce((a, x) => (a[x] = (a[x] ?? 0) + 1, a), {});
const dup = xs => { const t = tally(xs); return Object.values(t).filter(v => v > 1).reduce((a, v) => a + v, 0); };

export function runOnce({seed}) {
  const engine = new Engine();
  engine.resetTelemetry();
  let batch = null, refusal = null;
  try {
    batch = engine.generateMockBatch({
      seed, sessions: PLAN.map(p => ({count: p.count, difficulty: p.difficulty, family: 'random'}))
    });
  } catch (err) {
    refusal = {code: err.code ?? null, message: String(err.message).slice(0, 300)};
  }
  if (!batch) return {seed, refused: true, refusal};

  const all = batch.sessions.flatMap((s, i) => s.questions.map(q => ({...q, _session: PLAN[i].id})));
  const hard = all.filter(q => q.difficulty === 'hard');

  // --- the zeros -------------------------------------------------------------
  let wrongKeys = 0, ambiguous = 0, invalid = 0;
  for (const q of all) {
    const meta = q.metadata?.options_meta ?? {};
    const correct = Object.entries(meta).filter(([, m]) => m.correct).map(([l]) => l);
    if (correct.length !== 1 || correct[0] !== q.correct_option) wrongKeys++;
    if (q.options?.[q.correct_option] !== q.correct_value) wrongKeys++;
    if (q.metadata?.ambiguity_verdict && q.metadata.ambiguity_verdict !== 'CLEAN'
      && q.metadata.ambiguity_verdict !== 'BORDERLINE') ambiguous++;
    if (!q.question || Object.keys(q.options ?? {}).length !== 6) invalid++;
  }
  const fallbacks = {reasoningCap: 0, templateShare: 0, relaxedCap: 0};
  const perSession = batch.sessions.map((s, i) => {
    const w = s.validation.diversity_warnings ?? [];
    const byKind = {};
    for (const [k, code] of Object.entries(FALLBACKS)) {
      byKind[k] = w.filter(x => x.reason === code).length;
      fallbacks[k] += byKind[k];
    }
    const h = s.questions.filter(q => q.difficulty === 'hard');
    return {
      session: PLAN[i].id, kind: PLAN[i].kind, delivered: s.questions.length,
      bands: tally(s.questions.map(q => q.difficulty)),
      hardQuestions: h.length,
      familyDistribution: tally(s.questions.map(q => q.family)),
      templateDistribution: tally(s.questions.map(q => q.metadata.template_id)),
      hardFamilies: Object.keys(tally(h.map(q => q.family))).length,
      hardTemplates: Object.keys(tally(h.map(q => q.metadata.template_id))).length,
      maxSameTemplate: Math.max(0, ...Object.values(tally(s.questions.map(q => q.metadata.template_id)))),
      fallbacks: byKind
    };
  });

  // Every hard slot must come from a structure the human calibration left hard.
  const hardCapable = new Set(templatesAtBand('hard'));
  const filler = hard.filter(q => !hardCapable.has(q.metadata.template_id))
    .map(q => q.metadata.template_id);

  const t = engine.getTelemetry();
  return {
    seed, refused: false,
    totals: {questions: all.length, hardSlots: hard.length},
    zeros: {
      wrongKeys, ambiguous, invalidQuestions: invalid,
      exactDuplicates: dup(all.map(renderedItem)),
      semanticDuplicates: dup(all.map(q => q.metadata.semantic_fingerprint)),
      reasoningFallback: fallbacks.reasoningCap,
      templateShareFallback: fallbacks.templateShare,
      relaxedDelivery: fallbacks.relaxedCap,
      exhaustions: t.exhaustions ?? 0,
      hardSlotsFromNonHardStructures: filler.length
    },
    hard: {
      templates: Object.keys(tally(hard.map(q => q.metadata.template_id))).length,
      families: Object.keys(tally(hard.map(q => q.family))).length,
      reasoningSignatures: new Set(hard.map(q => q.metadata.structural_reasoning_signature)).size,
      constructionSignatures: new Set(hard.map(q => q.metadata.construction_signature)).size,
      byTemplate: tally(hard.map(q => q.metadata.template_id)),
      byFamily: tally(hard.map(q => q.family))
    },
    construction: measureConstruction(all),
    constructionHardOnly: measureConstruction(hard),
    perSession,
    telemetryBalanced: Boolean(t.reconciliation?.balanced && t.sessionReconciliation?.balanced)
  };
}

export function build({seeds = ['RC26-ACC-1', 'RC26-ACC-2', 'RC26-ACC-3', 'RC26-ACC-4', 'RC26-ACC-5']} = {}) {
  const runs = seeds.map(seed => runOnce({seed}));
  const coverage = {
    hardTemplates: templatesAtBand('hard').length,
    hardFamilies: FAMILY_REGISTRY.filter(f => f.difficulties.includes('hard')).length,
    perFamily: Object.fromEntries(FAMILY_REGISTRY
      .filter(f => f.difficulties.includes('hard'))
      .map(f => [f.id, f.templates.filter(t => TEMPLATE_STRUCTURE[t]?.band === 'hard').length])),
    bands: Object.fromEntries(['easy', 'medium', 'hard'].map(b => [b, templatesAtBand(b).length]))
  };
  const allZero = runs.every(r => !r.refused && Object.values(r.zeros).every(v => v === 0));
  return {
    schema: 'rc26-acceptance-v1',
    generatedAt: new Date().toISOString(),
    constructionCapPerBatch: CONSTRUCTION_CAP_PER_BATCH,
    coverage,
    accepted: allZero && runs.every(r => r.totals.hardSlots === 82),
    runs
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = build();
  mkdirSync('rc2', {recursive: true});
  writeFileSync('rc2/RC26_ACCEPTANCE.json', JSON.stringify(r, null, 2) + '\n');
  console.log(JSON.stringify({
    accepted: r.accepted,
    coverage: r.coverage,
    runs: r.runs.map(x => ({
      seed: x.seed, hardSlots: x.totals?.hardSlots, zeros: x.zeros,
      hardTemplates: x.hard?.templates, hardFamilies: x.hard?.families,
      reasoningSignatures: x.hard?.reasoningSignatures,
      constructionSignatures: x.hard?.constructionSignatures,
      parameterOnly: x.construction?.parameterOnlyVariants?.share,
      sameStemSkeleton: x.construction?.sameStemSkeleton?.share,
      sameScenario: x.construction?.sameScenarioStructure?.share,
      distinctConstructions: x.construction?.genuinelyDistinctConstructions?.distinct,
      overCap: x.construction?.genuinelyDistinctConstructions?.overCap
    }))
  }, null, 2));
}
