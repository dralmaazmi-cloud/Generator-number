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
 * Collects every number the question states, so a derivation that starts from a
 * GIVEN can be told apart from one that starts from the ANSWER. Without this the
 * test misfires whenever a given happens to equal the key — PL_M_DISC_MARK
 * prices a 200-dirham item and sells it for 200, and its honest derivation
 * "200 × (100 − 20) ÷ 100" starts from the tag price, not from the answer.
 */
function givenValues(base) {
  const out = new Set();
  const walk = v => {
    if (typeof v === 'number') out.add(String(v));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(base?.parameters || {});
  // Numbers written into the stem but not declared as parameters still count as
  // given: the learner can see them.
  for (const m of String(base?.question ?? '').matchAll(/\d+(?:\.\d+)?/g)) out.add(m[0]);
  return out;
}

/**
 * Does this derivation begin by taking the correct answer as an operand?
 * That is the mechanical signature of reasoning backwards from the key.
 *
 * @param {Set<string>} [givens] values the learner was given; a leading operand
 *        drawn from these is a starting point, not the answer, even when the two
 *        happen to be equal.
 */
export function isAnswerDerived(derivation, correct, givens = null) {
  if (!derivation) return false;
  // The shape the audit evidenced, and the only one that is a key-neighbour:
  // the ANSWER, one operator, one number, and nothing else. "8 ± 5" and the
  // 9−1 / 9+1 / 9+2 / 9−2 set match; "profit ÷ sale × 100" and
  // "600 × 125 ÷ 100" do not — those pass through an intermediate a learner
  // actually computes, and only coincide with the key for these numbers.
  const re = new RegExp(`^\\s*\\(?\\s*${esc(correct)}\\s*\\)?\\s*(${OPS})\\s*\\(?\\s*-?\\d+(?:\\.\\d+)?\\s*\\)?\\s*$`);
  if (!re.test(String(derivation))) return false;
  // A derivation that starts from a number the learner was GIVEN is a starting
  // point, not the answer, even when the two happen to be equal.
  return !(givens && givens.has(String(correct)));
}

/**
 * @param {object} base the family descriptor
 * @returns {{valid:boolean, reasons:string[], details:object}}
 *
 * Two rules, aimed at what the audit actually objected to rather than at the
 * arithmetic shape:
 *
 *   1. Every answer-derived distractor must name the reasoning step it
 *      corrupts, and that step must exist in the published explanation. This is
 *      the audit's own justified/unjustified distinction, mechanised: a
 *      distractor that can point at a step is making a claim a reader can check;
 *      "key + 1" is not.
 *
 *   2. No two answer-derived distractors may carry the SAME misconception. The
 *      audit's worst case was WORK_H_WORKERS_EFF offering 9−1, 9+1, 9+2 and 9−2
 *      — four options that are one nudge repeated, not four errors. Two
 *      differently named errors that both happen to sit near the key are a
 *      different thing: in the ages family "answered the future age" and
 *      "answered the other person's age" ARE the content, and each is
 *      necessarily expressed relative to the age asked for.
 */
export function validateDistractorProvenance(base) {
  const correct = base.correct;
  const givens = givenValues(base);
  // buildBase moves the solution steps under `explanation`; a family descriptor
  // that has not been through it still carries them at the top level.
  const steps = Array.isArray(base.explanation?.steps) ? base.explanation.steps
    : Array.isArray(base.steps) ? base.steps : [];
  const answerDerived = [];
  const unattributed = [];
  const outOfRange = [];

  for (const d of base.distractors || []) {
    if (!isAnswerDerived(d.derivation, correct, givens)) continue;
    answerDerived.push({value: d.value, misconceptionId: d.misconceptionId, derivation: d.derivation});
    const step = d.reasoningStepAffected;
    if (step === undefined || step === null) {
      unattributed.push({value: d.value, misconceptionId: d.misconceptionId, derivation: d.derivation});
    } else if (!Number.isInteger(step) || step < 1 || step > steps.length) {
      outOfRange.push({value: d.value, misconceptionId: d.misconceptionId, reasoningStepAffected: step, steps: steps.length});
    }
  }

  const byMisconception = {};
  for (const a of answerDerived) {
    byMisconception[a.misconceptionId] = (byMisconception[a.misconceptionId] || 0) + 1;
  }
  const repeated = Object.entries(byMisconception).filter(([, n]) => n > 1).map(([id]) => id);

  const reasons = [];
  if (repeated.length) reasons.push(REASON.REPEATED_ANSWER_DERIVED_MISCONCEPTION);
  if (unattributed.length || outOfRange.length) reasons.push(REASON.UNATTRIBUTED_ANSWER_DERIVED_DISTRACTOR);

  return {
    valid: reasons.length === 0,
    reasons,
    details: reasons.length
      ? {answerDerived, repeatedMisconceptions: repeated, unattributedAnswerDerived: unattributed, stepOutOfRange: outOfRange}
      : {}
  };
}
