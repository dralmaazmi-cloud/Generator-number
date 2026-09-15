import {isKnownMisconception, CORRECT_FEEDBACK} from './qa/misconceptions.js';
import {renderRationale} from './qa/rationale.js';
import {REASON} from './qa/reasons.js';

// RC2.6-3. Every personal name the generators draw from, so the stem skeleton
// can take names out without guessing which Arabic words are names.
// RC2.7-3. One pool, declared once, in src/compose/entities.js. It used to be
// written out here and again in the relational family, which is how the two
// drifted apart.
import {NAME_POOL, entityKindsIn} from './compose/entities.js';
import {deriveOperationProfile, computeComplexity} from './qa/complexity.js';
import {tidyArithmetic, tidyArithmeticAll} from './arabic/tidy-arithmetic.js';
import {structuralBandOf, criteriaOf} from './qa/structure.js';
import {coreConstructionSignature, reasoningTargetPair} from './qa/core-construction.js';
import {userPerceptualSignature, taskSignature, subIdeaSignature, infoStructureOf} from './qa/perceptual.js';
import {stemSkeleton, scenarioSignature, constructionSignature,
  skillSignature, entityPattern, parameterizationSignature, normalizedStemIdentity} from './qa/construction.js';
import {buildFingerprint, buildSemanticFingerprint, buildStructuralSignature, questionFingerprint} from './qa/fingerprint.js';

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
  preferredCorrectLetter = null,
  // RC2.9.4-A1. Where the options are shown, so the rationale can be rendered
  // for this family and template rather than from a family-blind sentence.
  family = null,
  templateId = null
}) {
  const correctFormatted = format(correct);
  const seenFormatted = new Set([correctFormatted]);
  const pool = [];

  for (const d of distractors || []) {
    if (!d || typeof d !== 'object' || !('value' in d)) continue;
    const {value, misconceptionId, derivation, reasoningStepAffected = null} = d;
    if (!isKnownMisconception(misconceptionId)) continue;        // no provenance, no option
    if (typeof value === 'number' && !Number.isFinite(value)) continue;
    const formatted = format(value);
    if (formatted === correctFormatted || seenFormatted.has(formatted)) continue;
    seenFormatted.add(formatted);
    pool.push({value, formatted, misconceptionId, derivation: derivation || null, reasoningStepAffected,
      implausible: d.implausible === true});
  }

  if (pool.length < 5) {
    const err = new Error(`Only ${pool.length} distractors with misconception provenance`);
    err.reason = REASON.DISTRACTOR_NO_MISCONCEPTION;
    err.available = pool.length;
    throw err;
  }

  // RC2-001. The five shown distractors are drawn from the provenance-carrying
  // pool without reference to the key's numeric rank, to the shape of the
  // resulting option set, or to any other property of the published answer.
  //
  // RC2.1-3. Candidates a template marked implausible are drawn from last. That
  // mark is computed from the question's GIVENS — "an average of two speeds lies
  // between them" — and never from the answer, so this remains a choice made
  // without consulting any property of the key. Where a template has five or
  // more plausible candidates the implausible ones simply go unused; where it has
  // fewer they still fill the set, so no template is starved into resampling.
  const preferred = pool.filter(d => !d.implausible);
  const fallback = pool.filter(d => d.implausible);
  // RC2.3-4. Among equally plausible candidates, a set that diagnoses five
  // DIFFERENT mistakes is worth more than one that diagnoses three. Measured
  // before this, 14.9% of published wrong options repeated a misconception
  // already on the page, so the learner who picked either was told the same
  // thing twice and the set taught less than its six slots suggest.
  //
  // This selects on PROVENANCE — which slip a candidate came from — and never on
  // the value, the key, or the shape of the resulting set, so OBSERVE_NEVER_TARGET
  // is untouched: the same five candidates would be chosen whatever the answer
  // turned out to be. Where a template does not offer five distinct slips, the
  // repeats still fill the set rather than the template being starved.
  const spread = candidates => {
    const byMisconception = new Map();
    for (const d of rng.shuffle(candidates)) {
      if (!byMisconception.has(d.misconceptionId)) byMisconception.set(d.misconceptionId, []);
      byMisconception.get(d.misconceptionId).push(d);
    }
    const out = [];
    const queues = [...byMisconception.values()];
    for (let round = 0; out.length < candidates.length; round++) {
      for (const q of queues) if (q[round] !== undefined) out.push(q[round]);
      if (round > candidates.length) break;
    }
    return out;
  };
  const take = (candidates, n) => spread(candidates).slice(0, n);
  const picked = preferred.length >= 5
    ? take(preferred, 5)
    : [...take(preferred, preferred.length), ...take(fallback, 5 - preferred.length)];

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
      optionsMeta[letter] = {correct: true, value: correct, misconceptionId: null, derivation: null, reasoningStepAffected: null};
    } else {
      const item = shuffledWrong[wi++];
      options[letter] = item.formatted;
      // RC2.9.4-A1. Rendered from the option's own provenance and the site it
      // is shown at; see src/qa/rationale.js.
      distractorAnalysis[letter] = renderRationale({
        optionText: item.formatted,
        value: item.value,
        misconceptionId: item.misconceptionId,
        derivation: item.derivation,
        family, templateId
      });
      // RC2-012: which step of the published solution this error corrupts.
      optionsMeta[letter] = {correct: false, value: item.value, misconceptionId: item.misconceptionId, derivation: item.derivation, reasoningStepAffected: item.reasoningStepAffected};
    }
  }
  // RC2-001 / OBSERVE_NEVER_TARGET. Both figures below are computed *after* the
  // pedagogically valid question and its options already exist. They are
  // observations for QA and are never read back into generation: nothing above
  // this point consults them, and no retry, acceptance or selection depends on
  // them. Rank is read off the raw values, not the rendered strings: a count of
  // 1 renders as "كيلومتر واحد" with no numeral, which no text parse can rank.
  return {
    options,
    correct_option: correctLetter,
    correct_value: correctFormatted,
    distractor_analysis: distractorAnalysis,
    options_meta: optionsMeta,
    numeric_rank: rankFromRawValues(picked.map(p => p.value), correct),
    // Observation only: the span of positions this instance's pool could have
    // produced. Recorded so leakage can be measured, never used to steer.
    feasible_rank_range: observedFeasibleRankRange(pool, correct)
  };
}

/**
 * RC2-001, observation only.
 *
 * The span of key positions this instance's distractor pool *could* have
 * produced, had a chooser existed. Nothing chooses: this is computed after the
 * options are built so that answer-position leakage can be measured across a
 * corpus. It is never consulted during generation.
 *
 * The function that used to live here — pickBalancedDistractors — drew a target
 * rank from a fitted weight table and then sliced the below-key and above-key
 * pools to land the key on it, excluding valid provenance-carrying distractors
 * to do so. It also re-sampled up to twelve times to avoid a lone multiple of
 * five among the six values. Both behaviours selected among pedagogically valid
 * distractors on the strength of a property of the published answer, and both
 * are gone. See RC2_SCOPE_FROZEN.json, constraint OBSERVE_NEVER_TARGET.
 */
function observedFeasibleRankRange(pool, correct) {
  const correctNum = typeof correct === 'number' ? correct : Number(correct);
  if (!Number.isFinite(correctNum)) return null;
  const below = pool.filter(p => Number(p.value) < correctNum).length;
  const above = pool.filter(p => Number(p.value) > correctNum).length;
  if (!below || !above) return null;
  const minBelow = Math.max(0, 5 - above);
  const maxBelow = Math.min(5, below);
  return [Math.min(minBelow, maxBelow) + 1, Math.max(minBelow, maxBelow) + 1];
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
    preferredCorrectLetter,
    family: base.family,
    templateId: base.template_id
  });

  const complexity = computeComplexity(base.complexityFactors || {});
  // RC2.3-1. Throws for a template nobody adjudicated, rather than guessing.
  const structuralBand = structuralBandOf(base.template_id);
  // RC2-022 / RC2-023. Three fingerprints, three purposes, kept distinct:
  //   fingerprint  — this exact generated instance
  //   semantic     — mathematically equivalent content, display order removed
  //   structural   — the reasoning pattern, incidental values removed
  const fingerprintSpec = {
    family: base.family,
    templateId: base.template_id,
    askedUnknown: base.askedUnknown,
    stageCount: base.stageCount,
    reasoningGraph: base.reasoningGraph,
    namedParameters: base.parameters || {},
    commutative: base.commutative
  };
  const fingerprint = buildFingerprint(fingerprintSpec);
  const semanticFingerprint = buildSemanticFingerprint({
    ...fingerprintSpec,
    orderInsensitive: base.orderInsensitive
  });
  const operationKinds = deriveOperationProfile(base.explanation?.steps ?? base.steps)?.kinds ?? [];
  // RC2.7-R1. The scenario-independent identity. See src/qa/core-construction.js:
  // the RC2.6/RC2.7 `construction_signature` had the scenario in it, so every
  // scenario added inflated it without a reader seeing a new question.
  const coreSpec = {
    oracle: base.oracle,
    askedUnknown: base.askedUnknown,
    direction: base.direction,
    operationKinds,
    reasoningPattern: base.reasoningPattern,
    dependencyDepth: base.complexityFactors?.dependencyDepth ?? 0,
    stageCount: base.stageCount ?? 0
  };
  const userConstructionSignature = coreConstructionSignature(coreSpec);
  const reasoningTarget = reasoningTargetPair(coreSpec);
  // RC2.8-1. The perceptual identity. Coarser than the core signature on
  // purpose: it normalises what a reader does not perceive as a difference —
  // commutative operand order, a product split across two steps, which SEAT of
  // an ordering is asked about — and adds the axis the core signature has no
  // view of at all, how the information is laid out. See src/qa/perceptual.js.
  const perceptualSpec = {...coreSpec, templateId: base.template_id};
  const perceptualSignature = userPerceptualSignature(perceptualSpec);
  const structuralSignature = buildStructuralSignature({
    family: base.family,
    templateId: base.template_id,
    askedUnknown: base.askedUnknown,
    reasoningPattern: base.reasoningPattern,
    // RC2.2-4. The kinds of transformation this solution composes, so an item
    // without a declared pattern still has a reasoning identity.
    operationKinds
  });

  const q = {
    id: base.id,
    generator_id: base.generator_id,
    seed: base.seed,
    family: base.family,
    family_ar: base.family_ar,
    category: base.category,
    subskill: base.subskill,
    // RC2.3-1. The published difficulty is the STRUCTURAL band.
    //
    // RC2.2 published the computed band, which removed declared/computed
    // disagreement entirely — and the independent Holdout D audit then found 44
    // of 82 items released as hard were not hard. Agreement between two views of
    // one number was never evidence that the number measured the right thing.
    //
    // The score ranks reasoning burden on one axis; what makes a question hard is
    // the KIND of reasoning it demands, which is a property of the template's
    // structure and not of its arithmetic. So the band comes from the structural
    // adjudication, and the score is kept beside it as evidence — reportable,
    // falsifiable, and no longer the thing that decides the label.
    difficulty: structuralBand,
    difficulty_ar: DIFFICULTY_LABELS[structuralBand],
    question: base.question,
    display_expression: base.display_expression ?? null,
    options: optionSet.options,
    correct_option: optionSet.correct_option,
    correct_value: optionSet.correct_value,
    // RC2.9.3-1. The explanation the learner reads is tidied HERE, at the last
    // step before publication: every signal computed above (operation kinds,
    // complexity, provenance, the step a wrong option points at) was read from
    // the raw text, so no scoring or identity decision moves because a «× 1»
    // stopped being printed. See src/arabic/tidy-arithmetic.js.
    explanation: {
      how_to_start: tidyArithmetic(base.explanation.how_to_start),
      steps: tidyArithmeticAll(base.explanation.steps),
      answer: base.explanation.answer || `الإجابة الصحيحة: ${optionSet.correct_value}.`,
      fast_method: tidyArithmetic(base.explanation.fast_method || null),
      remember: tidyArithmetic(base.explanation.remember),
      // RC2.9.4-A1. Not tidied here: the rationale renderer decides what of a
      // derivation to print, and a whole-text tidy is what turned «1 × 4» into
      // «وهي ناتج 4».
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
      semantic_fingerprint: semanticFingerprint,
      structural_reasoning_signature: structuralSignature,
      // RC2-022: which named parameters the template declares order-insensitive,
      // so the canonicalisation can be checked from outside the engine.
      order_insensitive_params: base.orderInsensitive ?? null,
      asked_unknown: base.askedUnknown ?? 'default',
      stage_count: base.stageCount ?? null,
      reasoning_graph: base.reasoningGraph ?? null,
      complexity_score: complexity.score,
      complexity_band: complexity.band,
      declared_difficulty: base.difficulty,
      // RC2.3-1. Difficulty evidence, kept separate so a reviewer can see the
      // two views disagree where they do. `structural_band` is what was
      // published; `complexity_band` is what the RC2.2 scorer would have said.
      structural_band: structuralBand,
      answer_count_unit: base.answerCountUnit ?? null,
      answer_unit_id: base.answerUnitId ?? null,
      // RC2.6-3. Construction diversity evidence: the sentence shape with its
      // numerals and names removed, the situation being told, and the
      // construction (situation + asked unknown + direction) that identifies a
      // genuinely different telling.
      stem_skeleton: stemSkeleton(base.question, NAME_POOL),
      // RC2.9-4. The stem on its own, options excluded: two items sharing it
      // are the same question asked twice however the choices are arranged.
      normalized_stem_identity: normalizedStemIdentity(
        {question: base.question, display_expression: base.display_expression ?? null}),
      scenario_signature: scenarioSignature({family: base.family, scenario: base.scenario}),
      construction_signature: constructionSignature({
        family: base.family, scenario: base.scenario,
        askedUnknown: base.askedUnknown, direction: base.direction
      }),
      // RC2.7-5. The remaining independent dimensions, each published in its own
      // right so a diversity claim can be checked dimension by dimension rather
      // than taken on one aggregate.
      skill_signature: skillSignature({family: base.family, subskill: base.subskill}),
      // RC2.7-R1. The core identity, and the coarser reasoning+target pair the
      // review asks to be reported on its own.
      user_construction_signature: userConstructionSignature,
      reasoning_target_pair: reasoningTarget,
      // RC2.8-1. The perceptual identity and the two axes it is built from,
      // published separately so a diversity claim can be checked on the axis it
      // is made about rather than on one aggregate.
      user_perceptual_signature: perceptualSignature,
      task_signature: taskSignature(perceptualSpec),
      sub_idea_signature: subIdeaSignature(perceptualSpec),
      information_structure: infoStructureOf(base.template_id),
      entry_direction: base.direction ?? 'forward',
      operation_kinds: operationKinds,
      target_signature: base.askedUnknown ?? 'default',
      stem_structure: base.stemStructure ?? 'fixed',
      information_order: base.informationOrder ?? 'given',
      entity_pattern: base.entityPattern ?? entityPattern(entityKindsIn(base.question)),
      parameterization_signature: parameterizationSignature(base.template_id, base.parameters ?? {}),
      structural_criteria: criteriaOf(base.template_id),
      band_source: 'structural_adjudication',
      score_agrees_with_structure: complexity.band === structuralBand,
      complexity_factors: complexity.factors,
      empirical_difficulty: null,
      correct_numeric_rank: optionSet.numeric_rank,
      feasible_rank_range: optionSet.feasible_rank_range,
      options_meta: optionSet.options_meta,
      target_skill: base.pedagogy?.targetSkill ?? null,
      target_misconception: base.pedagogy?.targetMisconception ?? null,
      ...base.metadata
    }
  };
  // Kept outside the metadata spread so a template cannot overwrite them.
  q.metadata.fingerprint = fingerprint;
  q.metadata.semantic_fingerprint = semanticFingerprint;
  q.metadata.structural_reasoning_signature = structuralSignature;
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
/**
 * RC2-022. Session identity is the *semantic* fingerprint: two presentations of
 * the same mathematical content are one question, however their values happen
 * to be ordered on the page.
 */
export function questionSignature(q) {
  const semantic = q?.metadata?.semantic_fingerprint;
  if (semantic) return semantic;
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
