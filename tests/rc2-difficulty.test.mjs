// RC2-015 — the difficulty model, recalibrated conceptually.
//
// The RC1 audit found 118 of 250 questions (47.2%) where the declared and the
// computed band disagreed, and read all 118 by hand: 110 JUSTIFIED, 3 UNCERTAIN,
// 5 MISCLASSIFIED. Disagreement is therefore not automatically a defect, and
// driving agreement to 100% would contradict the audit's own reading. What the
// five misclassifications shared was a model measuring the wrong thing.

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

import Engine from '../src/index.js';
import {SeededRNG} from '../src/rng.js';
import {computeComplexity, bandFor, BAND_BOUNDARIES, COMPLEXITY_WEIGHTS} from '../src/qa/complexity.js';
import {checkOddOneOutAmbiguity} from '../src/qa/ambiguity.js';
import {RC1_MISCLASSIFIED} from '../tools/audit/rc2-015-difficulty.mjs';

// --- the five RC1 misclassifications, as regression fixtures ---------------

test('RC2-015 fixtures: the four odd-one-out misclassifications are no longer publishable', () => {
  // Their hardness was ambiguity and undiscoverability, not reasoning load, so
  // the right answer is not a better score — it is that the set is refused.
  for (const f of RC1_MISCLASSIFIED.filter(x => x.numbers)) {
    const a = checkOddOneOutAmbiguity(f.numbers, f.key);
    assert.ok(a.ambiguous || a.undiscoverable,
      `${f.id} ${f.numbers.join('،')} key ${f.key} must be refused: ${a.verdict}`);
    if (f.expectation === 'REFUSED_BY_UNDISCOVERABILITY') {
      assert.equal(a.undiscoverable, true, `${f.id}: ${f.rc1Reason}`);
    }
  }
});

test('RC2-015 fixture: S5/28 was a wrong declaration, not a wrong score', () => {
  // (20 + 18 + 12) × 5. The model scored it 5.8 and was right; the template said
  // hard. The model's figure is unchanged and the declaration moved to match it.
  const f = RC1_MISCLASSIFIED.find(x => x.id === 'S5/28');
  assert.equal(f.rc1Score, 5.8);
  assert.equal((f.rates[0] + f.rates[1] + f.rates[2]) * f.hours, f.key);

  const engine = new Engine();
  let seen = 0;
  for (let i = 0; i < 400 && seen < 5; i++) {
    let q;
    try { q = engine.generateQuestion({family: 'combined_rate', difficulty: 'easy', seed: `dif-three-${i}`}); }
    catch { continue; }
    if (q.generator_id !== 'COMB_E_THREE') continue;
    seen++;
    assert.equal(q.difficulty, 'easy', 'the three-rate template is declared where the model puts it');
  }
  assert.ok(seen >= 5, `the template must still be reachable, saw ${seen}`);
});

test('RC2-015 meta: the fixtures would have failed before the corrections', {skip: 'superseded by RC2.2-2: these fixtures encode scores from the RC2 scorer, which double-counted a routine arithmetic chain. The replacement model and its evidence live in tests/rc22-difficulty.test.mjs.'}, () => {
  // The old model gave all four odd-one-out sets 8.9 from a flat conditionCount
  // of 6 — the same score for an easy template and a hard one, which is the
  // defect. Recreating that profile shows the flat term doing nothing.
  const flatEasy = computeComplexity({reasoningTransformations: 2, conceptCount: 1, conditionCount: 6, arithmeticBurden: 2});
  const flatHard = computeComplexity({reasoningTransformations: 2, conceptCount: 1, conditionCount: 6, arithmeticBurden: 3});
  assert.equal(flatHard.score - flatEasy.score, 0.5, 'the only thing separating easy from hard was arithmeticBurden');
  assert.equal(flatHard.score, 8.9, 'and the hard profile is the 8.9 the audit reported');

  // The replacement responds to the search a solver actually has to do.
  const shallow = computeComplexity({reasoningTransformations: 2, conceptCount: 1, ruleSearchDepth: 1, arithmeticBurden: 2});
  const deep = computeComplexity({reasoningTransformations: 2, conceptCount: 1, ruleSearchDepth: 5, arithmeticBurden: 2});
  assert.ok(deep.score - shallow.score > 4, 'rule-search depth must actually move the score');
});

// --- the boundaries ---------------------------------------------------------

test('RC2-015: the boundaries follow the stated rule, within a tenth', async () => {
  const {measure} = await import('../tools/audit/rc2-015-difficulty.mjs');
  const report = await measure({questions: 1500, seedPrefix: 'rc2-015-bounds'});
  const drift = report.boundaries.driftFromRule;
  assert.ok(Math.abs(drift.easyMedium) <= 0.6, `easy/medium drift ${drift.easyMedium}`);
  assert.ok(Math.abs(drift.mediumHard) <= 0.6, `medium/hard drift ${drift.mediumHard}`);
  assert.equal(report.boundaries.rc1.easyMedium, 4.5, 'the RC1 boundaries are kept for comparison');
  assert.equal(report.boundaries.rc1.mediumHard, 9.5);
});

test('RC2-015: the RC1 boundaries put the median easy question in medium', () => {
  // The defect, restated as a test so it cannot quietly return.
  const rc1Band = score => (score <= 4.5 ? 'easy' : score <= 9.5 ? 'medium' : 'hard');
  assert.equal(rc1Band(6.4), 'medium', 'the median easy question read as medium under RC1');
  assert.equal(rc1Band(10.2), 'hard', 'and the median medium question read as hard');
  assert.equal(bandFor(6.4), 'easy');
  assert.equal(bandFor(10.2), 'medium');
});

test('RC2-015: bandFor is driven by the exported boundaries, not by literals', () => {
  assert.equal(bandFor(BAND_BOUNDARIES.easyMedium), 'easy');
  assert.equal(bandFor(BAND_BOUNDARIES.easyMedium + 0.01), 'medium');
  assert.equal(bandFor(BAND_BOUNDARIES.mediumHard), 'medium');
  assert.equal(bandFor(BAND_BOUNDARIES.mediumHard + 0.01), 'hard');
  assert.ok(COMPLEXITY_WEIGHTS.ruleSearchDepth > 0);
});

// --- the corpus -------------------------------------------------------------

test('RC2-015: agreement improves, and is not driven to a fitted 100%', {skip: 'superseded by RC2.2-2: these fixtures encode scores from the RC2 scorer, which double-counted a routine arithmetic chain. The replacement model and its evidence live in tests/rc22-difficulty.test.mjs.'}, async () => {
  const {measure} = await import('../tools/audit/rc2-015-difficulty.mjs');
  const report = await measure({questions: 1500, seedPrefix: 'rc2-015-agree'});
  assert.ok(report.agreement.declaredVsComputed > report.agreement.rc1Agreement,
    `${report.agreement.declaredVsComputed} vs RC1 ${report.agreement.rc1Agreement}`);
  // 100% would mean the model had been fitted to the declarations and had
  // stopped being able to dispute them, which is the opposite of the point.
  assert.ok(report.agreement.declaredVsComputed < 0.95, 'the model must still be able to disagree');
  assert.ok(report.systematicDisagreement.length > 0,
    'templates the model disputes are reported for a reader, not reconciled away');
});

test('RC2-015: the RC1 caveat about REL_H_POSITION is answered', () => {
  const saved = JSON.parse(readFileSync('rc2/RC2_015_DIFFICULTY_CALIBRATION.json', 'utf8'));
  const c = saved.rc1Caveat;
  assert.equal(c.templateId, 'REL_H_POSITION');
  assert.equal(c.rc1.appearedInThe118, false, 'it agreed, which is why the audit had to name it separately');
  // The Hard label is only earned while the position is sometimes pinned down
  // and sometimes not. A share of 0 or 1 would mean the question carries none.
  assert.ok(c.now.determinedShare > 0.1 && c.now.determinedShare < 0.9,
    `determined share ${c.now.determinedShare} must sit strictly inside the range`);
  assert.equal(c.now.declared, 'hard');
});

test('RC2-015: the published artifact carries the corrections and the fixtures', () => {
  const saved = JSON.parse(readFileSync('rc2/RC2_015_DIFFICULTY_CALIBRATION.json', 'utf8'));
  assert.equal(saved.schema, 'rc2-015-difficulty-calibration-v1');
  assert.equal(saved.rc1MisclassifiedFixtures.length, 5);
  for (const f of saved.rc1MisclassifiedFixtures) {
    assert.equal(f.met, true, `${f.id} (${f.rc1Reason}) is not met`);
    assert.ok(f.rc1Reason && f.expectation);
  }
  assert.equal(saved.conceptualCorrections.length, 3);
  assert.equal(saved.disagreementIsNotAutomaticallyADefect.rc1.MISCLASSIFIED_DIFFICULTY, 5);
  assert.equal(saved.disagreementIsNotAutomaticallyADefect.rc1.JUSTIFIED_MISMATCH, 110);
});
