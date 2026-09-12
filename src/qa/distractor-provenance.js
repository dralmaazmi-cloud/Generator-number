// RC2-012. A distractor is the value a nameable mistake produces. A learner
// never starts from the answer, so a derivation that starts from the answer is
// not a derivation — it is decoration standing where a reason should be.
//
// The audit found 193 of 1,250 wrong options (15.4%) were the key plus or minus
// a small number, one question carrying four of them (WORK_H_WORKERS_EFF:
// 9−1, 9+1, 9+2, 9−2) and one derivation reading literally "8 ± 5". Measured
// across the whole engine with the mechanical test below — does the derivation
// begin with the correct answer? — the rate is 24.9% of wrong options, and 40%
// of questions carry two or more.
//
// Two different things hide under that number, and the check separates them:
//
//   HOLLOW      no reasoning step produces this value; the option exists to
//               fill a slot. These must go.
//   REAL        a genuine slip whose value happens to sit next to the key, with
//               the derivation written from the key out of laziness. These keep
//               their value, gain a derivation in the question's own quantities,
//               and must name the step of the published solution they corrupt.
//
// A distractor that names its step is making a claim a reader can check against
// the explanation; one that says "key + 1" is not.

import {REASON} from './reasons.js';

const OPS = '[+−\\-×÷*/]';

/** Escapes a value for use as a literal inside a RegExp. */
const esc = v => String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Does this derivation begin by taking the correct answer as an operand?
 * That is the mechanical signature of reasoning backwards from the key.
 */
export function isAnswerDerived(derivation, correct) {
  if (!derivation) return false;
  const re = new RegExp(`^\\s*\\(?\\s*${esc(correct)}\\s*\\)?\\s*${OPS}`);
  return re.test(String(derivation));
}

/**
 * @param {object} base the family descriptor
 * @returns {{valid:boolean, reasons:string[], details:object}}
 *
 * Two rules:
 *   1. At most one distractor per question may be answer-derived. The audit's
 *      worst case had four in one question; a paper where most wrong options are
 *      the key nudged sideways teaches a learner to pick the middle of the
 *      cluster, which is a leak as well as a pedagogical failure.
 *   2. The one that remains must name the reasoning step it corrupts, and that
 *      step must exist in the published explanation.
 */
export function validateDistractorProvenance(base) {
  const correct = base.correct;
  const steps = Array.isArray(base.steps) ? base.steps : [];
  const answerDerived = [];
  const unattributed = [];
  const outOfRange = [];

  for (const d of base.distractors || []) {
    if (!isAnswerDerived(d.derivation, correct)) continue;
    answerDerived.push({value: d.value, misconceptionId: d.misconceptionId, derivation: d.derivation});
    const step = d.reasoningStepAffected;
    if (step === undefined || step === null) {
      unattributed.push({value: d.value, misconceptionId: d.misconceptionId, derivation: d.derivation});
    } else if (!Number.isInteger(step) || step < 1 || step > steps.length) {
      outOfRange.push({value: d.value, misconceptionId: d.misconceptionId, reasoningStepAffected: step, steps: steps.length});
    }
  }

  const reasons = [];
  if (answerDerived.length > 1) reasons.push(REASON.EXCESS_ANSWER_DERIVED_DISTRACTORS);
  if (unattributed.length || outOfRange.length) reasons.push(REASON.UNATTRIBUTED_ANSWER_DERIVED_DISTRACTOR);

  return {
    valid: reasons.length === 0,
    reasons,
    details: reasons.length
      ? {answerDerived, unattributedAnswerDerived: unattributed, stepOutOfRange: outOfRange}
      : {}
  };
}
