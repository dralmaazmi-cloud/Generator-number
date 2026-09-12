// RC2 §25 — the final holdout.
//
// Four Mixed sessions and one All-Hard session, fifty questions each, two
// hundred and fifty in total, on the holdout seed AUDIT-2026-09-12-B and on no
// other. Each session is generated exactly once. If a holdout already exists
// this refuses to run, because a holdout that can be re-rolled until it looks
// better is not a holdout.
//
// The instrument is not new. Every judgement below is made by a frozen
// production validator — isAnswerDerived, classifyOptionFeedback,
// validateMisconceptionContext, checkOddOneOutAmbiguity,
// classifyQuestionConstructions — called exactly as §22 calls them. What is new
// here is only the bookkeeping around them, and `calibrate` exists so that the
// bookkeeping is not taken on trust: it re-measures the development seeds and
// the caller checks that it reproduces the recorded §22 figures. An instrument
// that reads differently on the corpus it was validated against cannot be
// trusted on the corpus it has never seen.
//
// If the holdout exposes a problem, the problem is preserved. That is what the
// holdout is for.

import {writeFileSync, mkdirSync, existsSync, readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';

import Engine, {ENGINE_VERSION} from '../../src/index.js';
import {classifyQuestionConstructions, STATUS as AR_STATUS} from '../../src/arabic/constructions.js';
import {allRenderedText} from '../../src/qa/pipeline.js';
import {checkOddOneOutAmbiguity} from '../../src/qa/ambiguity.js';
import {isAnswerDerived} from '../../src/qa/distractor-provenance.js';
import {classifyOptionFeedback, FEEDBACK_VERDICT} from '../../src/qa/feedback-metrics.js';
import {validateMisconceptionContext} from '../../src/qa/misconception-context.js';
import {HOLDOUT_SEED, DEVELOPMENT_SEEDS} from './rc2-development-corpus.mjs';

export {HOLDOUT_SEED};
export const OUT = 'rc2/HOLDOUT.json';
export const OUT_GZ = 'rc2/holdout.jsonl.gz';

/** §25 — four Mixed, one All-Hard, fifty each. */
export const SESSION_PLAN = Object.freeze([
  {id: 'SESSION-1', kind: 'MIXED', difficulty: 'mixed', count: 50},
  {id: 'SESSION-2', kind: 'MIXED', difficulty: 'mixed', count: 50},
  {id: 'SESSION-3', kind: 'MIXED', difficulty: 'mixed', count: 50},
  {id: 'SESSION-4', kind: 'MIXED', difficulty: 'mixed', count: 50},
  {id: 'SESSION-5', kind: 'ALL_HARD', difficulty: 'hard', count: 50}
]);

const BANDS = ['easy', 'medium', 'hard'];
const CHANCE = 1 / 6;

const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
function pct(xs, p) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))];
}
const entropyOf = counts => {
  const total = counts.reduce((a, b) => a + b, 0);
  return total ? -counts.reduce((a, c) => a + (c / total) * Math.log2(c / total), 0) : 0;
};

/**
 * The per-question measurement, identical in substance to §22's. Kept as one
 * function over a list of published questions so that the holdout and the
 * calibration run cannot diverge: both call this.
 */
export function measure(questions, {latencies = [], attempts = []} = {}) {
  const byFamily = {}, byTemplate = {}, byBand = {easy: 0, medium: 0, hard: 0};

  let oracleDisagreement = 0, oracleLabelMapped = 0;
  const oracleSamples = [];
  let postShuffleKeyMismatch = 0, zeroCorrectOption = 0,
    multipleCorrectOptions = 0, correctValueMismatch = 0, metaKeyMismatch = 0;

  const ambiguityVerdicts = {};
  let oddOneOutSeen = 0, oddAmbiguous = 0, oddUndiscoverable = 0;

  let arValid = 0, arExempt = 0, arInvalid = 0, arUnclassified = 0;
  const arInvalidSamples = [];

  let wrongOptions = 0, answerDerived = 0, unattributed = 0;
  const answerDerivedPerQuestion = {};
  const unattributedSamples = [], answerDerivedSamples = [];

  const feedbackVerdicts = {};
  let feedbackMismatch = 0, misconceptionInapplicable = 0, duplicateDerivation = 0;
  const feedbackMismatchSamples = [], misconceptionSamples = [];

  const answerCounts = {};
  const declaredVsComputed = {};
  let bandAgreement = 0;

  const exactFingerprints = new Set(), semanticFingerprints = new Set(), structuralSignatures = new Set();

  for (const {q, seed: qSeed} of questions) {
    byFamily[q.family] = (byFamily[q.family] || 0) + 1;
    byBand[q.difficulty]++;
    const t = byTemplate[q.generator_id] ??= {n: 0, answers: {}};
    t.n++;
    const answer = String(q.correct_value);
    t.answers[answer] = (t.answers[answer] || 0) + 1;
    answerCounts[answer] = (answerCounts[answer] || 0) + 1;

    // --- mathematics: the §20 RC1 gains, re-checked on every question --------
    const meta = q.metadata.options_meta;
    const correctEntries = Object.entries(meta).filter(([, m]) => m.correct);
    if (correctEntries.length === 0) zeroCorrectOption++;
    if (correctEntries.length > 1) multipleCorrectOptions++;
    const [correctLetter, correctMeta] = correctEntries[0] ?? [null, null];
    if (correctLetter !== q.correct_option) postShuffleKeyMismatch++;
    if (correctMeta && q.options[correctLetter] !== q.correct_value) correctValueMismatch++;
    if (q.metadata.target_misconception === undefined) metaKeyMismatch++;
    const om = q.metadata.validation_meta.oracle;
    if (om && om.claimed !== undefined && om.oracle !== undefined) {
      const claimedNumeric = Number.isFinite(Number(om.claimed));
      const oracleNumeric = Number.isFinite(Number(om.oracle));
      if (claimedNumeric === oracleNumeric && String(om.claimed) !== String(om.oracle)) {
        oracleDisagreement++;
        if (oracleSamples.length < 10) oracleSamples.push({seed: qSeed, templateId: q.generator_id, ...om});
      } else if (claimedNumeric !== oracleNumeric) {
        oracleLabelMapped++;
      }
    }

    // --- ambiguity -----------------------------------------------------------
    if (q.family === 'odd_one_out') {
      oddOneOutSeen++;
      const verdict = q.metadata.ambiguity_verdict ?? 'UNRECORDED';
      ambiguityVerdicts[verdict] = (ambiguityVerdicts[verdict] || 0) + 1;
      const nums = q.metadata.parameters?.numbers;
      if (Array.isArray(nums)) {
        const a = checkOddOneOutAmbiguity(nums, Number(q.correct_value));
        if (a.ambiguous) oddAmbiguous++;
        if (a.undiscoverable) oddUndiscoverable++;
      }
    }

    // --- language ------------------------------------------------------------
    const ar = classifyQuestionConstructions(allRenderedText(q)).constructions;
    for (const c of ar) {
      if (c.status === AR_STATUS.VALID) arValid++;
      else if (c.status === AR_STATUS.EXEMPT) arExempt++;
      else if (c.status === AR_STATUS.INVALID) {
        arInvalid++;
        if (arInvalidSamples.length < 20) arInvalidSamples.push({seed: qSeed, templateId: q.generator_id, ...c});
      } else arUnclassified++;
    }

    // --- distractors ---------------------------------------------------------
    const givens = new Set();
    const walkGivens = v => {
      if (typeof v === 'number') givens.add(String(v));
      else if (Array.isArray(v)) v.forEach(walkGivens);
      else if (v && typeof v === 'object') Object.values(v).forEach(walkGivens);
    };
    walkGivens(q.metadata.parameters || {});
    for (const g of String(q.question).matchAll(/\d+(?:\.\d+)?/g)) givens.add(g[0]);

    let adHere = 0;
    for (const [letter, m] of Object.entries(meta)) {
      if (m.correct) continue;
      wrongOptions++;
      if (isAnswerDerived(m.derivation, correctMeta?.value, givens)) {
        answerDerived++; adHere++;
        if (answerDerivedSamples.length < 40) {
          answerDerivedSamples.push({
            seed: qSeed, templateId: q.generator_id, option: letter, value: m.value,
            derivation: m.derivation, misconceptionId: m.misconceptionId,
            reasoningStepAffected: m.reasoningStepAffected ?? null
          });
        }
        if (m.reasoningStepAffected === null || m.reasoningStepAffected === undefined) {
          unattributed++;
          if (unattributedSamples.length < 40) {
            unattributedSamples.push({
              seed: qSeed, templateId: q.generator_id, option: letter,
              value: m.value, derivation: m.derivation, misconceptionId: m.misconceptionId
            });
          }
        }
      }
      const f = classifyOptionFeedback({value: m.value, derivation: m.derivation});
      feedbackVerdicts[f.verdict] = (feedbackVerdicts[f.verdict] || 0) + 1;
      if (f.verdict === FEEDBACK_VERDICT.MISMATCH) {
        feedbackMismatch++;
        if (feedbackMismatchSamples.length < 40) {
          feedbackMismatchSamples.push({
            seed: qSeed, templateId: q.generator_id, option: letter,
            value: m.value, derivation: m.derivation, detail: f
          });
        }
      }
    }
    answerDerivedPerQuestion[adHere] = (answerDerivedPerQuestion[adHere] || 0) + 1;
    const derivations = Object.values(meta).filter(m => !m.correct).map(m => m.derivation);
    if (new Set(derivations).size !== derivations.length) duplicateDerivation++;
    const mc = validateMisconceptionContext({
      question: q.question,
      distractors: Object.values(meta).filter(m => !m.correct)
        .map(m => ({value: m.value, misconceptionId: m.misconceptionId}))
    });
    if (!mc.valid) {
      misconceptionInapplicable++;
      if (misconceptionSamples.length < 20) {
        misconceptionSamples.push({seed: qSeed, templateId: q.generator_id, detail: mc});
      }
    }

    // --- difficulty ----------------------------------------------------------
    const key = `${q.difficulty}->${q.metadata.complexity_band}`;
    declaredVsComputed[key] = (declaredVsComputed[key] || 0) + 1;
    if (q.difficulty === q.metadata.complexity_band) bandAgreement++;

    // --- diversity -----------------------------------------------------------
    exactFingerprints.add(q.metadata.fingerprint);
    semanticFingerprints.add(q.metadata.semantic_fingerprint ?? q.metadata.fingerprint);
    if (q.metadata.structural_reasoning_signature) structuralSignatures.add(q.metadata.structural_reasoning_signature);
  }

  const published = questions.length;
  const leakage = Object.entries(byTemplate)
    .filter(([, t]) => t.n >= 40)
    .map(([id, t]) => {
      const counts = Object.values(t.answers);
      const modal = Math.max(...counts) / t.n;
      return {
        templateId: id, n: t.n, space: counts.length,
        modal: Number(modal.toFixed(3)),
        entropyBits: Number(entropyOf(counts).toFixed(2)),
        advantagePoints: Number(((modal - CHANCE) * 100).toFixed(1))
      };
    })
    .sort((a, b) => b.advantagePoints - a.advantagePoints);

  return {
    counts: {
      published,
      families: Object.keys(byFamily).length,
      templates: Object.keys(byTemplate).length,
      byBand, byFamily
    },
    mathematics: {
      note: '§20 — the RC1 gains. Any non-zero figure here is an RC2 blocker.',
      ORACLE_DISAGREEMENT: oracleDisagreement,
      oracleDisagreementSamples: oracleSamples,
      oracleComparedThroughALabelMap: oracleLabelMapped,
      postShuffleKeyMismatch, zeroCorrectOption, multipleCorrectOptions,
      correctValueMismatch, metaKeyMismatch
    },
    ambiguity: {
      oddOneOutPublished: oddOneOutSeen,
      verdicts: ambiguityVerdicts,
      publishedAmbiguous: oddAmbiguous,
      publishedUndiscoverable: oddUndiscoverable
    },
    language: {
      constructionsClassified: arValid + arExempt + arInvalid + arUnclassified,
      valid: arValid, exempt: arExempt, invalid: arInvalid, unclassified: arUnclassified,
      invalidSamples: arInvalidSamples
    },
    distractors: {
      wrongOptions,
      answerDerived,
      answerDerivedShare: Number((answerDerived / (wrongOptions || 1)).toFixed(5)),
      unattributedAnswerDerived: unattributed,
      perQuestionDistribution: answerDerivedPerQuestion,
      answerDerivedSamples,
      unattributedSamples,
      rc1Baseline: {answerDerivedShare: 0.249, questionsWithThreeOrMoreShare: 0.156}
    },
    feedback: {
      verdicts: feedbackVerdicts,
      derivationMismatches: feedbackMismatch,
      derivationMismatchSamples: feedbackMismatchSamples,
      questionsWithInapplicableMisconception: misconceptionInapplicable,
      inapplicableMisconceptionSamples: misconceptionSamples,
      questionsWithDuplicateDerivation: duplicateDerivation
    },
    statisticalLeakage: {
      note: 'A 250-question holdout is far too small to judge per-template leakage; ' +
        'the §22 corpus is what measures that. These figures are reported for completeness only.',
      distinctAnswersAcrossCorpus: Object.keys(answerCounts).length,
      corpusModalShare: Number((Math.max(...Object.values(answerCounts), 0) / (published || 1)).toFixed(5)),
      templatesMeasured: leakage.length,
      templatesAbove20Points: leakage.filter(t => t.advantagePoints > 20).length,
      templatesAbove15Points: leakage.filter(t => t.advantagePoints > 15).length,
      medianAdvantagePoints: leakage.length ? leakage[Math.floor(leakage.length / 2)].advantagePoints : null,
      worst: leakage.slice(0, 10)
    },
    difficulty: {
      declaredVsComputed,
      agreement: Number((bandAgreement / (published || 1)).toFixed(4)),
      rc1Agreement: 0.528
    },
    diversity: {
      exactFingerprints: exactFingerprints.size,
      semanticFingerprints: semanticFingerprints.size,
      structuralReasoningSignatures: structuralSignatures.size,
      exactPerPublished: Number((exactFingerprints.size / (published || 1)).toFixed(4)),
      semanticCollapseRatio: Number((semanticFingerprints.size / (exactFingerprints.size || 1)).toFixed(4))
    },
    performance: {
      meanAttemptsPerPublished: Number(mean(attempts).toFixed(4)),
      p95Attempts: pct(attempts, 95),
      maxAttempts: attempts.length ? Math.max(...attempts) : 0,
      latencyP50Ms: Number(pct(latencies, 50).toFixed(2)),
      latencyP95Ms: Number(pct(latencies, 95).toFixed(2)),
      latencyP99Ms: Number(pct(latencies, 99).toFixed(2))
    }
  };
}

/**
 * Instrument calibration. Re-generates development-seed questions exactly as §22
 * did and measures them with the function above, so the caller can check that
 * this bookkeeping reproduces the recorded §22 figures. Writes nothing, and the
 * §22 evidence is not touched. The holdout seed is refused here as it is there.
 */
export function calibrate({questions = 3000, seeds = DEVELOPMENT_SEEDS} = {}) {
  for (const s of seeds) {
    if (String(s).includes(HOLDOUT_SEED)) throw new Error(`calibration must not touch ${HOLDOUT_SEED}`);
  }
  const engine = new Engine();
  const collected = [], attempts = [], latencies = [];
  let published = 0, exhausted = 0;
  const perSeedCount = Math.ceil(questions / seeds.length);
  for (const seed of seeds) {
    for (let i = 0; i < perSeedCount && published + exhausted < questions; i++) {
      const band = BANDS[i % 3];
      const qSeed = `${seed}-${band}-${i}`;
      const t0 = performance.now();
      let q;
      try { q = engine.generateQuestion({family: 'random', difficulty: band, seed: qSeed}); }
      catch { exhausted++; continue; }
      latencies.push(performance.now() - t0);
      published++;
      attempts.push(q.metadata.validation_meta.attempts);
      collected.push({q, seed: qSeed});
    }
  }
  return {exhausted, metrics: measure(collected, {attempts, latencies})};
}

/**
 * §25. Generates the holdout once and refuses if one already exists. The session
 * seeds are derived from the holdout seed by a stated rule so an independent
 * auditor can replay exactly these two hundred and fifty questions.
 */
export function buildHoldout({force = false} = {}) {
  if (!force && existsSync(OUT)) {
    throw new Error(`§25 refuses to regenerate: ${OUT} already exists. A holdout is generated exactly once.`);
  }
  const freeze = JSON.parse(readFileSync('rc2/FREEZE.json', 'utf8'));
  if (freeze.holdoutSeed !== HOLDOUT_SEED) {
    throw new Error(`the freeze names holdout seed ${freeze.holdoutSeed}, not ${HOLDOUT_SEED}`);
  }

  const engine = new Engine();
  engine.resetTelemetry();

  const sessions = [], collected = [], attempts = [], latencies = [], lines = [];
  for (const plan of SESSION_PLAN) {
    const seed = `${HOLDOUT_SEED}-${plan.id}`;
    const t0 = performance.now();
    const s = engine.generatePractice({
      count: plan.count, difficulty: plan.difficulty, family: 'random', seed
    });
    const wallMs = performance.now() - t0;
    for (const q of s.questions) {
      collected.push({q, seed});
      attempts.push(q.metadata.validation_meta.attempts);
      lines.push(JSON.stringify({
        sessionId: plan.id, sessionKind: plan.kind, seed,
        templateId: q.generator_id, family: q.family, difficulty: q.difficulty,
        question: q.question, options: q.options, correct: q.correct_option, value: q.correct_value,
        fingerprint: q.metadata.fingerprint, semantic: q.metadata.semantic_fingerprint,
        structural: q.metadata.structural_reasoning_signature,
        complexityScore: q.metadata.complexity_score, complexityBand: q.metadata.complexity_band
      }));
    }
    latencies.push(wallMs / (s.questions.length || 1));
    sessions.push({
      id: plan.id, kind: plan.kind, requestedDifficulty: plan.difficulty,
      requestedCount: plan.count, seed,
      delivered: s.questions.length,
      generationMode: s.validation.generation_mode,
      diversityWarnings: s.validation.diversity_warnings ?? [],
      validationValid: s.validation.valid ?? s.validation.all_valid ?? null,
      validationIssues: (s.validation.issues ?? []).slice(0, 20),
      bands: s.questions.reduce((a, q) => (a[q.difficulty] = (a[q.difficulty] || 0) + 1, a), {}),
      answerLetters: s.questions.reduce((a, q) => (a[q.correct_option] = (a[q.correct_option] || 0) + 1, a), {}),
      wallMs: Number(wallMs.toFixed(1))
    });
  }

  const metrics = measure(collected, {attempts, latencies: []});
  metrics.performance.latencyPerQuestionMsBySession = sessions.map(s => ({
    id: s.id, msPerQuestion: Number((s.wallMs / (s.delivered || 1)).toFixed(3))
  }));

  const telemetry = engine.getTelemetry();
  const corpus = lines.join('\n') + '\n';
  const gz = gzipSync(Buffer.from(corpus, 'utf8'));

  return {
    report: {
      schema: 'rc2-holdout-v1',
      section: '§25',
      generatedAt: new Date().toISOString(),
      engineVersion: ENGINE_VERSION,
      holdoutSeed: HOLDOUT_SEED,
      sessionSeedRule: '`${HOLDOUT_SEED}-${sessionId}` — stated so the holdout is replayable',
      generatedExactlyOnce: true,
      frozenAt: {
        RC2_COMMIT: freeze.RC2_COMMIT,
        treeHash: freeze.treeHash,
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
        delivered: collected.length,
        sha256: createHash('sha256').update(corpus).digest('hex'),
        gzipBytes: gz.length
      },
      ...metrics,
      rejectionTelemetry: {
        reconciliation: telemetry.reconciliation,
        byStage: telemetry.byStage,
        byReason: telemetry.byReason,
        internalResamplesPerProposal: telemetry.internalResamplesPerProposal,
        exhaustions: telemetry.exhaustions
      },
      declaration: 'Generated once from the frozen engine. If a problem appears above it is preserved, not re-rolled.'
    },
    corpusGz: gz
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] ?? 'holdout';
  if (mode === 'calibrate') {
    const {exhausted, metrics} = calibrate({questions: Number(process.argv[3] ?? 3000)});
    console.log(JSON.stringify({exhausted, metrics: {
      counts: {...metrics.counts, byFamily: undefined},
      mathematics: metrics.mathematics,
      ambiguity: {...metrics.ambiguity, verdicts: metrics.ambiguity.verdicts},
      language: {...metrics.language, invalidSamples: metrics.language.invalidSamples.length},
      distractors: {...metrics.distractors, answerDerivedSamples: undefined, unattributedSamples: undefined},
      feedback: {
        verdicts: metrics.feedback.verdicts,
        derivationMismatches: metrics.feedback.derivationMismatches,
        questionsWithInapplicableMisconception: metrics.feedback.questionsWithInapplicableMisconception,
        questionsWithDuplicateDerivation: metrics.feedback.questionsWithDuplicateDerivation
      },
      difficulty: metrics.difficulty,
      diversity: metrics.diversity
    }}, null, 2));
  } else {
    const {report, corpusGz} = buildHoldout();
    mkdirSync('rc2', {recursive: true});
    writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n');
    writeFileSync(OUT_GZ, corpusGz);
    console.log(JSON.stringify({
      holdoutSeed: report.holdoutSeed, frozenAt: report.frozenAt,
      plan: report.plan, totals: report.totals,
      sessions: report.sessions.map(s => ({
        id: s.id, kind: s.kind, delivered: s.delivered, bands: s.bands,
        generationMode: s.generationMode, diversityWarnings: s.diversityWarnings.length
      })),
      counts: {...report.counts, byFamily: undefined},
      mathematics: {...report.mathematics, oracleDisagreementSamples: report.mathematics.oracleDisagreementSamples.length},
      ambiguity: report.ambiguity,
      language: {...report.language, invalidSamples: report.language.invalidSamples.length},
      distractors: {
        wrongOptions: report.distractors.wrongOptions,
        answerDerived: report.distractors.answerDerived,
        answerDerivedShare: report.distractors.answerDerivedShare,
        unattributedAnswerDerived: report.distractors.unattributedAnswerDerived,
        perQuestionDistribution: report.distractors.perQuestionDistribution
      },
      feedback: {
        derivationMismatches: report.feedback.derivationMismatches,
        questionsWithInapplicableMisconception: report.feedback.questionsWithInapplicableMisconception,
        questionsWithDuplicateDerivation: report.feedback.questionsWithDuplicateDerivation,
        verdicts: report.feedback.verdicts
      },
      difficulty: report.difficulty,
      diversity: report.diversity,
      rejectionTelemetry: report.rejectionTelemetry,
      performance: report.performance
    }, null, 2));
  }
}
