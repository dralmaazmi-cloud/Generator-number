// RC2.1-2 — difficulty calibration.
//
// The independent review of holdout B found 39 misclassified items: 36 declared
// harder than they are, 3 easier, concentrated in the ALL_HARD session. These
// tests check the ROOT CAUSE and the resulting calibration, and never name a
// holdout item.

import test from 'node:test';
import assert from 'node:assert/strict';

import Engine from '../src/index.js';
import {BAND_BOUNDARIES, deriveDependencyDepth} from '../src/qa/complexity.js';
import {build, allHardEvidence} from '../tools/audit/rc21-difficulty.mjs';

// --- the root cause ---------------------------------------------------------

test('RC2.1-2: dependency depth is derived from the solution, not declared', () => {
  // A chain: each step consumes the previous step's result.
  assert.equal(deriveDependencyDepth([
    'العمل الكلي = 12 × 15 = 180.',
    'المنجز = 12 × 3 = 36.',
    'المتبقي = 180 − 36 = 144.',
    'العمال = 144 ÷ 4 = 36.'
  ]), 2);
  // Independent steps are not a chain.
  assert.equal(deriveDependencyDepth(['أ = 2 × 3 = 6.', 'ب = 10 × 4 = 40.']), 0);
  // Nothing to parse: the declared value must stand rather than be zeroed.
  assert.equal(deriveDependencyDepth(['اقرأ العبارة.', 'قارن بين الاثنين.']), null);
  assert.equal(deriveDependencyDepth([]), null);
  assert.equal(deriveDependencyDepth(undefined), null);
});

test('RC2.1-2: every template gets a dependency depth, not just the ones that declared one', () => {
  // Before RC2.1 only 22 of 107 templates declared it, and that unevenness —
  // not the boundaries — is what misclassified templates in both directions.
  const e = new Engine();
  const seen = new Map();
  for (const band of ['easy', 'medium', 'hard']) {
    for (let i = 0; i < 700; i++) {
      let q;
      try { q = e.generateQuestion({family: 'random', difficulty: band, seed: `RC21-DD-${band}-${i}`}); } catch { continue; }
      const d = q.metadata.complexity_factors?.dependencyDepth;
      assert.equal(typeof d, 'number', `${q.generator_id} has no dependency depth`);
      seen.set(q.generator_id, Math.max(seen.get(q.generator_id) ?? 0, d));
    }
  }
  assert.ok(seen.size > 90, `only ${seen.size} templates sampled`);
  const withChain = [...seen.values()].filter(v => v > 0).length;
  assert.ok(withChain > 40,
    `only ${withChain} of ${seen.size} templates register a dependency chain; the derivation is not reaching them`);
});

// --- the boundaries ---------------------------------------------------------

test('RC2.1-2: the boundaries are what the stated rule implies', {skip: 'superseded by RC2.2-2: the midpoint-of-medians rule became circular once the release gate made declared and computed identical. tests/rc22-difficulty.test.mjs checks the tertile rule that replaced it.'}, async () => {
  // RC2-015 placed them midway between the medians of adjacent bands, and said
  // a later model change must show up rather than be absorbed. RC2.1 changed
  // the model, so the rule is reapplied — this asserts it was, and that the
  // constants in production are the fixed point rather than a fitted pair.
  const r = await build({perBand: 1200, seedTag: 'RC21-BOUND'});
  assert.equal(r.boundariesInUse.easyMedium, BAND_BOUNDARIES.easyMedium);
  assert.equal(r.boundariesInUse.mediumHard, BAND_BOUNDARIES.mediumHard);
  assert.ok(Math.abs(r.impliedBoundaries.easyMedium - BAND_BOUNDARIES.easyMedium) <= 0.3,
    `rule implies ${r.impliedBoundaries.easyMedium}, production uses ${BAND_BOUNDARIES.easyMedium}`);
  assert.ok(Math.abs(r.impliedBoundaries.mediumHard - BAND_BOUNDARIES.mediumHard) <= 0.3,
    `rule implies ${r.impliedBoundaries.mediumHard}, production uses ${BAND_BOUNDARIES.mediumHard}`);
});

// --- the outcome ------------------------------------------------------------

test('RC2.1-2: calibration improved against the RC2 baseline', async () => {
  // RC2 measured 65.4% declared/computed agreement on this same sampling.
  // Floors are set from the measured spread over four seed tags at this sample
  // size (overall .722-.728, easy .847-.871, hard .719-.743), not from a single
  // run — a threshold fitted to one run is a threshold that fails on the next.
  // RC2.5. What this measures is how often the RC2.2 NUMERIC complexity score
  // would band an item where the published band puts it. Since RC2.3 the score
  // is not what bands anything — the structural adjudication is — and RC2.5 has
  // now recalibrated that adjudication against human verdicts. So agreement with
  // the superseded scorer is expected to FALL, and a floor on it would be
  // asserting that the human calibration must agree with the thing it replaced.
  //
  // The floors are therefore loosened to sanity bounds and the number is kept as
  // a recorded measurement. Per the brief, it is never evidence that difficulty
  // is correct.
  const r = await build({perBand: 1500, seedTag: 'RC21-AGREE'});
  assert.ok(r.itemAgreement > 0.50,
    `agreement ${r.itemAgreement}: the score and the bands have diverged far enough to be worth investigating`);
  assert.ok(r.perDeclared.easy.agreement > 0.60, `easy ${r.perDeclared.easy.agreement}`);
  assert.ok(r.perDeclared.hard.agreement > 0.50, `hard ${r.perDeclared.hard.agreement}`);
  // Medium remains the weakest band and is not claimed to be fixed; it is the
  // residual this report carries forward. RC2.5 widened the gap further by
  // design: ten templates the reviewers judged EASY were moved out of medium and
  // nineteen judged MEDIUM were moved into it, and the numeric score agrees with
  // neither move. 0.46 is the measured value; it is recorded, not targeted.
  assert.ok(r.perDeclared.medium.agreement > 0.40, `medium ${r.perDeclared.medium.agreement}`);
});

test('RC2.1-2: no band was emptied by reclassification', {skip: 'superseded by RC2.2-1: a family band is now deliberately empty where the family holds no template that computes it, and generation fails explicitly there rather than substituting. tests/rc22-difficulty.test.mjs checks that instead.'}, () => {
  // Families dispatch from fixed per-band lists. Reclassifying a template out of
  // a band that holds only one would make that band ungenerateable.
  const e = new Engine();
  for (const fam of e.listFamilies().map(f => f.id)) {
    for (const band of ['easy', 'medium', 'hard']) {
      let ok = 0;
      for (let i = 0; i < 30 && ok === 0; i++) {
        try { e.generateQuestion({family: fam, difficulty: band, seed: `RC21-POOL-${fam}-${band}-${i}`}); ok++; } catch { /* retry */ }
      }
      assert.equal(ok, 1, `${fam}/${band} cannot generate at all`);
    }
  }
});

test('RC2.1-2: the ALL_HARD session is measurably less inflated', () => {
  // RC2 delivered 38% of ALL_HARD questions below the hard band on the same
  // measurement. This asserts the improvement and pins the residual, which is
  // structural: four families hold no template that reaches the hard band, and
  // a hard session drawing from every family necessarily includes them.
  const ev = allHardEvidence({sessions: 6, seedTag: 'RC21-AH-TEST'});
  assert.equal(ev.total, 300);
  assert.ok(ev.notHardShare < 0.32,
    `${(ev.notHardShare * 100).toFixed(1)}% of ALL_HARD is not hard; RC2 was 38%`);
  // The residual is named rather than hidden: if a family ever gains genuinely
  // hard stock this list shrinks, and if one loses it the list grows.
  assert.ok(Array.isArray(ev.familiesWithNoGenuinelyHardStock));
  for (const f of ev.familiesWithNoGenuinelyHardStock) {
    const row = ev.perFamily.find(x => x.family === f);
    assert.ok(row.medianScore < BAND_BOUNDARIES.mediumHard);
  }
});

test('RC2.1-2: the three underclassified work-target items are no longer underclassified', {skip: 'superseded by RC2.2-2: the scorer was reworked, so a template pinned to a band by the RC2.1 model is no longer the right fixture. The RC2.2 gate makes the underlying claim unconditional — nothing is released at a band it does not compute.'}, () => {
  // The review found three WORK_M_TARGET items declared easier than they are.
  // Nothing here was hard-coded for them: the derived dependency depth raised
  // the template to a hard median on its own, and it was reclassified with the
  // rest. This checks the template, not the three items.
  const e = new Engine();
  const scores = [];
  for (let i = 0; i < 3000 && scores.length < 30; i++) {
    let q;
    try { q = e.generateQuestion({family: 'work_time', difficulty: 'hard', seed: `RC21-WMT-${i}`}); } catch { continue; }
    if (q.generator_id !== 'WORK_M_TARGET') continue;
    scores.push(q.metadata.complexity_score);
    assert.equal(q.difficulty, 'hard');
  }
  assert.ok(scores.length >= 20, `only ${scores.length} WORK_M_TARGET items reached`);
  const med = [...scores].sort((a, b) => a - b)[scores.length >> 1];
  assert.ok(med >= BAND_BOUNDARIES.mediumHard, `median ${med} is below the hard boundary`);
});
