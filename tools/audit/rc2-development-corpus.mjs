// RC2 §22 — the development corpus.
//
// At least ten thousand questions on DEVELOPMENT seeds. The final holdout seed
// AUDIT-2026-09-12-B is not used here and is refused if passed: a corpus that
// has touched the holdout is no longer a holdout.
//
// Everything the scope asks to see is measured on one coherent run, so the
// figures describe the same engine at the same commit rather than ten separate
// samples that happen to agree.

import {writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';

import Engine, {ENGINE_VERSION} from '../../src/index.js';
import {validateCandidate} from '../../src/qa/pipeline.js';
import {classifyQuestionConstructions, STATUS as AR_STATUS} from '../../src/arabic/constructions.js';
import {allRenderedText} from '../../src/qa/pipeline.js';
import {checkOddOneOutAmbiguity} from '../../src/qa/ambiguity.js';
import {isAnswerDerived} from '../../src/qa/distractor-provenance.js';
import {classifyOptionFeedback, FEEDBACK_VERDICT} from '../../src/qa/feedback-metrics.js';
import {validateMisconceptionContext} from '../../src/qa/misconception-context.js';

export const HOLDOUT_SEED = 'AUDIT-2026-09-12-B';

/**
 * RC2.3. The next sign-off holdout, named here and generated nowhere.
 *
 * Declaring it is what lets the §23 gate check it has not leaked into
 * development evidence before it exists. It lives beside the other seeds rather
 * than inside the gate so that the freeze can name it without importing the
 * gate, which would make the two mutually dependent.
 */
export const RC23_SIGNOFF_SEED = 'AUDIT-2026-09-12-E';

/**
 * RC2.7's sign-off holdout, NAMED and not generated.
 *
 * Holdout E was reviewed under RC2.5 and Holdout F was sealed under RC2.6, so
 * both are spent: an engine remediated against a holdout can no longer be
 * tested by it. This release freezes against a seed nothing has been drawn on,
 * and the RC2.7 brief is explicit that the holdout is not to be generated yet —
 * which is the same posture RC2.3 took.
 */
export const RC27_SIGNOFF_SEED = 'AUDIT-2026-09-13-G';

/** Holdout F, sealed under RC2.6 and reviewed independently. */
export const RC26_HOLDOUT_SEED = 'AUDIT-2026-09-13-F';
export const DEVELOPMENT_SEEDS = Object.freeze([
  'RC2-DEV-ALPHA', 'RC2-DEV-BETA', 'RC2-DEV-GAMMA', 'RC2-DEV-DELTA', 'RC2-DEV-EPSILON'
]);

/**
 * RC2.1 draws its corpus on seeds the RC2 corpus never used. Re-measuring on the
 * same five would report how the engine behaves on questions its remediation was
 * developed against, which is not what a development corpus is for.
 */
/** RC2.2 draws on seeds neither RC2 nor RC2.1 used. */
export const RC22_DEVELOPMENT_SEEDS = Object.freeze([
  'RC22-DEV-LAMBDA', 'RC22-DEV-MU', 'RC22-DEV-NU', 'RC22-DEV-XI', 'RC22-DEV-OMICRON'
]);

export const RC21_DEVELOPMENT_SEEDS = Object.freeze([
  'RC21-DEV-ZETA', 'RC21-DEV-ETA', 'RC21-DEV-THETA', 'RC21-DEV-IOTA', 'RC21-DEV-KAPPA'
]);

/** RC2.3 draws on seeds no earlier release used. */
export const RC23_DEVELOPMENT_SEEDS = Object.freeze([
  'RC23-DEV-PI', 'RC23-DEV-RHO', 'RC23-DEV-SIGMA', 'RC23-DEV-TAU', 'RC23-DEV-UPSILON'
]);

/** RC2.4, likewise. */
export const RC24_DEVELOPMENT_SEEDS = Object.freeze([
  'RC24-DEV-PHI', 'RC24-DEV-CHI', 'RC24-DEV-PSI', 'RC24-DEV-OMEGA', 'RC24-DEV-KOPPA'
]);

/** RC2.7, likewise. Fresh seeds: a corpus drawn on RC2.4's seeds would measure
 * this engine on draws chosen for a different one. */
export const RC27_DEVELOPMENT_SEEDS = Object.freeze([
  'RC27-DEV-ALEF', 'RC27-DEV-BAA', 'RC27-DEV-JEEM', 'RC27-DEV-DAL', 'RC27-DEV-HAA'
]);

/**
 * RC2.8, likewise, and for a reason this release makes sharper than the others.
 *
 * The generator no longer draws a question and then judges it; it plans the
 * IDEA for every slot first. A corpus drawn on RC2.7's seeds would be a record
 * of what the old loop happened to sample, and freezing against it would attest
 * a measurement of an engine that no longer exists.
 */
export const RC28_DEVELOPMENT_SEEDS = Object.freeze([
  'RC28-DEV-ALEF', 'RC28-DEV-BAA', 'RC28-DEV-JEEM', 'RC28-DEV-DAL', 'RC28-DEV-HAA'
]);

/**
 * RC2.8 names its sign-off holdout and does not generate it, exactly as RC2.3
 * and RC2.7 did: the brief for this release forbids starting a new blind
 * holdout, and a seed that has been drawn on is spent.
 */
export const RC28_SIGNOFF_SEED = 'AUDIT-2026-09-13-H';

/**
 * RC2.9, likewise, and for this release's own reason.
 *
 * The engine no longer plans a session from an empty page: it is handed what
 * the user has already solved and allocates around it. A corpus drawn on
 * RC2.8's seeds would be a record of sessions planned without that memory, so
 * freezing against it would attest a measurement of a planner that no longer
 * runs.
 */
export const RC29_DEVELOPMENT_SEEDS = Object.freeze([
  'RC29-DEV-ALEF', 'RC29-DEV-BAA', 'RC29-DEV-JEEM', 'RC29-DEV-DAL', 'RC29-DEV-HAA'
]);

/**
 * RC2.9 names its sign-off holdout and does not generate it. The brief for this
 * release forbids creating a blind holdout or claiming one exists, so the seed
 * is named as the state this freeze would be sealed against and nothing is
 * drawn on it. RC2.8's H is spent by having been frozen against.
 */
export const RC29_SIGNOFF_SEED = 'AUDIT-2026-09-13-I';

/**
 * RC2.9.1. A corpus of its own, for the reason every release has had one: the
 * engine it measures is not the one before it. RC2.9's corpus was drawn from a
 * renderer that published «302 علبتان» and «5 زجاجة/ساعة», and freezing RC2.9.1
 * against it would attest a measurement of text this release no longer emits.
 *
 * The seeds are RC2.9's, deliberately: this release changes how a question is
 * WORDED, not which question is drawn, so drawing the same sample makes the two
 * corpora comparable line for line.
 */
export const RC291_DEVELOPMENT_SEEDS = RC29_DEVELOPMENT_SEEDS;

/**
 * RC2.9.1 names its sign-off holdout and does not generate it. Its brief
 * forbids generating a blind holdout; RC2.9's I is spent by being frozen
 * against.
 */
export const RC291_SIGNOFF_SEED = 'AUDIT-2026-09-13-J';

/**
 * Which release a corpus run belongs to, and where its evidence lands. The RC2.1
 * and RC2.2 corpora were built by calling `build` with a seed list by hand and
 * writing the files by hand, which left no record of how to reproduce them.
 */
export const RELEASES = Object.freeze({
  rc2: {seeds: DEVELOPMENT_SEEDS, json: 'rc2/DEVELOPMENT_CORPUS.json', gz: 'rc2/development-corpus.jsonl.gz'},
  rc21: {seeds: RC21_DEVELOPMENT_SEEDS, json: 'rc2/RC21_DEVELOPMENT_CORPUS.json', gz: 'rc2/rc21-development-corpus.jsonl.gz'},
  rc22: {seeds: RC22_DEVELOPMENT_SEEDS, json: 'rc2/RC22_DEVELOPMENT_CORPUS.json', gz: 'rc2/rc22-development-corpus.jsonl.gz'},
  rc23: {seeds: RC23_DEVELOPMENT_SEEDS, json: 'rc2/RC23_DEVELOPMENT_CORPUS.json', gz: 'rc2/rc23-development-corpus.jsonl.gz'},
  rc24: {seeds: RC24_DEVELOPMENT_SEEDS, json: 'rc2/RC24_DEVELOPMENT_CORPUS.json', gz: 'rc2/rc24-development-corpus.jsonl.gz'},
  rc27: {seeds: RC27_DEVELOPMENT_SEEDS, json: 'rc2/RC27_DEVELOPMENT_CORPUS.json', gz: 'rc2/rc27-development-corpus.jsonl.gz'},
  rc28: {seeds: RC28_DEVELOPMENT_SEEDS, json: 'rc2/RC28_DEVELOPMENT_CORPUS.json', gz: 'rc2/rc28-development-corpus.jsonl.gz'},
  rc29: {seeds: RC29_DEVELOPMENT_SEEDS, json: 'rc2/RC29_DEVELOPMENT_CORPUS.json', gz: 'rc2/rc29-development-corpus.jsonl.gz'},
  rc291: {seeds: RC291_DEVELOPMENT_SEEDS, json: 'rc2/RC291_DEVELOPMENT_CORPUS.json', gz: 'rc2/rc291-development-corpus.jsonl.gz'}
});

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

export async function build({questions = 10000, seeds = DEVELOPMENT_SEEDS} = {}) {
  // Both holdout seeds are refused. B is preserved diagnostic evidence and C is
  // the unused sign-off holdout; a development corpus that has touched either is
  // no longer independent of it.
  for (const s of seeds) {
    for (const forbidden of [HOLDOUT_SEED, 'AUDIT-2026-09-12-C', 'AUDIT-2026-09-12-D']) {
      if (String(s).includes(forbidden)) {
        throw new Error(`a development corpus must not use the holdout seed ${forbidden}`);
      }
    }
  }

  const engine = new Engine();
  const started = Date.now();

  // --- accumulators ---------------------------------------------------------
  const attempts = [], latencies = [];
  let published = 0, exhausted = 0;
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

  const feedbackVerdicts = {};
  let feedbackMismatch = 0, misconceptionInapplicable = 0, duplicateDerivation = 0;

  const answerCounts = {};
  const declaredVsComputed = {};
  let bandAgreement = 0;

  const exactFingerprints = new Set(), semanticFingerprints = new Set(), structuralSignatures = new Set();
  const corpusLines = [];

  const perSeedCount = Math.ceil(questions / seeds.length);

  for (const seed of seeds) {
    for (let i = 0; i < perSeedCount && published + exhausted < questions; i++) {
      const band = BANDS[i % 3];
      const qSeed = `${seed}-${band}-${i}`;
      const t0 = performance.now();
      let q;
      try { q = engine.generateQuestion({family: 'random', difficulty: band, seed: qSeed}); }
      catch { exhausted++; continue; }
      const ms = performance.now() - t0;
      published++;
      attempts.push(q.metadata.validation_meta.attempts);
      latencies.push(ms);
      byFamily[q.family] = (byFamily[q.family] || 0) + 1;
      byBand[q.difficulty]++;
      const t = byTemplate[q.generator_id] ??= {n: 0, answers: {}};
      t.n++;
      const answer = String(q.correct_value);
      t.answers[answer] = (t.answers[answer] || 0) + 1;
      answerCounts[answer] = (answerCounts[answer] || 0) + 1;

      // --- mathematics: the RC1 gains, re-checked on every question ----------
      const meta = q.metadata.options_meta;
      const correctEntries = Object.entries(meta).filter(([, m]) => m.correct);
      if (correctEntries.length === 0) zeroCorrectOption++;
      if (correctEntries.length > 1) multipleCorrectOptions++;
      const [correctLetter, correctMeta] = correctEntries[0] ?? [null, null];
      if (correctLetter !== q.correct_option) postShuffleKeyMismatch++;
      if (correctMeta && q.options[correctLetter] !== q.correct_value) correctValueMismatch++;
      if (q.metadata.target_misconception === undefined) metaKeyMismatch++;
      // The oracle figure is re-derived from the published artifact. A template
      // whose answer is a LABEL declares a mapping from the searched value to
      // the label, and the pipeline compares through it — so the metadata's
      // `claimed` («الربع») and `oracle` («4») legitimately differ there and are
      // not a disagreement. Comparing them blind reported 208 of these; the
      // comparison is made only where both sides are the same kind of value.
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

      // --- ambiguity ---------------------------------------------------------
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

      // --- language ----------------------------------------------------------
      const ar = classifyQuestionConstructions(allRenderedText(q)).constructions;
      for (const c of ar) {
        if (c.status === AR_STATUS.VALID) arValid++;
        else if (c.status === AR_STATUS.EXEMPT) arExempt++;
        else if (c.status === AR_STATUS.INVALID) {
          arInvalid++;
          if (arInvalidSamples.length < 20) arInvalidSamples.push({seed: qSeed, templateId: q.generator_id, ...c});
        } else arUnclassified++;
      }

      // --- distractors -------------------------------------------------------
      // The givens: a derivation starting from a number the learner was given is
      // a starting point, not the answer, even when the two coincide for this
      // draw. Without this the count reports those coincidences as unattributed
      // key-neighbours — 160 of them, none of which is one.
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
          if (m.reasoningStepAffected === null || m.reasoningStepAffected === undefined) unattributed++;
        }
        // --- feedback --------------------------------------------------------
        const f = classifyOptionFeedback({value: m.value, derivation: m.derivation});
        feedbackVerdicts[f.verdict] = (feedbackVerdicts[f.verdict] || 0) + 1;
        if (f.verdict === FEEDBACK_VERDICT.MISMATCH) feedbackMismatch++;
        void letter;
      }
      answerDerivedPerQuestion[adHere] = (answerDerivedPerQuestion[adHere] || 0) + 1;
      const derivations = Object.values(meta).filter(m => !m.correct).map(m => m.derivation);
      if (new Set(derivations).size !== derivations.length) duplicateDerivation++;
      if (!validateMisconceptionContext({
        question: q.question,
        distractors: Object.values(meta).filter(m => !m.correct)
          .map(m => ({value: m.value, misconceptionId: m.misconceptionId}))
      }).valid) misconceptionInapplicable++;

      // --- difficulty --------------------------------------------------------
      const key = `${q.difficulty}->${q.metadata.complexity_band}`;
      declaredVsComputed[key] = (declaredVsComputed[key] || 0) + 1;
      if (q.difficulty === q.metadata.complexity_band) bandAgreement++;

      // --- diversity ---------------------------------------------------------
      exactFingerprints.add(q.metadata.fingerprint);
      semanticFingerprints.add(q.metadata.semantic_fingerprint ?? q.metadata.fingerprint);
      if (q.metadata.structural_reasoning_signature) structuralSignatures.add(q.metadata.structural_reasoning_signature);

      corpusLines.push(JSON.stringify({
        seed: qSeed, templateId: q.generator_id, family: q.family, difficulty: q.difficulty,
        question: q.question, options: q.options, correct: q.correct_option, value: q.correct_value,
        fingerprint: q.metadata.fingerprint, semantic: q.metadata.semantic_fingerprint,
        structural: q.metadata.structural_reasoning_signature,
        complexityScore: q.metadata.complexity_score, complexityBand: q.metadata.complexity_band
      }));
    }
  }

  const wallMs = Date.now() - started;
  const telemetry = engine.getTelemetry();

  // --- leakage, per template -------------------------------------------------
  // RC2.2: judged on a confidence lower bound and at a sample that can support
  // the claim. At n=45 a template whose true advantage is +12 measured +34 here,
  // and reporting that as a breach would be reporting noise. The threshold and
  // the bound match tests/rc2-answer-space.test.mjs.
  const leakage = Object.entries(byTemplate)
    .filter(([, t]) => t.n >= 150)
    .map(([id, t]) => {
      const counts = Object.values(t.answers);
      const modal = Math.max(...counts) / t.n;
      return {
        templateId: id, n: t.n, space: counts.length,
        modal: Number(modal.toFixed(3)),
        entropyBits: Number(entropyOf(counts).toFixed(2)),
        advantagePoints: Number(((modal - CHANCE) * 100).toFixed(1)),
        advantageLowerBoundPoints: Number((
          (modal - 2 * Math.sqrt(modal * (1 - modal) / t.n) - CHANCE) * 100).toFixed(1))
      };
    })
    .sort((a, b) => b.advantagePoints - a.advantagePoints);

  const corpus = corpusLines.join('\n') + '\n';
  const gz = gzipSync(Buffer.from(corpus, 'utf8'));

  return {
    report: {
      schema: 'rc2-development-corpus-v1',
      section: '§22',
      generatedAt: new Date().toISOString(),
      engineVersion: ENGINE_VERSION,
      seeds,
      holdoutSeedUsed: false,
      holdoutSeed: HOLDOUT_SEED,
      corpus: {
        requested: questions, published, exhausted,
        families: Object.keys(byFamily).length,
        templates: Object.keys(byTemplate).length,
        byBand, byFamily,
        sha256: createHash('sha256').update(corpus).digest('hex'),
        gzipBytes: gz.length
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
        rc1Baseline: {answerDerivedShare: 0.249, questionsWithThreeOrMoreShare: 0.156}
      },
      feedback: {
        verdicts: feedbackVerdicts,
        derivationMismatches: feedbackMismatch,
        questionsWithInapplicableMisconception: misconceptionInapplicable,
        questionsWithDuplicateDerivation: duplicateDerivation
      },
      statisticalLeakage: {
        note: 'A 10,000-question corpus spread over ~105 templates gives ~95 draws each, so few clear the sample this statistic needs. The authoritative leakage measurement is tools/audit/rc2-011-answer-space.mjs at 30,000 questions; this is a cross-check.',
        distinctAnswersAcrossCorpus: Object.keys(answerCounts).length,
        corpusModalShare: Number((Math.max(...Object.values(answerCounts)) / (published || 1)).toFixed(5)),
        templatesMeasured: leakage.length,
        templatesAbove20Points: leakage.filter(t => t.advantageLowerBoundPoints > 20).length,
        templatesAbove20PointsOnPointEstimate: leakage.filter(t => t.advantagePoints > 20).length,
        templatesAbove15Points: leakage.filter(t => t.advantageLowerBoundPoints > 15).length,
        medianAdvantagePoints: leakage.length ? leakage[Math.floor(leakage.length / 2)].advantagePoints : null,
        worst: leakage.slice(0, 10)
      },
      difficulty: {
        declaredVsComputed,
        agreement: Number((bandAgreement / (published || 1)).toFixed(4)),
        rc1Agreement: 0.528
      },
      rejectionTelemetry: {
        reconciliation: telemetry.reconciliation,
        byStage: telemetry.byStage,
        byReason: telemetry.byReason,
        internalResamplesPerProposal: telemetry.internalResamplesPerProposal,
        exhaustions: telemetry.exhaustions
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
        latencyP99Ms: Number(pct(latencies, 99).toFixed(2)),
        wallClockSeconds: Number((wallMs / 1000).toFixed(1)),
        questionsPerSecond: Number((published / (wallMs / 1000)).toFixed(1))
      }
    },
    corpusGz: gz
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const release = process.argv[3] ?? 'rc2';
  const target = RELEASES[release];
  if (!target) throw new Error(`unknown release ${release}; expected one of ${Object.keys(RELEASES)}`);
  const {report, corpusGz} = await build({questions: Number(process.argv[2] ?? 10000), seeds: target.seeds});
  mkdirSync('rc2', {recursive: true});
  writeFileSync(target.json, JSON.stringify(report, null, 2) + '\n');
  writeFileSync(target.gz, corpusGz);
  console.log(JSON.stringify({
    corpus: {...report.corpus, byFamily: undefined},
    mathematics: report.mathematics,
    ambiguity: report.ambiguity,
    language: {...report.language, invalidSamples: report.language.invalidSamples.length},
    distractors: report.distractors,
    feedback: report.feedback,
    statisticalLeakage: {...report.statisticalLeakage, worst: report.statisticalLeakage.worst.slice(0, 3)},
    difficulty: report.difficulty,
    rejectionTelemetry: report.rejectionTelemetry,
    diversity: report.diversity,
    performance: report.performance
  }, null, 2));
}
