// RC2.2-1/2 — the difficulty release gate and the reworked scorer.
//
// Holdout C released 82 items as HARD and an independent review found 43 were
// not hard. Two separate defects: a scorer in which routine arithmetic inflated
// difficulty, and a release path in which the label a question carried and the
// difficulty it actually had were free to disagree.

import test from 'node:test';
import assert from 'node:assert/strict';

import Engine from '../src/index.js';
import {FAMILY_REGISTRY, FAMILY_MAP} from '../src/registry.js';
import {BAND_BOUNDARIES, bandFor, deriveOperationProfile, deriveDependencyDepth, COMPLEXITY_WEIGHTS} from '../src/qa/complexity.js';
import {ungated, gated, allHard, capabilityCheck} from '../tools/audit/rc22-difficulty.mjs';

// --- the scorer -------------------------------------------------------------

test('RC2.2-2: repeating one operation is workload, composing different ones is depth', () => {
  // The distinction the whole rework rests on. Four divisions of one kind is
  // one idea applied four times; a weighted mean composes three.
  const chained = ['ثمن العدد = 1920 ÷ 8 = 240.', 'خمس الناتج = 240 ÷ 5 = 48.',
    'ربع الناتج = 48 ÷ 4 = 12.', 'نصف الناتج = 12 ÷ 2 = 6.'];
  const composed = ['المجموع = 4 × 14 = 56.', 'المجموع الثاني = 6 × 19 = 114.',
    'الكل = 56 + 114 = 170.', 'المتوسط = 170 ÷ 10 = 17.'];
  const a = deriveOperationProfile(chained);
  const b = deriveOperationProfile(composed);
  assert.equal(a.transformationDepth, 1, 'one kind of operation');
  assert.equal(a.arithmeticWorkload, 4, 'four of them');
  assert.equal(b.transformationDepth, 3, 'three kinds');
  assert.equal(b.arithmeticWorkload, 4, 'also four operations');
  // Same workload, different depth — so they must not score the same.
  assert.ok(b.transformationDepth > a.transformationDepth);
});

test('RC2.2-2: workload alone cannot lift an item a band', () => {
  // The weight has to be small enough that arithmetic cannot buy difficulty.
  // A whole band is 4.0 wide at the narrowest; twenty routine operations must
  // not cover it.
  const bandWidth = BAND_BOUNDARIES.mediumHard - BAND_BOUNDARIES.easyMedium;
  // Grounded in the corpus rather than in a round number: the median question
  // runs 4 routine operations, the 90th percentile 12, the heaviest 19.
  // At the median, workload buys a fifth of a band. At the 90th it buys 0.6 of
  // one — real, but it cannot cross a band on its own from a standing start,
  // and the heaviest template is independently hard on reasoning. The ceiling
  // is stated rather than hidden: 20 operations WOULD cover a band exactly.
  assert.ok(COMPLEXITY_WEIGHTS.arithmeticWorkload * 4 < bandWidth / 4,
    `the median question's workload contributes ${COMPLEXITY_WEIGHTS.arithmeticWorkload * 4} of a ${bandWidth} band`);
  assert.ok(COMPLEXITY_WEIGHTS.arithmeticWorkload * 12 < bandWidth,
    `a 90th-percentile workload contributes ${COMPLEXITY_WEIGHTS.arithmeticWorkload * 12}, band width ${bandWidth}`);
  // And reasoning must outweigh workload per unit, by a wide margin.
  for (const k of ['dependencyDepth', 'transformationDepth', 'independentConstraints']) {
    assert.ok(COMPLEXITY_WEIGHTS[k] >= COMPLEXITY_WEIGHTS.arithmeticWorkload * 5,
      `${k} is not decisively heavier than workload`);
  }
});

test('RC2.2-2: nothing is parsed, nothing is invented', () => {
  assert.equal(deriveOperationProfile(['اقرأ العبارة.']), null);
  assert.equal(deriveOperationProfile([]), null);
  assert.equal(deriveDependencyDepth(undefined), null);
});

// --- the boundary rule ------------------------------------------------------

test('RC2.2-2: the boundaries are the tertiles of the template population', async () => {
  // The old rule (midway between band medians) became circular once the gate
  // made declared and computed identical: the medians are of the items the
  // boundaries selected. This rule is computed from the UNGATED population and
  // does not depend on where the boundaries already sit, so it can disagree.
  const u = await ungated({perBand: 400, seedTag: 'RC22-T-BOUND'});
  assert.ok(u.templates.length > 95, `only ${u.templates.length} templates reached`);
  // Templates sitting near a tertile change side between samples, so the rule is
  // held to a stated tolerance rather than to exact equality at every sample
  // size. Half a point is well inside a 4.0 band and well outside a drift that
  // would move templates wholesale.
  assert.ok(Math.abs(u.impliedBoundaries.easyMedium - BAND_BOUNDARIES.easyMedium) <= 0.5,
    `rule implies ${u.impliedBoundaries.easyMedium}, production uses ${BAND_BOUNDARIES.easyMedium}`);
  assert.ok(Math.abs(u.impliedBoundaries.mediumHard - BAND_BOUNDARIES.mediumHard) <= 0.5,
    `rule implies ${u.impliedBoundaries.mediumHard}, production uses ${BAND_BOUNDARIES.mediumHard}`);
});

// --- the release gate -------------------------------------------------------

test('RC2.2-1: no question is ever released at a band it does not compute', {skip: 'superseded by RC2.3-1: the published band is the STRUCTURAL band now, not the computed one. RC2.2 made the two identical and the independent Holdout D audit then found 44 of 82 items released as hard were not hard, so agreement between two views of one score was never evidence. tests/rc23-structure.test.mjs checks the replacement, and reports score-vs-structure agreement as evidence rather than as a gate.'}, () => {
  const g = gated({perBand: 800, seedTag: 'RC22-T-GATE'});
  assert.deepEqual(g.violations, [], `${g.violationCount} band violations`);
  assert.equal(g.exhausted, 0, 'the gate must not cost the engine its ability to publish');
});

test('RC2.2-1: the published label IS the computed one', {skip: 'superseded by RC2.3-1: the published band is the STRUCTURAL band now, not the computed one. RC2.2 made the two identical and the independent Holdout D audit then found 44 of 82 items released as hard were not hard, so agreement between two views of one score was never evidence. tests/rc23-structure.test.mjs checks the replacement, and reports score-vs-structure agreement as evidence rather than as a gate.'}, () => {
  const e = new Engine();
  for (let i = 0; i < 600; i++) {
    let q;
    try { q = e.generateQuestion({family: 'random', difficulty: ['easy', 'medium', 'hard'][i % 3], seed: `RC22-T-LBL-${i}`}); }
    catch { continue; }
    assert.equal(q.difficulty, q.metadata.complexity_band, q.generator_id);
    assert.equal(q.metadata.difficulty_is_computed, true);
    assert.equal(bandFor(q.metadata.complexity_score), q.difficulty);
  }
});

test('RC2.2-1: a family that cannot reach a band fails explicitly rather than substituting', () => {
  // The instruction is that an unmeetable request fails loudly. Nothing may come
  // back wearing the wrong label, and nothing may come back easier in silence.
  const e = new Engine();
  const unreachable = [];
  for (const f of FAMILY_REGISTRY) {
    for (const band of ['easy', 'medium', 'hard']) {
      if (f.difficulties.includes(band)) continue;
      unreachable.push([f.id, band]);
      let threw = false, wrongBand = false;
      for (let i = 0; i < 12; i++) {
        try {
          const q = e.generateQuestion({family: f.id, difficulty: band, seed: `RC22-T-UNR-${f.id}-${band}-${i}`});
          if (q.difficulty !== band) wrongBand = true;
        } catch { threw = true; }
      }
      assert.equal(wrongBand, false, `${f.id}/${band} returned a question at another band`);
      assert.equal(threw, true, `${f.id}/${band} neither produced nor refused`);
    }
  }
  assert.ok(unreachable.length > 0, 'this test is only meaningful while some band is unreachable');
});

test('RC2.2-1: the registry capability is what the engine really produces', () => {
  const c = capabilityCheck({attempts: 40});
  assert.deepEqual(c.mismatches.map(m => `${m.family}: says ${m.declared} produces ${m.produced}`), []);
  assert.equal(c.allMatch, true);
});

// --- ALL_HARD ---------------------------------------------------------------

test('RC2.2-1: an ALL_HARD session contains only genuinely hard questions', {skip: 'superseded by RC2.3-2: this asserted eight families in an ALL_HARD session, which the structural adjudication cannot meet — only five families hold a template that demands genuine reasoning depth, and the other eleven were contributing the routine items the audit rejected. Relaxing the number here would be lowering the bar; the shortfall is reported instead, in the RC2.3 coverage report, and tests/rc23-structure.test.mjs asserts what RC2.3 actually requires: every ALL_HARD item comes from a HARD_CAPABLE structure, and the engine refuses up front when a band cannot fill a session.'}, () => {
  const a = allHard({sessions: 6, seedTag: 'RC22-T-AH'});
  assert.equal(a.failedSessions, 0, 'sessions must still be producible');
  assert.equal(a.total, 300);
  assert.equal(a.notHard, 0, `${a.notHard} of ${a.total} ALL_HARD questions are not hard`);
  // And it must not have achieved that by collapsing onto one family.
  assert.ok(a.perFamily.length >= 8, `only ${a.perFamily.length} families in ALL_HARD`);
});

test('RC2.2-1: a mixed session still spans the bands, each correctly labelled', () => {
  const e = new Engine();
  const s = e.generatePractice({count: 50, difficulty: 'mixed', family: 'random', seed: 'RC22-T-MIX'});
  const bands = new Set(s.questions.map(q => q.difficulty));
  assert.ok(bands.size >= 2, `a mixed session collapsed to ${[...bands]}`);
  // RC2.3-1: the label a question is released at is its structural band. The
  // computed band is still recorded beside it and is still worth reporting, but
  // it is evidence, not the label.
  for (const q of s.questions) assert.equal(q.difficulty, q.metadata.structural_band);
});

test('RC2.2-1: session scheduling never asks a family for a band it lacks', () => {
  const e = new Engine();
  for (const band of ['easy', 'medium', 'hard']) {
    for (let i = 0; i < 4; i++) {
      // RC2.7-R2: the hard band delivers about thirty-five before the core
      // construction pool runs out, so the fixture asks for thirty.
      const s = e.generatePractice({count: 30, difficulty: band, family: 'random', seed: `RC22-T-SCHED-${band}-${i}`, bandSession: true});
      for (const q of s.questions) {
        assert.ok(FAMILY_MAP[q.family].difficulties.includes(q.difficulty),
          `${q.family} delivered ${q.difficulty}, which the registry does not claim`);
      }
    }
  }
});
