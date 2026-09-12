// Shared scaffolding for the family generators.
//
// Two rules the helpers exist to enforce:
//   * a distractor is only ever created through `mk`, which demands a
//     misconception id and the derivation that produced the value (Section 14);
//   * a number and an Arabic unit only ever meet inside `u` / `plain`, which
//     delegate to the central lexicon (Section 12).

import {agreeingAdjective, singularOf, accusativeSingularOf, definitePlural, theSingleUnit, formatNumberWithUnit, unitWordFor, displayNumber} from '../arabic/units.js';
import {deriveDependencyDepth, deriveOperationProfile} from '../qa/complexity.js';
import {partitionByPlausibility} from '../qa/distractor-plausibility.js';
import {Fraction} from '../qa/fraction.js';
import {isKnownMisconception} from '../qa/misconceptions.js';
import {REASON} from '../qa/reasons.js';

/**
 * Distractor with provenance. Anything else is rejected by makeOptionSet.
 *
 * RC2-012. `reasoningStepAffected` is the 1-based index of the step in the
 * published explanation that this mistake corrupts. It is required of any
 * distractor whose derivation starts from the answer — those have to say which
 * step went wrong, because "key + 1" says nothing — and is welcome on the rest.
 */
export function mk(value, misconceptionId, derivation, reasoningStepAffected = null) {
  if (!isKnownMisconception(misconceptionId)) {
    throw new Error(`Unknown misconception id: ${misconceptionId}`);
  }
  return {value, misconceptionId, derivation: derivation ?? null, reasoningStepAffected};
}

/**
 * Keeps only usable distractors. Beyond sign and finiteness this drops values a
 * learner would never actually write down — a mistake that lands on
 * 35.714286 is not a plausible answer, so it is not a plausible distractor.
 * This is a presentation filter; provenance is enforced separately.
 */
/**
 * Drops distractor values a learner could not arrive at or would never write:
 * a negative or zero count, a non-finite value, or a number needing more
 * decimal places than the answer format shows.
 *
 * RC2-003. These drops used to be silent, and DISTRACTOR_IMPOSSIBLE was a reason
 * code with no emission site anywhere in the engine. This is that code's real
 * meaning, and it is now counted.
 */
export function usable(ctx, distractors, opts = {}) {
  const {allowZero = false, allowNegative = false, maxDecimals = 2} = opts;
  const drop = (d, why) => {
    ctx?.telemetry?.record({
      stage: 'distractor_filter', reasonCode: REASON.DISTRACTOR_IMPOSSIBLE,
      family: ctx.family, seed: ctx.seed, detail: why
    });
    return false;
  };
  return distractors.filter(d => {
    if (!d) return false;
    const v = d.value;
    if (typeof v !== 'number') return true;
    if (!Number.isFinite(v)) return drop(d, 'not finite');
    if (!allowNegative && v < 0) return drop(d, 'negative');
    if (!allowZero && v === 0) return drop(d, 'zero');
    const f = Fraction.from(v);
    if (!f.isExactDecimal || f.decimalPlaces > maxDecimals) return drop(d, 'precision beyond the displayed format');
    return true;
  });
}

/**
 * Rounds a distractor to the precision a learner would actually write down.
 * Only ever applied to a *final* distractor value — never to an intermediate
 * that feeds another calculation (Section 8-A).
 */
export function approx(value, decimals = 1) {
  if (!Number.isFinite(value)) return value;
  const p = 10 ** decimals;
  return Math.round(value * p) / p;
}

/** `12 يومًا`, `يومان`, `3 أيام` — the only way a count meets a unit. */
/**
 * RC2.2-1. Picks a template for a requested band, and fails explicitly when the
 * family holds none at that band.
 *
 * After RC2.2 the pools hold the templates that actually COMPUTE each band, so
 * some families legitimately have none at some bands: odd-one-out has nothing
 * that reaches hard, fractions has nothing above easy. The instruction is to
 * fail rather than quietly hand back an easier item, so that is what happens —
 * loudly, with the family and band named.
 */
export function pickTemplate(rng, list, family, difficulty) {
  if (!Array.isArray(list) || list.length === 0) {
    throw Object.assign(
      new Error(`NO_TEMPLATE_AT_DIFFICULTY: ${family} has no template that computes ${difficulty}`),
      {code: 'NO_TEMPLATE_AT_DIFFICULTY', family, difficulty}
    );
  }
  return rng.pick(list);
}

export const u = (n, unitId, ctx = 'nominative') => formatNumberWithUnit(n, unitId, ctx);

export const adj = (n, unitId, stem, ctx = 'oblique') => agreeingAdjective(n, unitId, stem, ctx);
export const unitWord = unitId => singularOf(unitId);
export const unitWordKam = unitId => accusativeSingularOf(unitId);
export const theSingle = unitId => theSingleUnit(unitId);
export const defPlural = unitId => definitePlural(unitId);

/**
 * RC2.1-4. «ارتفعت الكفاءة بنسبة 150%» is ambiguous in a way «بنسبة 20%» is not.
 *
 * Below 100% the two readings are not both viable: "rose by 20%" and "rose to
 * 20%" cannot both be a rise, so the sentence resolves itself. At 100% and above
 * both readings remain increases — "rose by 150%" (to 250% of before) and "rose
 * to 150%" are each plausible — and the reader has no way to choose. The
 * independent review flagged exactly that case.
 *
 * So the resulting level is stated outright once the ambiguity is real. The rule
 * is on the number, not on a template name: widen any percentage pool later and
 * the clarification follows automatically.
 */
export function risePercentPhrase(pct) {
  // The clarification must not introduce a numeral the stem cannot source. An
  // earlier attempt appended «(أي صارت 250% مما كانت عليه)», and the text-params
  // guard correctly rejected every candidate with pct >= 100 — silently removing
  // 38% of this template's parameter space. Naming the base instead of computing
  // a second percentage says the same thing and adds no number:
  // «بنسبة 150% من القيمة السابقة» can only mean an increase OF 150% OF the
  // previous value.
  return pct >= 100
    ? `بنسبة ${pct}% من القيمة السابقة`
    : `بنسبة ${pct}%`;
}
export const word = (n, unitId) => unitWordFor(n, unitId);
export const num = n => displayNumber(n);

/** A choice formatter bound to one unit. */
export const unitFormat = (unitId, ctx = 'nominative') => v => formatNumberWithUnit(v, unitId, ctx);

/** Exact value as an display string; throws nothing, rounds only for display. */
export function exact(value) {
  return Fraction.from(value).toDecimalString();
}

/**
 * Section 8-C. A percent factor is a derived value, so the explanation must show
 * where it came from rather than announcing 1.25 out of nowhere.
 */
export function factorLine(pct, direction = 'up', label = 'معامل التغير') {
  const f = direction === 'up'
    ? Fraction.from(1).add(Fraction.from(pct).div(100))
    : Fraction.from(1).sub(Fraction.from(pct).div(100));
  const sign = direction === 'up' ? '+' : '-';
  return {factor: f, text: `${label} = 1 ${sign} ${pct} ÷ 100 = ${f.toDecimalString()}.`};
}

/** Builds the oracle constraint `left == right` from expression trees. */
export const eq = (left, right) => ({op: 'eq', left, right});
export const gt = (left, right) => ({op: 'gt', left, right});
export const gte = (left, right) => ({op: 'gte', left, right});
export const isInt = left => ({op: 'int', left});

/** Expression helpers for oracle statements. */
export const X = 'x';
export const add = (...parts) => ({add: parts});
export const sub = (a, b) => ({sub: [a, b]});
export const mul = (...parts) => ({mul: parts});
export const div = (a, b) => ({div: [a, b]});
export const mod = (a, b) => ({mod: [a, b]});
export const abs = a => ({abs: a});

/**
 * The published shape every family returns. Keeping it in one place means the
 * QA fields cannot be forgotten by one template and present in another.
 */
/**
 * RC2-003. A sampler discarding its own draw and trying again.
 *
 * Families used to recurse directly — `return addOne(ctx)` — which made every
 * internal resample invisible to telemetry. The call is routed through here so
 * the event is counted at the stage where it actually happens.
 */
export function resample(ctx, fn, reason = REASON.SAMPLER_CONSTRAINT) {
  ctx.telemetry?.familyResample({
    family: ctx.family, templateId: fn.name, reasonCode: reason, seed: ctx.seed
  });
  return fn(ctx);
}

export function buildBase(ctx, spec) {
  const {
    templateId, subskill, difficulty, question, displayExpression = null,
    correct, distractors, format, steps, howToStart, remember, fastMethod,
    estimatedSteps, conceptTags = [], parameters = {}, oracle = null,
    askedUnknown = 'default', stageCount = null, reasoningGraph = null,
    pedagogy = null, ratio = null, realism = null, complexityFactors = {},
    textParams = null, allowedConstants, commutative = null, answerText = null,
    orderInsensitive = null, reasoningPattern = null, metadata = null,
    // RC2.1-3. Optional, and declared by the template because only the template
    // knows what its answer is bounded by. `stimulusIsOptions` marks families
    // whose six options ARE the displayed set, where a wide spread between
    // options is the question rather than a defect.
    answerBounds = null, stimulusIsOptions = false
  } = spec;

  // RC2.1-3. Implausible candidates sink to the back of the list; none is
  // dropped. A template with more candidates than slots stops offering the ones
  // a candidate could strike out without solving, and a template with exactly
  // enough is unaffected — so no template is pushed into resampling, which is
  // what narrows an answer space.
  const ordered = (() => {
    const {plausible, implausible} = partitionByPlausibility(distractors, {
      bounds: answerBounds, stimulusIsOptions
    });
    if (implausible.length && ctx?.telemetry) {
      for (const d of implausible) {
        ctx.telemetry.record({
          stage: 'distractor_plausibility', reasonCode: REASON.IMPLAUSIBLE_DISTRACTOR_DEMOTED,
          family: ctx.family, templateId, seed: ctx.seed,
          detail: `${d.misconceptionId}=${d.value} outside ${JSON.stringify(answerBounds?.between)}`
        });
      }
    }
    // Marked, not dropped: makeOptionSet prefers the plausible ones and still
    // falls back to these, so no template is pushed into resampling.
    return [...plausible.map(d => ({...d, implausible: false})),
      ...implausible.map(d => ({...d, implausible: true}))];
  })();

  return {
    id: makeStableId(templateId, ctx.seed),
    generator_id: templateId,
    template_id: templateId,
    seed: ctx.seed,
    family: ctx.family,
    family_ar: ctx.family_ar,
    category: ctx.category,
    subskill,
    difficulty: difficulty ?? ctx.difficulty,
    question,
    display_expression: displayExpression,
    correct,
    distractors: ordered,
    format,
    explanation: {
      how_to_start: howToStart,
      steps,
      answer: answerText ?? `الإجابة الصحيحة: ${format(correct)}.`,
      fast_method: fastMethod ?? null,
      remember
    },
    estimated_steps: estimatedSteps,
    concept_tags: conceptTags,
    engine_version: ctx.engineVersion,
    parameters,
    oracle,
    askedUnknown,
    stageCount,
    reasoningGraph,
    pedagogy,
    ratio,
    realism,
    // RC2.2-2. The factors the scorer actually consumes, assembled here so no
    // template has to be edited and none can inflate its own difficulty.
    //
    // Templates keep declaring what they know about themselves; what changed is
    // that the CHAIN is measured once, from the solution, instead of arriving
    // four times over as reasoningTransformations + stageCount + dependencyDepth
    // + arithmeticBurden. Those four rose together on the same steps, which is
    // why Holdout C released 82 items as hard and an independent review found 43
    // of them were not.
    complexityFactors: (() => {
      const declared = complexityFactors ?? {};
      const depth = deriveDependencyDepth(steps);
      const ops = deriveOperationProfile(steps);
      return {
        // Genuine reasoning burden.
        dependencyDepth: depth === null ? (declared.dependencyDepth ?? 0) : depth,
        // Distinct kinds of transformation composed. Working backwards and
        // converting units are transformations in their own right and are not
        // visible as operators, so they are added to what the steps show.
        transformationDepth: (ops ? ops.transformationDepth : (declared.reasoningTransformations ?? 0))
          + (declared.reverseReasoning ?? 0) + (declared.unitConversion ?? 0),
        // Conditions that must hold at once rather than in sequence.
        independentConstraints: (declared.conditionCount ?? 0) + (declared.equationSolving ?? 0),
        // Separate given information held together at once.
        informationIntegration: (declared.conceptCount ?? 0) + (declared.graphDepth ?? 0),
        ruleSearchDepth: declared.ruleSearchDepth ?? 0,
        // Workload: how many routine operations, regardless of how few ideas.
        arithmeticWorkload: ops ? ops.arithmeticWorkload : (declared.arithmeticBurden ?? 0),
        // Kept for evidence and for the audit trail; not scored.
        declared
      };
    })(),
    textParams,
    allowedConstants,
    commutative,
    // RC2-022: named parameters whose ORDER is presentation only. They are
    // sorted for the semantic fingerprint, never dropped: the content still
    // distinguishes questions.
    orderInsensitive,
    // RC2-023: the reasoning pattern, where the template has one that is
    // independent of its incidental numeric values.
    reasoningPattern,
    metadata
  };
}

function makeStableId(prefix, seed) {
  const safe = String(seed).replace(/[^a-zA-Z0-9_-]/g, '').slice(-18) || 'seed';
  return `${prefix}-${safe}`;
}
