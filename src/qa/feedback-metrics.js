// RC2-014. Feedback specificity, measured semantically.
//
// The RC1 figure — "0% -> 100% of wrong options carry specific feedback" — was
// counting the mechanical head of every sentence:
//
//   اخترت {الخيار}، وهي ناتج {الاشتقاق}. {جملة التصور الخاطئ}
//
// The head contains the option's own value, so it is unique by construction and
// the metric could not return anything but 100%. It measured string assembly,
// not whether the sentence was true.
//
// What actually has to hold, from the scope's own wording:
//
//   * the feedback must correctly describe THAT option's derivation;
//   * the misconception must be applicable to THAT stem  (RC2-013);
//   * generic or vacuous feedback is not sufficient;
//   * misattributed feedback is a defect;
//   * identical wording alone is NOT a defect.
//
// The first is checkable and is the one this file adds: read the derivation as
// arithmetic and see whether it produces the number on the paper. A learner who
// follows "وهي ناتج 12 × 100 ÷ 228" and lands somewhere else has been told
// something false, whatever the sentence after it says.
//
// The comparison is made on the DISPLAYED value, not the raw one: a learner who
// computes 5.2631... and writes it to the precision the paper uses gets 5.3, and
// the feedback is true. A derivation that lands on a different number after
// rounding is not.

import {REASON} from './reasons.js';

const ARITHMETIC_ONLY = /^[\s0-9.+\-*/()|]+$/;

export const FEEDBACK_VERDICT = Object.freeze({
  EXACT: 'EXACT',                      // the expression evaluates to the value
  ROUNDS_TO_VALUE: 'ROUNDS_TO_VALUE',  // ...once written to the displayed precision
  MISMATCH: 'MISMATCH',                // it evaluates to a different number: a defect
  PROSE: 'PROSE',                      // no arithmetic claim is made, so none can be false
  NON_NUMERIC: 'NON_NUMERIC',          // the answer is a day, a name, a fraction word
  ABSENT: 'ABSENT'                     // no derivation at all
});

/**
 * The arithmetic claim a derivation makes, if it makes one.
 *
 * Derivations are written for a reader, so many mix an expression with a clause
 * that explains it — «720 ÷ 40 بإسقاط الثلث», «81 × 2 بقراءة المعامل 2 بدل 3».
 * The expression is the falsifiable part; the clause is not. So the leading run
 * of arithmetic is taken and the rest ignored, and a derivation that is entirely
 * prose makes no arithmetic claim at all.
 */
export function extractExpression(text) {
  if (text === null || text === undefined) return null;
  const s = String(text)
    .replace(/×/g, '*').replace(/÷/g, '/')
    .replace(/[−–—\u2212]/g, '-');
  const m = /^[\s0-9.+\-*/()|]+/.exec(s);
  if (!m) return null;
  const expr = m[0].trim();
  if (!/\d/.test(expr)) return null;
  // A bare number is a statement of the value, not a calculation.
  if (/^-?\d+(?:\.\d+)?$/.test(expr)) return null;
  return expr;
}

/** Evaluates an extracted expression, resolving |x| as absolute value. */
export function evaluateDerivation(text) {
  const expr = extractExpression(text);
  if (expr === null) return null;
  if (!ARITHMETIC_ONLY.test(expr)) return null;
  // |a - b| -> Math.abs(a - b); the bars always come in pairs in this corpus.
  const bars = (expr.match(/\|/g) || []).length;
  if (bars % 2 !== 0) return null;
  let open = true;
  const resolved = expr.replace(/\|/g, () => (open = !open) ? ')' : 'Math.abs(');
  try {
    // eslint-disable-next-line no-new-func
    const v = Function(`"use strict";return (${resolved});`)();
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

const decimalsOf = v => {
  const s = String(v);
  const i = s.indexOf('.');
  return i === -1 ? 0 : s.length - i - 1;
};

/**
 * @param {object} o
 * @param {number|string} o.value    the option's value
 * @param {string|null} o.derivation
 */
export function classifyOptionFeedback({value, derivation}) {
  if (!derivation) return {verdict: FEEDBACK_VERDICT.ABSENT, evaluated: null};
  if (typeof value !== 'number') {
    // A weekday, a person, a fraction name. The derivation cannot be checked
    // arithmetically; its applicability is checked by RC2-013 instead.
    return {verdict: FEEDBACK_VERDICT.NON_NUMERIC, evaluated: null};
  }
  const evaluated = evaluateDerivation(derivation);
  if (evaluated === null) return {verdict: FEEDBACK_VERDICT.PROSE, evaluated: null};
  if (Math.abs(evaluated - value) < 1e-9) return {verdict: FEEDBACK_VERDICT.EXACT, evaluated};
  // A learner writing the result to the precision the paper shows.
  const d = decimalsOf(value);
  const p = 10 ** d;
  if (Math.abs(Math.round(evaluated * p) / p - value) < 1e-9) {
    return {verdict: FEEDBACK_VERDICT.ROUNDS_TO_VALUE, evaluated};
  }
  return {verdict: FEEDBACK_VERDICT.MISMATCH, evaluated};
}

export const FEEDBACK_DEFECTS = Object.freeze([FEEDBACK_VERDICT.MISMATCH]);

/**
 * RC2-014 as a pipeline stage: an option whose derivation makes a false
 * arithmetic claim is refused. Measuring this without enforcing it would leave
 * the metric doing what the RC1 metric did — describing rather than gating.
 */
export function validateFeedbackTruthfulness(q) {
  const meta = q.metadata?.options_meta || {};
  const offenders = [];
  for (const [letter, m] of Object.entries(meta)) {
    if (m.correct) continue;
    const r = classifyOptionFeedback({value: m.value, derivation: m.derivation});
    if (FEEDBACK_DEFECTS.includes(r.verdict)) {
      offenders.push({letter, misconceptionId: m.misconceptionId, derivation: m.derivation,
        value: m.value, evaluated: r.evaluated});
    }
  }
  // RC2-014: two wrong options explained by the same derivation are one
  // explanation shown twice — the learner cannot tell which mistake they made,
  // which is precisely what "generic feedback is not sufficient" forbids.
  const seen = new Map();
  const duplicates = [];
  for (const [letter, m] of Object.entries(meta)) {
    if (m.correct || !m.derivation) continue;
    const prior = seen.get(m.derivation);
    if (prior) duplicates.push({derivation: m.derivation, letters: [prior, letter]});
    else seen.set(m.derivation, letter);
  }

  const reasons = [];
  if (offenders.length) reasons.push(REASON.FEEDBACK_DERIVATION_MISMATCH);
  if (duplicates.length) reasons.push(REASON.DUPLICATE_DISTRACTOR_DERIVATION);

  return {
    valid: reasons.length === 0,
    reasons,
    details: reasons.length
      ? {feedbackDerivationMismatch: offenders, duplicateDerivations: duplicates}
      : {}
  };
}
