// Section 1-C. An invariant that cannot fail is not an invariant.
//
// Every check in this project is exercised here against a deliberately
// corrupted answer, explanation or parameter. A check that still passes on the
// broken input is worthless, so each case asserts that the corruption *is*
// caught — and, alongside it, that the untouched original passes.

import test from 'node:test';
import {supportedBand} from './_support/bands.mjs';
import assert from 'node:assert/strict';

import Engine from '../src/index.js';
import {SeededRNG} from '../src/rng.js';
import {finalizeQuestion, DAYS_AR} from '../src/utils.js';
import {validateCandidate, runOracle} from '../src/qa/pipeline.js';
import {validateDisplayedEquations, validateExplanationSourcing} from '../src/qa/equations.js';
import {validateTextMatchesParams} from '../src/qa/text-params.js';
import {checkOddOneOutAmbiguity} from '../src/qa/ambiguity.js';
import {buildOrderOracle} from '../src/qa/relational-oracle.js';
import {REASON} from '../src/qa/reasons.js';

const FAMILIES = [
  'sequences', 'ratios', 'percentages', 'averages', 'ages', 'speed', 'work_time',
  'machines', 'direct_proportion', 'fractions', 'unit_rate', 'combined_rate',
  'relational', 'calendar', 'odd_one_out', 'profit_loss'
];

/** Produces a base descriptor and its finalised question, unmodified. */
async function makeItem(family, difficulty, i) {
  const mod = await import(`../src/families/${family}.js`);
  const gen = Object.values(mod).find(v => typeof v === 'function' && v.name.startsWith('generate'));
  for (let attempt = 0; attempt < 40; attempt++) {
    const rng = new SeededRNG(`inject-${family}-${difficulty}-${i}-${attempt}`);
    try {
      const base = gen({difficulty, rng: rng.fork('c'), seed: `s${i}${attempt}`, engineVersion: 'test'});
      const q = finalizeQuestion(base, rng.fork('o'));
      const verdict = validateCandidate(base, q);
      if (verdict.valid) return {base, q};
    } catch { /* try another draw */ }
  }
  throw new Error(`could not build a clean ${family} item`);
}

// --- the oracle catches a corrupted key, family by family -------------------

for (const family of FAMILIES) {
  test(`fault injection: a corrupted key in ${family} is caught by the oracle`, async () => {
    const {base, q} = await makeItem(family, supportedBand(family, 'medium'), 3);
    assert.equal(validateCandidate(base, q).valid, true, 'the untouched item must pass');

    // Corrupt the answer the way a wrong formula would: one step out.
    const broken = structuredCloneish(base);
    if (typeof base.correct === 'number') {
      broken.correct = base.correct + 1;
    } else if (DAYS_AR.includes(base.correct)) {
      broken.correct = DAYS_AR[(DAYS_AR.indexOf(base.correct) + 1) % 7];
    } else {
      // A label answer: swap it for one of the distractors' labels.
      const other = base.distractors.find(d => d.value !== base.correct);
      broken.correct = other.value;
    }
    const result = runOracle(broken, q);
    assert.ok(result.ran, `${family} must declare an oracle`);
    assert.ok(
      result.reasons.includes(REASON.ORACLE_DISAGREEMENT) ||
      result.reasons.includes(REASON.ORACLE_NO_SOLUTION),
      `${family}: shifting the key must be caught, got ${JSON.stringify(result.reasons)}`
    );
  });
}

function structuredCloneish(base) {
  const copy = {...base};
  copy.explanation = {...base.explanation, steps: [...base.explanation.steps]};
  copy.parameters = {...base.parameters};
  return copy;
}

// --- the calendar off-by-one specifically ----------------------------------

test('fault injection: the historical day-offset bug is caught', async () => {
  const {base, q} = await makeItem('calendar', supportedBand('calendar', 'hard'), 11);
  if (base.template_id !== 'CAL_H_NESTED') return; // the shape under test
  const p = base.parameters;
  const broken = structuredCloneish(base);
  // Reintroduce exactly the old defect: use N - M instead of 1 + N - M.
  const oldOffset = p.aheadDays - p.behindDays;
  broken.correct = DAYS_AR[((p.targetDayIndex - oldOffset) % 7 + 7) % 7];
  if (broken.correct === base.correct) return; // offsets coincide, nothing to catch
  const result = runOracle(broken, q);
  assert.ok(result.reasons.includes(REASON.ORACLE_DISAGREEMENT),
    'the exhaustive day sweep must reject the old N - M answer');
});

// --- the explanation checks ------------------------------------------------

test('fault injection: a corrupted equation in an explanation is caught', async () => {
  const {base, q} = await makeItem('averages', supportedBand('averages', 'medium'), 5);
  const clean = validateDisplayedEquations(q.explanation.steps);
  assert.equal(clean.valid, true, 'the untouched explanation must pass');
  const broken = q.explanation.steps.map(s => s.replace(/= (\d+)\./, (m, n) => `= ${Number(n) + 7}.`));
  const result = validateDisplayedEquations(broken);
  assert.equal(result.valid, false, 'changing a result must break the equality');
});

test('fault injection: a value slipped into an explanation without derivation is caught', () => {
  const clean = validateExplanationSourcing({stemNumbers: [48, 4], steps: ['قيمة الوحدة = 48 ÷ 4 = 12.']});
  assert.equal(clean.valid, true);
  const broken = validateExplanationSourcing({stemNumbers: [48, 4], steps: ['قيمة الوحدة = 48 ÷ 4 = 12.', 'نأخذ المعامل 37.']});
  assert.equal(broken.valid, false);
});

// --- the text/parameter check ----------------------------------------------

test('fault injection: a stem number that drifts from the solver is caught', async () => {
  const {base, q} = await makeItem('direct_proportion', supportedBand('direct_proportion', 'easy'), 7);
  const clean = validateTextMatchesParams({
    questionText: q.question, parameters: base.parameters,
    derivedFromParams: base.textParams?.derivedFromParams || []
  });
  assert.equal(clean.valid, true);
  const firstParam = Object.values(base.parameters).find(v => typeof v === 'number');
  const broken = validateTextMatchesParams({
    questionText: q.question.replace(String(firstParam), String(firstParam + 11)),
    parameters: base.parameters,
    derivedFromParams: base.textParams?.derivedFromParams || []
  });
  assert.equal(broken.valid, false, 'a number in the stem with no source must be caught');
});

// --- the ambiguity sweep ---------------------------------------------------

test('fault injection: pointing the ambiguity check at the wrong outlier is caught', () => {
  const clean = checkOddOneOutAmbiguity([4, 9, 16, 25, 36, 40], 40);
  assert.equal(clean.supportsIntended, true);
  const broken = checkOddOneOutAmbiguity([4, 9, 16, 25, 36, 40], 25);
  assert.equal(broken.supportsIntended, false, 'no rule singles out 25, so the sweep must say so');
});

// --- the order oracle ------------------------------------------------------

test('fault injection: dropping an edge changes what the order oracle can prove', () => {
  const nodes = ['a', 'b', 'c', 'd'];
  const full = buildOrderOracle(nodes, [['a', 'b'], ['b', 'c'], ['c', 'd']]);
  assert.equal(full.definitelyAbove('a', 'd'), true);
  assert.equal(full.whoAtPosition(2), 'b');
  const broken = buildOrderOracle(nodes, [['a', 'b'], ['c', 'd']]);
  assert.equal(broken.definitelyAbove('a', 'd'), false, 'without the middle link the claim is no longer forced');
  assert.equal(broken.whoAtPosition(2), null, 'and position two is no longer determined');
});

// --- the distractor provenance rule ----------------------------------------

test('fault injection: a distractor without provenance is refused, not padded', async () => {
  const {base} = await makeItem('unit_rate', supportedBand('unit_rate', 'easy'), 9);
  const rng = new SeededRNG('provenance');
  const stripped = {...base, distractors: base.distractors.map(d => ({value: d.value}))};
  assert.throws(() => finalizeQuestion(stripped, rng.fork('o')), /provenance/,
    'the option builder must refuse rather than invent a near-miss value');
});

// --- the engine-level gate -------------------------------------------------

test('fault injection: a published question always carries a passed quality gate', () => {
  const engine = new Engine();
  for (let i = 0; i < 40; i++) {
    const q = engine.generateQuestion({seed: `gate-${i}`});
    assert.equal(q.metadata.quality_gate, 'passed');
    assert.ok(q.metadata.validation_meta.attempts >= 1);
  }
});
