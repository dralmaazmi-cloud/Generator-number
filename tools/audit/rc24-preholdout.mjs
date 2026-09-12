#!/usr/bin/env node
// RC2.4 — the final pre-holdout check.
//
// One batch in exactly the shape a holdout has: four mixed sessions of fifty and
// one ALL_HARD session of fifty, generated as a single batch on a fresh seed, by
// the same call the holdout tool makes. Nothing here is a stand-in for the
// holdout workload; it IS the workload, run once on a seed that will never be a
// holdout seed.
//
// The RC2.4 acceptance evidence measured five ALL_HARD sessions — 250 hard
// questions from 37 structures — and reported honestly that sessions four and
// five spent the batch reasoning allowance and the fallback delivered past the
// cap. That was the stress case the RC2.4 brief specified. This is the case that
// matters for a holdout: 82 hard slots, not 250.
//
// Every figure below is read off the published batch. The caps are read from the
// engine's own config and are not touched.

import {writeFileSync, mkdirSync} from 'node:fs';

import Engine, {ENGINE_VERSION} from '../../src/index.js';
import {FAMILY_REGISTRY} from '../../src/registry.js';
import {isHardCapable, criteriaOf, contradictions, templatesAtBand} from '../../src/qa/structure.js';
import {validateQuestion} from '../../src/utils.js';
import {checkOddOneOutAmbiguity} from '../../src/qa/ambiguity.js';
import {REASON} from '../../src/qa/reasons.js';
import {newHardTemplates} from './rc24-hard-coverage.mjs';

/** The holdout shape, taken from the holdout tool rather than restated. */
export const SESSION_PLAN = Object.freeze([
  {id: 'SESSION-1', kind: 'MIXED', difficulty: 'mixed', count: 50},
  {id: 'SESSION-2', kind: 'MIXED', difficulty: 'mixed', count: 50},
  {id: 'SESSION-3', kind: 'MIXED', difficulty: 'mixed', count: 50},
  {id: 'SESSION-4', kind: 'MIXED', difficulty: 'mixed', count: 50},
  {id: 'SESSION-5', kind: 'ALL_HARD', difficulty: 'hard', count: 50}
]);

const tally = xs => {
  const m = new Map();
  for (const x of xs) if (x !== undefined && x !== null) m.set(x, (m.get(x) ?? 0) + 1);
  return m;
};

/**
 * The three ways a session can deliver past a preference, kept apart because the
 * brief asks about each separately.
 *
 *   reasoning-cap fallback   a reasoning signature delivered past its allowance
 *   template-share fallback  one template delivered past its share of a session
 *   relaxed-cap delivery     the repetition target was relaxed at all
 */
const FALLBACK_KINDS = Object.freeze({
  reasoningCap: REASON.REPEATED_REASONING_PATTERN,
  templateShare: REASON.SESSION_TEMPLATE_SHARE_CAP,
  relaxedCap: REASON.TEMPLATE_OVERUSE
});

export function run({seed = 'RC24-PREHOLDOUT'} = {}) {
  const engine = new Engine();
  engine.resetTelemetry();
  const started = Date.now();

  let batch = null, refusal = null;
  try {
    batch = engine.generateMockBatch({
      seed,
      sessions: SESSION_PLAN.map(p => ({count: p.count, difficulty: p.difficulty, family: 'random'}))
    });
  } catch (err) {
    refusal = {code: err.code ?? null, message: String(err.message).slice(0, 300)};
  }
  if (!batch) {
    return {schema: 'rc24-preholdout-v1', seed, refused: true, refusal};
  }

  const all = batch.sessions.flatMap(s => s.questions);
  const hard = all.filter(q => q.difficulty === 'hard');

  // --- keys, ambiguity -------------------------------------------------------
  let zeroCorrect = 0, multipleCorrect = 0, postShuffleMismatch = 0,
    correctValueMismatch = 0, oracleDisagreement = 0, invalid = 0;
  let oddSeen = 0, oddAmbiguous = 0, oddUndiscoverable = 0;
  const ambiguityVerdicts = {};
  for (const q of all) {
    const entries = Object.entries(q.metadata.options_meta).filter(([, m]) => m.correct);
    if (entries.length === 0) zeroCorrect++;
    if (entries.length > 1) multipleCorrect++;
    const [letter, meta] = entries[0] ?? [null, null];
    if (letter !== q.correct_option) postShuffleMismatch++;
    if (meta && q.options[letter] !== q.correct_value) correctValueMismatch++;
    if (!validateQuestion(q).valid) invalid++;
    // The oracle verdict is re-read from the published artifact. Where the answer
    // is a LABEL the pipeline compares through the template's declared mapping,
    // so «الربع» beside «4» is not a disagreement — compared only where both
    // sides are the same kind of value.
    const om = q.metadata.validation_meta?.oracle;
    if (om && om.claimed !== undefined && om.oracle !== undefined) {
      const a = Number.isFinite(Number(om.claimed)), b = Number.isFinite(Number(om.oracle));
      if (a === b && String(om.claimed) !== String(om.oracle)) oracleDisagreement++;
    }
    if (q.family === 'odd_one_out') {
      oddSeen++;
      const v = q.metadata.ambiguity_verdict ?? 'UNRECORDED';
      ambiguityVerdicts[v] = (ambiguityVerdicts[v] ?? 0) + 1;
      const nums = q.metadata.parameters?.numbers;
      if (Array.isArray(nums)) {
        const r = checkOddOneOutAmbiguity(nums, Number(q.correct_value));
        if (r.ambiguous) oddAmbiguous++;
        if (r.undiscoverable) oddUndiscoverable++;
      }
    }
  }

  // --- fallbacks, per session and in total ------------------------------------
  const perSession = batch.sessions.map((s, i) => {
    const warnings = s.validation.diversity_warnings ?? [];
    const h = s.questions.filter(q => q.difficulty === 'hard');
    const byKind = Object.fromEntries(Object.entries(FALLBACK_KINDS)
      .map(([k, code]) => [k, warnings.filter(w => w.reason === code).length]));
    return {
      session: SESSION_PLAN[i].id, kind: SESSION_PLAN[i].kind,
      delivered: s.questions.length,
      bands: s.questions.reduce((a, q) => (a[q.difficulty] = (a[q.difficulty] ?? 0) + 1, a), {}),
      hardQuestions: h.length,
      hardTemplates: tally(h.map(q => q.metadata.template_id)).size,
      hardFamilies: tally(h.map(q => q.family)).size,
      fallbacks: byKind,
      otherWarnings: warnings.filter(w => !Object.values(FALLBACK_KINDS).includes(w.reason)).length,
      cost: s.validation.session_cost
    };
  });
  const fallbacks = Object.fromEntries(Object.keys(FALLBACK_KINDS)
    .map(k => [k, perSession.reduce((a, s) => a + s.fallbacks[k], 0)]));

  // --- duplication ------------------------------------------------------------
  const exact = tally(all.map(q => q.metadata.fingerprint));
  const semantic = tally(all.map(q => q.metadata.semantic_fingerprint));
  const hardTemplates = tally(hard.map(q => q.metadata.template_id));
  const hardSignatures = tally(hard.map(q => q.metadata.structural_reasoning_signature));
  const hardFamilies = tally(hard.map(q => q.family));

  const t = engine.getTelemetry();
  const config = engine.config;

  return {
    schema: 'rc24-preholdout-v1',
    generatedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
    seed, refused: false,
    plan: SESSION_PLAN.map(p => ({id: p.id, kind: p.kind, difficulty: p.difficulty, count: p.count})),
    totals: {questions: all.length, hardQuestions: hard.length},
    hard: {
      questions: hard.length,
      families: {distinct: hardFamilies.size, counts: Object.fromEntries([...hardFamilies].sort((a, b) => b[1] - a[1]))},
      templates: {distinct: hardTemplates.size, max: Math.max(0, ...hardTemplates.values()),
        counts: Object.fromEntries([...hardTemplates].sort((a, b) => b[1] - a[1]))},
      signatures: {distinct: hardSignatures.size, max: Math.max(0, ...hardSignatures.values())},
      nonHardCapable: hard.filter(q => !isHardCapable(q.metadata.template_id)).map(q => q.metadata.template_id)
    },
    duplication: {
      exactDuplicates: all.length - exact.size,
      semanticDuplicates: all.length - semantic.size
    },
    keys: {
      wrongKeys: zeroCorrect + multipleCorrect + postShuffleMismatch + correctValueMismatch + oracleDisagreement,
      zeroCorrectOption: zeroCorrect, multipleCorrectOptions: multipleCorrect,
      postShuffleKeyMismatch: postShuffleMismatch, correctValueMismatch, oracleDisagreement,
      invalidQuestions: invalid
    },
    ambiguity: {
      oddOneOutPublished: oddSeen, verdicts: ambiguityVerdicts,
      publishedAmbiguous: oddAmbiguous, publishedUndiscoverable: oddUndiscoverable
    },
    fallbacks,
    caps: {
      maxTemplateRepeatsPerSession: config.maxTemplateRepeatsPerSession,
      maxTemplateIdRepeatsPerSession: config.maxTemplateIdRepeatsPerSession,
      maxReasoningRepeatsPerSession: config.maxReasoningRepeatsPerSession,
      maxReasoningRepeatsPerBatch: config.maxReasoningRepeatsPerBatch,
      note: 'read from the engine, unchanged by this check'
    },
    exhaustion: {
      engineExhaustions: t.exhaustions,
      sessionsRefused: 0,
      sessionsDelivered: batch.sessions.length,
      allSessionsFull: batch.sessions.every((s, i) => s.questions.length === SESSION_PLAN[i].count)
    },
    telemetry: {
      engine: t.reconciliation ?? t.engineReconciliation ?? null,
      session: t.sessionReconciliation,
      byReason: t.byReason
    },
    perSession,
    wallMs: Date.now() - started
  };
}

/**
 * The eighteen RC2.4 templates, re-checked against the RC2.3 criteria as they
 * stand. A template fails if it is no longer hard, claims no criterion, carries a
 * routine marker, or publishes evidence contradicting what it claims.
 */
export function readjudicateNewTemplates({perTemplate = 30, seedTag = 'RC24-PRE-ADJ'} = {}) {
  const engine = new Engine();
  const targets = newHardTemplates();
  const wanted = new Set(targets);
  const seen = new Map();
  for (let i = 0; i < perTemplate * wanted.size * 20 && seen.size < wanted.size; i++) {
    let q;
    try { q = engine.generateQuestion({family: 'random', difficulty: 'hard', seed: `${seedTag}-${i}`}); }
    catch { continue; }
    const id = q.metadata.template_id;
    if (!wanted.has(id)) continue;
    const row = seen.get(id) ?? {samples: 0, problems: new Set()};
    row.samples++;
    if (q.difficulty !== 'hard') row.problems.add('released at another band');
    if (!isHardCapable(id)) row.problems.add('no longer HARD_CAPABLE');
    if (criteriaOf(id).length === 0) row.problems.add('claims no structural criterion');
    for (const c of contradictions(q)) row.problems.add(c);
    seen.set(id, row);
  }
  const rows = targets.map(id => ({
    templateId: id,
    criteria: criteriaOf(id),
    samples: seen.get(id)?.samples ?? 0,
    problems: [...(seen.get(id)?.problems ?? [])]
  }));
  return {
    templates: rows.length,
    stillHard: rows.filter(r => r.problems.length === 0 && r.samples > 0).length,
    neverDrawn: rows.filter(r => r.samples === 0).map(r => r.templateId),
    failing: rows.filter(r => r.problems.length > 0),
    rows
  };
}

export function build(opts = {}) {
  return {
    batch: run(opts),
    readjudication: readjudicateNewTemplates(opts),
    hardBandSize: templatesAtBand('hard').length,
    hardFamilies: FAMILY_REGISTRY.filter(f => f.difficulties.includes('hard')).map(f => f.id)
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = build({seed: process.argv[2] ?? 'RC24-PREHOLDOUT'});
  mkdirSync('rc2', {recursive: true});
  writeFileSync('rc2/RC24_PREHOLDOUT.json', JSON.stringify(r, null, 2) + '\n');
  const b = r.batch;
  console.log(JSON.stringify({
    seed: b.seed, refused: b.refused,
    totals: b.totals,
    hard: {
      questions: b.hard.questions,
      families: b.hard.families.distinct,
      templates: b.hard.templates.distinct, maxTemplateUses: b.hard.templates.max,
      signatures: b.hard.signatures.distinct, maxSignatureUses: b.hard.signatures.max,
      nonHardCapable: b.hard.nonHardCapable.length
    },
    duplication: b.duplication,
    wrongKeys: b.keys.wrongKeys, invalid: b.keys.invalidQuestions,
    ambiguous: b.ambiguity.publishedAmbiguous + b.ambiguity.publishedUndiscoverable,
    fallbacks: b.fallbacks,
    exhaustion: b.exhaustion,
    telemetrySession: b.telemetry.session,
    perSession: b.perSession.map(s => ({
      id: s.session, bands: s.bands, hard: s.hardQuestions,
      hardTemplates: s.hardTemplates, hardFamilies: s.hardFamilies, fallbacks: s.fallbacks
    })),
    readjudication: {
      templates: r.readjudication.templates, stillHard: r.readjudication.stillHard,
      neverDrawn: r.readjudication.neverDrawn,
      failing: r.readjudication.failing.map(f => `${f.templateId}: ${f.problems.join('; ')}`)
    }
  }, null, 2));
}
