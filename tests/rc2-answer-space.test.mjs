// RC2-011 — answer-space leakage, remediated in parameter space.
//
// The scope is explicit that answer-space SIZE is not itself a defect and that
// no threshold rule is adopted: REL_M_COUNT had the largest space in the RC1
// table and still leaked the most. What is measured is the ADVANTAGE a
// test-taker gets by ignoring the question and picking the commonest answer —
// modal share minus the 1/6 a blind guess earns on a six-option paper.
//
// OBSERVE_NEVER_TARGET governs the remedy. The fix is the DESIGN-TIME width of
// the pools the stem draws its stated numbers from — numbers a learner reads on
// the page. It is never a filter, a retry, a reweighting or a chooser that looks
// at a generated answer.

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

import {measure, scanForAnswerConditionedSampling, RC1_WORST} from '../tools/audit/rc2-011-answer-space.mjs';

// --- the constraint ---------------------------------------------------------

test('RC2-011: no generation path consults a statistical property of answers', () => {
  const scan = scanForAnswerConditionedSampling();
  assert.deepEqual(scan.forbidden, [],
    'rank, frequency, modal, histogram and the RC1 chooser names must all be absent');
});

test('RC2-011 meta: the scan convicts the vocabulary it exists to catch', async () => {
  // A scan that returns empty because it matches nothing would prove nothing.
  // The RC1 engine had pickBalancedDistractors, drawRankPosition and
  // hasLoneRoundNumber; the scan is shown to catch that whole family of names.
  const {mkdtempSync, writeFileSync, rmSync} = await import('node:fs');
  const {tmpdir} = await import('node:os');
  const {join} = await import('node:path');
  const dir = mkdtempSync(join(tmpdir(), 'rc2-011-'));
  try {
    writeFileSync(join(dir, 'fake.js'), [
      'const x = pickBalancedDistractors(pool, correct);',
      'const p = drawRankPosition(rng, 5);',
      'if (answerCounts[v] > 3) return resample(ctx, f);',
      'const r = correctNumericRank(options);'
    ].join('\n'));
    const scan = scanForAnswerConditionedSampling(dir);
    assert.ok(scan.forbidden.length >= 4, JSON.stringify(scan.forbidden));
    const matched = scan.forbidden.map(o => o.text).join(' ');
    assert.ok(matched.includes('pickBalancedDistractors'));
    assert.ok(matched.includes('drawRankPosition'));
    assert.ok(matched.includes('answerCounts'));
    // The name that would reintroduce the defect is more likely to be buried in
    // a longer identifier than to stand alone, so the scan must catch that too.
    assert.ok(matched.includes('correctNumericRank'), 'a rank name inside an identifier must be caught');
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
});

test('RC2-011: the answer reads that DO exist are the two expected shapes', () => {
  const scan = scanForAnswerConditionedSampling();
  // Validity guards redraw when the answer is not a usable quantity; backward
  // construction draws it uniformly and computes the stem from it. Both read
  // `correct`; neither consults a property of any answer.
  assert.ok(scan.validityGuards.length > 0, 'the engine does guard validity, and says so');
  assert.ok(scan.backwardConstruction.length > 0, 'and some templates build backwards, and say so');
  for (const b of scan.backwardConstruction) {
    assert.equal(b.uniform, true, `${b.file}:${b.line} draws the answer with a weight`);
  }
});

// --- the measurement --------------------------------------------------------

test('RC2-011: the five templates the RC1 audit named all leak materially less', async () => {
  // RC2.1-2 moved templates between bands, so a fixed sample is spread over
  // more templates per band than before and the five named ones are reached
  // less often. The corpus is enlarged rather than the assertion weakened.
  // RC2.5 moved nineteen structures out of hard and ten out of medium, so the
  // bands hold very different numbers of templates and a fixed corpus reaches
  // each one less often. The corpus is enlarged again rather than the assertion
  // weakened — two of the five named templates now sit in a 62-template medium
  // pool and were not being sampled at all at 12,000.
  const report = await measure({questions: 24000, seedPrefix: 'rc2-011-test'});
  assert.equal(report.corpus.exhausted, 0);
  for (const c of report.rc1Comparison) {
    assert.ok(c.rc2, `${c.templateId} was not sampled`);
    assert.ok(c.advantageDelta < 0,
      `${c.templateId}: RC1 +${c.rc1.advantagePoints} -> RC2 +${c.rc2.advantagePoints}`);
    assert.ok(c.rc2.space > c.rc1.space,
      `${c.templateId}: the answer space must have widened, ${c.rc1.space} -> ${c.rc2.space}`);
    assert.ok(c.rc2.entropyBits > c.rc1.entropyBits, `${c.templateId}: entropy`);
  }
});

test('RC2-011: no template still gives a guesser a twenty-point advantage', async () => {
  // RC2.1-2. Judged on the lower bound of the modal share, not the point
  // estimate: a template is convicted only where the sample actually supports
  // the claim. Two templates measured above 20 on a point estimate here while
  // their true advantages are +7.8 and +16.0.
  const report = await measure({questions: 20000, seedPrefix: 'rc2-011-ceiling', minSample: 150});
  const worst = report.templates.filter(t => t.advantageLowerBoundPoints > 20);
  assert.deepEqual(worst.map(t => `${t.templateId} +${t.advantageLowerBoundPoints} (n=${t.n})`), []);
  // ...and the typical template gives no advantage at all.
  assert.ok(report.summary.medianAdvantagePoints < 5,
    `median advantage ${report.summary.medianAdvantagePoints}`);
});

test('RC2-011: widening the pools did not cost the engine its ability to publish', async () => {
  const report = await measure({questions: 3000, seedPrefix: 'rc2-011-publish', minSample: 5});
  assert.equal(report.corpus.exhausted, 0);
  assert.ok(report.summary.templatesMeasured > 100, `${report.summary.templatesMeasured} templates reached`);
});

test('RC2-011: the published artifact carries the comparison and the empty scan', () => {
  const saved = JSON.parse(readFileSync('rc2/RC2_011_ANSWER_SPACE.json', 'utf8'));
  assert.equal(saved.schema, 'rc2-011-answer-space-v1');
  assert.deepEqual(saved.constraint.staticScanOffenders, []);
  assert.equal(saved.rc1Comparison.length, RC1_WORST.length);
  for (const c of saved.rc1Comparison) assert.ok(c.advantageDelta < 0, c.templateId);
  // The scope's own caveat must be carried, not quietly replaced by a threshold.
  assert.ok(saved.interpretation.note.includes('not a defect'));
  assert.ok(saved.constraint.expectedAnswerReads.validityGuards.length > 0);
});
