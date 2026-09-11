// Shared scaffolding for the family generators.
//
// Two rules the helpers exist to enforce:
//   * a distractor is only ever created through `mk`, which demands a
//     misconception id and the derivation that produced the value (Section 14);
//   * a number and an Arabic unit only ever meet inside `u` / `plain`, which
//     delegate to the central lexicon (Section 12).

import {formatNumberWithUnit, unitWordFor, displayNumber} from '../arabic/units.js';
import {Fraction} from '../qa/fraction.js';
import {isKnownMisconception} from '../qa/misconceptions.js';

/** Distractor with provenance. Anything else is rejected by makeOptionSet. */
export function mk(value, misconceptionId, derivation) {
  if (!isKnownMisconception(misconceptionId)) {
    throw new Error(`Unknown misconception id: ${misconceptionId}`);
  }
  return {value, misconceptionId, derivation: derivation ?? null};
}

/**
 * Keeps only usable distractors. Beyond sign and finiteness this drops values a
 * learner would never actually write down — a mistake that lands on
 * 35.714286 is not a plausible answer, so it is not a plausible distractor.
 * This is a presentation filter; provenance is enforced separately.
 */
export function usable(distractors, {allowZero = false, allowNegative = false, maxDecimals = 2} = {}) {
  return distractors.filter(d => {
    if (!d) return false;
    const v = d.value;
    if (typeof v !== 'number') return true;
    if (!Number.isFinite(v)) return false;
    if (!allowNegative && v < 0) return false;
    if (!allowZero && v === 0) return false;
    const f = Fraction.from(v);
    if (!f.isExactDecimal || f.decimalPlaces > maxDecimals) return false;
    return true;
  });
}

/** `12 يومًا`, `يومان`, `3 أيام` — the only way a count meets a unit. */
export const u = (n, unitId, ctx = 'nominative') => formatNumberWithUnit(n, unitId, ctx);
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
export function buildBase(ctx, spec) {
  const {
    templateId, subskill, difficulty, question, displayExpression = null,
    correct, distractors, format, steps, howToStart, remember, fastMethod,
    estimatedSteps, conceptTags = [], parameters = {}, oracle = null,
    askedUnknown = 'default', stageCount = null, reasoningGraph = null,
    pedagogy = null, ratio = null, realism = null, complexityFactors = {},
    textParams = null, allowedConstants, commutative = null, answerText = null,
    metadata = null
  } = spec;

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
    distractors,
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
    complexityFactors,
    textParams,
    allowedConstants,
    commutative,
    metadata
  };
}

function makeStableId(prefix, seed) {
  const safe = String(seed).replace(/[^a-zA-Z0-9_-]/g, '').slice(-18) || 'seed';
  return `${prefix}-${safe}`;
}
