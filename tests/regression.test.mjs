// Section 18-A. Every defect the audit found is a permanent test here.
//
// Section 1-B: each rejection rule is paired with a case that must be ACCEPTED.
// Without the second half, an implementation that rejects everything passes the
// whole file, and every threshold becomes free to tune.

import test from 'node:test';
import assert from 'node:assert/strict';

import {DAYS_AR} from '../src/utils.js';
import {searchDomain, grid} from '../src/qa/oracle-engine.js';
import {Fraction} from '../src/qa/fraction.js';
import {validateDisplayedEquations, validateExplanationSourcing} from '../src/qa/equations.js';
import {checkOddOneOutAmbiguity} from '../src/qa/ambiguity.js';
import {validatePedagogy, validateRealism} from '../src/qa/pedagogy.js';
import {validateTextMatchesParams} from '../src/qa/text-params.js';
import {buildFingerprint, canonicalGraph, canonicalNumberSet} from '../src/qa/fingerprint.js';
import {checkArabicNumberUnits} from '../src/arabic/units.js';
import {REASON} from '../src/qa/reasons.js';

/** The production oracle: sweep all seven days for the ones the sentence allows. */
function solveToday(aheadDays, behindDays, targetDayName) {
  const netOffset = 1 + aheadDays - behindDays;
  const targetIndex = DAYS_AR.indexOf(targetDayName);
  const {survivors} = searchDomain(grid(0, 6), [
    {op: 'eq', left: {mod: [{add: ['x', netOffset]}, 7]}, right: targetIndex}
  ]);
  return {netOffset, days: survivors.map(f => DAYS_AR[Number(f.toDecimalString())])};
}

// --- temporal (Section 7) ---------------------------------------------------

test('temporal: N=2, M=1, target Monday resolves to Saturday', () => {
  const r = solveToday(2, 1, 'الاثنين');
  assert.equal(r.netOffset, 2);
  assert.deepEqual(r.days, ['السبت']);
});

test('temporal: N=3, M=1, target Sunday resolves to Thursday', () => {
  const r = solveToday(3, 1, 'الأحد');
  assert.equal(r.netOffset, 3);
  assert.deepEqual(r.days, ['الخميس']);
});

test('temporal: N=2, M=3 gives a net offset of zero', () => {
  const r = solveToday(2, 3, 'الخميس');
  assert.equal(r.netOffset, 0);
  assert.deepEqual(r.days, ['الخميس'], 'a zero net offset returns the stated day itself');
});

test('temporal: the nested template refuses a zero net offset in Medium/Hard', async () => {
  const {generateCalendar} = await import('../src/families/calendar.js');
  const {SeededRNG} = await import('../src/rng.js');
  for (let i = 0; i < 400; i++) {
    const rng = new SeededRNG(`net-zero-${i}`);
    const base = generateCalendar({difficulty: 'hard', rng: rng.fork('c'), seed: `s${i}`, engineVersion: 'test'});
    if (base.template_id !== 'CAL_H_NESTED') continue;
    const net = base.parameters.netOffset;
    assert.notEqual(((net % 7) + 7) % 7, 0, 'a published nested item must not have a zero net offset');
  }
});

test('temporal MUST_ACCEPT: every allowed (N, M, target) combination resolves to exactly one day', () => {
  for (let n = 2; n <= 4; n++) {
    for (let m = 1; m <= 3; m++) {
      if (((1 + n - m) % 7 + 7) % 7 === 0) continue;
      for (const target of DAYS_AR) {
        const r = solveToday(n, m, target);
        assert.equal(r.days.length, 1, `N=${n} M=${m} target=${target} must have exactly one answer`);
      }
    }
  }
});

// --- exact arithmetic (Section 8-A) -----------------------------------------

test('exact arithmetic: 5/8 is 0.625 and 20 x 0.625 is 12.5', () => {
  const eighths = Fraction.from(5).div(8);
  assert.equal(eighths.toDecimalString(), '0.625');
  assert.equal(Fraction.from(20).mul(eighths).toDecimalString(), '12.5');
});

test('MUST_ACCEPT: the exact chain passes the equation validator', () => {
  const r = validateDisplayedEquations(['5 ÷ 8 = 0.625.', '20 × 0.625 = 12.5.']);
  assert.equal(r.valid, true);
  assert.equal(r.checked, 2);
});

test('MUST_REJECT: rounding an intermediate is caught', () => {
  const r = validateDisplayedEquations(['5 ÷ 8 = 0.63.', '20 × 0.63 = 12.5.']);
  assert.equal(r.valid, false);
  assert.ok(r.reasons.includes(REASON.INTERMEDIATE_ROUNDING));
});

test('MUST_REJECT: an equation that is simply wrong is caught', () => {
  const r = validateDisplayedEquations(['20 × 3 = 61.']);
  assert.ok(r.reasons.includes(REASON.EXPLANATION_EQUATION_FAILURE));
});

// --- explanation sourcing (Section 8-C) -------------------------------------

test('MUST_REJECT: "we pick the part value 4" announces a value it never derives', () => {
  const r = validateExplanationSourcing({
    stemNumbers: [4, 5, 12],
    steps: ['لأن أ لم تتغير، نختار قيمة الجزء 7.']
  });
  assert.equal(r.valid, false);
  assert.ok(r.reasons.includes(REASON.EXPLANATION_UNSOURCED_VALUE));
});

test('MUST_ACCEPT: the same value derived by cross-multiplication passes', () => {
  const r = validateExplanationSourcing({
    stemNumbers: [4, 5, 12],
    steps: [
      'بالضرب التبادلي: 5 × 4 = 20 و4 × 2 = 8 و4 × 12 = 48.',
      '20 − 8 = 12، إذن 12ك = 48.',
      'ك = 48 ÷ 12 = 4.'
    ]
  });
  assert.equal(r.valid, true, JSON.stringify(r.unsourced));
});

test('MUST_ACCEPT: a demonstrated factorisation of a stem number is sourced', () => {
  const r = validateExplanationSourcing({stemNumbers: [24], steps: ['24 = 6 × 4.']});
  assert.equal(r.valid, true);
});

test('MUST_REJECT: a structural constant alone cannot license its operands', () => {
  const r = validateExplanationSourcing({stemNumbers: [500], steps: ['المعامل الكلي = 1.25 × 0.8 = 1.']});
  assert.equal(r.valid, false);
});

// --- ratio degeneracy (Section 12) ------------------------------------------

for (const [a, b] of [[2, 2], [3, 3], [4, 2]]) {
  test(`MUST_REJECT: ratio ${a}:${b} in a template that needs a reduced, unequal ratio`, () => {
    const r = validatePedagogy({
      correct: 10,
      ratio: {a, b, requireReduced: true, requireDistinctSides: true}
    });
    assert.equal(r.valid, false);
    assert.ok(r.reasons.includes(REASON.REDUCIBLE_RATIO) || r.reasons.includes(REASON.EQUAL_RATIO_SIDES));
  });
}

test('MUST_ACCEPT: 3:5 is reduced and unequal', () => {
  const r = validatePedagogy({correct: 10, ratio: {a: 3, b: 5, requireReduced: true, requireDistinctSides: true}});
  assert.equal(r.valid, true);
});

test('MUST_ACCEPT: 4:2 passes in a template that is about reducing ratios', () => {
  const r = validatePedagogy({correct: 10, ratio: {a: 4, b: 2, requireReduced: false, requireDistinctSides: false}});
  assert.equal(r.valid, true, 'the rule is tied to the template, not applied globally');
});

// --- degeneracy (Section 10) ------------------------------------------------

test('MUST_REJECT: equal group sizes make the mean of the means correct', () => {
  const n1 = 4, n2 = 4, a1 = 12, a2 = 20;
  const correct = (n1 * a1 + n2 * a2) / (n1 + n2);
  const r = validatePedagogy({
    correct,
    pedagogy: {targetMisconception: 'USED_ARITHMETIC_MEAN_OF_AVERAGES', wrongMethodValue: (a1 + a2) / 2}
  });
  assert.equal(r.valid, false);
  assert.ok(r.reasons.includes(REASON.DEGENERATE_WRONG_METHOD_EQUALS_KEY));
});

test('MUST_ACCEPT: unequal group sizes keep the mean of the means wrong', () => {
  const n1 = 3, n2 = 6, a1 = 12, a2 = 21;
  const correct = (n1 * a1 + n2 * a2) / (n1 + n2);
  const r = validatePedagogy({
    correct,
    pedagogy: {targetMisconception: 'USED_ARITHMETIC_MEAN_OF_AVERAGES', wrongMethodValue: (a1 + a2) / 2}
  });
  assert.equal(r.valid, true);
});

test('MUST_REJECT: equal stage times make the arithmetic mean of speeds correct', () => {
  const s1 = 60, s2 = 90, t1 = 2, t2 = 2;
  const correct = (s1 * t1 + s2 * t2) / (t1 + t2);
  const r = validatePedagogy({
    correct,
    pedagogy: {targetMisconception: 'USED_ARITHMETIC_MEAN_OF_SPEEDS', wrongMethodValue: (s1 + s2) / 2}
  });
  assert.equal(r.valid, false);
});

test('MUST_ACCEPT: unequal stage times keep the arithmetic mean wrong', () => {
  const s1 = 60, s2 = 90, t1 = 1, t2 = 3;
  const correct = (s1 * t1 + s2 * t2) / (t1 + t2);
  const r = validatePedagogy({
    correct,
    pedagogy: {targetMisconception: 'USED_ARITHMETIC_MEAN_OF_SPEEDS', wrongMethodValue: (s1 + s2) / 2}
  });
  assert.equal(r.valid, true);
});

test('MUST_REJECT: +25% then -20% cancels exactly', () => {
  const f1 = 125, f2 = 80;
  assert.equal(f1 * f2, 10000);
  const r = validatePedagogy({
    correct: 0,
    pedagogy: {degenerateWhen: [{when: f1 * f2 === 10000, note: 'net factor of one'}]}
  });
  assert.equal(r.valid, false);
  assert.ok(r.reasons.includes(REASON.DEGENERATE_PARAMETERS));
});

test('MUST_ACCEPT: +25% then -10% does not cancel', () => {
  const f1 = 125, f2 = 90;
  const r = validatePedagogy({
    correct: (f1 * f2 - 10000) / 100,
    pedagogy: {degenerateWhen: [{when: f1 * f2 === 10000, note: 'net factor of one'}]}
  });
  assert.equal(r.valid, true);
});

// --- realism (Section 11) ---------------------------------------------------

test('MUST_REJECT: a mother of 15 with a daughter of 5', () => {
  const r = validateRealism({parentAgeAtBirth: 10, ages: [15, 5]});
  assert.equal(r.valid, false);
  assert.ok(r.reasons.includes(REASON.UNREALISTIC_AGE));
});

test('MUST_ACCEPT: a father of 32 with a son of 12', () => {
  assert.equal(validateRealism({parentAgeAtBirth: 20, ages: [32, 12]}).valid, true);
});

test('MUST_ACCEPT: siblings of 24 and 16 — a wide gap is a preference, not an error', () => {
  const r = validateRealism({ages: [24, 16], siblingGap: 8});
  assert.equal(r.valid, true);
  const wide = validateRealism({ages: [40, 14], siblingGap: 26});
  assert.equal(wide.valid, true, 'a 26-year sibling gap is unusual, not impossible');
  assert.equal(wide.softWarnings.length, 1, 'it is reported as a soft preference');
});

// --- odd one out ambiguity (Section 9) --------------------------------------

test('MUST_REJECT: {30,42,56,72,84,90} has a competing simple rule', () => {
  // Historical case, kept. Under the RC2 policy `competing` holds only the
  // rules pointing at a number *other* than the key, which is the defect
  // itself: the key is 84, and multiples of three single out 56.
  const r = checkOddOneOutAmbiguity([30, 42, 56, 72, 84, 90], 84);
  assert.equal(r.ambiguous, true);
  const outliers = new Set(r.competing.flat().map(x => x.outlier));
  assert.ok(outliers.has(56), 'a simple rule must be shown pointing away from the key');
  assert.ok(!outliers.has(84), 'the key itself is not a competing outlier');
});

test('MUST_ACCEPT: perfect squares with one intruder', () => {
  const r = checkOddOneOutAmbiguity([4, 9, 16, 25, 36, 40], 40);
  assert.equal(r.ambiguous, false);
  assert.equal(r.supportsIntended, true);
});

test('MUST_REJECT: a cube run whose only perfect square is a lone member', () => {
  // RC2-008. Every run of consecutive cubes carries exactly one perfect square
  // (64 = 8²). With a non-square intruder, "the only perfect square" singles out
  // 64 at salience 1 against the cube rule at 2.
  const r = checkOddOneOutAmbiguity([8, 27, 64, 125, 216, 200], 200);
  assert.equal(r.ambiguous, true);
});

test('MUST_ACCEPT: the same cube run with a square intruder is publishable', () => {
  // The sampler fix: when the run carries a lone square, the intruder is chosen
  // to be a square too, so no single member is "the only one".
  const r = checkOddOneOutAmbiguity([8, 27, 64, 125, 216, 100], 100);
  assert.equal(r.ambiguous, false);
  assert.equal(r.undiscoverable, false);
  assert.equal(r.supportsIntended, true);
});

test('MUST_REJECT: "prime + 10" is not a discoverable rule', () => {
  // This was a MUST_ACCEPT in RC1 and that was the mistake: the frozen sample
  // published it as S5/46, where primality — the reading a candidate tries
  // first — singles out 21 and 15, neither of them the key.
  const r = checkOddOneOutAmbiguity([13, 15, 17, 19, 21, 23], 19);
  assert.equal(r.undiscoverable, true);
  assert.equal(r.verdict, 'UNDISCOVERABLE');
  assert.equal(r.ambiguous, false,
    'undiscoverable is its own verdict, distinct from ambiguity');
});

// --- duplicates and fingerprints (Section 13) -------------------------------

test('a number set shuffled produces the same fingerprint', () => {
  const a = buildFingerprint({family: 'odd_one_out', templateId: 'ODD_E_MULT', commutative: {numberSet: canonicalNumberSet([30, 12, 18, 24, 36, 25])}});
  const b = buildFingerprint({family: 'odd_one_out', templateId: 'ODD_E_MULT', commutative: {numberSet: canonicalNumberSet([25, 36, 24, 18, 12, 30])}});
  assert.equal(a, b);
});

test('the same relational graph with different names produces the same structural key', () => {
  const one = canonicalGraph(['خالد', 'سالم', 'ماجد', 'راشد'], [['خالد', 'سالم'], ['خالد', 'ماجد'], ['سالم', 'راشد']]);
  const two = canonicalGraph(['نورة', 'هند', 'ريم', 'سارة'], [['نورة', 'هند'], ['نورة', 'ريم'], ['هند', 'سارة']]);
  assert.equal(one.key, two.key);
});

test('MUST_ACCEPT: parameter roles are not interchangeable', () => {
  const leader = buildFingerprint({family: 'speed', templateId: 'SPD_H_CATCH', namedParameters: {speedLeader: 72, speedFollower: 90, delayHours: 2}});
  const swapped = buildFingerprint({family: 'speed', templateId: 'SPD_H_CATCH', namedParameters: {speedLeader: 90, speedFollower: 72, delayHours: 2}});
  assert.notEqual(leader, swapped, 'swapping two speeds is a different question, not a duplicate');
});

// --- text vs parameters (Section 6) -----------------------------------------

test('MUST_REJECT: a number in the stem with no counterpart in the parameters', () => {
  const r = validateTextMatchesParams({
    questionText: 'إذا كانت 5 وحدات تكلف 50 درهمًا، فكم تكلف 21 وحدة؟',
    parameters: {baseCount: 5, baseAmount: 50, targetCount: 12}
  });
  assert.equal(r.valid, false);
  assert.ok(r.reasons.includes(REASON.TEXT_PARAM_MISMATCH));
});

test('MUST_ACCEPT: a stem whose numbers all trace back to parameters', () => {
  const r = validateTextMatchesParams({
    questionText: 'إذا كانت 5 وحدات تكلف 50 درهمًا، فكم تكلف 12 وحدة؟',
    parameters: {baseCount: 5, baseAmount: 50, targetCount: 12}
  });
  assert.equal(r.valid, true);
});

// --- Arabic number/unit agreement (Section 12) ------------------------------

test('MUST_REJECT: the six malformed number/unit pairs from the audit', () => {
  const {violations} = checkArabicNumberUnits('12 عمال و2 أيام و3 ساعة و4 كوب و1 آلات و6 وحدة');
  assert.equal(violations.length, 6);
});

test('MUST_ACCEPT: correctly agreeing forms', () => {
  const {violations} = checkArabicNumberUnits('12 عاملًا و5 أيام و25 ساعة و3 أكواب و6 وحدات');
  assert.deepEqual(violations, []);
});

test('MUST_ACCEPT: a compound rate symbol is a unit name, not a counted noun', () => {
  const {violations} = checkArabicNumberUnits('ينجز العامل 10 وحدة/ساعة');
  assert.deepEqual(violations, []);
});
