// RC2-014 — feedback specificity, measured semantically.
//
// The RC1 figure was "0% -> 100% of wrong options carry specific feedback". It
// counted the mechanical head of the sentence — «اخترت {الخيار}، وهي ناتج
// {الاشتقاق}.» — which carries the option's own value and is therefore unique by
// construction. The metric could not return anything but 100%. It measured
// string assembly, not truth.
//
// The replacement is falsifiable: read the derivation as arithmetic and check it
// produces the number on the paper. Running it found three real classes of false
// feedback that the RC1 metric had no way to see:
//
//   COMB_H_THREE, MACH_H_TWO_TYPES  the averaged rate is rounded before use, so
//                                   «(38 ÷ 3) × 3» evaluated to 38 while the
//                                   option read 39
//   PCT_M_SUCCESSIVE                two decreases summed to −50 while the
//                                   derivation read «25 + 25»
//   PCT_E_REVERSE_ONE               a Math.max(1, …) clamp turned a negative
//                                   result into 1 while the derivation still
//                                   read «40 − 50»
//
// ...and one question in PL_H_REVERSE where two wrong options carried the same
// derivation: one explanation shown twice.

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

import Engine from '../src/index.js';
import {SeededRNG} from '../src/rng.js';
import {finalizeQuestion} from '../src/utils.js';
import {validateCandidate} from '../src/qa/pipeline.js';
import {
  classifyOptionFeedback, evaluateDerivation, extractExpression,
  validateFeedbackTruthfulness, FEEDBACK_VERDICT
} from '../src/qa/feedback-metrics.js';
import {REASON} from '../src/qa/reasons.js';

// --- reading a derivation ---------------------------------------------------

test('RC2-014: an arithmetic derivation is evaluated', () => {
  assert.equal(evaluateDerivation('12 × 2'), 24);
  assert.equal(evaluateDerivation('120 ÷ (4 + 2)'), 20);
  assert.equal(evaluateDerivation('100 − 30'), 70);
  assert.equal(evaluateDerivation('240 ÷ |70 − 80|'), 24);
});

test('RC2-014: the expression is read out of a derivation that also explains itself', () => {
  // Derivations are written for a reader, so many carry a clause after the sum.
  assert.equal(evaluateDerivation('720 ÷ 40 بإسقاط الثلث'), 18);
  assert.equal(evaluateDerivation('81 × 2 بقراءة المعامل 2 بدل 3'), 162);
  assert.equal(extractExpression('720 ÷ 40 بإسقاط الثلث'), '720 / 40');
});

test('RC2-014: prose makes no arithmetic claim, so none can be false', () => {
  assert.equal(evaluateDerivation('العدد الأصلي 480'), null);
  assert.equal(evaluateDerivation('الفرق المعطى 7'), null);
  assert.equal(classifyOptionFeedback({value: 480, derivation: 'العدد الأصلي 480'}).verdict,
    FEEDBACK_VERDICT.PROSE);
});

test('RC2-014: an answer that is not a number is not checked arithmetically', () => {
  assert.equal(
    classifyOptionFeedback({value: 'الثُمن', derivation: 'القسمة على 8 بدل 3'}).verdict,
    FEEDBACK_VERDICT.NON_NUMERIC
  );
});

// --- the check itself -------------------------------------------------------

test('RC2-014 MUST_ACCEPT: a derivation that produces its option', () => {
  assert.equal(classifyOptionFeedback({value: 24, derivation: '12 × 2'}).verdict, FEEDBACK_VERDICT.EXACT);
});

test('RC2-014 MUST_ACCEPT: a derivation whose result is written to the shown precision', () => {
  // 12 × 100 ÷ 228 = 5.2631..., published as 5.3. A learner following the sum
  // and writing it to one place gets the option.
  const r = classifyOptionFeedback({value: 5.3, derivation: '12 × 100 ÷ (120 + 108)'});
  assert.equal(r.verdict, FEEDBACK_VERDICT.ROUNDS_TO_VALUE);
});

test('RC2-014 MUST_REJECT: a derivation that produces a different number', () => {
  assert.equal(classifyOptionFeedback({value: 39, derivation: '(38 ÷ 3) × 3'}).verdict, FEEDBACK_VERDICT.MISMATCH);
  assert.equal(classifyOptionFeedback({value: -50, derivation: '25 + 25'}).verdict, FEEDBACK_VERDICT.MISMATCH);
  assert.equal(classifyOptionFeedback({value: 1, derivation: '40 − 50'}).verdict, FEEDBACK_VERDICT.MISMATCH);
});

test('RC2-014 meta: the rounding tolerance is exactly the displayed precision', () => {
  // The allowance is "write the result to the precision the paper shows", and
  // nothing wider. At integer precision that is ±0.5, and the boundary holds in
  // both directions rather than being a blanket nearness test.
  assert.equal(classifyOptionFeedback({value: 5, derivation: '5.4 + 0'}).verdict,
    FEEDBACK_VERDICT.ROUNDS_TO_VALUE, '5.4 written as a whole number is 5');
  assert.equal(classifyOptionFeedback({value: 5, derivation: '5.6 + 0'}).verdict,
    FEEDBACK_VERDICT.MISMATCH, '5.6 written as a whole number is 6, not 5');
  // One decimal shown means one decimal of allowance, not more.
  assert.equal(classifyOptionFeedback({value: 5.3, derivation: '5.26 + 0'}).verdict,
    FEEDBACK_VERDICT.ROUNDS_TO_VALUE);
  assert.equal(classifyOptionFeedback({value: 5.3, derivation: '5.44 + 0'}).verdict,
    FEEDBACK_VERDICT.MISMATCH);
  // And a whole number apart is never rounding.
  assert.equal(classifyOptionFeedback({value: 39, derivation: '38 + 0'}).verdict, FEEDBACK_VERDICT.MISMATCH);
});

// --- wired into the pipeline ------------------------------------------------

test('RC2-014: a false arithmetic claim is refused, not merely counted', () => {
  const q = {metadata: {options_meta: {
    A: {correct: true, value: 10, derivation: null},
    B: {correct: false, value: 39, misconceptionId: 'APPLIED_STEP_TWICE', derivation: '(38 ÷ 3) × 3'}
  }}};
  const v = validateFeedbackTruthfulness(q);
  assert.equal(v.valid, false);
  assert.ok(v.reasons.includes(REASON.FEEDBACK_DERIVATION_MISMATCH));
  assert.equal(v.details.feedbackDerivationMismatch[0].evaluated, 38);
});

test('RC2-014: two wrong options explained by one derivation is refused', () => {
  const q = {metadata: {options_meta: {
    A: {correct: true, value: 10, derivation: null},
    B: {correct: false, value: 20, misconceptionId: 'APPLIED_STEP_TWICE', derivation: '10 × 2'},
    C: {correct: false, value: 21, misconceptionId: 'OFF_BY_ONE_STEP', derivation: '10 × 2'}
  }}};
  const v = validateFeedbackTruthfulness(q);
  assert.equal(v.valid, false);
  assert.ok(v.reasons.includes(REASON.DUPLICATE_DISTRACTOR_DERIVATION));
  assert.deepEqual(v.details.duplicateDerivations[0].letters, ['B', 'C']);
});

test('RC2-014: the check is reached through validateCandidate', async () => {
  const {generateSpeed} = await import('../src/families/speed.js');
  const rng = new SeededRNG('fb-wired');
  const base = generateSpeed({difficulty: 'medium', rng: rng.fork('c'), seed: 'fb-wired', engineVersion: 'test'});
  const q = finalizeQuestion(base, rng.fork('o'));
  assert.equal(validateCandidate(base, q).valid, true, 'the untouched item must pass');

  const wrongLetter = Object.keys(q.metadata.options_meta).find(l => !q.metadata.options_meta[l].correct);
  const broken = {...q, metadata: {...q.metadata, options_meta: {
    ...q.metadata.options_meta,
    [wrongLetter]: {...q.metadata.options_meta[wrongLetter], value: 123456, derivation: '1 + 1'}
  }}};
  const verdict = validateCandidate(base, broken);
  assert.ok(verdict.reasons.includes(REASON.FEEDBACK_DERIVATION_MISMATCH), verdict.reasons.join(','));
});

// --- the corpus -------------------------------------------------------------

test('RC2-014: no published wrong option makes a false arithmetic claim', async () => {
  const {measure} = await import('../tools/audit/rc2-014-feedback.mjs');
  const report = await measure({questions: 800, seedPrefix: 'rc2-014-test'});
  assert.ok(report.corpus.questions > 790);
  assert.ok(report.metrics.M1_derivationTruthfulness.checked > 2000, 'the metric must actually check things');
  assert.equal(report.metrics.M1_derivationTruthfulness.mismatches, 0, JSON.stringify(report.mismatches.slice(0, 3)));
  assert.equal(report.metrics.M1_derivationTruthfulness.value, 1);
  assert.equal(report.metrics.M2_misconceptionApplicability.value, 1);
  assert.equal(report.metrics.M5_vacuity.value, 0);
  // Every question's five wrong options must carry five different derivations.
  assert.equal(report.metrics.M3_discrimination.byDerivation.minDistinct, 5);
});

test('RC2-014: the retired metric is recorded as retired, with the reason', () => {
  const saved = JSON.parse(readFileSync('rc2/RC2_014_FEEDBACK_METRICS.json', 'utf8'));
  assert.equal(saved.schema, 'rc2-014-feedback-metrics-v1');
  assert.equal(saved.retiredMetric.status, 'RETIRED');
  assert.equal(saved.retiredMetric.rc1Reported, 1.0);
  assert.ok(saved.retiredMetric.whyInvalid.length > 80);
  // Wording duplication is carried, and carried as an observation.
  assert.equal(saved.wordingDuplication.classification, 'OBSERVATION');
  assert.ok(saved.wordingDuplication.shareOfWrongOptions > 0, 'duplication is real and is reported');
  assert.equal(saved.metrics.M1_derivationTruthfulness.mismatches, 0);
});

test('RC2-014: discrimination is not measured on the rendered sentence', () => {
  // The rendered sentence carries the option value in its head, so it is unique
  // by construction — measuring it would repeat the RC1 error exactly. This test
  // shows that uniqueness IS trivially true, which is why it is not the metric.
  const engine = new Engine();
  for (let i = 0; i < 60; i++) {
    let q;
    try { q = engine.generateQuestion({family: 'random', difficulty: 'medium', seed: `fb-render-${i}`}); } catch { continue; }
    const rendered = Object.entries(q.metadata.options_meta)
      .filter(([, m]) => !m.correct)
      .map(([l]) => q.explanation.distractor_analysis[l]);
    assert.equal(new Set(rendered).size, 5, 'rendered sentences are unique by construction');
  }
  const saved = JSON.parse(readFileSync('rc2/RC2_014_FEEDBACK_METRICS.json', 'utf8'));
  assert.ok(saved.metrics.M3_discrimination.description.includes('NOT on the rendered sentence'));
});
