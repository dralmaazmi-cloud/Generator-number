import {SeededRNG, makeSeed} from './rng.js';
import {FAMILY_REGISTRY, FAMILY_MAP, FAMILY_ALIASES} from './registry.js';
import {finalizeQuestion, validateQuestion, questionSignature, buildBalancedLetterSchedule, LETTERS} from './utils.js';
import {validateCandidate} from './qa/pipeline.js';
import {REASON} from './qa/reasons.js';
import {GenerationAnalytics} from './qa/analytics.js';

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
export const ENGINE_VERSION = '1.4.0';

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
  'pedagogy', 'language', 'explanation', 'distractors', 'fingerprint'
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
      slidingWindow: config.slidingWindow ?? 20,
      preferredRepeatsPerWindow: config.preferredRepeatsPerWindow ?? 1,
      diversityAttempts: config.diversityAttempts ?? 24,
      // Section 13-C: a small, non-persistent memory of recent sessions.
      recentFingerprintMemory: config.recentFingerprintMemory ?? 150
    };
    this.analytics = new GenerationAnalytics();
    this._recentFingerprints = [];
  }

  /** Section 6 / 45: the rejection and latency figures behind the published items. */
  getAnalytics() {
    return this.analytics.snapshot();
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
    const difficulty = this.recommendDifficulty(stats);
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
      const family = familyInput === 'random' ? rng.pick(FAMILY_REGISTRY).id : familyInput;
      lastFamily = family;
      const difficulty = this.resolveDifficulty(
        options.difficulty ?? this.config.defaultDifficulty,
        rng.fork('difficulty'),
        options.adaptiveStats
      );
      const generator = GENERATORS[family];

      let base;
      try {
        base = generator({difficulty, rng: rng.fork('content'), seed, engineVersion: this.version});
      } catch (err) {
        rejections.push(err.reason || `GENERATOR_ERROR:${err.message}`);
        continue;
      }
      lastTemplate = base.template_id;

      let q;
      try {
        q = finalizeQuestion(base, rng.fork('options'), options.preferredCorrectLetter ?? null);
      } catch (err) {
        // Not enough distractors with real provenance: reject, do not pad.
        rejections.push(err.reason || REASON.DISTRACTOR_NO_MISCONCEPTION);
        this.analytics.record(family, base.template_id, difficulty, {accepted: false, reasons: [err.reason || REASON.DISTRACTOR_NO_MISCONCEPTION]});
        continue;
      }

      q.metadata.family_description = FAMILY_MAP[family].description;
      q.metadata.blueprint_family = FAMILY_MAP[family].category;

      const verdict = validateCandidate(base, q);
      this.analytics.record(family, base.template_id, difficulty, {accepted: verdict.valid, reasons: verdict.reasons});

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
    const familySchedule = this._buildFamilySchedule(selectedFamilies, count, rng.fork('families'));
    const difficultySchedule = this._buildDifficultySchedule(
      options.difficulty ?? this.config.defaultDifficulty, count, rng.fork('difficulty'), options.adaptiveStats
    );
    const letterSchedule = options.balanceAnswerLetters === false
      ? Array(count).fill(null)
      : buildBalancedLetterSchedule(count, rng.fork('letters'));

    const questions = [];
    const fingerprints = new Set();
    // Section 41: a template asked in a genuinely different direction counts as
    // diversity, while changing only the names or the numbers does not. So the
    // repetition preference is measured on (template, asked unknown), which is
    // what keeps a family holding a single hard template from filling its slots
    // with the same reasoning over and over.
    const variantCounts = new Map();
    const reasoningSignatures = new Set();
    const recentVariants = [];
    const diversityWarnings = [];
    const useRecentMemory = options.useRecentSessionMemory !== false;

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
      for (let retry = 0; retry < this.config.diversityAttempts; retry++) {
        const stage = stages[Math.min(stages.length - 1, Math.floor(retry / Math.ceil(this.config.diversityAttempts / stages.length)))];
        let q;
        try {
          q = this.generateQuestion({
            family: familySchedule[i],
            difficulty: difficultySchedule[i],
            seed: `${seed}|Q${i + 1}|${retry}`,
            preferredCorrectLetter: letterSchedule[i],
            adaptiveStats: options.adaptiveStats
          });
        } catch (err) {
          if (err.code === 'QUESTION_GENERATION_EXHAUSTED' && retry < this.config.diversityAttempts - 1) continue;
          throw err;
        }
        const fingerprint = questionSignature(q);
        // Absolute rules: never publish the same reasoning twice in a session,
        // however the choices happen to be ordered.
        // RC2-022: `fingerprint` here is the semantic fingerprint, so two
        // display permutations of one mathematical instance collide.
        if (fingerprints.has(fingerprint)) continue;
        if (useRecentMemory && this._recentFingerprints.includes(fingerprint)) continue;
        // RC2-023: and never publish the same reasoning *pattern* twice in a
        // session either. A template that declares no pattern has a null
        // signature and is governed by the semantic check alone, so unrelated
        // questions are not collapsed together.
        const structural = q.metadata?.structural_reasoning_signature ?? null;
        if (structural && reasoningSignatures.has(structural)) continue;

        const variant = `${q.generator_id}|${q.metadata?.asked_unknown ?? 'default'}`;
        const used = variantCounts.get(variant) || 0;
        const inWindow = recentVariants.slice(-this.config.slidingWindow)
          .filter(t => t === variant).length;
        // Keep the best fallback seen so far: one that still respects the hard
        // ceiling is preferred over one that does not.
        if (!relaxed || (relaxed.used >= this.config.maxTemplateRepeatsPerSession && used < this.config.maxTemplateRepeatsPerSession)) {
          relaxed = {q, fingerprint, used, variant};
        }
        // Preferences: honoured when the stock allows, relaxed in stages when not.
        if (count <= 50 && used >= stage.cap) continue;
        if (inWindow >= stage.window) continue;
        chosen = {q, fingerprint, variant};
        break;
      }

      if (!chosen) {
        if (!relaxed) {
          throw Object.assign(new Error('SESSION_DIVERSITY_EXHAUSTED: no distinct question available'), {
            code: 'SESSION_DIVERSITY_EXHAUSTED', index: i + 1
          });
        }
        chosen = relaxed;
        diversityWarnings.push({
          index: i + 1,
          template_id: chosen.q.generator_id,
          reason: REASON.TEMPLATE_OVERUSE,
          note: 'template repetition target relaxed: the stock of distinct templates for this difficulty is too small'
        });
      }

      fingerprints.add(chosen.fingerprint);
      if (chosen.q.metadata?.structural_reasoning_signature) {
        reasoningSignatures.add(chosen.q.metadata.structural_reasoning_signature);
      }
      variantCounts.set(chosen.variant, (variantCounts.get(chosen.variant) || 0) + 1);
      recentVariants.push(chosen.variant);
      questions.push({...chosen.q, practice_number: i + 1});
    }

    if (useRecentMemory) {
      this._recentFingerprints.push(...fingerprints);
      const overflow = this._recentFingerprints.length - this.config.recentFingerprintMemory;
      if (overflow > 0) this._recentFingerprints.splice(0, overflow);
    }

    const validation = this.validateBatch(questions);
    validation.diversity_warnings = diversityWarnings;
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
      questions
    };
  }

  /**
   * Section 41. How many genuinely distinct templates exist at a difficulty,
   * so a caller can see an exhaustion risk before asking for the session.
   */
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
