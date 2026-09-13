import {SeededRNG, makeSeed} from './rng.js';
import {FAMILY_REGISTRY, FAMILY_MAP, FAMILY_ALIASES} from './registry.js';
import {finalizeQuestion, validateQuestion, questionSignature, buildBalancedLetterSchedule, LETTERS} from './utils.js';
import {validateCandidate} from './qa/pipeline.js';
import {REASON} from './qa/reasons.js';
import {GenerationAnalytics} from './qa/analytics.js';
import {GenerationTelemetry} from './qa/telemetry.js';
import {structuralBandOf} from './qa/structure.js';
import {NoveltyScheduler, CORE} from './compose/novelty.js';
import {BlueprintScheduler, capacityFor} from './compose/blueprint-scheduler.js';
import {blueprintFor, blueprintId, presentationOf} from './compose/blueprints.js';
import {JourneyMemory, keysOf} from './compose/diversity-history.js';
import {entityWordsIn} from './compose/entities.js';

import {generateSequences} from './families/sequences.js';
import {generateRatios} from './families/ratios.js';
import {generatePercentages} from './families/percentages.js';
import {generateAverages} from './families/averages.js';
import {generateAges} from './families/ages.js';
import {generateSpeed} from './families/speed.js';
import {generateWorkTime} from './families/work_time.js';
import {generateMachines} from './families/machines.js';
import {generateDirectProportion} from './families/direct_proportion.js';
import {generateFractions} from './families/fractions.js';
import {generateUnitRate} from './families/unit_rate.js';
import {generateCombinedRate} from './families/combined_rate.js';
import {generateRelational} from './families/relational.js';
import {generateCalendar} from './families/calendar.js';
import {generateOddOneOut} from './families/odd_one_out.js';
import {generateProfitLoss} from './families/profit_loss.js';

/**
 * RC2-021. The single authoritative engine version. Every other place that
 * shows a version — the report footer, the UI pill, the generator manifest,
 * the audit manifests — derives from this constant. Two stale literals
 * (report.js and index.html) were what the RC1 audit caught.
 */
// RC2.9 moved the minor: `generatePractice` accepts a `diversityHistory` and
// returns the history to carry forward, which is a new term in the contract
// between the product and the engine. Nothing already published changes shape.
//
// RC2.9.1 moves the patch. The contract is unchanged — what changed is that the
// APPLICATION now honours it, and that four Arabic renderer defects are fixed,
// so the same seed renders different text and callers should be able to tell.
export const ENGINE_VERSION = '1.5.1';

const GENERATORS = {
  sequences: generateSequences,
  ratios: generateRatios,
  percentages: generatePercentages,
  averages: generateAverages,
  ages: generateAges,
  speed: generateSpeed,
  work_time: generateWorkTime,
  machines: generateMachines,
  direct_proportion: generateDirectProportion,
  fractions: generateFractions,
  unit_rate: generateUnitRate,
  combined_rate: generateCombinedRate,
  relational: generateRelational,
  calendar: generateCalendar,
  odd_one_out: generateOddOneOut,
  profit_loss: generateProfitLoss
};

const PIPELINE_STAGES = [
  'text_matches_params', 'mathematics_oracle', 'unique_answer', 'ambiguity',
  'pedagogy', 'misconception_context', 'feedback_truthfulness', 'language', 'explanation',
  'distractors', 'fingerprint'
];

const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

function summarizeReasons(reasons) {
  const out = {};
  for (const r of reasons) out[r] = (out[r] || 0) + 1;
  return out;
}

const MIXED_DIFFICULTY_WEIGHTS = [
  {value:'easy', weight:0.25},
  {value:'medium', weight:0.60},
  {value:'hard', weight:0.15}
];

export class NumericalQuestionGeneratorEngine {
  constructor(config = {}) {
    this.version = ENGINE_VERSION;
    this.config = {
      maxGenerationAttempts: config.maxGenerationAttempts ?? 50,
      defaultDifficulty: config.defaultDifficulty ?? 'mixed',
      defaultCount: config.defaultCount ?? 10,
      targetTimeSeconds: config.targetTimeSeconds ?? {easy:35, medium:55, hard:80},
      // Section 13-B: targets, not hard ceilings. When the stock of distinct
      // templates cannot meet them the session reports a diversity warning
      // instead of spinning in a retry loop.
      preferredTemplateRepeatsPer50: config.preferredTemplateRepeatsPer50 ?? 2,
      // The ceiling a single-difficulty session may reach before the engine
      // reports a diversity limitation rather than quietly repeating further.
      maxTemplateRepeatsPerSession: config.maxTemplateRepeatsPerSession ?? 3,
      // RC2.2-4. How often one reasoning path may recur. The floor is set by
      // arithmetic, not taste: the hard band offers 45 distinct paths and a
      // session asks for 50, so the best achievable maximum is ceil(50/45) = 2.
      // Three leaves the scheduler room to satisfy the other constraints; the
      // batch allowance is proportionate to five sessions rather than five times
      // as permissive.
      maxReasoningRepeatsPerSession: config.maxReasoningRepeatsPerSession ?? 3,
      maxReasoningRepeatsPerBatch: config.maxReasoningRepeatsPerBatch ?? 5,
      // RC2.3-5. The per-session cap above counts a VARIANT — a template paired
      // with the quantity it asks for — so a template that can be asked three
      // ways was free to appear nine times in fifty. Measured on RC2.3 hard
      // sessions it did exactly that, and no diversity warning was raised
      // because no variant had exceeded anything.
      //
      // Different asked-unknowns are genuinely different reasoning, so the
      // variant cap is right and stays. What it does not bound is how much of a
      // session one template's SURFACE can occupy, and that is what a reader
      // notices. Four in fifty is one in twelve, which needs thirteen distinct
      // structures to fill a session — a floor the coverage check below enforces
      // up front rather than discovering at question forty.
      maxTemplateIdRepeatsPerSession: config.maxTemplateIdRepeatsPerSession ?? 4,
      slidingWindow: config.slidingWindow ?? 20,
      preferredRepeatsPerWindow: config.preferredRepeatsPerWindow ?? 1,
      // RC2.8-3. Raised from 24. The retry budget is now spent very differently:
      // an ordinary slot takes ONE candidate, because the idea was chosen before
      // anything was rendered, so the budget is only drawn on where a slot is
      // genuinely hard to fill — the fifth session of a long batch, a band near
      // its ceiling. Twenty-four was enough to work through twelve ideas at two
      // seeds each; thirty-six reaches eighteen, which is what the last session
      // of a 230-question sitting needs before the batch's shared allowances are
      // exhausted. It relaxes no bar: every retry is still judged by the same
      // controls, and a slot that cannot be filled is still refused.
      diversityAttempts: config.diversityAttempts ?? 36,
      // Section 13-C: a small, non-persistent memory of recent sessions.
      recentFingerprintMemory: config.recentFingerprintMemory ?? 150
    };
    this.analytics = new GenerationAnalytics();
    // RC2-003: one telemetry object spanning every rejection stage.
    this.telemetry = new GenerationTelemetry();
    this._recentFingerprints = [];
  }

  /** Section 6 / 45: the rejection and latency figures behind the published items. */
  getAnalytics() {
    return this.analytics.snapshot();
  }

  /** RC2-003: the reconciled rejection telemetry across every stage. */
  getTelemetry() {
    return this.telemetry.snapshot();
  }

  resetTelemetry() {
    this.telemetry.reset();
  }

  resetAnalytics() {
    this.analytics = new GenerationAnalytics();
  }

  listFamilies() {
    return FAMILY_REGISTRY.map(x => ({...x}));
  }

  listDifficulties() {
    return [
      {id:'easy', ar:'سهل'},
      {id:'medium', ar:'متوسط'},
      {id:'hard', ar:'صعب'},
      {id:'mixed', ar:'مختلط'},
      {id:'adaptive', ar:'تكيفي'}
    ];
  }

  normalizeFamily(input = 'random') {
    const key = FAMILY_ALIASES[input] || FAMILY_ALIASES[String(input).trim()] || input;
    if (key === 'random') return 'random';
    if (!FAMILY_MAP[key]) throw new Error(`Unknown family: ${input}`);
    return key;
  }

  resolveDifficulty(input, rng, adaptiveStats = null) {
    const d = input || this.config.defaultDifficulty;
    if (['easy','medium','hard'].includes(d)) return d;
    if (d === 'mixed') return rng.weightedPick(MIXED_DIFFICULTY_WEIGHTS);
    if (d === 'adaptive') return this.recommendDifficulty(adaptiveStats || {});
    throw new Error(`Unknown difficulty: ${d}`);
  }

  recommendDifficulty(stats = {}) {
    const attempts = Number(stats.attempts ?? stats.count ?? 0);
    const accuracy = Number(stats.accuracy ?? (attempts ? (stats.correct ?? 0) / attempts : 0.7));
    const streak = Number(stats.correctStreak ?? 0);
    const avgTime = Number(stats.avgTimeSeconds ?? 60);
    const current = stats.currentDifficulty || 'medium';

    if (attempts < 3) return current === 'hard' ? 'medium' : current;
    if ((accuracy >= 0.85 && streak >= 2 && avgTime <= 70) || accuracy >= 0.92) return 'hard';
    if (accuracy < 0.55 || (stats.wrongStreak ?? 0) >= 2) return 'easy';
    return 'medium';
  }

  deriveAdaptiveStats(history = []) {
    const recent = history.slice(-8);
    const attempts = recent.length;
    const correct = recent.filter(x => x.correct === true).length;
    const accuracy = attempts ? correct / attempts : 0.7;
    const timed = recent.map(x => Number(x.timeSeconds)).filter(Number.isFinite);
    const avgTimeSeconds = timed.length ? timed.reduce((a,b)=>a+b,0) / timed.length : 60;
    let correctStreak = 0;
    let wrongStreak = 0;
    for (let i=recent.length-1; i>=0; i--) {
      if (recent[i].correct === true && wrongStreak === 0) correctStreak++;
      else if (recent[i].correct === false && correctStreak === 0) wrongStreak++;
      else break;
    }
    const currentDifficulty = recent.at(-1)?.difficulty || 'medium';
    return {attempts, correct, accuracy, avgTimeSeconds, correctStreak, wrongStreak, currentDifficulty};
  }

  generateAdaptiveQuestion(options = {}) {
    const history = Array.isArray(options.history) ? options.history : [];
    const stats = this.deriveAdaptiveStats(history);
    const recommended = this.recommendDifficulty(stats);
    // RC2.2-1. A named family may not be able to produce the recommended band —
    // fractions computes easy and nothing else. Recommending a band the family
    // cannot reach would fail the request outright, so the recommendation is
    // met as closely as the family allows rather than demanded of it. With no
    // family named, capability-aware selection in generateQuestion handles it.
    const named = options.family && options.family !== 'random' ? this.normalizeFamily(options.family) : null;
    const can = named ? (FAMILY_MAP[named]?.difficulties ?? []) : null;
    const ORDER = ['easy', 'medium', 'hard'];
    let difficulty = recommended;
    if (can && can.length && !can.includes(recommended)) {
      const want = ORDER.indexOf(recommended);
      difficulty = [...can].sort((a, b) =>
        Math.abs(ORDER.indexOf(a) - want) - Math.abs(ORDER.indexOf(b) - want))[0];
    }
    return this.generateQuestion({
      ...options,
      difficulty,
      adaptiveStats: stats,
      seed: options.seed ?? makeSeed('NUMADAPT')
    });
  }

  /**
   * Section 5. Generate, validate, and on rejection regenerate with a fresh
   * draw — never repair a candidate in place. When the attempts are exhausted
   * the engine raises a structured error rather than publishing a broken item.
   */
  generateQuestion(options = {}) {
    const requestedSeed = options.seed ?? makeSeed('NUMQ');
    const familyInput = this.normalizeFamily(options.family ?? 'random');
    const rejections = [];
    let lastTemplate = null;
    let lastFamily = familyInput;
    const startedAt = now();

    for (let attempt = 0; attempt < this.config.maxGenerationAttempts; attempt++) {
      const seed = attempt === 0 ? requestedSeed : `${requestedSeed}|retry:${attempt}`;
      const rng = new SeededRNG(seed);
      // RC2.2-1. When the caller does not name a family, choose among families
      // that can actually produce the requested band. Picking blind and letting
      // the draw fail wastes attempts and fills telemetry with failures that
      // were predictable before the draw.
      const wanted = options.difficulty ?? this.config.defaultDifficulty;
      const capable = wanted === 'mixed'
        ? FAMILY_REGISTRY
        : FAMILY_REGISTRY.filter(f => f.difficulties.includes(wanted));
      const family = familyInput === 'random'
        ? rng.pick(capable.length ? capable : FAMILY_REGISTRY).id
        : familyInput;
      lastFamily = family;
      const difficulty = this.resolveDifficulty(
        options.difficulty ?? this.config.defaultDifficulty,
        rng.fork('difficulty'),
        options.adaptiveStats
      );
      const generator = GENERATORS[family];

      this.telemetry.proposal({family, seed, attempt: attempt + 1});
      let base;
      try {
        base = generator({
          difficulty, rng: rng.fork('content'), seed, engineVersion: this.version,
          telemetry: this.telemetry,
          // RC2.8-2. The blueprint the scheduler decided on, when there is one.
          // Without a pin this is null and the draw is exactly what it was.
          pinTemplate: options.templateId ?? null,
          // RC2.8-2. And WHICH unknown the blueprint wants asked, where the
          // template can ask more than one.
          pinTargets: options.targets ?? null
        });
      } catch (err) {
        // RC2.8-2. A pin the family cannot honour is a caller error, not a bad
        // draw: retrying it 12 times produces 12 identical failures and then an
        // exhaustion that names the wrong cause.
        if (err.code === 'TEMPLATE_PIN_UNAVAILABLE') throw err;
        // RC2.2-1. A thrown error carries a code; use the declared reason it
        // maps to rather than minting a new one from its message.
        const reasonCode = err.reason
          || (err.code && REASON[err.code] ? REASON[err.code] : null)
          || `GENERATOR_ERROR:${err.message}`;
        rejections.push(reasonCode);
        // RC2-003: RC1 recorded nothing here at all.
        this.telemetry.samplerFailure({reasonCode, family, seed, attempt: attempt + 1});
        this.analytics.record(family, null, difficulty, {accepted: false, reasons: [reasonCode]});
        continue;
      }
      lastTemplate = base.template_id;

      let q;
      try {
        q = finalizeQuestion(base, rng.fork('options'), options.preferredCorrectLetter ?? null);
      } catch (err) {
        // Not enough distractors with real provenance: reject, do not pad.
        const reasonCode = err.reason || REASON.DISTRACTOR_NO_MISCONCEPTION;
        rejections.push(reasonCode);
        this.telemetry.finalizationFailure({family, templateId: base.template_id, reasonCode, seed, attempt: attempt + 1});
        this.analytics.record(family, base.template_id, difficulty, {accepted: false, reasons: [reasonCode]});
        continue;
      }

      q.metadata.family_description = FAMILY_MAP[family].description;
      q.metadata.blueprint_family = FAMILY_MAP[family].category;

      // RC2.2-1. The difficulty release gate. A question asked for at a band is
      // only released at that band: no item may go out labelled HARD whose
      // computed difficulty is medium or easy, and none may go out labelled
      // easier than it is either. The published label is already the computed
      // one, so this checks the remaining gap — between what was ASKED for and
      // what the draw actually produced — and resamples rather than releasing a
      // mismatch. Exhaustion is an explicit failure, never a quieter item.
      if (difficulty !== 'mixed' && q.difficulty !== difficulty) {
        this.telemetry.pipelineRejectedCandidate();
        this.telemetry.pipelineRejection({
          family, templateId: base.template_id, reasonCode: REASON.DIFFICULTY_BAND_MISMATCH,
          seed, attempt: attempt + 1,
          detail: `asked ${difficulty}, computed ${q.difficulty} (${q.metadata.complexity_score})`
        });
        continue;
      }

      const verdict = validateCandidate(base, q);
      this.analytics.record(family, base.template_id, difficulty, {accepted: verdict.valid, reasons: verdict.reasons});
      if (!verdict.valid) {
        this.telemetry.pipelineRejectedCandidate();
        for (const reasonCode of verdict.reasons) {
          this.telemetry.pipelineRejection({family, templateId: base.template_id, reasonCode, seed, attempt: attempt + 1});
        }
      } else {
        this.telemetry.published({family, templateId: base.template_id, seed, attempt: attempt + 1});
      }

      if (verdict.valid) {
        q.metadata.quality_gate = 'passed';
        q.metadata.validation_meta = {
          attempts: attempt + 1,
          checks_passed: PIPELINE_STAGES,
          realism_kind: base.realism ? 'editorial_realism_constraint' : null,
          realism_warnings: verdict.details.realismSoftWarnings || [],
          equations_checked: verdict.details.equationsChecked ?? 0,
          oracle: verdict.details.oracle ?? null,
          generation_ms: Math.round((now() - startedAt) * 1000) / 1000
        };
        this.analytics.recordPublished(family, base.template_id, difficulty, attempt + 1, now() - startedAt);
        return q;
      }
      rejections.push(...verdict.reasons);
    }

    const summary = summarizeReasons(rejections);
    this.analytics.recordExhaustion(lastFamily, lastTemplate);
    // RC2-003: RETRY_EXHAUSTED had no emission site in RC1. It has one now.
    this.telemetry.exhaustion({family: lastFamily, templateId: lastTemplate, seed: requestedSeed, attempt: this.config.maxGenerationAttempts});
    const error = new Error(`QUESTION_GENERATION_EXHAUSTED: ${lastFamily}/${lastTemplate} — ${Object.keys(summary).join(', ')}`);
    error.code = 'QUESTION_GENERATION_EXHAUSTED';
    error.family = lastFamily;
    error.templateId = lastTemplate;
    error.rejectionReasonsSummary = summary;
    throw error;
  }

  /**
   * Section 13-B / 41. Builds a session.
   *
   * Duplicate protection is absolute: the same fingerprint, the same item with
   * its choices shuffled, and the same parameter set under the same reasoning
   * graph all collide and are refused. Template repetition is a *target* — when
   * the stock of distinct templates cannot meet it (a fifty-question hard-only
   * session, say), the session carries a diversity warning instead of spinning
   * in a retry loop that cannot terminate.
   */
  generatePractice(options = {}) {
    const count = Math.max(1, Math.min(100, Number(options.count ?? this.config.defaultCount)));
    const seed = options.seed ?? makeSeed('NUMSET');
    const rng = new SeededRNG(seed);
    const selectedFamilies = this._resolveFamilyPool(options);
    const requestedDifficulty = options.difficulty ?? this.config.defaultDifficulty;
    const difficultySchedule = this._buildDifficultySchedule(
      requestedDifficulty, count, rng.fork('difficulty'), options.adaptiveStats
    );
    // RC2.2-1. Session selection is difficulty-aware. A family is only
    // scheduled into a slot whose band it can actually produce — the registry's
    // `difficulties` is a capability now, not an aspiration. Before this, a hard
    // session scheduled calendar and odd-one-out slots that no draw could ever
    // satisfy, and the choice was between failing the session and quietly
    // handing back an easier item. Neither is necessary: schedule only what can
    // be produced, and fail only when NOTHING can produce the band.
    const eligibleFamilies = band => (band === 'mixed' ? selectedFamilies
      : selectedFamilies.filter(f => (FAMILY_MAP[f]?.difficulties ?? []).includes(band)));
    // RC2.3-2. Coverage is checked before a single question is drawn.
    //
    // The instruction is that a hard quota is never filled with easier
    // templates, and that when there is not enough genuinely hard and diverse
    // material the engine fails explicitly instead. Both halves matter: the
    // first is now structural — a hard slot can only draw a HARD_CAPABLE
    // template — and the second is this.
    //
    // Discovering the shortage at question forty-three, after hundreds of
    // discards, and then relaxing a cap to finish, is the silent filling this
    // release exists to stop. The arithmetic is knowable in advance: a session
    // of `count` questions in one band needs at least
    // ceil(count / maxTemplateIdRepeatsPerSession) distinct structures at that
    // band. When it does not have them, it says so, and says which families hold
    // nothing at that band.
    for (const band of new Set(difficultySchedule)) {
      const slots = difficultySchedule.filter(b => b === band).length;
      const cov = this.bandCoverage(band, selectedFamilies);
      const needed = Math.ceil(slots / this.config.maxTemplateIdRepeatsPerSession);
      if (cov.distinctTemplates < needed) {
        throw Object.assign(
          new Error(
            `INSUFFICIENT_BAND_COVERAGE: ${slots} ${band} slots need ${needed} distinct structures, ` +
            `the selected families hold ${cov.distinctTemplates} ` +
            `(families with none at ${band}: ${cov.familiesWithout.join(', ') || 'none'})`
          ),
          {code: 'INSUFFICIENT_BAND_COVERAGE', band, slots, needed, ...cov}
        );
      }
    }
    const familySchedule = this._buildFamilyScheduleForDifficulties(
      selectedFamilies, difficultySchedule, rng.fork('families')
    );
    const letterSchedule = options.balanceAnswerLetters === false
      ? Array(count).fill(null)
      : buildBalancedLetterSchedule(count, rng.fork('letters'));

    // RC2.1-5. A caller generating several sessions as one batch (a mock exam)
    // passes a shared Set so the same mathematical instance cannot appear twice
    // across it. Omitted, behaviour is exactly as before: a lone session is
    // still a pure function of its own seed.
    const batchFingerprints = options.batchFingerprints ?? null;
    let sessionCandidates = 0;
    const questions = [];
    const fingerprints = new Set();
    // Section 41: a template asked in a genuinely different direction counts as
    // diversity, while changing only the names or the numbers does not. So the
    // repetition preference is measured on (template, asked unknown), which is
    // what keeps a family holding a single hard template from filling its slots
    // with the same reasoning over and over.
    const variantCounts = new Map();
    const templateCounts = new Map();
    const reasoningCounts = new Map();
    const batchReasoningCounts = options.batchReasoningCounts ?? null;
    const recentVariants = [];
    const diversityWarnings = [];
    // RC2.7-5. The novelty scheduler. It binds what the older caps could not:
    // the exact combination of reasoning, construction, target and stem; how
    // similar two CONSECUTIVE questions may be; and how far one construction,
    // target, scenario, entity pattern or sentence shape may spread through a
    // session. It never bypasses itself — a candidate delivered against its
    // judgement is delivered as a recorded breach, the same way the template
    // and reasoning caps report theirs.
    const novelty = new NoveltyScheduler(count, undefined,
      options.batchEntityCounts ?? null, options.batchQuestionCount ?? null,
      options.batchCoreConstructions ?? null, options.batchReasoningTargets ?? null);
    // RC2.8-3. The semantic plan, decided before anything is rendered.
    //
    // This is the inversion the release is about. The loop below used to draw a
    // question and then ask whether it was too similar to what it already had —
    // 621 candidates for 100 published questions, and the repetition still
    // landed, because a filter cannot aim at what a session is short of. The
    // scheduler picks the IDEA for every slot first, over the 159 blueprints in
    // src/compose/blueprints.js, balancing jobs, layouts and families and
    // backtracking when a slot has nothing admissible. The renderer is then told
    // which blueprint to realise.
    //
    // Difficulty is untouched: the band of every slot is the band the difficulty
    // schedule already decided, and the planner may not move one.
    // RC2.9-1. What this user has already solved, in earlier sessions of the
    // same journey.
    //
    // A session is fifty questions and a user who wants a hundred sits two, so
    // the second call used to start the planner from an empty page: every idea
    // the first session spent was eligible again. Measured through the product's
    // own entry, 34 of the second fifty repeated something already solved, and
    // the first repeat landed at Q51.
    //
    // The memory is a VALUE the caller hands in and gets back — never a field
    // on the engine — so an omitted history behaves exactly as this engine did
    // before, and a journey that is continued does not restart. It is consumed
    // HERE, before a single blueprint is allocated, rather than used to reject
    // candidates after they have been rendered.
    const journey = new JourneyMemory(options.diversityHistory);
    // Where this sitting sits in the journey. Every cooldown is measured from a
    // question's absolute position, so the first slot of a third sitting is
    // Q101 and not Q1 — which is what lets an idea from Q1 expire exactly there.
    const journeyStart = journey.questionsSeen;
    const blueprints = new BlueprintScheduler({
      bandSchedule: difficultySchedule,
      familyPreference: familySchedule,
      familyPool: selectedFamilies,
      rng: rng.fork('blueprints'),
      // The ideas this user has met before are not eligible again while the
      // pool holds any they have not.
      journey,
      recentBlueprints: options.recentBlueprints instanceof Set ? options.recentBlueprints : null,
      batchPresentations: options.batchPresentations ?? null,
      batchBlueprints: options.batchBlueprints ?? null,
      batchCount: options.batchQuestionCount ?? null
    });
    // RC2.8-4. Which mathematical ideas each family has already shown.
    //
    // The family acceptance rule asks a family seen four times or more to show
    // at least two genuinely different IDEAS, not just two different jobs. The
    // blueprint plan guarantees different jobs; it cannot see the idea, because
    // that depends on the graph or the equation the draw produces — two
    // orderings can be a chain and a branched partial order under one template.
    // So the idea is checked after rendering, as a staged preference: honoured
    // while there is another shape to be had, given up rather than failing the
    // slot.
    const familySubIdeas = new Map();
    const blueprintPlan = blueprints.plan();
    if (!blueprintPlan.complete) {
      // The shortfall is named with the arithmetic behind it rather than filled
      // with reskins. `capacityFor` says how many distinct ideas each band of
      // this request actually holds.
      throw Object.assign(
        new Error(
          `INSUFFICIENT_CONSTRUCTION_BREADTH: ${blueprintPlan.filled} of ${count} slots could be `
          + 'planned with a distinct question idea. '
          + capacityFor(difficultySchedule, selectedFamilies)
            .map(c => `${c.band}: ${c.slots} slots against ${c.blueprints} ideas`).join('; ')
          + '. Add genuine constructions; no diversity control was relaxed to produce this.'
        ),
        {
          code: 'INSUFFICIENT_CONSTRUCTION_BREADTH',
          delivered: blueprintPlan.filled, requested: count,
          distinctCoreConstructions: blueprintPlan.distinctBlueprints,
          capacity: capacityFor(difficultySchedule, selectedFamilies)
        }
      );
    }
    blueprints.beginRealization();
    const blueprintEvents = [];
    // RC2-004. Two generation modes, named and documented, because the RC1
    // engine silently had both and called the result reproducible.
    //
    //   DETERMINISTIC_SINGLE_GENERATION (default)
    //     The session is a pure function of its declared inputs. Nothing the
    //     engine generated earlier can change it, so the same seed replays
    //     identically in a fresh engine, in a long-lived one, and after any
    //     number of unrelated generations. This is what audit and replay need.
    //
    //   STATEFUL_SESSION_GENERATION (opt in)
    //     The engine additionally avoids fingerprints it produced in recent
    //     sessions. Useful for a learner working through several sessions in one
    //     sitting, and NOT reproducible from the seed alone — by design, since
    //     the engine's own history is an input.
    //
    // RC1 defaulted to the stateful behaviour, which is why the same seed gave
    // different questions depending on what the engine had done before.
    const mode = options.mode
      ?? (options.useRecentSessionMemory === true ? 'STATEFUL_SESSION_GENERATION' : 'DETERMINISTIC_SINGLE_GENERATION');
    if (!['DETERMINISTIC_SINGLE_GENERATION', 'STATEFUL_SESSION_GENERATION'].includes(mode)) {
      throw new Error(`Unknown generation mode: ${mode}`);
    }
    const useRecentMemory = mode === 'STATEFUL_SESSION_GENERATION';

    for (let i = 0; i < count; i++) {
      let chosen = null;
      let relaxed = null;
      // Section 13-B / 17-C. The repetition preference is relaxed in stages
      // rather than abandoned: the sliding window first, then the per-session
      // cap up to the hard ceiling, and only past that is the item accepted
      // with a diversity warning.
      const stages = [
        {cap: this.config.preferredTemplateRepeatsPer50, window: this.config.preferredRepeatsPerWindow},
        {cap: this.config.maxTemplateRepeatsPerSession, window: this.config.preferredRepeatsPerWindow},
        {cap: this.config.maxTemplateRepeatsPerSession, window: Infinity}
      ];
      // RC2.8-3. The ideas this slot may be filled with, best first: the one the
      // plan chose, then the alternatives that are still admissible against what
      // has ACTUALLY been published — which can differ from the plan, because a
      // pinned template can exhaust its parameter space on a given seed.
      //
      // Two seeds are spent on each idea before moving to the next, so a slot
      // works through twelve genuinely different ideas within the same retry
      // budget the old loop spent rotating families and hoping.
      const plannedBlueprint = blueprintPlan.plan[i];
      // Ideas the PLAN has reserved for later slots. Taking one of them here
      // because this slot's own idea is momentarily unavailable is how a single
      // substitution cascades into a session that cannot be finished: the plan
      // proved 100 slots were fillable, and then realization spent slot 84's
      // material at slot 40. Alternatives are drawn from outside the reservation
      // first, and only from inside it when there is nothing else.
      const reserved = new Set(blueprintPlan.plan.slice(i + 1).filter(Boolean).map(blueprintId));
      reserved.add(blueprintId(plannedBlueprint));
      const free = blueprints.admissibleAt(i, reserved).blueprints;
      const fromReserve = blueprints.admissibleAt(i, new Set([blueprintId(plannedBlueprint)])).blueprints
        .filter(b => reserved.has(blueprintId(b)));
      const alternatives = [...free, ...fromReserve];
      // The plan leads only while it is still admissible. An earlier slot that
      // fell through to an alternative can have spent the quota this slot's
      // planned idea was counting on, and following the plan regardless is how
      // a presentation cluster grows past its cap.
      const slotBlueprints = (blueprints.stillAdmissible(i, plannedBlueprint)
        ? [plannedBlueprint, ...alternatives]
        : [...alternatives, plannedBlueprint]
      ).slice(0, Math.ceil(this.config.diversityAttempts / 2));
      const SEEDS_PER_BLUEPRINT = 2;
      // RC2.9.2. How long it is worth looking. When every construction this
      // band can offer is still inside its cooldown, the guard below will
      // refuse all of them and the search is already over; the slot takes its
      // fallback after a short look instead of rendering three dozen questions
      // that cannot be published. Nothing is relaxed by this — the same
      // candidate is delivered either way.
      const budget = blueprints.hasFreeConstructionAt(i)
        ? this.config.diversityAttempts
        : Math.min(this.config.diversityAttempts, SEEDS_PER_BLUEPRINT * 3);
      for (let retry = 0; retry < budget; retry++) {
        const stage = stages[Math.min(stages.length - 1, Math.floor(retry / Math.ceil(this.config.diversityAttempts / stages.length)))];
        // Cycled, not clamped. Late in a single-band session most ideas are
        // already spent and this list is short; stopping on its last entry meant
        // the remaining twenty retries all redrew one idea, and a slot failed
        // with other ideas in the list untried. Cycling spends the retry budget
        // across everything still admissible.
        const bp = slotBlueprints[Math.floor(retry / SEEDS_PER_BLUEPRINT) % slotBlueprints.length];
        let q;
        try {
          q = this.generateQuestion({
            family: bp.family,
            templateId: bp.templateId,
            targets: bp.targets,
            difficulty: difficultySchedule[i],
            seed: `${seed}|Q${i + 1}|${retry}`,
            preferredCorrectLetter: letterSchedule[i],
            adaptiveStats: options.adaptiveStats
          });
        } catch (err) {
          if ((err.code === 'QUESTION_GENERATION_EXHAUSTED' || err.code === 'TEMPLATE_PIN_UNAVAILABLE')
            && retry < budget - 1) continue;
          throw err;
        }
        // RC2.1-1. Counted here, where the session builder actually receives a
        // published candidate, so the session identity below has an independent
        // witness rather than being derived from its own operands.
        this.telemetry.sessionCandidate();
        sessionCandidates++;
        const fingerprint = questionSignature(q);
        // Absolute rules: never publish the same reasoning twice in a session,
        // however the choices happen to be ordered.
        // RC2-022: `fingerprint` here is the semantic fingerprint, so two
        // display permutations of one mathematical instance collide.
        if (fingerprints.has(fingerprint)) {
          this.telemetry.sessionDiscard({family: q.family, templateId: q.generator_id, reasonCode: REASON.DUPLICATE_FINGERPRINT, seed, attempt: retry + 1});
          continue;
        }
        // RC2.1-5. The batch set, when one is supplied, is the same semantic
        // fingerprint compared across every session of one multi-session batch.
        // It is the mathematical instance that must not repeat, not the display
        // order — holdout B shipped three pairs that were the same question with
        // the options shuffled. Ordinary template reuse is untouched: two
        // different instances of one template collide on neither fingerprint.
        if (batchFingerprints && batchFingerprints.has(fingerprint)) {
          this.telemetry.sessionDiscard({family: q.family, templateId: q.generator_id, reasonCode: REASON.SESSION_BATCH_DUPLICATE, seed, attempt: retry + 1});
          continue;
        }
        // RC2.1-1. Was a bare `continue` before RC2.1.
        if (useRecentMemory && this._recentFingerprints.includes(fingerprint)) {
          this.telemetry.sessionDiscard({family: q.family, templateId: q.generator_id, reasonCode: REASON.SESSION_RECENT_MEMORY, seed, attempt: retry + 1});
          continue;
        }
        // RC2-023: and never publish the same reasoning *pattern* twice in a
        // session either. A template that declares no pattern has a null
        // signature and is governed by the semantic check alone, so unrelated
        // questions are not collapsed together.
        const variant = `${q.generator_id}|${q.metadata?.asked_unknown ?? 'default'}`;
        const used = variantCounts.get(variant) || 0;
        const usedTemplate = templateCounts.get(q.generator_id) || 0;
        const inWindow = recentVariants.slice(-this.config.slidingWindow)
          .filter(t => t === variant).length;
        // Keep the best fallback seen so far: one that still respects the hard
        // ceiling is preferred over one that does not.
        // RC2.3-5 / RC2.4. The fallback prefers a candidate that respects the
        // ceilings, and the share cap is one of them: without this the fallback
        // bypassed it exactly as it once bypassed the reasoning cap, and the
        // fifth session of an all-hard batch put one template in five slots
        // against a cap of four.
        const within = c => c.used < this.config.maxTemplateRepeatsPerSession
          && c.usedTemplate < this.config.maxTemplateIdRepeatsPerSession;
        // RC2.7-R2. A candidate that repeats a core construction is not a
        // fallback at any price, so it is never promoted to one here either.
        // This branch runs BEFORE the novelty assessment below, and without the
        // guard a core repeat could be parked as `relaxed` and delivered later
        // without the assessment ever being consulted.
        // RC2.8-3. The idea this FINISHED question actually realises, checked
        // against the session's hard limits before anything else looks at it.
        // A pinned template does not always deliver the job it was asked for —
        // a sequence with no whole predecessor cannot be asked backwards — and
        // the question then belongs to a presentation this slot may have no
        // room for. Checked here rather than at selection, because this is
        // where what the reader will see is finally known.
        const realizedBlueprint = blueprintFor(
          q.generator_id, q.metadata?.task_signature ?? '?', q.family,
          difficultySchedule[i], q.metadata?.information_structure ?? 'DIRECT_GIVENS'
        );
        // RC2.9-3. Has this user already solved this exact question, or this
        // exact construction, in an earlier session of the same journey?
        //
        // Checked on the FINISHED item, because that is where the stem and the
        // perceptual identity are finally known, and checked on every retry.
        //
        // RC2.9.2. The question is how RECENTLY, not whether ever. Both
        // identities carry a cooldown measured from the position this slot is
        // being asked at, so an idea whose window has closed passes here the
        // same way it passes the planner.
        const journeyStem = q.metadata?.normalized_stem_identity ?? null;
        const journeyPerceptual = q.metadata?.user_perceptual_signature ?? null;
        const atPosition = journeyStart + i + 1;
        // The STEM is checked against everything, this sitting included: the
        // same sentence twice is the most visible repeat there is. The
        // CONSTRUCTION is checked against earlier sittings, because how often
        // one may appear inside a single sitting is the scheduler's cluster
        // cap, and two controls answering the same question differently is how
        // a planner ends up asking for what a guard will refuse.
        const inCooldown = journey.isProtected('stem', journeyStem, atPosition) ? 'stem'
          : journey.carriedIn('perceptual', journeyPerceptual, atPosition) ? 'perceptual'
          : null;
        if (inCooldown) {
          this.telemetry.sessionDiscard({
            family: q.family, templateId: q.generator_id,
            reasonCode: REASON.NOVELTY_CORE_CONSTRUCTION_REPEAT, seed, attempt: retry + 1,
            detail: `JOURNEY: ${inCooldown} still inside its cooldown`
          });
          // A STEM is never relaxed: the same sentence twice is the most
          // visible repeat there is, and stems are plentiful. A CONSTRUCTION is
          // kept as the last resort the slot falls back on, so a journey whose
          // pool is momentarily thin delivers a slightly older idea instead of
          // refusing the sitting. The acceptance run reports how often this
          // fires, and it is expected to be zero.
          //
          // It is kept ONLY if this session could deliver it anyway. The core
          // construction rule inside a sitting is absolute — `novelty.accept`
          // throws rather than publish a repeat of it — so a fallback that
          // ignored that would trade a refused session for a thrown one.
          // RC2.9.2. When the slot has to fall back, it falls back on the idea
          // the user met LONGEST ago, not on whichever refusal came first. The
          // distance is reported in the session, so «the cooldown held except
          // here, and here it was ninety-seven questions back» is a statement a
          // reviewer can check rather than take on trust.
          if (inCooldown === 'perceptual' && novelty.assess(q).level !== CORE) {
            const lastSeen = journey.lastSeen('perceptual', journeyPerceptual);
            const distance = lastSeen == null ? Infinity : atPosition - lastSeen;
            if (!relaxed || (relaxed.journeyRefusal && distance > relaxed.journeyRefusal.distance)) {
              relaxed = {q, fingerprint, used, usedTemplate, variant, discardEvent: null,
                journeyRefusal: {dimension: 'perceptual', key: journeyPerceptual,
                  at: atPosition, lastSeen, distance}};
            }
          }
          continue;
        }
        const hardBreach = blueprints.hardViolation(i, realizedBlueprint);
        if (hardBreach) {
          this.telemetry.sessionDiscard({
            family: q.family, templateId: q.generator_id,
            reasonCode: REASON.NOVELTY_DIMENSION_DOMINANCE, seed, attempt: retry + 1,
            detail: `BLUEPRINT: ${hardBreach}`
          });
          continue;
        }
        const subIdea = q.metadata?.sub_idea_signature ?? null;
        const familySeen = familySubIdeas.get(q.family);
        if (subIdea && familySeen?.has(subIdea) && retry < Math.floor(this.config.diversityAttempts * 2 / 3)) {
          this.telemetry.sessionDiscard({
            family: q.family, templateId: q.generator_id,
            reasonCode: REASON.NOVELTY_DIMENSION_DOMINANCE, seed, attempt: retry + 1,
            detail: 'family_sub_idea: this family has already shown this mathematical idea'
          });
          continue;
        }
        const coreVerdict = novelty.assess(q);
        const candidate = {q, fingerprint, used, usedTemplate, variant, discardEvent: null};
        if (coreVerdict.level !== CORE
          && (!relaxed || relaxed.journeyRefusal || (!within(relaxed) && within(candidate)))) {
          // A candidate that is merely inside its journey cooldown is the worst
          // fallback available, so anything reaching here displaces it.
          relaxed = candidate;
        }
        // RC2.2-4. A CAP, not a ban. Before RC2.2 a reasoning signature existed
        // only where a template declared one — sequences alone, 15 of Holdout
        // C's 250 items — so the rule governed almost nothing and the same
        // reasoning repeated with only the numbers changed. The signature is
        // derived for every item now, and an absolute ban immediately became
        // infeasible: the hard band offers 45 distinct reasoning paths and a
        // hard session asks for 50 questions, so "never repeat" cannot be
        // satisfied and every hard session failed.
        //
        // Ordinary reuse is not a defect. Excessive parameter-only repetition
        // is. The cap is what separates them, at both levels.
        const structural = q.metadata?.structural_reasoning_signature ?? null;
        if (structural) {
          // The discard event is remembered on the fallback for the same reason
          // the cap branches do it: this candidate may still be delivered as the
          // relaxed fallback, and a candidate counted as both discarded and
          // delivered breaks the session identity by exactly the number of
          // fallbacks used.
          const usedHere = reasoningCounts.get(structural) ?? 0;
          if (usedHere >= this.config.maxReasoningRepeatsPerSession) {
            const ev = this.telemetry.sessionDiscard({family: q.family, templateId: q.generator_id, reasonCode: REASON.REPEATED_REASONING_PATTERN, seed, attempt: retry + 1});
            if (relaxed && relaxed.q === q) relaxed.discardEvent = ev;
            continue;
          }
          if (batchReasoningCounts) {
            const usedInBatch = batchReasoningCounts.get(structural) ?? 0;
            if (usedInBatch >= this.config.maxReasoningRepeatsPerBatch) {
              const ev = this.telemetry.sessionDiscard({family: q.family, templateId: q.generator_id, reasonCode: REASON.REPEATED_REASONING_PATTERN_IN_BATCH, seed, attempt: retry + 1});
              if (relaxed && relaxed.q === q) relaxed.discardEvent = ev;
              continue;
            }
          }
        }


        // Preferences: honoured when the stock allows, relaxed in stages when not.
        // RC2.1-1. Both were bare `continue`s before RC2.1, and between them they
        // accounted for most of the 104 undispositioned discards on holdout B.
        // A candidate rejected here may still be delivered later as the relaxed
        // fallback, so its event is remembered and withdrawn if that happens —
        // otherwise it would be counted as discarded AND delivered, and the
        // session identity would over-count by exactly the number of fallbacks.
        if (count <= 50 && used >= stage.cap) {
          const ev = this.telemetry.sessionDiscard({family: q.family, templateId: q.generator_id, reasonCode: REASON.SESSION_TEMPLATE_CAP, seed, attempt: retry + 1});
          if (relaxed && relaxed.q === q) relaxed.discardEvent = ev;
          continue;
        }
        // RC2.3-5. How much of the session one template's surface may occupy,
        // independently of how many ways it can be asked.
        if (usedTemplate >= this.config.maxTemplateIdRepeatsPerSession) {
          const ev = this.telemetry.sessionDiscard({family: q.family, templateId: q.generator_id, reasonCode: REASON.SESSION_TEMPLATE_SHARE_CAP, seed, attempt: retry + 1});
          if (relaxed && relaxed.q === q) relaxed.discardEvent = ev;
          continue;
        }
        if (inWindow >= stage.window) {
          const ev = this.telemetry.sessionDiscard({family: q.family, templateId: q.generator_id, reasonCode: REASON.SESSION_WINDOW_CAP, seed, attempt: retry + 1});
          if (relaxed && relaxed.q === q) relaxed.discardEvent = ev;
          continue;
        }
        // RC2.7-5. Last, because it is the finest of the controls: a candidate
        // that has satisfied every cap can still read as the question before it.
        //
        // And staged, for the same reason the template preference is staged. The
        // novelty controls are the newest and the strictest, and a veto that
        // holds to the last retry does not make a session more varied — it makes
        // the loop fall through to the relaxed fallback, which is free to breach
        // the OLDER caps that bound reasoning and template share. Vetoing for the
        // first two thirds of the budget keeps novelty binding in every ordinary
        // case and leaves the last third to the caps that were there first.
        // Whatever is finally delivered is re-assessed at commit, so a
        // relaxation here is still recorded rather than lost.
        // RC2.7-R2. CORE is assessed on EVERY retry and is never staged: the
        // independent review found 34 of 35 relaxations producing a
        // perceptually repetitive item, because under pressure the scheduler
        // relaxed the dimensions that decide whether a reader sees a new
        // question. Surface vetoes are still staged — binding for the first two
        // thirds of the budget, advisory after — because relaxing those is what
        // a session under pressure SHOULD do.
        const verdict = novelty.assess(q);
        const staged = retry < Math.floor(this.config.diversityAttempts * 2 / 3);
        if (!verdict.ok && (verdict.level === CORE || staged)) {
          const ev = this.telemetry.sessionDiscard({
            family: q.family, templateId: q.generator_id, reasonCode: verdict.reason,
            seed, attempt: retry + 1, detail: `${verdict.level}: ${verdict.dimension}`
          });
          if (relaxed && relaxed.q === q) relaxed.discardEvent = ev;
          // A candidate refused on a SURFACE dimension is still the best
          // fallback available if nothing better turns up. One refused on CORE
          // never is — delivering it is the reskin this release exists to stop —
          // so it is dropped from the fallback entirely.
          if (verdict.level === CORE) {
            if (relaxed && relaxed.q === q) relaxed = null;
          } else if (!relaxed || relaxed.noveltyRefusal) {
            relaxed = {q, fingerprint, used, usedTemplate, variant, discardEvent: ev, noveltyRefusal: verdict};
          }
          continue;
        }
        if (!verdict.ok) {
          // Past the staged window and surface-only: delivered, and recorded.
          chosen = {q, fingerprint, variant, noveltyRefusal: verdict};
          break;
        }
        chosen = {q, fingerprint, variant, noveltyRefusal: null};
        break;
      }

      if (!chosen) {
        if (!relaxed) {
          // RC2.7-R2. The review's instruction, made structural: when a session
          // cannot be filled without repeating a core construction, the session
          // is REFUSED and the shortfall named. Filling the remaining slots with
          // parameter reskins is what produced a 2.8/10 all-hard session, and
          // there is no longer a code path that can do it.
          throw Object.assign(
            new Error(
              `INSUFFICIENT_CONSTRUCTION_BREADTH: ${i} of ${count} slots filled before the pool of `
              + `distinct core constructions ran out (${novelty.coreConstructions.size} used). `
              + 'Add genuine constructions; the caps and the novelty controls were not relaxed.'
            ),
            {
              code: 'INSUFFICIENT_CONSTRUCTION_BREADTH', index: i + 1, delivered: i, requested: count,
              distinctCoreConstructions: novelty.coreConstructions.size,
              band: difficultySchedule[i],
              // RC2.8-3. Both refusal paths say how much material the request
              // actually has to work with, so a caller never has to guess
              // whether the shortfall is in this band or another.
              capacity: capacityFor(difficultySchedule, selectedFamilies)
            }
          );
        }
        chosen = relaxed;
        this.telemetry.withdrawSessionDiscard(relaxed.discardEvent);
        // RC2.2-4. The fallback used to bypass the reasoning caps entirely, so a
        // cap of three could still produce ten. It is still a fallback — the
        // session must be deliverable — but a breach is now recorded rather than
        // silent, so the cap means something even where it cannot be honoured.
        const relaxedSignature = relaxed.q.metadata?.structural_reasoning_signature;
        if (relaxedSignature) {
          const over = (reasoningCounts.get(relaxedSignature) ?? 0) >= this.config.maxReasoningRepeatsPerSession
            || (batchReasoningCounts
              && (batchReasoningCounts.get(relaxedSignature) ?? 0) >= this.config.maxReasoningRepeatsPerBatch);
          if (over) {
            diversityWarnings.push({
              index: i + 1,
              template_id: relaxed.q.generator_id,
              reason: REASON.REPEATED_REASONING_PATTERN,
              note: 'reasoning-path allowance exceeded by the fallback: no candidate within the cap was available'
            });
          }
        }
        if ((relaxed.usedTemplate ?? 0) >= this.config.maxTemplateIdRepeatsPerSession) {
          diversityWarnings.push({
            index: i + 1,
            template_id: relaxed.q.generator_id,
            reason: REASON.SESSION_TEMPLATE_SHARE_CAP,
            note: 'template share cap exceeded by the fallback: no candidate within the cap was available'
          });
        }
        diversityWarnings.push({
          index: i + 1,
          template_id: chosen.q.generator_id,
          reason: REASON.TEMPLATE_OVERUSE,
          note: 'template repetition target relaxed: the stock of distinct templates for this difficulty is too small'
        });
      }

      fingerprints.add(chosen.fingerprint);
      // RC2.8-3. Record the idea that was ACTUALLY delivered, which is not
      // always the one planned: a slot may have fallen through to an
      // alternative, and the live state the next slot is planned against has to
      // reflect what the reader will see rather than what was intended.
      const deliveredBlueprint = blueprintFor(
        chosen.q.generator_id, chosen.q.metadata?.task_signature ?? '?',
        chosen.q.family, difficultySchedule[i],
        chosen.q.metadata?.information_structure ?? 'DIRECT_GIVENS'
      );
      blueprints.record(i, deliveredBlueprint,
        chosen.q.metadata?.user_perceptual_signature ?? null);
      // RC2.9-1. The journey remembers what it delivered, from the identities
      // the question itself publishes, so the memory and the measurement can
      // never disagree about what the user was shown.
      journey.record(keysOf(chosen.q, {entityWords: [...entityWordsIn(chosen.q.question)]}),
        journeyStart + i + 1);
      // A slot that had to fall back on an idea still inside its cooldown is
      // recorded by name, so the acceptance run can report how often the last
      // resort was needed rather than leaving it invisible.
      if (chosen.journeyRefusal) journey.noteProtectedReuse({index: i + 1, ...chosen.journeyRefusal});
      const deliveredSubIdea = chosen.q.metadata?.sub_idea_signature ?? null;
      if (deliveredSubIdea) {
        if (!familySubIdeas.has(chosen.q.family)) familySubIdeas.set(chosen.q.family, new Set());
        familySubIdeas.get(chosen.q.family).add(deliveredSubIdea);
      }
      if (blueprintId(deliveredBlueprint) !== blueprintId(plannedBlueprint)) {
        blueprintEvents.push({
          index: i + 1,
          planned: blueprintId(plannedBlueprint),
          delivered: blueprintId(deliveredBlueprint),
          presentation: presentationOf(deliveredBlueprint),
          note: 'the planned idea could not be realised at this slot; the next admissible idea was used'
        });
      }
      // The verdict is taken HERE, on the question actually being delivered,
      // rather than carried from wherever the candidate was chosen. The relaxed
      // fallback can arrive from a branch that never consulted the scheduler,
      // and a control that is only consulted on some paths is a control that
      // can be bypassed without anybody being told.
      const noveltyAtCommit = novelty.assess(chosen.q);
      // RC2.7-R2. `accept` throws on a core relaxation rather than recording
      // one, so this is a last structural check on the delivered question and
      // not merely a place that reports.
      novelty.accept(chosen.q, {index: i + 1, forced: noveltyAtCommit.ok ? null : noveltyAtCommit});
      if (!noveltyAtCommit.ok) {
        diversityWarnings.push({
          index: i + 1,
          template_id: chosen.q.generator_id,
          reason: REASON.NOVELTY_SURFACE_FALLBACK,
          level: noveltyAtCommit.level,
          dimension: noveltyAtCommit.dimension,
          note: `surface novelty control relaxed on ${noveltyAtCommit.dimension}: no candidate satisfying it was available`
        });
      }
      const chosenSignature = chosen.q.metadata?.structural_reasoning_signature;
      if (chosenSignature) {
        reasoningCounts.set(chosenSignature, (reasoningCounts.get(chosenSignature) ?? 0) + 1);
        if (batchReasoningCounts) {
          batchReasoningCounts.set(chosenSignature, (batchReasoningCounts.get(chosenSignature) ?? 0) + 1);
        }
      }
      variantCounts.set(chosen.variant, (variantCounts.get(chosen.variant) || 0) + 1);
      templateCounts.set(chosen.q.generator_id, (templateCounts.get(chosen.q.generator_id) || 0) + 1);
      recentVariants.push(chosen.variant);
      this.telemetry.deliveredToSession({family: chosen.q.family, templateId: chosen.q.generator_id, seed});
      if (batchFingerprints) batchFingerprints.add(chosen.fingerprint);
      questions.push({...chosen.q, practice_number: i + 1});
    }

    if (useRecentMemory) {
      this._recentFingerprints.push(...fingerprints);
      const overflow = this._recentFingerprints.length - this.config.recentFingerprintMemory;
      if (overflow > 0) this._recentFingerprints.splice(0, overflow);
    }

    const validation = this.validateBatch(questions);
    validation.generation_mode = mode;
    validation.diversity_warnings = diversityWarnings;
    // RC2.1-1. What this session cost, on the session's own terms: how many
    // published candidates it was handed, how many it delivered, and how many it
    // refused. Reported per session so a high-cost session cannot be averaged
    // away inside a batch.
    validation.session_cost = {
      published_candidates: sessionCandidates,
      delivered: questions.length,
      discarded: sessionCandidates - questions.length
    };
    // RC2.7-5. What the session actually looks like on every dimension the
    // scheduler controls, published beside the warnings so a claim about
    // perceived variety can be checked from the session itself.
    validation.novelty = novelty.report();
    // RC2.9.2. Slots that had to fall back on a construction still inside its
    // cooldown, named with how far back it was. Published rather than counted,
    // because «the cooldown held» is a claim a reviewer must be able to check
    // against the session itself; an empty list is the expected state.
    validation.journey = {
      questions_before: journeyStart,
      questions_after: journey.questionsSeen,
      protected_reuses: journey.protectedReuses.map(r => ({
        index: r.index, dimension: r.dimension, at: r.at, last_seen: r.lastSeen,
        distance: r.lastSeen == null ? null : r.at - r.lastSeen
      }))
    };
    return {
      engine_version: this.version,
      seed,
      generated_at: new Date().toISOString(),
      settings: {
        count,
        requested_family: options.family ?? options.families ?? 'random',
        requested_difficulty: options.difficulty ?? this.config.defaultDifficulty,
        balance_answer_letters: options.balanceAnswerLetters !== false
      },
      summary: this.summarizeBatch(questions),
      validation,
      // RC2.9-1. What the product persists so the NEXT session of this journey
      // knows what the user has already solved. JSON, bounded to the fifty-to-
      // a-hundred horizon the product is for, and a pure function of the seed
      // and the history that came in. A caller that ignores it gets exactly the
      // engine that existed before this field did.
      diversity_history: journey.toHistory(),
      questions
    };
  }

  /**
   * RC2.1-5. Several sessions generated as one batch — a mock exam — sharing a
   * single semantic-fingerprint set, so the same mathematical instance cannot
   * appear in two of them. Holdout B shipped three such pairs (the same
   * averages, speed and odd-one-out questions with the options shuffled)
   * because each session deduplicated only against itself.
   *
   * The batch is a pure function of its seed: session k is seeded
   * `${seed}|S${k}`. Within a batch a session additionally depends on the
   * sessions before it, which is the point — that dependency is what removes
   * the duplicates — so a session pulled out of a batch and regenerated alone
   * is not guaranteed to match. Generating the batch again from the same seed
   * always is.
   *
   * @param {object} options
   * @param {Array<{count?: number, difficulty?: string, family?: string}>} options.sessions
   */
  generateMockBatch(options = {}) {
    const specs = Array.isArray(options.sessions) ? options.sessions : [];
    if (!specs.length) throw new Error('generateMockBatch: at least one session is required');
    const seed = options.seed ?? makeSeed('NUMBATCH');
    const batchFingerprints = new Set();
    const batchReasoningCounts = new Map();
    // RC2.7-6. Entity concentration measured across the batch rather than only
    // inside each session: the validation found one word reaching 25 of 250
    // where no single session had more than 6 of it.
    const batchEntityCounts = new Map();
    const batchQuestionCount = specs.reduce((a, x) => a + (Number(x.count) || 0), 0);
    // RC2.7-D. The ideas already used, shared across the whole batch, so a user
    // who sits several sessions does not meet the same question idea again in
    // the next one.
    const batchCoreConstructions = new Map();
    const batchReasoningTargets = new Map();
    // RC2.8-3. And the ideas and layouts the PLANNER has already spent, so the
    // second session of a sitting is planned against what the first one
    // delivered rather than starting from an empty page. A user who sits four
    // sessions in a row is the 100-to-200-question experience the brief is
    // about, and it crosses session boundaries.
    const batchBlueprints = new Map();
    const batchPresentations = new Map();
    const sessions = specs.map((spec, k) => this.generatePractice({
      ...options.defaults,
      ...spec,
      seed: `${seed}|S${k + 1}`,
      batchFingerprints,
      batchReasoningCounts,
      batchEntityCounts,
      batchQuestionCount,
      batchCoreConstructions,
      batchReasoningTargets,
      batchBlueprints,
      batchPresentations
    }));
    return {
      engine_version: this.version,
      seed,
      generated_at: new Date().toISOString(),
      sessions,
      batch_summary: {
        sessions: sessions.length,
        questions: sessions.reduce((a, s) => a + s.questions.length, 0),
        distinct_semantic_fingerprints: batchFingerprints.size,
        distinct_reasoning_paths: batchReasoningCounts.size,
        most_repeated_reasoning_path: Math.max(0, ...batchReasoningCounts.values()),
        distinct_core_constructions: batchCoreConstructions.size,
        distinct_reasoning_targets: batchReasoningTargets.size,
        distinct_entities: batchEntityCounts.size,
        most_repeated_entity: Math.max(0, ...batchEntityCounts.values()),
        published_candidates: sessions.reduce((a, s) => a + s.validation.session_cost.published_candidates, 0),
        discarded: sessions.reduce((a, s) => a + s.validation.session_cost.discarded, 0)
      }
    };
  }

  /**
   * Section 41. How many genuinely distinct templates exist at a difficulty,
   * so a caller can see an exhaustion risk before asking for the session.
   */
  /**
   * RC2.3-2. What a band can actually be built from, read off the structural
   * adjudication rather than probed.
   *
   * `availableDistinctTemplates` below samples the engine, which is the right
   * measurement for "what does a draw really produce" and the wrong one for a
   * precondition: it costs hundreds of generations and it answers a question
   * about luck. This one answers the question about stock.
   */
  bandCoverage(band, families = null) {
    const pool = (families && families.length
      ? families.map(f => this.normalizeFamily(f))
      : FAMILY_REGISTRY.map(f => f.id)).filter(f => f !== 'random');
    const perFamily = pool.map(id => {
      const templates = (FAMILY_MAP[id]?.templates ?? []).filter(t => structuralBandOf(t) === band);
      return {family: id, templates, count: templates.length};
    });
    return {
      band,
      families: pool,
      perFamily,
      distinctTemplates: perFamily.reduce((n, f) => n + f.count, 0),
      familiesWith: perFamily.filter(f => f.count > 0).map(f => f.family),
      familiesWithout: perFamily.filter(f => f.count === 0).map(f => f.family)
    };
  }

  availableDistinctTemplates(difficulty, families = null, samples = 120) {
    const pool = families && families.length
      ? families.map(f => this.normalizeFamily(f))
      : FAMILY_REGISTRY.map(f => f.id);
    const seen = new Set();
    for (const family of pool) {
      for (let i = 0; i < samples; i++) {
        try {
          const q = this.generateQuestion({family, difficulty, seed: `probe-${family}-${difficulty}-${i}`});
          seen.add(q.generator_id);
        } catch { /* an exhausted probe is not a template */ }
      }
    }
    return {difficulty, families: pool, distinct_templates: seen.size, template_ids: [...seen].sort()};
  }

  validateQuestion(q) {
    return validateQuestion(q);
  }

  validateBatch(questions) {
    const errors = [];
    const warnings = [];
    const fingerprints = new Set();
    const paramGraphKeys = new Set();
    const keyCounts = Object.fromEntries(LETTERS.map(l => [l, 0]));
    const rankCounts = {};
    const outlierPositions = [];
    const templateCounts = {};
    const variantCounts = {};

    questions.forEach((q, i) => {
      const check = validateQuestion(q);
      if (!check.valid) errors.push({index: i + 1, errors: check.errors});

      const fingerprint = questionSignature(q);
      if (fingerprints.has(fingerprint)) errors.push({index: i + 1, errors: [REASON.DUPLICATE_FINGERPRINT]});
      fingerprints.add(fingerprint);

      // Section 31: the same parameters under the same reasoning graph and the
      // same asked unknown are the same question, even if the fingerprint fields
      // were to drift apart. Two different templates that happen to share a
      // parameter shape are not duplicates, so the template is part of the key.
      const paramKey = [
        q.family, q.generator_id, q.metadata?.asked_unknown ?? '',
        q.metadata?.reasoning_graph ?? '', JSON.stringify(q.metadata?.parameters ?? {})
      ].join('|');
      if (paramGraphKeys.has(paramKey)) errors.push({index: i + 1, errors: [REASON.DUPLICATE_FINGERPRINT]});
      paramGraphKeys.add(paramKey);

      keyCounts[q.correct_option] = (keyCounts[q.correct_option] || 0) + 1;
      const rank = q.metadata?.correct_numeric_rank;
      if (rank) rankCounts[rank] = (rankCounts[rank] || 0) + 1;
      templateCounts[q.generator_id] = (templateCounts[q.generator_id] || 0) + 1;
      const variant = `${q.generator_id}|${q.metadata?.asked_unknown ?? 'default'}`;
      variantCounts[variant] = (variantCounts[variant] || 0) + 1;
      if (q.family === 'odd_one_out' && q.metadata?.outlier_display_position) {
        outlierPositions.push(q.metadata.outlier_display_position);
      }
    });

    const counts = Object.values(keyCounts);
    const spread = Math.max(...counts) - Math.min(...counts);
    if (questions.length >= 6 && spread > 3) warnings.push('answer_key_distribution_spread_gt_3');
    if (outlierPositions.length >= 4 && new Set(outlierPositions).size === 1) warnings.push('odd_one_out_position_leak');
    const overused = Object.entries(variantCounts)
      .filter(([, n]) => n > this.config.preferredTemplateRepeatsPer50 && questions.length <= 50);
    if (overused.length) warnings.push(`template_repetition_above_target:${overused.map(([t, n]) => `${t}x${n}`).join(',')}`);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      key_counts: keyCounts,
      numeric_rank_counts: rankCounts,
      distinct_templates: Object.keys(templateCounts).length,
      distinct_reasoning_variants: Object.keys(variantCounts).length,
      template_counts: templateCounts,
      variant_counts: variantCounts,
      odd_one_out_positions: outlierPositions
    };
  }

  summarizeBatch(questions) {
    const byFamily={}, byDifficulty={}, byTemplate={};
    for(const q of questions){
      byFamily[q.family]=(byFamily[q.family]||0)+1;
      byDifficulty[q.difficulty]=(byDifficulty[q.difficulty]||0)+1;
      byTemplate[q.generator_id]=(byTemplate[q.generator_id]||0)+1;
    }
    return {by_family:byFamily, by_difficulty:byDifficulty, by_template:byTemplate};
  }

  _resolveFamilyPool(options) {
    if (Array.isArray(options.families) && options.families.length) {
      return [...new Set(options.families.map(f => this.normalizeFamily(f)).filter(f => f !== 'random'))];
    }
    const family = this.normalizeFamily(options.family ?? 'random');
    return family === 'random' ? FAMILY_REGISTRY.map(f=>f.id) : [family];
  }

  _buildFamilySchedule(pool, count, rng) {
    if (pool.length===1) return Array(count).fill(pool[0]);
    const out=[];
    while(out.length<count){
      let round=rng.shuffle(pool);
      if(out.length && round[0]===out.at(-1)) {
        round=[...round.slice(1), round[0]];
      }
      for(const f of round){
        if(out.length>=count) break;
        out.push(f);
      }
    }
    return out;
  }

  /**
   * RC2.2-1. Builds the family schedule against the per-slot band, so a family
   * is never asked for a difficulty it cannot compute. Round-robins within the
   * eligible set so coverage stays even, and refuses outright when a band has no
   * eligible family at all — an explicit failure rather than a silent downgrade.
   */
  _buildFamilyScheduleForDifficulties(pool, difficultySchedule, rng) {
    const eligible = band => pool.filter(f => (FAMILY_MAP[f]?.difficulties ?? []).includes(band));
    const cursor = {};
    const out = [];
    for (let i = 0; i < difficultySchedule.length; i++) {
      const band = difficultySchedule[i];
      const options = eligible(band);
      if (!options.length) {
        throw Object.assign(
          new Error(`NO_FAMILY_AT_DIFFICULTY: no selected family can produce a ${band} question`),
          {code: 'NO_FAMILY_AT_DIFFICULTY', difficulty: band, pool: [...pool]}
        );
      }
      // Rotate through the eligible families, offset by a seeded start so the
      // schedule is neither fixed nor clumped.
      const start = cursor[band] ??= rng.int(0, options.length - 1);
      const pick = options[(start + (cursor[`${band}:n`] = (cursor[`${band}:n`] ?? 0) + 1) - 1) % options.length];
      if (out.length && pick === out.at(-1) && options.length > 1) {
        out.push(options[(options.indexOf(pick) + 1) % options.length]);
      } else {
        out.push(pick);
      }
    }
    return out;
  }

  _buildDifficultySchedule(difficulty, count, rng, adaptiveStats) {
    if (['easy','medium','hard'].includes(difficulty)) return Array(count).fill(difficulty);
    if (difficulty==='adaptive') return Array.from({length:count},()=>this.recommendDifficulty(adaptiveStats||{}));
    if (difficulty!=='mixed') throw new Error(`Unknown difficulty: ${difficulty}`);

    const easy=Math.round(count*0.25);
    const hard=Math.round(count*0.15);
    const medium=count-easy-hard;
    const arr=[...Array(easy).fill('easy'),...Array(medium).fill('medium'),...Array(hard).fill('hard')];
    return rng.shuffle(arr);
  }
}

export {FAMILY_REGISTRY, FAMILY_MAP};
export {validateQuestion} from './utils.js';
export {SeededRNG} from './rng.js';

export default NumericalQuestionGeneratorEngine;
