// RC2-012 — a wrong option is the product of a mistake, not of the answer.
//
// A learner has no access to the answer, so a derivation that starts from the
// answer is not a derivation. The audit found 193 of 1,250 wrong options (15.4%)
// were the key plus or minus a small number, one question carrying four of them
// (WORK_H_WORKERS_EFF: 9−1, 9+1, 9+2, 9−2) and one derivation reading literally
// "8 ± 5".
//
// Measured mechanically over the whole engine, the rate was 24.9% of published
// wrong options and 79 of 107 templates; 15.6% of questions carried three or
// more. After the migration it is 1.9%, every survivor names the step of the
// published solution it corrupts, and no question repeats one under the same
// misconception.
//
// The rule deliberately does NOT ban answer-relative errors outright. In the
// ages family "answered the future age" and "answered the other person's age"
// are the content, and each is necessarily expressed relative to the age asked
// for. What the audit objected to was one nudge repeated four times.

import test from 'node:test';
import {supportedBand, supportedBands} from './_support/bands.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

import Engine from '../src/index.js';
import {SeededRNG} from '../src/rng.js';
import {finalizeQuestion} from '../src/utils.js';
import {validateCandidate} from '../src/qa/pipeline.js';
import {validateDistractorProvenance, isAnswerDerived} from '../src/qa/distractor-provenance.js';
import {mk} from '../src/families/_shared.js';
import {REASON} from '../src/qa/reasons.js';

const FAMILIES = [
  'sequences', 'ratios', 'percentages', 'averages', 'ages', 'speed', 'work_time',
  'machines', 'direct_proportion', 'fractions', 'unit_rate', 'combined_rate',
  'relational', 'calendar', 'odd_one_out', 'profit_loss'
];

// --- the shape test ---------------------------------------------------------

test('RC2-012: the key-neighbour shape is recognised', () => {
  assert.equal(isAnswerDerived('9 − 1', 9), true);
  assert.equal(isAnswerDerived('9 + 2', 9), true);
  assert.equal(isAnswerDerived('8 × 2', 8), true);
  assert.equal(isAnswerDerived('2.5 ÷ 2', 2.5), true);
  assert.equal(isAnswerDerived('(9) + 1', 9), true);
});

test('RC2-012: a derivation through an intermediate is not a key-neighbour', () => {
  // These only coincide with the key for particular numbers; the learner
  // reaches them through a value they actually compute.
  assert.equal(isAnswerDerived('25 ÷ 75 × 100', 25), false);
  assert.equal(isAnswerDerived('600 × 125 ÷ 100', 600), false);
  assert.equal(isAnswerDerived('(12 + 4) × 3', 12), false);
  assert.equal(isAnswerDerived('9 + 1 + 1', 9), false);
});

test('RC2-012: a derivation starting from a GIVEN is not answer-derived', () => {
  // PL_M_DISC_MARK prices a 200-dirham item and sells it for 200. Its honest
  // derivation starts from the tag price, and the coincidence must not convict.
  const givens = new Set(['200', '20', '25']);
  assert.equal(isAnswerDerived('200 × 2', 200, givens), false);
  assert.equal(isAnswerDerived('200 × 2', 200, new Set(['999'])), true);
});

// --- the two rules ----------------------------------------------------------

test('RC2-012 MUST_REJECT: an unattributed key-neighbour', () => {
  const v = validateDistractorProvenance({
    correct: 9,
    steps: ['first', 'second', 'third'],
    distractors: [mk(8, 'OFF_BY_ONE_STEP', '9 − 1')]
  });
  assert.equal(v.valid, false);
  assert.deepEqual(v.reasons, [REASON.UNATTRIBUTED_ANSWER_DERIVED_DISTRACTOR]);
});

test('RC2-012 MUST_ACCEPT: the same value once it names the step it corrupts', () => {
  const v = validateDistractorProvenance({
    correct: 9,
    steps: ['first', 'second', 'third'],
    distractors: [mk(8, 'OFF_BY_ONE_STEP', '9 − 1', 3)]
  });
  assert.equal(v.valid, true);
});

test('RC2-012 MUST_REJECT: a step the published explanation does not have', () => {
  const v = validateDistractorProvenance({
    correct: 9,
    steps: ['first', 'second'],
    distractors: [mk(8, 'OFF_BY_ONE_STEP', '9 − 1', 7)]
  });
  assert.equal(v.valid, false);
  assert.equal(v.details.stepOutOfRange[0].reasoningStepAffected, 7);
});

test('RC2-012 MUST_REJECT: the audit\'s worst case, one nudge four times', () => {
  const v = validateDistractorProvenance({
    correct: 9,
    steps: ['a', 'b', 'c'],
    distractors: [
      mk(8, 'OFF_BY_ONE_STEP', '9 − 1', 3),
      mk(10, 'OFF_BY_ONE_STEP', '9 + 1', 3),
      mk(11, 'OFF_BY_ONE_STEP', '9 + 2', 3),
      mk(7, 'OFF_BY_ONE_STEP', '9 − 2', 3)
    ]
  });
  assert.equal(v.valid, false);
  assert.deepEqual(v.reasons, [REASON.REPEATED_ANSWER_DERIVED_MISCONCEPTION]);
  assert.deepEqual(v.details.repeatedMisconceptions, ['OFF_BY_ONE_STEP']);
});

test('RC2-012 MUST_ACCEPT: several distinctly named errors that each sit near the key', () => {
  // The ages family: the future age, the past age and the other person's age are
  // three different errors, not one nudge repeated.
  const v = validateDistractorProvenance({
    correct: 12,
    steps: ['a', 'b', 'c', 'd', 'e'],
    distractors: [
      mk(18, 'ANSWERED_FUTURE_AGE', '12 + 6', 5),
      mk(6, 'ANSWERED_PAST_AGE', '12 − 6', 5),
      mk(24, 'MULTIPLIED_INSTEAD_OF_DIVIDED', '12 × 2', 5)
    ]
  });
  assert.equal(v.valid, true);
});

test('RC2-012: the steps come from the published explanation, not only the descriptor', () => {
  const v = validateDistractorProvenance({
    correct: 9,
    explanation: {steps: ['first', 'second', 'third']},
    distractors: [mk(8, 'OFF_BY_ONE_STEP', '9 − 1', 3)]
  });
  assert.equal(v.valid, true);
});

// --- the engine -------------------------------------------------------------

test('RC2-012: no template in any family produces an unattributed key-neighbour', async () => {
  const offenders = {};
  let candidates = 0;
  for (const family of FAMILIES) {
    const mod = await import(`../src/families/${family}.js`);
    const gen = Object.values(mod).find(v => typeof v === 'function' && v.name.startsWith('generate'));
    for (const difficulty of supportedBands(family)) {
      for (let i = 0; i < 150; i++) {
        const rng = new SeededRNG(`prov-${family}-${difficulty}-${i}`);
        let base;
        try { base = gen({difficulty, rng: rng.fork('c'), seed: `s${i}`, engineVersion: 'test', telemetry: null}); } catch { continue; }
        candidates++;
        const v = validateDistractorProvenance(base);
        if (!v.valid) {
          for (const o of v.details.unattributedAnswerDerived || []) {
            offenders[`${base.template_id} / ${o.misconceptionId}`] = o.derivation;
          }
          for (const r of v.details.repeatedMisconceptions || []) {
            offenders[`REPEAT ${base.template_id} / ${r}`] = true;
          }
        }
      }
    }
  }
  // RC2.2-1: a family is swept only at bands it can compute, so the sweep is
  // smaller than when every family was asked at all three. It still covers every
  // template the engine can publish, which is what the claim needs.
  assert.ok(candidates > 5000, `the sweep must be substantial, saw ${candidates}`);
  assert.deepEqual(offenders, {});
});

test('RC2-012: the rate in published options is a fraction of what it was', () => {
  const engine = new Engine();
  const bands = ['easy', 'medium', 'hard'];
  let wrong = 0, answerDerived = 0, published = 0;
  const perQuestion = {};
  for (let i = 0; i < 600; i++) {
    let q;
    try { q = engine.generateQuestion({family: 'random', difficulty: bands[i % 3], seed: `prov-pub-${i}`}); } catch { continue; }
    published++;
    const meta = q.metadata.options_meta;
    const correctValue = Object.values(meta).find(m => m.correct).value;
    let n = 0;
    for (const m of Object.values(meta)) {
      if (m.correct) continue;
      wrong++;
      if (isAnswerDerived(m.derivation, correctValue)) { answerDerived++; n++; }
    }
    perQuestion[n] = (perQuestion[n] || 0) + 1;
  }
  assert.ok(published > 590, `the engine must still publish, published ${published}`);
  const rate = answerDerived / wrong;
  // RC1 measured 24.9% of published wrong options by this same test.
  assert.ok(rate < 0.05, `answer-derived rate ${(rate * 100).toFixed(1)}% must stay far below the 24.9% baseline`);
  // And the audit's specific complaint — three or more in one question — is rare
  // and, where it survives, is several distinctly named errors rather than one
  // nudge repeated.
  const crowded = (perQuestion[3] || 0) + (perQuestion[4] || 0) + (perQuestion[5] || 0);
  assert.ok(crowded / published < 0.03, `${crowded}/${published} questions carry three or more`);
});

test('RC2-012: the step reaches the published option metadata', () => {
  const engine = new Engine();
  let seen = 0;
  for (let i = 0; i < 200 && seen < 5; i++) {
    let q;
    try { q = engine.generateQuestion({family: 'ages', difficulty: supportedBand('ages','hard'), seed: `prov-meta-${i}`}); } catch { continue; }
    for (const m of Object.values(q.metadata.options_meta)) {
      assert.ok('reasoningStepAffected' in m, 'every option must carry the field');
      if (!m.correct && m.reasoningStepAffected !== null) {
        assert.ok(Number.isInteger(m.reasoningStepAffected) && m.reasoningStepAffected >= 1);
        assert.ok(m.reasoningStepAffected <= q.explanation.steps.length);
        seen++;
      }
    }
  }
  assert.ok(seen >= 5, `the sweep must find attributed options, saw ${seen}`);
});

test('RC2-012: a bare key-neighbour is refused by validateCandidate', async () => {
  const {generateSpeed} = await import('../src/families/speed.js');
  const rng = new SeededRNG('prov-inject');
  const base = generateSpeed({difficulty: 'easy', rng: rng.fork('c'), seed: 'prov-inject', engineVersion: 'test'});
  const q = finalizeQuestion(base, rng.fork('o'));
  assert.equal(validateCandidate(base, q).valid, true, 'the untouched item must pass');

  const broken = {
    ...base,
    distractors: [...base.distractors, mk(base.correct + 1, 'OFF_BY_ONE_STEP', `${base.correct} + 1`)]
  };
  const verdict = validateCandidate(broken, q);
  assert.ok(verdict.reasons.includes(REASON.UNATTRIBUTED_ANSWER_DERIVED_DISTRACTOR), verdict.reasons.join(','));
});

test('RC2-012: mk carries the step through to the published option metadata', () => {
  const d = mk(8, 'OFF_BY_ONE_STEP', '9 − 1', 3);
  assert.equal(d.reasoningStepAffected, 3);
  assert.equal(mk(8, 'OFF_BY_ONE_STEP', '9 − 1').reasoningStepAffected, null);
});

// --- the stratified audit of what survived (RC2-012 evidence) ---------------

test('RC2-012 audit: no surviving answer-relative option is unjustified', async () => {
  const {audit} = await import('../tools/audit/rc2-012-survivors.mjs');
  const report = await audit({questions: 900, seedPrefix: 'rc2-012-audit-test'});
  assert.ok(report.corpus.questions > 880, `the corpus must be real, got ${report.corpus.questions}`);
  assert.ok(report.totals.survivors > 20, 'the audit must actually have survivors to classify');
  assert.equal(report.totals.unjustified, 0, JSON.stringify(report.totals.byStratum));
  // The strong stratum must carry the overwhelming majority: a survivor set that
  // is mostly "it names a step" would be bookkeeping, not mathematics.
  const strong = (report.totals.byStratum.S1_TASK_PATH ?? 0) + (report.totals.byStratum.S3_GIVEN_COINCIDENCE ?? 0);
  assert.ok(strong / report.totals.survivors > 0.9,
    `${strong}/${report.totals.survivors} in S1/S3: ${JSON.stringify(report.totals.byStratum)}`);
});

test('RC2-012 audit meta: the stratifier convicts a genuine key-neighbour', async () => {
  // If the classifier cannot separate the RC1 defect from a real task path, the
  // audit above proves nothing. These are the shapes the RC1 audit reported.
  const {classifySurvivor} = await import('../tools/audit/rc2-012-survivors.mjs');
  const givens = [120, 7, 3];          // the stem's own numbers
  const solutionValues = [120, 7, 3, 40, 17];

  // MUST_CONVICT — "8 ± 5" where 5 is nowhere on the page.
  for (const value of [17 + 5, 17 - 5, 17 * 5, 17 + 1, 17 - 1, 17 + 2]) {
    assert.equal(
      classifySurvivor({value, correct: 17, givens: [999], solutionValues: [999], stepText: null}),
      'S4_UNJUSTIFIED',
      `key→${value} with nothing stated must be unjustified`
    );
  }

  // ...and naming a step does not launder it into a task path.
  assert.equal(
    classifySurvivor({value: 18, correct: 17, givens: [999], solutionValues: [999], stepText: 'a step'}),
    'S2_STEP_ATTRIBUTED',
    'naming a step is bookkeeping, and must not reach S1'
  );

  // MUST_ACQUIT — displaced by a quantity the stem actually states.
  assert.equal(
    classifySurvivor({value: 17 + 3, correct: 17, givens, solutionValues, stepText: null}),
    'S1_TASK_PATH',
    'the future age, displaced by the stated number of years'
  );
  assert.equal(
    classifySurvivor({value: 17 * 3, correct: 17, givens, solutionValues, stepText: null}),
    'S1_TASK_PATH',
    'the other person\'s age, under the stated ratio'
  );
  // ...and one displaced only by a value the SOLUTION computes is kept apart.
  assert.equal(
    classifySurvivor({value: 17 - 40, correct: 17, givens: [1000], solutionValues: [40], stepText: null}),
    'S1B_SOLUTION_QUANTITY'
  );
  // A key that is itself one of the stated numbers is a coincidence, not a leak.
  assert.equal(
    classifySurvivor({value: 240, correct: 120, givens, solutionValues, stepText: null, keyIsAGiven: true}),
    'S3_GIVEN_COINCIDENCE'
  );
});

test('RC2-012 audit: the published artifact matches the engine', () => {
  const saved = JSON.parse(readFileSync('rc2/RC2_012_SURVIVOR_AUDIT.json', 'utf8'));
  assert.equal(saved.schema, 'rc2-012-survivor-audit-v1');
  assert.equal(saved.totals.unjustified, 0);
  assert.equal(saved.rc1Baseline.answerDerivedShareOfWrongOptions, 0.249);
  assert.ok(saved.totals.shareOfWrongOptions < 0.05);
  // Every survivor carries its own evidence, not just a label.
  for (const s of saved.survivors) {
    assert.ok(
      s.reconstructedFromGivens || s.appearsInPublishedSolution || s.displacementFromKey
        || s.displacementFromKeyBySolutionQuantity || s.keyIsAlsoAGivenNumber || s.stepText,
      `${s.templateId}/${s.misconceptionId} has no evidence recorded`
    );
  }
});
