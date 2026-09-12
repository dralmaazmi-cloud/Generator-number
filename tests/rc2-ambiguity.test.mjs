// RC2-007 / RC2-008 / RC2-009 — odd-one-out ambiguity and discoverability.
//
// The historical cases are fixtures for the RULE, not for their literal values:
// each MUST_REJECT is paired with a structurally nearby MUST_ACCEPT, so a
// checker that simply rejected everything would fail this file.

import test from 'node:test';
import assert from 'node:assert/strict';

import Engine from '../src/index.js';
import {classifyOddOneOut, findSingleOutlierRules, VERDICT, DISCOVERABILITY_CEILING} from '../src/qa/ambiguity.js';

const verdict = (set, key) => classifyOddOneOut(set, key).verdict;

// --- RC2-007: one competing simple rule is enough ---------------------------

test('RC2-007 MUST_REJECT: a lone simpler rule pointing elsewhere makes it ambiguous', () => {
  // RC1 S1/27 and S5/08. The intended rule is n²−1 (salience 2); "all but one
  // are multiples of 3" (salience 1) singles out 35 instead. RC1 published both
  // because it demanded a *pair* of competing simple rules.
  assert.equal(verdict([24, 35, 75, 48, 63, 15], 75), VERDICT.AMBIGUOUS);
  assert.equal(verdict([24, 63, 15, 30, 48, 35], 30), VERDICT.AMBIGUOUS);
});

test('RC2-007 MUST_ACCEPT: the same rule class with no competing rule passes', () => {
  // n²−1 again: 24,35,48,63,80 with 50 as the intruder. Nothing else singles
  // out a different number at salience ≤ 2.
  //
  // The first set tried here was 8,15,24,35,48 + 50, and the classifier called
  // it AMBIGUOUS — correctly: 8 is the only cube and 15 the only triangular
  // number. The run was changed, not the policy.
  const c = classifyOddOneOut([24, 35, 48, 63, 80, 50], 50);
  assert.equal(c.verdict, VERDICT.CLEAN, `expected CLEAN, got ${c.verdict} (${c.competing.map(r => r.ruleId + '->' + r.outlier).join(', ')})`);
});

test('RC2-007: a single competing rule is sufficient — no pair required', () => {
  const c = classifyOddOneOut([24, 35, 75, 48, 63, 15], 75);
  assert.equal(c.competing.length >= 1, true);
  assert.equal(c.verdict, VERDICT.AMBIGUOUS, 'one competing rule must be enough');
});

// --- RC2-008: both framings, and magnitude ---------------------------------

test('RC2-008 MUST_REJECT: "exactly one satisfies P" is tested, not only "one fails"', () => {
  // RC1 S3/27. Multiples of four with 18 as the intruder — but 16 is the only
  // perfect square, which RC1 could not see because it tested one framing only.
  assert.equal(verdict([16, 18, 32, 20, 24, 28], 18), VERDICT.AMBIGUOUS);
});

test('RC2-008 MUST_ACCEPT: multiples of four with no lone special number', () => {
  const c = classifyOddOneOut([12, 18, 20, 24, 28, 32], 18);
  assert.equal(c.verdict, VERDICT.CLEAN, `got ${c.verdict}: ${c.competing.map(r => r.ruleId + '->' + r.outlier).join(', ')}`);
});

test('RC2-008: both framings are reported by the rule sweep', () => {
  const rules = findSingleOutlierRules([16, 18, 32, 20, 24, 28]);
  assert.ok(rules.some(r => r.framing === 'allButOneSatisfy'), 'the unifying framing must be found');
  assert.ok(rules.some(r => r.framing === 'onlyOneSatisfies'), 'the inverse framing must be found');
});

test('RC2-008: a magnitude pattern is reported as BORDERLINE, never as AMBIGUOUS', () => {
  // All two-digit except one three-digit, with a clean structural rule.
  const c = classifyOddOneOut([36, 49, 64, 81, 100, 73], 73);
  assert.equal(c.verdict, VERDICT.BORDERLINE);
  assert.ok(c.surfaceCompeting.length > 0, 'the magnitude pattern must stay visible');
  assert.equal(c.competing.length, 0, 'a magnitude pattern is not a hard ambiguity');
});

test('RC2-008: arbitrary divisibility cannot compete in the inverse framing', () => {
  // "the only one divisible by 7" is an artefact of any set, not a reason for
  // the set to exist. If it competed, almost every item would be ambiguous.
  const rules = findSingleOutlierRules([6, 10, 12, 14, 22, 26]);
  const bogus = rules.filter(r => r.framing === 'onlyOneSatisfies' && /^mult\d+$/.test(r.ruleId));
  assert.deepEqual(bogus, [], 'divisibility must unify five numbers to count');
});

// --- RC2-009: the intended rule must be findable ----------------------------

test('RC2-009 MUST_REJECT: a key reachable only above the ceiling is undiscoverable', () => {
  // RC1 S5/46: prime + 10 over six consecutive odd numbers. Primality, the
  // natural reading, singles out two numbers, neither the key.
  const c = classifyOddOneOut([21, 23, 15, 13, 19, 17], 19);
  assert.equal(c.verdict, VERDICT.UNDISCOVERABLE);
  assert.ok(c.intendedSalience > DISCOVERABILITY_CEILING);
});

test('RC2-009 MUST_ACCEPT: a hard but findable rule passes', () => {
  // Triangular numbers 10,15,21,28,36 with 30 as the intruder: salience 2.
  const c = classifyOddOneOut([10, 15, 21, 28, 36, 30], 30);
  assert.notEqual(c.verdict, VERDICT.UNDISCOVERABLE);
  assert.ok(c.intendedSalience <= DISCOVERABILITY_CEILING);
});

test('RC2-009: an above-ceiling rule cannot certify a question it alone supports', () => {
  const c = classifyOddOneOut([21, 23, 15, 13, 19, 17], 19);
  assert.ok(c.supporting.every(r => r.salience > DISCOVERABILITY_CEILING) || c.supporting.length === 0,
    'nothing at or below the ceiling supports this key');
  assert.equal(c.verdict, VERDICT.UNDISCOVERABLE);
});

// --- publication policy over real generation --------------------------------

test('RC2-007/008/009: nothing AMBIGUOUS or UNDISCOVERABLE is ever published', () => {
  const engine = new Engine();
  const seen = {};
  const templates = new Set();
  for (let i = 0; i < 900; i++) {
    const q = engine.generateQuestion({family: 'odd_one_out', difficulty: 'mixed', seed: `rc2-amb-${i}`});
    const v = q.metadata.ambiguity_verdict;
    seen[v] = (seen[v] || 0) + 1;
    templates.add(q.generator_id);
    // Re-derive independently from the published numbers rather than trusting
    // the recorded verdict.
    const nums = (q.display_expression || '').match(/\d+/g).map(Number);
    const key = Number(q.correct_value);
    const again = classifyOddOneOut(nums, key).verdict;
    assert.notEqual(again, VERDICT.AMBIGUOUS, `${q.id} published an ambiguous set`);
    assert.notEqual(again, VERDICT.UNDISCOVERABLE, `${q.id} published an undiscoverable rule`);
    assert.notEqual(again, VERDICT.UNSUPPORTED, `${q.id} published a key no rule supports`);
  }
  assert.equal(seen[VERDICT.AMBIGUOUS] ?? 0, 0);
  assert.equal(seen[VERDICT.UNDISCOVERABLE] ?? 0, 0);
  assert.ok(templates.size >= 7, `every odd-one-out template must still publish, saw ${[...templates].join(', ')}`);
});

test('RC2-009: the retired prime-offset rule is gone, and the inventory is not smaller', () => {
  const engine = new Engine();
  const templates = new Set();
  for (let i = 0; i < 900; i++) {
    templates.add(engine.generateQuestion({family: 'odd_one_out', difficulty: 'mixed', seed: `rc2-inv-${i}`}).generator_id);
  }
  assert.ok(!templates.has('ODD_H_PRIME_OFFSET'), 'the undiscoverable rule must no longer publish');
  assert.ok(templates.has('ODD_H_TRIANGULAR'), 'and must have been replaced, not dropped');
  assert.equal(templates.size, 7, `expected 7 templates, saw ${templates.size}: ${[...templates].join(', ')}`);
});
