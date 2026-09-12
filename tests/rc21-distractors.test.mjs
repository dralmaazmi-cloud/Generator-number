// RC2.1-3 — distractor plausibility.
//
// The review raised 44 option-quality concerns in three shapes: grossly
// out-of-scale values, dimensionally relabelled intermediates, and values a
// candidate can strike out without solving. These tests cover the mechanism, the
// constraint that shaped it, and the residual it does not close.

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

import Engine from '../src/index.js';
import {violatesBounds, partitionByPlausibility, scaleRatio} from '../src/qa/distractor-plausibility.js';
import {measure} from '../tools/audit/rc21-distractors.mjs';

test('RC2.1-3: bounds are judged from the givens, never from the key', () => {
  // The whole design rests on this. An average of two given speeds lies between
  // them whatever the answer turns out to be.
  assert.equal(violatesBounds({value: 405}, {between: [70, 100]}), true);
  assert.equal(violatesBounds({value: 85}, {between: [70, 100]}), false);
  assert.equal(violatesBounds({value: 70}, {between: [70, 100]}), false, 'an endpoint is inside');
  assert.equal(violatesBounds({value: 5}, null), false, 'no bounds declared, no opinion');
  assert.equal(violatesBounds({value: 'السبت'}, {between: [1, 5]}), false, 'non-numeric is not judged');
});

test('RC2.1-3: the plausibility split takes no argument that could carry the answer', () => {
  // A structural guarantee, not a promise: partitionByPlausibility has no
  // parameter for the key, so no future edit can quietly start consulting it.
  const sig = partitionByPlausibility.toString().slice(0, 120);
  assert.ok(/partitionByPlausibility\(distractors, opts = \{\}\)/.test(sig),
    `signature must not take the key: ${sig}`);
  assert.ok(!/\bkey\b/.test(partitionByPlausibility.toString()),
    'the function body must not reference a key');
  const r = partitionByPlausibility(
    [{value: 80}, {value: 405}, {value: 90}], {bounds: {between: [70, 100]}});
  assert.deepEqual(r.plausible.map(d => d.value), [80, 90]);
  assert.deepEqual(r.implausible.map(d => d.value), [405]);
});

test('RC2.1-3: odd-one-out is exempt, because its options are the stimulus', () => {
  const r = partitionByPlausibility([{value: 34}, {value: 2}],
    {bounds: {between: [2, 10]}, stimulusIsOptions: true});
  assert.equal(r.implausible.length, 0);
  assert.equal(r.plausible.length, 2);
});

test('RC2.1-3: a template that declares bounds never ships an option outside them', () => {
  // The defect the review named: a total distance offered as an average speed.
  const e = new Engine();
  let checked = 0;
  for (let i = 0; i < 6000 && checked < 400; i++) {
    let q;
    try { q = e.generateQuestion({family: 'speed', difficulty: 'medium', seed: `RC21-BOUND-${i}`}); } catch { continue; }
    if (q.generator_id !== 'SPD_M_AVG') continue;
    checked++;
    const p = q.metadata.parameters;
    const lo = Math.min(p.speedA, p.speedB), hi = Math.max(p.speedA, p.speedB);
    for (const [letter, v] of Object.entries(q.options)) {
      const n = parseFloat(v);
      assert.ok(n >= lo && n <= hi,
        `${q.generator_id} option ${letter} = ${n} is outside [${lo}, ${hi}]: ${q.question}`);
    }
  }
  assert.ok(checked >= 200, `only ${checked} SPD_M_AVG items reached`);
});

test('RC2.1-3: the averaging templates gained credible in-bracket alternatives', () => {
  // Suppressing the bad options is only half of it — the template must have
  // something better to offer, or it falls back to them anyway.
  const e = new Engine();
  const seen = new Set();
  for (let i = 0; i < 6000 && seen.size < 2; i++) {
    let q;
    try { q = e.generateQuestion({family: 'speed', difficulty: 'medium', seed: `RC21-NEAR-${i}`}); } catch { continue; }
    if (q.generator_id !== 'SPD_M_AVG') continue;
    for (const m of Object.values(q.metadata.options_meta)) {
      if (m.misconceptionId === 'SWAPPED_WEIGHTS_IN_WEIGHTED_MEAN') seen.add('swap');
      if (m.misconceptionId === 'WEIGHTED_BY_WRONG_QUANTITY') seen.add('weight');
    }
  }
  assert.deepEqual([...seen].sort(), ['swap', 'weight'],
    'both new near-misses must actually reach learners');
});

test('RC2.1-3: no template declaring bounds violates them, engine-wide', () => {
  const r = measure({questions: 4500, seedTag: 'RC21-DIST-TEST'});
  assert.equal(r.outOfDeclaredBounds.count, 0);
  assert.ok(r.corpus.items > 4000);
});

test('RC2.1-3: the residual is measured and named, not hidden', () => {
  // This does NOT assert the out-of-scale share is zero, because it is not, and
  // closing it would require selecting options by their ratio to the key —
  // which OBSERVE_NEVER_TARGET forbids. The share is pinned so that a later
  // change which makes it worse is visible.
  const r = measure({questions: 4500, seedTag: 'RC21-RESID'});
  assert.ok(r.outOfScale.share < 0.09,
    `out-of-scale share ${r.outOfScale.share} has grown`);
  assert.ok(r.worstTemplates.length > 0,
    'the residual is expected to be non-empty; if it is empty, check the measurement still works');
});

test('RC2.1-3: scaleRatio is measurement-only and no generation path calls it', () => {
  // The rule is only worth having if it is enforced. src/ may define it; src/
  // may not use it.
  assert.equal(scaleRatio(405, 90), 4.5);
  assert.equal(scaleRatio(90, 405), 4.5, 'symmetric');
  const files = [
    'src/utils.js', 'src/index.js', 'src/families/_shared.js',
    'src/families/speed.js', 'src/families/averages.js', 'src/qa/pipeline.js'
  ];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    assert.ok(!/scaleRatio\s*\(/.test(src), `${f} calls scaleRatio, which reads the key`);
  }
});
