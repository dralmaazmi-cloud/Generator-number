import {isKnownMisconception, buildOptionFeedback, CORRECT_FEEDBACK} from './qa/misconceptions.js';
import {REASON} from './qa/reasons.js';
import {computeComplexity} from './qa/complexity.js';
import {buildFingerprint, questionFingerprint} from './qa/fingerprint.js';

export const LETTERS = ['A','B','C','D','E','F'];

export const DIFFICULTY_LABELS = {
  easy: 'سهل',
  medium: 'متوسط',
  hard: 'صعب'
};

export function gcd(a,b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a,b] = [b, a % b];
  return a || 1;
}

export function lcm(a,b) {
  return Math.abs(a*b) / gcd(a,b);
}

export function roundTo(n, decimals = 6) {
  const p = 10 ** decimals;
  return Math.round((n + Number.EPSILON) * p) / p;
}

export function isNearlyInteger(n, eps = 1e-9) {
  return Math.abs(n - Math.round(n)) < eps;
}

export function formatNumber(n, maxDecimals = 2) {
  if (typeof n === 'string') return n;
  if (!Number.isFinite(n)) return String(n);
  if (isNearlyInteger(n)) return String(Math.round(n));
  return roundTo(n, maxDecimals).toFixed(maxDecimals).replace(/0+$/,'').replace(/\.$/,'');
}

export function percentOf(value, pct) {
  return value * pct / 100;
}

export function canonical(v) {
  if (typeof v === 'number') return `n:${roundTo(v,8)}`;
  return `s:${String(v).trim()}`;
}

export function uniqByCanonical(values) {
  const seen = new Set();
  const out = [];
  for (const v of values) {
    const key = canonical(v);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(v);
    }
  }
  return out;
}

export function chooseCleanDivisorPair(rng, products = [24,30,36,40,42,48,54,56,60,63,64,72,80,84,90,96,100,108,120]) {
  const product = rng.pick(products);
  const divisors = [];
  for (let d=2; d<=12; d++) if (product % d === 0) divisors.push(d);
  const a = rng.pick(divisors);
  return [a, product/a, product];
}

/**
 * Section 14 / 20. Builds the six choices.
 *
 * Every distractor must arrive carrying a misconception id and the derivation
 * that produced it. There is no fallback: if five distractors with real
 * provenance are not available, the candidate is rejected and regenerated
 * rather than padded with a near-miss number.
 */
export function makeOptionSet({
  correct,
  distractors,
  rng,
  format = v => String(v),
  preferredCorrectLetter = null
}) {
  const correctFormatted = format(correct);
  const seenFormatted = new Set([correctFormatted]);
  const pool = [];

  for (const d of distractors || []) {
    if (!d || typeof d !== 'object' || !('value' in d)) continue;
    const {value, misconceptionId, derivation} = d;
    if (!isKnownMisconception(misconceptionId)) continue;        // no provenance, no option
    if (typeof value === 'number' && !Number.isFinite(value)) continue;
    const formatted = format(value);
    if (formatted === correctFormatted || seenFormatted.has(formatted)) continue;
    seenFormatted.add(formatted);
    pool.push({value, formatted, misconceptionId, derivation: derivation || null});
  }

  if (pool.length < 5) {
    const err = new Error(`Only ${pool.length} distractors with misconception provenance`);
    err.reason = REASON.DISTRACTOR_NO_MISCONCEPTION;
    err.available = pool.length;
    throw err;
  }

  const picked = pickBalancedDistractors(pool, correct, rng);

  const correctLetter = preferredCorrectLetter && LETTERS.includes(preferredCorrectLetter)
    ? preferredCorrectLetter
    : rng.pick(LETTERS);
  const shuffledWrong = rng.shuffle(picked);
  const options = {};
  const distractorAnalysis = {};
  const optionsMeta = {};
  let wi = 0;
  for (const letter of LETTERS) {
    if (letter === correctLetter) {
      options[letter] = correctFormatted;
      distractorAnalysis[letter] = CORRECT_FEEDBACK;
      optionsMeta[letter] = {correct: true, value: correct, misconceptionId: null, derivation: null};
    } else {
      const item = shuffledWrong[wi++];
      options[letter] = item.formatted;
      distractorAnalysis[letter] = buildOptionFeedback({
        optionText: item.formatted,
        misconceptionId: item.misconceptionId,
        derivation: item.derivation
      });
      optionsMeta[letter] = {correct: false, value: item.value, misconceptionId: item.misconceptionId, derivation: item.derivation};
    }
  }
  // Rank is read off the raw values, not the rendered strings: a count of 1
  // renders as "كيلومتر واحد" with no numeral, which no text parse can rank.
  return {
    options,
    correct_option: correctLetter,
    correct_value: correctFormatted,
    distractor_analysis: distractorAnalysis,
    options_meta: optionsMeta,
    numeric_rank: rankFromRawValues(picked.map(p => p.value), correct)
  };
}

/**
 * Section 14-E / 15-C. When mistakes on both sides of the key exist, keep both
 * sides represented so the key does not drift to the middle of the sorted list.
 * This only chooses among distractors that already exist; it never invents one.
 */
function pickBalancedDistractors(pool, correct, rng) {
  const correctNum = typeof correct === 'number' ? correct : Number(correct);
  if (!Number.isFinite(correctNum)) return rng.sample(pool, 5);

  const below = pool.filter(p => Number(p.value) < correctNum);
  const above = pool.filter(p => Number(p.value) > correctNum);
  const other = pool.filter(p => !Number.isFinite(Number(p.value)) || Number(p.value) === correctNum);
  if (!below.length || !above.length) return rng.sample(pool, 5);

  const shuffledBelow = rng.shuffle(below);
  const shuffledAbove = rng.shuffle(above);
  // Section 15-C: vary how many of the five sit below the key across the whole
  // feasible range, so the key does not settle into the same sorted position
  // every time. Only genuine distractors are ever chosen from; none is invented.
  const minBelow = Math.max(0, 5 - shuffledAbove.length);
  const maxBelow = Math.min(5, shuffledBelow.length);
  const wantBelow = minBelow >= maxBelow ? minBelow : rng.int(minBelow, maxBelow);
  const wantAbove = Math.min(shuffledAbove.length, 5 - wantBelow);
  const chosen = [...shuffledBelow.slice(0, wantBelow), ...shuffledAbove.slice(0, wantAbove)];
  const rest = rng.shuffle([
    ...shuffledBelow.slice(wantBelow),
    ...shuffledAbove.slice(wantAbove),
    ...other
  ]);
  while (chosen.length < 5 && rest.length) chosen.push(rest.shift());
  return chosen.slice(0, 5);
}

/** Section 15-B: 1-based position of the key among the raw option values. */
export function rankFromRawValues(distractorValues, correct) {
  const correctNum = typeof correct === 'number' ? correct : Number(correct);
  if (!Number.isFinite(correctNum)) return null;
  const values = distractorValues.map(v => (typeof v === 'number' ? v : Number(v)));
  if (values.some(v => !Number.isFinite(v))) return null;
  return values.filter(v => v < correctNum).length + 1;
}

/** Same measure, read off rendered option strings (used by external QA tools). */
export function numericRankOf(options, correctLetter) {
  const parsed = LETTERS.map(l => ({letter: l, value: parseLeadingNumber(options[l])}));
  if (parsed.some(p => p.value === null)) return null;
  const sorted = [...parsed].sort((a, b) => a.value - b.value);
  return sorted.findIndex(p => p.letter === correctLetter) + 1;
}

export function parseLeadingNumber(text) {
  if (typeof text === 'number') return text;
  const m = /-?\d+(?:\.\d+)?/.exec(String(text ?? '').replace(/[٠-٩]/g, c => String(c.codePointAt(0) - 0x0660)));
  return m ? Number(m[0]) : null;
}

export function finalizeQuestion(base, rng, preferredCorrectLetter = null) {
  const optionSet = makeOptionSet({
    correct: base.correct,
    distractors: base.distractors,
    rng,
    format: base.format || (v => String(v)),
    preferredCorrectLetter
  });

  const complexity = computeComplexity(base.complexityFactors || {});
  const fingerprint = buildFingerprint({
    family: base.family,
    templateId: base.template_id,
    askedUnknown: base.askedUnknown,
    stageCount: base.stageCount,
    reasoningGraph: base.reasoningGraph,
    namedParameters: base.parameters || {},
    commutative: base.commutative
  });

  const q = {
    id: base.id,
    generator_id: base.generator_id,
    seed: base.seed,
    family: base.family,
    family_ar: base.family_ar,
    category: base.category,
    subskill: base.subskill,
    difficulty: base.difficulty,
    difficulty_ar: DIFFICULTY_LABELS[base.difficulty],
    question: base.question,
    display_expression: base.display_expression ?? null,
    options: optionSet.options,
    correct_option: optionSet.correct_option,
    correct_value: optionSet.correct_value,
    explanation: {
      how_to_start: base.explanation.how_to_start,
      steps: base.explanation.steps,
      answer: base.explanation.answer || `الإجابة الصحيحة: ${optionSet.correct_value}.`,
      fast_method: base.explanation.fast_method || null,
      remember: base.explanation.remember,
      distractor_analysis: optionSet.distractor_analysis
    },
    metadata: {
      generated: true,
      engine_version: base.engine_version || '1.0.0',
      template_id: base.template_id,
      parameters: base.parameters || {},
      estimated_steps: base.estimated_steps ?? null,
      concept_tags: base.concept_tags || [],
      // --- optional QA fields added in v1.3.0; no existing field is removed ---
      fingerprint,
      asked_unknown: base.askedUnknown ?? 'default',
      stage_count: base.stageCount ?? null,
      reasoning_graph: base.reasoningGraph ?? null,
      complexity_score: complexity.score,
      complexity_band: complexity.band,
      complexity_factors: complexity.factors,
      empirical_difficulty: null,
      correct_numeric_rank: optionSet.numeric_rank,
      options_meta: optionSet.options_meta,
      target_skill: base.pedagogy?.targetSkill ?? null,
      target_misconception: base.pedagogy?.targetMisconception ?? null,
      ...base.metadata
    }
  };
  // Kept outside metadata spread so a template cannot overwrite it.
  q.metadata.fingerprint = fingerprint;
  return q;
}

export function validateQuestion(q) {
  const errors = [];
  if (!q || typeof q !== 'object') return {valid:false, errors:['Question is not an object'], reasons:[REASON.MISSING_QUESTION]};
  const letters = Object.keys(q.options || {});
  if (letters.length !== 6 || LETTERS.some(l => !(l in q.options))) errors.push(REASON.OPTIONS_MUST_HAVE_A_TO_F);
  const vals = LETTERS.map(l => q.options?.[l]);
  if (new Set(vals).size !== 6) errors.push(REASON.OPTIONS_MUST_BE_UNIQUE);
  if (!LETTERS.includes(q.correct_option)) errors.push(REASON.INVALID_CORRECT_OPTION);
  if (q.options?.[q.correct_option] !== q.correct_value) errors.push(REASON.CORRECT_VALUE_MISMATCH);
  const matching = vals.filter(v => v === q.correct_value).length;
  if (matching === 0) errors.push(REASON.NO_CORRECT_OPTION);
  else if (matching > 1) errors.push(REASON.MULTIPLE_CORRECT_OPTIONS);
  if (!q.question?.trim()) errors.push(REASON.MISSING_QUESTION);
  if (!q.explanation?.how_to_start) errors.push(REASON.MISSING_HOW_TO_START);
  if (!Array.isArray(q.explanation?.steps) || !q.explanation.steps.length) errors.push(REASON.MISSING_STEPS);
  if (!q.explanation?.remember) errors.push(REASON.MISSING_REMEMBER);
  if (!['easy','medium','hard'].includes(q.difficulty)) errors.push(REASON.INVALID_DIFFICULTY);
  return {valid: errors.length === 0, errors, reasons: errors};
}

/**
 * Section 13-B. Identity is the reasoning the question asks for, so the same
 * item with its choices shuffled collides with the original.
 */
export function questionSignature(q) {
  return questionFingerprint(q);
}

/**
 * Section 35. A soft balance, not a quota. The old schedule handed out the
 * letters in a fixed A,B,C,D,E,F cycle before shuffling, which produces a
 * predictable 9/9/8/8/8/8 split in a 50-item session. Here the base allocation
 * is spread evenly and the remainder is handed to randomly chosen letters, so
 * no letter has a fixed share.
 */
export function buildBalancedLetterSchedule(count, rng) {
  const per = Math.floor(count / LETTERS.length);
  const remainder = count - per * LETTERS.length;
  const base = [];
  for (const letter of LETTERS) for (let i = 0; i < per; i++) base.push(letter);
  const bonusLetters = rng.shuffle(LETTERS).slice(0, remainder);
  base.push(...bonusLetters);
  return rng.shuffle(base);
}

export function arabicJoin(items) {
  if (items.length <= 1) return items[0] || '';
  if (items.length === 2) return `${items[0]} و${items[1]}`;
  return `${items.slice(0,-1).join('، ')}، و${items.at(-1)}`;
}

export function dayShift(dayIndex, delta) {
  return ((dayIndex + delta) % 7 + 7) % 7;
}

export const DAYS_AR = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

export function divisorsOf(n, min=1, max=n) {
  const arr=[];
  for(let i=Math.max(1,min); i<=Math.min(max,n); i++) if(n%i===0) arr.push(i);
  return arr;
}

export function makeId(prefix, seed) {
  const safe = String(seed).replace(/[^a-zA-Z0-9_-]/g,'').slice(-18) || 'seed';
  return `${prefix}-${safe}`;
}
