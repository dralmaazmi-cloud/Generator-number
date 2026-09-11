// Section 6. The oracle reads parameters, not the sentence the learner reads, so
// a fault in the presentation layer — the stem says 12 where the solver used 21,
// or the stem says kg where the maths used grams — is invisible to it. This
// closes that gap.

import {REASON} from './reasons.js';
import {numbersIn} from './equations.js';

const TOLERANCE = 1e-9;

function near(a, b) { return Math.abs(a - b) < TOLERANCE; }

/**
 * @param {object} spec
 * @param {string} spec.questionText       the rendered stem
 * @param {string} [spec.displayExpression]
 * @param {object} spec.parameters         what the solver actually used
 * @param {number[]} [spec.derivedFromParams] values the stem legitimately shows
 *        that are computed from parameters (a stated total, a stated final value)
 * @param {string[]} [spec.essentialParams] parameter names that must be visible
 */
export function validateTextMatchesParams({
  questionText,
  displayExpression = null,
  parameters = {},
  derivedFromParams = [],
  essentialParams = []
}) {
  const textNumbers = [
    ...numbersIn(questionText || ''),
    ...(displayExpression ? numbersIn(displayExpression) : [])
  ];
  const paramNumbers = [];
  const collect = v => {
    if (typeof v === 'number' && Number.isFinite(v)) paramNumbers.push(v);
    else if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === 'object') Object.values(v).forEach(collect);
  };
  collect(parameters);
  const allowed = [...paramNumbers, ...derivedFromParams.filter(Number.isFinite)];

  const orphanNumbers = textNumbers.filter(n => !allowed.some(a => near(a, n)));
  const missingParams = essentialParams.filter(name => {
    const v = parameters[name];
    if (typeof v !== 'number' || !Number.isFinite(v)) return false;
    return !textNumbers.some(n => near(n, v));
  });

  const reasons = (orphanNumbers.length || missingParams.length) ? [REASON.TEXT_PARAM_MISMATCH] : [];
  return {valid: reasons.length === 0, reasons, orphanNumbers, missingParams};
}
