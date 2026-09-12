// Sections 10, 11, 12 (ratios) and 13 (percentage cancellation).
//
// A question can be arithmetically perfect and still fail as a measurement: if
// the wrong method the template exists to catch happens to give the right answer
// for these particular numbers, the item measures nothing.
//
// The rejection is always tied to the template's declared target. Two equal
// numbers are not, on their own, grounds for anything.

import {REASON} from './reasons.js';
import {gcd} from '../utils.js';

const EPS = 1e-9;
const same = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < EPS;

/**
 * RC2-005. Answer equality across the types this engine actually publishes:
 * numbers compare within epsilon, everything else (a day name, a person, an
 * Arabic statement, a fraction name) compares as the string it is published as.
 * A numeric string and the number it denotes are the same answer.
 */
function sameAnswer(a, b) {
  const an = typeof a === 'number' ? a : Number(a);
  const bn = typeof b === 'number' ? b : Number(b);
  if (Number.isFinite(an) && Number.isFinite(bn) && String(a).trim() !== '' && String(b).trim() !== '') {
    return same(an, bn);
  }
  return String(a) === String(b);
}

/**
 * @param {object} spec
 * @param {number|string} spec.correct
 * @param {object} [spec.pedagogy]
 * @param {string} [spec.pedagogy.targetSkill]
 * @param {string} [spec.pedagogy.targetMisconception]
 * @param {number|string} [spec.pedagogy.wrongMethodValue]  what the target misconception yields
 * @param {Array<{when:boolean, code?:string, note:string}>} [spec.pedagogy.degenerateWhen]
 * @param {object} [spec.ratio]    {a, b, requireReduced, requireDistinctSides, label}
 * @param {object} [spec.realism]  {parentAgeAtBirth, ages:[...], siblingGap}
 */
export function validatePedagogy(spec) {
  const reasons = [];
  const details = {};
  const ped = spec.pedagogy || {};

  // RC2-005. The check used to require a finite NUMBER, so every template whose
  // answer is a day name, a person, a statement or a fraction name was outside
  // the model entirely — 23 of 107 templates, and with them the two families
  // where the degeneracy is easiest to produce. A wrong method that lands on the
  // key is the same defect whatever type the key has.
  if (ped.targetMisconception && ped.wrongMethodValue !== undefined && ped.wrongMethodValue !== null) {
    if (sameAnswer(ped.wrongMethodValue, spec.correct)) {
      reasons.push(REASON.DEGENERATE_WRONG_METHOD_EQUALS_KEY);
      details.wrongMethod = {misconception: ped.targetMisconception, value: ped.wrongMethodValue};
    }
  }

  for (const rule of ped.degenerateWhen || []) {
    if (rule && rule.when) {
      reasons.push(rule.code || REASON.DEGENERATE_PARAMETERS);
      details.degenerate = [...(details.degenerate || []), rule.note];
    }
  }

  for (const r of asArray(spec.ratio)) {
    const {a, b, requireReduced = false, requireDistinctSides = false, label = 'ratio'} = r;
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (requireReduced && gcd(a, b) !== 1) {
      reasons.push(REASON.REDUCIBLE_RATIO);
      details.ratio = [...(details.ratio || []), `${label}:${a}:${b} not reduced`];
    }
    if (requireDistinctSides && a === b) {
      reasons.push(REASON.EQUAL_RATIO_SIDES);
      details.ratio = [...(details.ratio || []), `${label}:${a}:${b} equal sides`];
    }
  }

  const realism = spec.realism;
  if (realism) {
    const r = validateRealism(realism);
    reasons.push(...r.reasons);
    if (r.reasons.length) details.realism = r.details;
    if (r.softWarnings.length) details.realismSoftWarnings = r.softWarnings;
  }

  return {valid: reasons.length === 0, reasons: [...new Set(reasons)], details};
}

function asArray(v) { return !v ? [] : Array.isArray(v) ? v : [v]; }

export const REALISM = Object.freeze({
  MIN_PARENT_AGE_AT_BIRTH: 18,
  MAX_PARENT_AGE_AT_BIRTH: 50,
  MAX_HUMAN_AGE: 95,
  PREFERRED_SIBLING_GAP: 15
});

/**
 * Section 11. An editorial constraint, not a mathematical one — it is reported
 * as such in validationMeta. The sibling gap is a soft preference: a 22-year gap
 * is unusual, not impossible, and must not fail a sound question.
 */
export function validateRealism({parentAgeAtBirth = null, ages = [], siblingGap = null} = {}) {
  const reasons = [];
  const details = [];
  const softWarnings = [];

  if (parentAgeAtBirth !== null && Number.isFinite(parentAgeAtBirth)) {
    if (parentAgeAtBirth < REALISM.MIN_PARENT_AGE_AT_BIRTH) {
      reasons.push(REASON.UNREALISTIC_AGE);
      details.push(`parent age at birth ${parentAgeAtBirth} < ${REALISM.MIN_PARENT_AGE_AT_BIRTH}`);
    } else if (parentAgeAtBirth > REALISM.MAX_PARENT_AGE_AT_BIRTH) {
      reasons.push(REASON.UNREALISTIC_AGE);
      details.push(`parent age at birth ${parentAgeAtBirth} > ${REALISM.MAX_PARENT_AGE_AT_BIRTH}`);
    }
  }

  for (const a of ages) {
    if (!Number.isFinite(a)) continue;
    if (a <= 0) { reasons.push(REASON.UNREALISTIC_AGE); details.push(`age ${a} <= 0`); }
    else if (a > REALISM.MAX_HUMAN_AGE) { reasons.push(REASON.UNREALISTIC_AGE); details.push(`age ${a} > ${REALISM.MAX_HUMAN_AGE}`); }
  }

  if (siblingGap !== null && Number.isFinite(siblingGap) && Math.abs(siblingGap) > REALISM.PREFERRED_SIBLING_GAP) {
    softWarnings.push(`sibling gap ${siblingGap} above preferred ${REALISM.PREFERRED_SIBLING_GAP} (editorial preference only)`);
  }

  return {valid: reasons.length === 0, reasons: [...new Set(reasons)], details, softWarnings, kind: 'editorial_realism_constraint'};
}
