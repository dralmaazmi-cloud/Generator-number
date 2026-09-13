#!/usr/bin/env node
// RC2.4 — Holdout F, the sign-off holdout, on a seed no run has ever touched.
//
// B, C and D are spent. Each has been reviewed and each is the diagnosis a later
// release answers, so none can test this one: a holdout an engine has already
// been remediated against is not a holdout.
//
// The preservation contract is the one RC2.2 established for Holdout D, unchanged
// — reviewer-visible and reviewer-hidden data written to SEPARATE files, so a
// blind package is built by shipping one file rather than by trusting a filter
// not to leak a key, and everything a reviewer might need captured at first
// generation because there is no second one.
//
// Three things this tool refuses to do:
//   * generate twice on the real seed;
//   * generate at all if production has moved off the freeze;
//   * report a latency it did not measure. Unmeasured is null, never zero.

import {writeFileSync, mkdirSync, existsSync, readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';

import Engine, {ENGINE_VERSION} from '../../src/index.js';
import {verifyFreeze} from './rc2-freeze.mjs';
import {REASON} from '../../src/qa/reasons.js';

export const HOLDOUT_SEED = 'AUDIT-2026-09-13-F';
export const OUT = 'rc2/HOLDOUT_F.json';
export const OUT_BLIND = 'rc2/holdout-f-blind.jsonl.gz';
export const OUT_FULL = 'rc2/holdout-f-full.jsonl.gz';

/**
 * The structure the brief specifies. The band split of a mixed session is the
 * engine's own and is recorded here as what was REQUESTED so that delivered can
 * be compared against it rather than described by it.
 */
export const SESSION_PLAN = Object.freeze([
  {id: 'SESSION-1', kind: 'MIXED', difficulty: 'mixed', count: 50, requestedBands: {easy: 13, medium: 29, hard: 8}},
  {id: 'SESSION-2', kind: 'MIXED', difficulty: 'mixed', count: 50, requestedBands: {easy: 13, medium: 29, hard: 8}},
  {id: 'SESSION-3', kind: 'MIXED', difficulty: 'mixed', count: 50, requestedBands: {easy: 13, medium: 29, hard: 8}},
  {id: 'SESSION-4', kind: 'MIXED', difficulty: 'mixed', count: 50, requestedBands: {easy: 13, medium: 29, hard: 8}},
  {id: 'SESSION-5', kind: 'ALL_HARD', difficulty: 'hard', count: 50, requestedBands: {easy: 0, medium: 0, hard: 50}}
]);

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const sha = b => createHash('sha256').update(b).digest('hex');

/** The three ways a session can deliver past a preference, counted apart. */
const FALLBACK_KINDS = Object.freeze({
  reasoningCap: REASON.REPEATED_REASONING_PATTERN,
  templateShare: REASON.SESSION_TEMPLATE_SHARE_CAP,
  relaxedCap: REASON.TEMPLATE_OVERUSE
});

/**
 * `seed` exists so the capture machinery can be exercised without touching
 * AUDIT-2026-09-13-F. The real seed is the default, the CLI never passes
 * anything else, and a run on the real seed refuses to overwrite an existing
 * holdout and refuses to run against a production tree that has moved.
 */
export function buildHoldoutF({seed = HOLDOUT_SEED, force = false} = {}) {
  const isRealHoldout = seed === HOLDOUT_SEED;
  if (isRealHoldout && !force && existsSync(OUT)) {
    throw Object.assign(
      new Error(`HOLDOUT_ALREADY_GENERATED: ${OUT} exists. Holdout F is generated exactly once and is never regenerated.`),
      {code: 'HOLDOUT_ALREADY_GENERATED'}
    );
  }
  let freeze = {RC2_COMMIT: null, treeHash: null, productionBundleSha256: null, internalGate: null};
  if (isRealHoldout) {
    const v = verifyFreeze();
    if (!v.intact) {
      throw Object.assign(
        new Error(`PRODUCTION_MOVED: the holdout may only be drawn from the frozen engine. ${JSON.stringify(v.changed)}`),
        {code: 'PRODUCTION_MOVED'}
      );
    }
    freeze = JSON.parse(readFileSync('rc2/FREEZE.json', 'utf8'));
  }

  const engine = new Engine();
  engine.resetTelemetry();

  // ONE batch, so the batch-level diversity controls apply across all five
  // sessions rather than within each.
  const t0 = performance.now();
  const batch = engine.generateMockBatch({seed, sessions: SESSION_PLAN.map(p => ({
    count: p.count, difficulty: p.difficulty, family: 'random'
  }))});
  const wallMs = performance.now() - t0;

  const blindLines = [], fullLines = [];
  const sessions = [];
  let n = 0;

  batch.sessions.forEach((s, i) => {
    const plan = SESSION_PLAN[i];
    s.questions.forEach((q, k) => {
      n++;
      const itemId = `F-S${i + 1}-${String(k + 1).padStart(2, '0')}`;

      // --- reviewer-visible: everything needed to answer, nothing that gives
      //     the answer away. The stimulus is recorded as RENDERED.
      blindLines.push(JSON.stringify({
        itemId, sessionId: plan.id, sessionKind: plan.kind, questionNumber: k + 1,
        declaredDifficulty: q.difficulty,
        stem: q.question,
        stimulus: q.display_expression ?? null,
        options: Object.fromEntries(LETTERS.map(L => [L, q.options[L]]))
      }));

      // --- reviewer-hidden: the key and every piece of evidence about it
      fullLines.push(JSON.stringify({
        itemId, sessionId: plan.id, questionNumber: k + 1,
        seed: s.seed, templateId: q.generator_id, family: q.family,
        declaredDifficulty: q.difficulty,
        stem: q.question,
        stimulus: q.display_expression ?? null,
        options: q.options,
        correctOption: q.correct_option,
        correctValue: q.correct_value,
        explanation: q.explanation,
        optionsMeta: q.metadata.options_meta,
        targetMisconception: q.metadata.target_misconception ?? null,
        parameters: q.metadata.parameters ?? null,
        difficultyEvidence: {
          declared: q.difficulty,
          structuralBand: q.metadata.structural_band,
          structuralCriteria: q.metadata.structural_criteria,
          bandSource: q.metadata.band_source,
          computedBand: q.metadata.complexity_band,
          score: q.metadata.complexity_score,
          scoreAgreesWithStructure: q.metadata.score_agrees_with_structure,
          factors: q.metadata.complexity_factors
        },
        fingerprint: q.metadata.fingerprint,
        semanticFingerprint: q.metadata.semantic_fingerprint,
        structuralReasoningSignature: q.metadata.structural_reasoning_signature,
        ambiguityVerdict: q.metadata.ambiguity_verdict ?? null,
        validationMeta: q.metadata.validation_meta
      }));
    });

    const warnings = s.validation.diversity_warnings ?? [];
    sessions.push({
      id: plan.id, kind: plan.kind, seed: s.seed,
      requestedDifficulty: plan.difficulty, requestedCount: plan.count,
      requestedBands: plan.requestedBands,
      delivered: s.questions.length,
      generationMode: s.validation.generation_mode,
      diversityWarnings: warnings.length,
      fallbacks: Object.fromEntries(Object.entries(FALLBACK_KINDS)
        .map(([k, code]) => [k, warnings.filter(w => w.reason === code).length])),
      sessionCost: s.validation.session_cost,
      bands: s.questions.reduce((a, q) => (a[q.difficulty] = (a[q.difficulty] || 0) + 1, a), {})
    });
  });

  const blind = blindLines.join('\n') + '\n';
  const full = fullLines.join('\n') + '\n';
  const telemetry = engine.getTelemetry();

  const deliveredBands = sessions.reduce((a, s) => {
    for (const [b, c] of Object.entries(s.bands)) a[b] = (a[b] ?? 0) + c;
    return a;
  }, {});
  const requestedBands = SESSION_PLAN.reduce((a, p) => {
    for (const [b, c] of Object.entries(p.requestedBands)) a[b] = (a[b] ?? 0) + c;
    return a;
  }, {});
  const fallbacks = Object.keys(FALLBACK_KINDS).reduce(
    (a, k) => (a[k] = sessions.reduce((t, s) => t + s.fallbacks[k], 0), a), {});

  return {
    report: {
      schema: 'rc26-holdout-v1',
      section: 'RC2.6 final sign-off holdout',
      generatedAt: new Date().toISOString(),
      engineVersion: ENGINE_VERSION,
      holdoutSeed: seed,
      previousHoldouts: [
        {seed: 'AUDIT-2026-09-12-B', status: 'FAILED_DIAGNOSTIC_HOLDOUT', reused: false},
        {seed: 'AUDIT-2026-09-12-C', status: 'REVIEWED_AND_SPENT', reused: false},
        {seed: 'AUDIT-2026-09-12-D', status: 'REVIEWED_AND_SPENT', reused: false}
      ],
      generatedExactlyOnce: true,
      generatedAsOneBatch: true,
      frozenAt: {
        RC2_6_COMMIT: freeze.RC2_COMMIT, treeHash: freeze.treeHash,
        productionBundleSha256: freeze.productionBundleSha256,
        internalGate: freeze.internalGate,
        freezeVerifiedIntactBeforeGeneration: isRealHoldout
      },
      plan: {
        mixedSessions: SESSION_PLAN.filter(p => p.kind === 'MIXED').length,
        allHardSessions: SESSION_PLAN.filter(p => p.kind === 'ALL_HARD').length,
        questionsPerSession: 50,
        totalRequested: SESSION_PLAN.reduce((a, p) => a + p.count, 0),
        requestedBands
      },
      sessions,
      totals: {
        requested: SESSION_PLAN.reduce((a, p) => a + p.count, 0),
        delivered: n,
        requestedBands, deliveredBands,
        // Compared band by band. Holdout E's manifest carried a false negative
        // here, because an earlier version compared the two objects with
        // JSON.stringify, which compares KEY ORDER as well as counts. That was
        // fixed before this run, so Holdout F's manifest states the comparison
        // correctly at first generation.
        bandsMatchRequest: ['easy', 'medium', 'hard']
          .every(b => (requestedBands[b] ?? 0) === (deliveredBands[b] ?? 0)),
        blindSha256: sha(Buffer.from(blind, 'utf8')),
        fullSha256: sha(Buffer.from(full, 'utf8'))
      },
      preserved: {
        note: 'Captured at first generation, because there is no second one.',
        reviewerVisible: ['item id', 'stem', 'stimulus as rendered', 'six options in published order', 'declared difficulty'],
        reviewerHidden: ['key', 'correct value', 'explanation and solution steps', 'per-option derivations',
          'misconception ids', 'template and family', 'structural difficulty evidence',
          'semantic fingerprint', 'reasoning signature', 'telemetry evidence'],
        separateFiles: {blind: OUT_BLIND, full: OUT_FULL}
      },
      sessionTelemetry: telemetry.sessionReconciliation,
      engineTelemetry: telemetry.reconciliation,
      anonymousDiscards: telemetry.sessionReconciliation?.anonymous ?? null,
      fallbacks,
      exhaustions: telemetry.exhaustions,
      rejectionByReason: telemetry.byReason,
      performance: {
        // Unmeasured is null, never 0. Questions are generated inside
        // generatePractice and cannot be timed individually without changing
        // production, so only the batch figure is real.
        perQuestionLatencyMeasured: false,
        latencyP50Ms: null, latencyP95Ms: null, latencyP99Ms: null,
        batchWallMs: Number(wallMs.toFixed(1)),
        msPerQuestion: Number((wallMs / (n || 1)).toFixed(3))
      },
      declaration: 'Generated once from the frozen RC2.6 engine. Not to be inspected or remediated before independent review.'
    },
    blindGz: gzipSync(Buffer.from(blind, 'utf8')),
    fullGz: gzipSync(Buffer.from(full, 'utf8'))
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const {report, blindGz, fullGz} = buildHoldoutF();
  mkdirSync('rc2', {recursive: true});
  writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n');
  writeFileSync(OUT_BLIND, blindGz);
  writeFileSync(OUT_FULL, fullGz);
  console.log(JSON.stringify({
    holdoutSeed: report.holdoutSeed,
    generatedExactlyOnce: report.generatedExactlyOnce,
    frozenAt: report.frozenAt,
    totals: report.totals,
    plan: report.plan,
    sessions: report.sessions.map(s => ({id: s.id, kind: s.kind, delivered: s.delivered,
      requestedBands: s.requestedBands, bands: s.bands, fallbacks: s.fallbacks, cost: s.sessionCost})),
    sessionTelemetry: report.sessionTelemetry,
    engineTelemetry: report.engineTelemetry,
    anonymousDiscards: report.anonymousDiscards,
    fallbacks: report.fallbacks,
    exhaustions: report.exhaustions,
    performance: report.performance
  }, null, 2));
}
