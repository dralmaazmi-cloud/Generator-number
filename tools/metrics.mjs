#!/usr/bin/env node
// Section 45. Recomputes every published figure from the raw corpus.
//
// This script never calls the generator. It reads qa-artifacts/corpus.jsonl and
// re-derives the metrics from the questions themselves, so the numbers in the
// report can be checked without trusting the run that produced them.

import {readFileSync, existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

import {checkArabicNumberUnitsDeep} from '../src/arabic/units.js';
import {validateDisplayedEquations, validateExplanationSourcing, numbersIn} from '../src/qa/equations.js';
import {isKnownMisconception, NEUTRAL_FEEDBACK, CORRECT_FEEDBACK} from '../src/qa/misconceptions.js';
import {LETTERS, validateQuestion} from '../src/utils.js';

const ROOT = new URL('../', import.meta.url).pathname;

/** Reads a JSONL file, transparently handling the committed .gz form. */
function readCorpus(path) {
  if (existsSync(path)) return readFileSync(path, 'utf8');
  if (existsSync(`${path}.gz`)) return gunzipSync(readFileSync(`${path}.gz`)).toString('utf8');
  return null;
}
const corpusPath = process.argv[2] || `${ROOT}qa-artifacts/corpus.jsonl`;
const sessionsPath = process.argv[3] || `${ROOT}qa-artifacts/hard-sessions.jsonl`;

const corpusText = readCorpus(corpusPath);
if (!corpusText) {
  console.error(`Missing ${corpusPath} (or ${corpusPath}.gz). Run: node tools/stress-qa.mjs`);
  process.exit(1);
}

const questions = corpusText.trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
console.log(`Read ${questions.length} published questions from ${corpusPath}\n`);

const m = {
  total: questions.length,
  structural_failures: 0,
  no_correct_option: 0,
  multiple_correct_options: 0,
  arabic_violations: 0,
  arabic_violation_examples: [],
  equation_failures: 0,
  equation_failure_examples: [],
  intermediate_rounding: 0,
  unsourced_values: 0,
  unsourced_examples: [],
  distractors_total: 0,
  distractors_with_provenance: 0,
  distractors_with_derivation: 0,
  feedback_option_specific: 0,
  feedback_neutral: 0,
  duplicate_fingerprints: 0,
  by_family: {},
  by_template: {},
  letters: Object.fromEntries(LETTERS.map(l => [l, 0])),
  ranks: {},
  asked_unknown_by_family: {},
  difficulty: {},
  complexity_by_difficulty: {}
};

const fingerprints = new Map();

for (const q of questions) {
  const family = q.family;
  const template = q.generator_id;
  m.by_family[family] ??= {n: 0, key_mismatch: 0};
  m.by_template[template] ??= {n: 0, key_mismatch: 0, family};
  m.by_family[family].n++;
  m.by_template[template].n++;
  m.difficulty[q.difficulty] = (m.difficulty[q.difficulty] || 0) + 1;

  const structural = validateQuestion(q);
  if (!structural.valid) {
    m.structural_failures++;
    if (structural.errors.includes('NO_CORRECT_OPTION')) m.no_correct_option++;
    if (structural.errors.includes('MULTIPLE_CORRECT_OPTIONS')) m.multiple_correct_options++;
    m.by_family[family].key_mismatch++;
    m.by_template[template].key_mismatch++;
  }

  // Arabic number/unit agreement across every rendered string.
  const texts = [
    q.question, q.display_expression,
    ...LETTERS.map(l => q.options[l]),
    q.explanation.how_to_start, ...q.explanation.steps, q.explanation.answer,
    q.explanation.fast_method, q.explanation.remember,
    ...LETTERS.map(l => q.explanation.distractor_analysis?.[l])
  ].filter(t => typeof t === 'string');
  const arabic = checkArabicNumberUnitsDeep(texts);
  if (arabic.violations.length) {
    m.arabic_violations += arabic.violations.length;
    if (m.arabic_violation_examples.length < 5) m.arabic_violation_examples.push({template, ...arabic.violations[0]});
  }

  // Displayed equations and intermediate rounding.
  const eq = validateDisplayedEquations([...q.explanation.steps, q.explanation.fast_method, q.explanation.answer].filter(Boolean));
  if (eq.failures.length) {
    m.equation_failures += eq.failures.length;
    if (m.equation_failure_examples.length < 5) m.equation_failure_examples.push({template, ...eq.failures[0]});
  }
  m.intermediate_rounding += eq.rounding.length;

  // Every printed value traceable to the stem, the parameters or an earlier step.
  const src = validateExplanationSourcing({
    stemNumbers: [...numbersIn(q.question || ''), ...(q.display_expression ? numbersIn(q.display_expression) : [])],
    paramNumbers: collectNumbers(q.metadata?.parameters || {}),
    steps: q.explanation.steps,
    allowedConstants: [0, 1, 2, 3, 4, 5, 6, 7, 60, 100]
  });
  if (src.unsourced.length) {
    m.unsourced_values += src.unsourced.length;
    if (m.unsourced_examples.length < 5) m.unsourced_examples.push({template, ...src.unsourced[0]});
  }

  // Distractor provenance and option-specific feedback.
  //
  // "Option-specific" is measured objectively: the analysis a learner sees must
  // differ between the five wrong choices. A single sentence repeated under all
  // five is a family-level note, not an analysis of the choice they made.
  const analyses = LETTERS.filter(l => l !== q.correct_option)
    .map(l => q.explanation?.distractor_analysis?.[l] ?? '');
  const distinctAnalyses = new Set(analyses.filter(Boolean)).size;
  for (const letter of LETTERS) {
    if (letter === q.correct_option) continue;
    m.distractors_total++;
    const meta = q.metadata?.options_meta?.[letter];
    if (meta && isKnownMisconception(meta.misconceptionId)) m.distractors_with_provenance++;
    if (meta?.derivation) m.distractors_with_derivation++;
    const feedback = q.explanation?.distractor_analysis?.[letter];
    const specific = Boolean(feedback)
      && feedback !== NEUTRAL_FEEDBACK && feedback !== CORRECT_FEEDBACK
      && distinctAnalyses === analyses.length;
    if (specific) m.feedback_option_specific++;
    else m.feedback_neutral++;
  }

  // v1.2.0 published no fingerprint; its own duplicate rule compared the
  // rendered question text, so that is what is counted for it.
  const fp = q.metadata?.fingerprint
    ?? `${q.family}|${q.generator_id}|${q.question}|${q.display_expression || ''}`;
  fingerprints.set(fp, (fingerprints.get(fp) || 0) + 1);

  m.letters[q.correct_option]++;
  let rank = q.metadata?.correct_numeric_rank;
  if (!rank) {
    const values = LETTERS.map(l => parseLeading(q.options[l]));
    if (values.every(Number.isFinite) && new Set(values).size === 6) {
      const key = parseLeading(q.options[q.correct_option]);
      rank = values.filter(v => v < key).length + 1;
    }
  }
  if (rank) m.ranks[rank] = (m.ranks[rank] || 0) + 1;

  m.asked_unknown_by_family[family] ??= {};
  const direction = q.metadata?.asked_unknown ?? 'default';
  m.asked_unknown_by_family[family][direction] = (m.asked_unknown_by_family[family][direction] || 0) + 1;

  m.complexity_by_difficulty[q.difficulty] ??= [];
  if (Number.isFinite(q.metadata?.complexity_score)) m.complexity_by_difficulty[q.difficulty].push(q.metadata.complexity_score);
}

m.duplicate_fingerprints = [...fingerprints.values()].filter(n => n > 1).reduce((a, n) => a + (n - 1), 0);
m.distinct_fingerprints = fingerprints.size;

// --- Section 38: can any simple strategy beat chance? -----------------------

const strategies = {
  pickLargest: opts => [opts.at(-1).letter],
  pickSmallest: opts => [opts[0].letter],
  pickRank3: opts => [opts[2].letter],
  pickRank4: opts => [opts[3].letter],
  pickRank5: opts => [opts[4].letter],
  pickMiddleTwo: opts => [opts[2].letter, opts[3].letter],
  pickSecondLargest: opts => [opts[4].letter],
  avoidExtremesThenRandom: opts => opts.slice(1, 5).map(o => o.letter),
  uniqueMultipleOf5: opts => uniqueBy(opts, v => v % 5 === 0),
  uniqueMultipleOf10: opts => uniqueBy(opts, v => v % 10 === 0)
};

function uniqueBy(opts, predicate) {
  const hits = opts.filter(o => Number.isInteger(o.value) && predicate(o.value));
  return hits.length === 1 ? [hits[0].letter] : [];
}

const guessing = {};
for (const name of Object.keys(strategies)) guessing[name] = {answered: 0, expectedHits: 0};

for (const q of questions) {
  const meta = q.metadata?.options_meta;
  const opts = LETTERS.map(l => ({
    letter: l,
    value: meta ? Number(meta[l]?.value) : parseLeading(q.options[l])
  })).filter(o => Number.isFinite(o.value));
  if (opts.length !== 6) continue;
  opts.sort((a, b) => a.value - b.value);
  for (const [name, strategy] of Object.entries(strategies)) {
    const picks = strategy(opts);
    if (!picks.length) continue;
    guessing[name].answered++;
    guessing[name].expectedHits += picks.includes(q.correct_option) ? 1 / picks.length : 0;
  }
}

const BASELINE = 1 / 6;
const guessingReport = Object.entries(guessing).map(([name, g]) => {
  const rate = g.answered ? g.expectedHits / g.answered : 0;
  const se = g.answered ? Math.sqrt(BASELINE * (1 - BASELINE) / g.answered) : Infinity;
  const z = g.answered ? (rate - BASELINE) / se : 0;
  return {
    strategy: name,
    answered: g.answered,
    success_rate: Number((100 * rate).toFixed(2)),
    baseline: Number((100 * BASELINE).toFixed(2)),
    z: Number(z.toFixed(2)),
    exploitable: Math.abs(z) > 2
  };
}).sort((a, b) => Math.abs(b.z) - Math.abs(a.z));

// --- letter and rank bias ---------------------------------------------------

function chiSquare(counts, categories) {
  const n = Object.values(counts).reduce((a, b) => a + b, 0);
  const expected = n / categories;
  if (!n) return 0;
  return Object.values(counts).reduce((acc, o) => acc + (o - expected) ** 2 / expected, 0);
}

const letterChi = chiSquare(m.letters, 6);       // 5 df, 95% critical value 11.07
const rankChi = chiSquare(m.ranks, 6);

// --- hard sessions (Sections 17-C, 41) --------------------------------------

let sessionReport = null;
const sessionText = (readCorpus(sessionsPath) || '').trim();
if (sessionText) {
  const sessionLines = sessionText.split('\n').filter(Boolean).map(l => JSON.parse(l));
  const templateTotals = {};
  let totalQuestions = 0;
  const distincts = [];
  const distinctVariants = [];
  const maxRepeats = [];
  const maxVariantRepeats = [];
  let invalid = 0;
  let duplicateFingerprintInSession = 0;
  for (const s of sessionLines) {
    if (!s.valid) invalid++;
    distincts.push(s.distinct_templates);
    if (s.distinct_reasoning_variants) distinctVariants.push(s.distinct_reasoning_variants);
    maxRepeats.push(Math.max(...Object.values(s.template_counts)));
    if (s.variant_counts) maxVariantRepeats.push(Math.max(...Object.values(s.variant_counts)));
    for (const [t, n] of Object.entries(s.template_counts)) {
      templateTotals[t] = (templateTotals[t] || 0) + n;
      totalQuestions += n;
    }
    const seen = new Set();
    for (const q of s.questions) {
      if (seen.has(q.fingerprint)) duplicateFingerprintInSession++;
      seen.add(q.fingerprint);
    }
  }
  if (!totalQuestions) sessionReport = null;
  const shares = Object.entries(templateTotals)
    .map(([t, n]) => ({template: t, share: n / totalQuestions}))
    .sort((a, b) => b.share - a.share);
  if (shares.length) sessionReport = {
    sessions: sessionLines.length,
    invalid_sessions: invalid,
    duplicate_fingerprints_within_sessions: duplicateFingerprintInSession,
    distinct_templates_min: Math.min(...distincts),
    distinct_templates_mean: Number((distincts.reduce((a, b) => a + b, 0) / distincts.length).toFixed(2)),
    distinct_reasoning_variants_min: distinctVariants.length ? Math.min(...distinctVariants) : null,
    max_repeat_of_any_template: Math.max(...maxRepeats),
    max_repeat_of_any_reasoning_variant: maxVariantRepeats.length ? Math.max(...maxVariantRepeats) : null,
    top_template_share: Number((100 * shares[0].share).toFixed(2)),
    top_templates: shares.slice(0, 5).map(x => ({template: x.template, share_pct: Number((100 * x.share).toFixed(2))}))
  };
}

/** Reads the leading number out of a rendered option, for legacy corpora. */
function parseLeading(text) {
  const match = /-?\d+(?:\.\d+)?/.exec(String(text ?? ''));
  return match ? Number(match[0]) : NaN;
}

function collectNumbers(value, out = []) {
  if (typeof value === 'number' && Number.isFinite(value)) out.push(value);
  else if (Array.isArray(value)) value.forEach(v => collectNumbers(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach(v => collectNumbers(v, out));
  return out;
}

const pctOf = (part, whole) => whole ? Number((100 * part / whole).toFixed(3)) : 0;

const report = {
  corpus_size: m.total,
  deterministic: {
    published_with_zero_correct_options: m.no_correct_option,
    published_with_multiple_correct_options: m.multiple_correct_options,
    structural_failures: m.structural_failures,
    arabic_number_unit_violations: m.arabic_violations,
    displayed_equation_failures: m.equation_failures,
    intermediate_rounding_contradictions: m.intermediate_rounding,
    explanation_unsourced_values: m.unsourced_values,
    duplicate_fingerprints_in_corpus: m.duplicate_fingerprints,
    distinct_fingerprints: m.distinct_fingerprints
  },
  distractors: {
    total: m.distractors_total,
    with_misconception_provenance_pct: pctOf(m.distractors_with_provenance, m.distractors_total),
    with_derivation_pct: pctOf(m.distractors_with_derivation, m.distractors_total),
    option_specific_feedback_pct: pctOf(m.feedback_option_specific, m.distractors_total),
    neutral_feedback_count: m.feedback_neutral
  },
  key_accuracy: {
    overall_pct: pctOf(m.total - m.structural_failures, m.total),
    worst_template: Object.entries(m.by_template)
      .map(([t, v]) => ({template: t, family: v.family, n: v.n, accuracy_pct: pctOf(v.n - v.key_mismatch, v.n)}))
      .sort((a, b) => a.accuracy_pct - b.accuracy_pct)[0]
  },
  letters: {counts: m.letters, chi_square: Number(letterChi.toFixed(2)), critical_95_5df: 11.07,
    biased: letterChi > 11.07},
  numeric_rank: {counts: m.ranks, chi_square: Number(rankChi.toFixed(2)), critical_95_5df: 11.07},
  guessing_strategies: guessingReport,
  exploitable_strategies: guessingReport.filter(s => s.exploitable).map(s => s.strategy),
  difficulty_distribution: m.difficulty,
  complexity_mean_by_difficulty: Object.fromEntries(
    Object.entries(m.complexity_by_difficulty).map(([d, arr]) => [d, Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2))])
  ),
  asked_unknown_share_by_family: Object.fromEntries(
    Object.entries(m.asked_unknown_by_family).map(([f, dirs]) => {
      const total = Object.values(dirs).reduce((a, b) => a + b, 0);
      return [f, Object.fromEntries(Object.entries(dirs).map(([k, v]) => [k, Number((100 * v / total).toFixed(1))]))];
    })
  ),
  hard_sessions: sessionReport,
  examples: {
    arabic: m.arabic_violation_examples,
    equations: m.equation_failure_examples,
    unsourced: m.unsourced_examples
  }
};

console.log(JSON.stringify(report, null, 2));
