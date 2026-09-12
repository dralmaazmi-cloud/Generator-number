#!/usr/bin/env node
// RC2.2 — the sign-off holdout, on a fresh seed.
//
// Neither B nor C is reused. Both have been reviewed and both are the diagnosis
// this release answers, so neither can test it: a holdout an engine has already
// been remediated against is not a holdout.
//
// Two lessons from B are built in:
//
//   * B's preserved corpus recorded stems, options and keys and nothing else.
//     It did not record the stimulus line, which left every sequences item
//     unanswerable in the blind package, and it did not record explanations or
//     per-option derivations, so feedback quality could not be reviewed at all
//     without regenerating. Everything a reviewer might need is captured HERE,
//     at first generation, because there is no second one.
//
//   * Reviewer-visible and reviewer-hidden data are written to SEPARATE files,
//     so a blind package is built by shipping one file rather than by trusting
//     a filter not to leak a key.
//
// Unmeasured latency is recorded as null. It is not zero.

import {writeFileSync, mkdirSync, existsSync, readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';

import Engine, {ENGINE_VERSION} from '../../src/index.js';

export const HOLDOUT_SEED = 'AUDIT-2026-09-12-D';
export const OUT = 'rc2/HOLDOUT_D.json';
export const OUT_BLIND = 'rc2/holdout-d-blind.jsonl.gz';
export const OUT_FULL = 'rc2/holdout-d-full.jsonl.gz';

export const SESSION_PLAN = Object.freeze([
  {id: 'SESSION-1', kind: 'MIXED', difficulty: 'mixed', count: 50},
  {id: 'SESSION-2', kind: 'MIXED', difficulty: 'mixed', count: 50},
  {id: 'SESSION-3', kind: 'MIXED', difficulty: 'mixed', count: 50},
  {id: 'SESSION-4', kind: 'MIXED', difficulty: 'mixed', count: 50},
  {id: 'SESSION-5', kind: 'ALL_HARD', difficulty: 'hard', count: 50}
]);

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const sha = b => createHash('sha256').update(b).digest('hex');

/**
 * `seed` exists so the capture machinery can be exercised by tests without
 * touching AUDIT-2026-09-12-D. The real seed is the default, the CLI never
 * passes anything else, and a run on the real seed still refuses to overwrite an
 * existing holdout and still requires a freeze to attribute it to.
 */
export function buildHoldoutC({seed = HOLDOUT_SEED, force = false} = {}) {
  const isRealHoldout = seed === HOLDOUT_SEED;
  if (isRealHoldout && !force && existsSync(OUT)) {
    throw new Error(`RC2.1 refuses to regenerate: ${OUT} exists. A holdout is generated exactly once.`);
  }
  const freeze = isRealHoldout
    ? JSON.parse(readFileSync('rc2/FREEZE.json', 'utf8'))
    : {RC2_COMMIT: null, treeHash: null, productionBundleSha256: null, internalGate: null};

  const engine = new Engine();
  engine.resetTelemetry();

  // Generated as ONE batch so the cross-session duplication fix is exercised by
  // the holdout rather than merely tested beside it.
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
      const itemId = `D-S${i + 1}-${String(k + 1).padStart(2, '0')}`;

      // --- reviewer-visible: everything needed to answer, nothing that gives
      //     the answer away. The stimulus is recorded as RENDERED, so no future
      //     package has to reconstruct it as B's did.
      blindLines.push(JSON.stringify({
        itemId, sessionId: plan.id, sessionKind: plan.kind, questionNumber: k + 1,
        family: q.family, templateId: q.generator_id, declaredDifficulty: q.difficulty,
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
          computedBand: q.metadata.complexity_band,
          score: q.metadata.complexity_score,
          factors: q.metadata.complexity_factors
        },
        fingerprint: q.metadata.fingerprint,
        semanticFingerprint: q.metadata.semantic_fingerprint,
        structuralReasoningSignature: q.metadata.structural_reasoning_signature,
        ambiguityVerdict: q.metadata.ambiguity_verdict ?? null,
        validationMeta: q.metadata.validation_meta
      }));
    });

    sessions.push({
      id: plan.id, kind: plan.kind, seed: s.seed,
      requestedDifficulty: plan.difficulty, requestedCount: plan.count,
      delivered: s.questions.length,
      generationMode: s.validation.generation_mode,
      diversityWarnings: (s.validation.diversity_warnings ?? []).length,
      sessionCost: s.validation.session_cost,
      bands: s.questions.reduce((a, q) => (a[q.difficulty] = (a[q.difficulty] || 0) + 1, a), {})
    });
  });

  const blind = blindLines.join('\n') + '\n';
  const full = fullLines.join('\n') + '\n';
  const telemetry = engine.getTelemetry();

  return {
    report: {
      schema: 'rc22-holdout-v1',
      section: 'RC2.1 sign-off holdout',
      generatedAt: new Date().toISOString(),
      engineVersion: ENGINE_VERSION,
      holdoutSeed: seed,
      previousHoldouts: [
        {seed: 'AUDIT-2026-09-12-B', status: 'FAILED_DIAGNOSTIC_HOLDOUT', reused: false},
        {seed: 'AUDIT-2026-09-12-C', status: 'REVIEWED_AND_SPENT', reused: false}
      ],
      generatedExactlyOnce: true,
      generatedAsOneBatch: true,
      frozenAt: {
        RC2_2_COMMIT: freeze.RC2_COMMIT, treeHash: freeze.treeHash,
        productionBundleSha256: freeze.productionBundleSha256,
        internalGate: freeze.internalGate
      },
      plan: {
        mixedSessions: SESSION_PLAN.filter(p => p.kind === 'MIXED').length,
        allHardSessions: SESSION_PLAN.filter(p => p.kind === 'ALL_HARD').length,
        questionsPerSession: 50,
        totalRequested: SESSION_PLAN.reduce((a, p) => a + p.count, 0)
      },
      sessions,
      totals: {
        requested: SESSION_PLAN.reduce((a, p) => a + p.count, 0),
        delivered: n,
        blindSha256: sha(Buffer.from(blind, 'utf8')),
        fullSha256: sha(Buffer.from(full, 'utf8'))
      },
      preserved: {
        note: 'Captured at first generation, because there is no second one.',
        reviewerVisible: ['stem', 'stimulus as rendered', 'six options in published order'],
        reviewerHidden: ['key', 'explanation and solution steps', 'per-option derivations',
          'misconception ids', 'difficulty evidence', 'semantic fingerprint', 'reasoning signature'],
        separateFiles: {blind: OUT_BLIND, full: OUT_FULL}
      },
      sessionTelemetry: telemetry.sessionReconciliation,
      engineTelemetry: telemetry.reconciliation,
      rejectionByReason: telemetry.byReason,
      performance: {
        // Unmeasured is null, never 0. Questions are generated inside
        // generatePractice and cannot be timed individually without changing
        // production, so only the per-session figure is real.
        perQuestionLatencyMeasured: false,
        latencyP50Ms: null, latencyP95Ms: null, latencyP99Ms: null,
        batchWallMs: Number(wallMs.toFixed(1)),
        msPerQuestion: Number((wallMs / (n || 1)).toFixed(3))
      },
      declaration: 'Generated once from the frozen RC2.1 engine. Not to be inspected or remediated before independent review.'
    },
    blindGz: gzipSync(Buffer.from(blind, 'utf8')),
    fullGz: gzipSync(Buffer.from(full, 'utf8'))
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const {report, blindGz, fullGz} = buildHoldoutC();
  mkdirSync('rc2', {recursive: true});
  writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n');
  writeFileSync(OUT_BLIND, blindGz);
  writeFileSync(OUT_FULL, fullGz);
  console.log(JSON.stringify({
    holdoutSeed: report.holdoutSeed, frozenAt: report.frozenAt,
    totals: report.totals, plan: report.plan,
    sessions: report.sessions.map(s => ({id: s.id, kind: s.kind, delivered: s.delivered,
      bands: s.bands, diversityWarnings: s.diversityWarnings, cost: s.sessionCost})),
    sessionTelemetry: report.sessionTelemetry,
    engineTelemetry: report.engineTelemetry,
    performance: report.performance
  }, null, 2));
}
