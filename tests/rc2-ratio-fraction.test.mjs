// RC2-018, RC2-019, RC2-020 — fraction pedagogy and ratio invariants.

import test from 'node:test';
import assert from 'node:assert/strict';

import Engine from '../src/index.js';
import {gcd} from '../src/utils.js';

// --- RC2-020: every printed ratio edge carries the template's invariants ----

test('RC2-020 MUST_REJECT: an unreduced secondary ratio is refused', async () => {
  const {validatePedagogy} = await import('../src/qa/pedagogy.js');
  // The historical escape: ب : ج = 6 : 2 printed alongside a reduced first edge.
  const r = validatePedagogy({
    correct: 12,
    ratio: [
      {a: 3, b: 5, requireReduced: true, requireDistinctSides: true, label: 'first'},
      {a: 6, b: 2, requireReduced: true, requireDistinctSides: true, label: 'second'}
    ]
  });
  assert.equal(r.valid, false);
  assert.ok(r.reasons.includes('REDUCIBLE_RATIO'));
});

test('RC2-020 MUST_REJECT: an equal-sided secondary ratio is refused', async () => {
  const {validatePedagogy} = await import('../src/qa/pedagogy.js');
  const r = validatePedagogy({
    correct: 12,
    ratio: [
      {a: 3, b: 5, requireReduced: true, requireDistinctSides: true, label: 'first'},
      {a: 4, b: 4, requireReduced: true, requireDistinctSides: true, label: 'second'}
    ]
  });
  assert.equal(r.valid, false);
  assert.ok(r.reasons.includes('EQUAL_RATIO_SIDES'));
});

test('RC2-020 MUST_ACCEPT: two reduced, distinct-sided ratios pass', async () => {
  const {validatePedagogy} = await import('../src/qa/pedagogy.js');
  const r = validatePedagogy({
    correct: 12,
    ratio: [
      {a: 3, b: 5, requireReduced: true, requireDistinctSides: true, label: 'first'},
      {a: 2, b: 7, requireReduced: true, requireDistinctSides: true, label: 'second'}
    ]
  });
  assert.equal(r.valid, true);
});

test('RC2-020: no published ratio question prints an unreduced or equal-sided pair', () => {
  const engine = new Engine();
  const offenders = [];
  const templates = new Set();
  for (let i = 0; i < 900; i++) {
    const q = engine.generateQuestion({family: 'ratios', difficulty: 'mixed', seed: `rc2-020-${i}`});
    templates.add(q.generator_id);
    const p = q.metadata.parameters;
    for (const [x, y] of [['firstA', 'firstB'], ['secondB', 'secondC'], ['partA', 'partB']]) {
      if (!Number.isFinite(p[x]) || !Number.isFinite(p[y])) continue;
      if (p[x] === p[y]) offenders.push(`${q.generator_id} ${x}:${y} = ${p[x]}:${p[y]} equal sides`);
      else if (gcd(p[x], p[y]) !== 1) offenders.push(`${q.generator_id} ${x}:${y} = ${p[x]}:${p[y]} reducible`);
    }
  }
  assert.deepEqual(offenders.slice(0, 5), [], `${offenders.length} escapes, e.g. ${offenders.slice(0, 3).join(' | ')}`);
  // RC2.9.4-B2/B3 added five ratio constructions (three easy, two medium) and
  // RC2.9.5 §4 three more EASY ones: sixteen.
  assert.equal(templates.size, 16, `all ratio templates must still publish, saw ${[...templates].join(", ")}`);
});

// --- RC2-018: the hidden fraction is next ÷ previous ------------------------

const hiddenFractionItems = (n = 400) => {
  const engine = new Engine();
  const out = [];
  for (let i = 0; i < n; i++) {
    const q = engine.generateQuestion({family: 'fractions', difficulty: 'mixed', seed: `rc2-018-${i}`});
    if (q.metadata.asked_unknown === 'hiddenFraction') out.push(q);
  }
  return out;
};

test('RC2-018: the reminder no longer teaches the reversed rule', () => {
  const items = hiddenFractionItems();
  assert.ok(items.length > 0, 'the hidden-fraction direction must still be generated');
  for (const q of items) {
    const r = q.explanation.remember;
    assert.ok(/الكسر المجهول = الناتج بعده ÷ الناتج قبله/.test(r),
      `the reminder must state next ÷ previous: ${r}`);
    assert.ok(/مقام/.test(r),
      `and must say that previous ÷ next gives the denominator: ${r}`);
  }
});

test('RC2-018: the steps distinguish the fraction from its denominator', () => {
  for (const q of hiddenFractionItems(200)) {
    const joined = q.explanation.steps.join(' ');
    assert.ok(/الكسر المجهول = الناتج بعده ÷ الناتج قبله/.test(joined), q.question);
    assert.ok(/وهذا مقام الكسر/.test(joined), q.question);
  }
});

// --- RC2-019: the quick method is a rule, not one instance's arithmetic -----

test('RC2-019: every quick method states a reusable rule', () => {
  const engine = new Engine();
  const offenders = [];
  for (const fam of engine.listFamilies().map(f => f.id)) {
    for (let i = 0; i < 40; i++) {
      let q;
      try { q = engine.generateQuestion({family: fam, difficulty: 'mixed', seed: `rc2-019-${fam}-${i}`}); } catch { continue; }
      const fast = q.explanation.fast_method;
      if (!fast) continue;
      // A method must carry words, not only digits and operators. A string of
      // the shape "30 ÷ 15 = 2." is this instance's arithmetic, not a method.
      const words = fast.replace(/[\d\s×÷+\-=.,()%]/g, '');
      if (words.length < 8) offenders.push(`${q.generator_id}: ${fast}`);
    }
  }
  assert.deepEqual(offenders.slice(0, 5), [], `${offenders.length} instance-only quick methods, e.g. ${offenders.slice(0, 3).join(' | ')}`);
});

test('RC2-019 meta: the check would catch the historical string', () => {
  const historical = '30 ÷ 15 = 2.';
  const words = historical.replace(/[\d\s×÷+\-=.,()%]/g, '');
  assert.ok(words.length < 8, 'the meta-fixture must fail the rule, or the check proves nothing');
});
