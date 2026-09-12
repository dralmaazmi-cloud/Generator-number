// Section 18-C. How the answer must move when the input is changed in a known
// way. These catch faults that random generation can walk straight past.
//
// Every case here calls production code, and every case can fail: the
// fault-injection suite demonstrates that for the same checks.

import test from 'node:test';
import assert from 'node:assert/strict';

import {searchDomain, grid} from '../src/qa/oracle-engine.js';
import {Fraction} from '../src/qa/fraction.js';
import {checkOddOneOutAmbiguity, findSingleOutlierRules} from '../src/qa/ambiguity.js';
import {buildOrderOracle} from '../src/qa/relational-oracle.js';
import {canonicalGraph, buildFingerprint, canonicalNumberSet} from '../src/qa/fingerprint.js';
import {SeededRNG} from '../src/rng.js';

const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

test('doubling both the distance and the speed leaves the time unchanged', () => {
  for (const [distance, speed] of [[120, 60], [180, 90], [250, 50]]) {
    for (const k of [2, 3, 4]) {
      const solveTime = (d, s) => searchDomain(grid(0, 20, 0.5), [
        {op: 'eq', left: {mul: ['x', s]}, right: d}
      ]).survivors;
      const base = solveTime(distance, speed);
      const scaled = solveTime(distance * k, speed * k);
      assert.equal(base.length, 1);
      assert.equal(scaled.length, 1);
      assert.ok(base[0].eq(scaled[0]), `x${k} on both sides must not move the time`);
    }
  }
});

test('doubling the input quantity doubles the output', async () => {
  const {solve} = await import('../src/families/direct_proportion.js');
  for (const [baseCount, baseAmount] of [[4, 48], [5, 25], [8, 40]]) {
    for (const targetCount of [6, 9, 12]) {
      const one = solve({baseCount, baseAmount, targetCount}, 'scaledOutput').answer;
      const two = solve({baseCount, baseAmount, targetCount: targetCount * 2}, 'scaledOutput').answer;
      assert.ok(near(two, one * 2));
    }
  }
});

test('multiplying both sides of a ratio by one factor leaves the split unchanged', () => {
  const splitFor = (a, b, total) => searchDomain(grid(0, total), [
    {op: 'eq', left: {mul: ['x', a + b]}, right: {mul: [total, a]}}
  ]).survivors;
  for (const [a, b, total] of [[2, 3, 50], [3, 5, 80], [1, 4, 45]]) {
    for (const k of [2, 3, 5]) {
      const one = splitFor(a, b, total);
      const scaled = splitFor(a * k, b * k, total);
      assert.equal(one.length, 1);
      assert.equal(scaled.length, 1);
      assert.ok(one[0].eq(scaled[0]), 'a ratio and its multiple describe the same split');
    }
  }
});

test('reordering an odd-one-out set does not change the outlier', () => {
  const rng = new SeededRNG('metamorphic-odd');
  const sets = [[4, 9, 16, 25, 36, 40], [8, 27, 64, 125, 216, 200], [12, 18, 24, 30, 36, 40]];
  for (const set of sets) {
    const baseRules = findSingleOutlierRules(set).map(r => `${r.ruleId}:${r.outlier}`).sort();
    for (let i = 0; i < 10; i++) {
      const shuffled = rng.shuffle(set);
      const rules = findSingleOutlierRules(shuffled).map(r => `${r.ruleId}:${r.outlier}`).sort();
      assert.deepEqual(rules, baseRules, 'the rule sweep must be order-independent');
      assert.equal(
        checkOddOneOutAmbiguity(shuffled, set.at(-1)).ambiguous,
        checkOddOneOutAmbiguity(set, set.at(-1)).ambiguous
      );
    }
  }
});

test('a shuffled odd-one-out set collides with the original fingerprint', () => {
  const rng = new SeededRNG('metamorphic-fp');
  const set = [30, 12, 18, 24, 36, 25];
  const original = buildFingerprint({
    family: 'odd_one_out', templateId: 'ODD_E_MULT',
    commutative: {numberSet: canonicalNumberSet(set)}
  });
  for (let i = 0; i < 10; i++) {
    const shuffled = buildFingerprint({
      family: 'odd_one_out', templateId: 'ODD_E_MULT',
      commutative: {numberSet: canonicalNumberSet(rng.shuffle(set))}
    });
    assert.equal(shuffled, original);
  }
});

test('renaming the people does not change what the order graph proves', () => {
  const namesA = ['خالد', 'سالم', 'ماجد', 'راشد', 'ناصر'];
  const namesB = ['نورة', 'سارة', 'هند', 'ريم', 'ليان'];
  const shape = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]];
  const edgesA = shape.map(([i, j]) => [namesA[i], namesA[j]]);
  const edgesB = shape.map(([i, j]) => [namesB[i], namesB[j]]);
  const a = buildOrderOracle(namesA, edgesA);
  const b = buildOrderOracle(namesB, edgesB);

  assert.equal(a.extensions.length, b.extensions.length);
  assert.equal(a.countDefinitelyAbove(namesA[4]), b.countDefinitelyAbove(namesB[4]));
  assert.equal(a.definitelyAbove(namesA[0], namesA[4]), b.definitelyAbove(namesB[0], namesB[4]));
  assert.equal(a.undetermined(namesA[1], namesA[2]), b.undetermined(namesB[1], namesB[2]));
  assert.equal(
    a.whoAtPosition(1) === null ? null : namesA.indexOf(a.whoAtPosition(1)),
    b.whoAtPosition(1) === null ? null : namesB.indexOf(b.whoAtPosition(1))
  );
  assert.equal(canonicalGraph(namesA, edgesA).key, canonicalGraph(namesB, edgesB).key);
});

test('adding a constant to every value shifts the mean by that constant', () => {
  const meanOf = values => searchDomain(grid(0, 200, 0.5), [
    {op: 'eq', left: {mul: ['x', values.length]}, right: values.reduce((a, b) => a + b, 0)}
  ]).survivors[0];
  for (const values of [[10, 12, 14], [6, 10, 14, 18], [21, 25, 29, 33, 37]]) {
    for (const c of [3, 8, 12]) {
      const before = meanOf(values);
      const after = meanOf(values.map(v => v + c));
      assert.ok(after.sub(before).eq(Fraction.from(c)), `the mean must move by exactly ${c}`);
    }
  }
});

test('scaling every rate and the target together leaves the joint time unchanged', () => {
  const timeFor = (rateA, rateB, target) => searchDomain(grid(0, 40, 0.5), [
    {op: 'eq', left: {add: [{mul: [rateA, 'x']}, {mul: [rateB, 'x']}]}, right: target}
  ]).survivors;
  for (const [a, b, target] of [[10, 15, 150], [12, 18, 240], [8, 12, 100]]) {
    for (const k of [2, 5]) {
      const one = timeFor(a, b, target);
      const scaled = timeFor(a * k, b * k, target * k);
      assert.equal(one.length, 1);
      assert.ok(one[0].eq(scaled[0]));
    }
  }
});

test('shifting the whole week shifts the answer by the same amount', () => {
  const todayFor = (netOffset, targetIndex) => searchDomain(grid(0, 6), [
    {op: 'eq', left: {mod: [{add: ['x', netOffset]}, 7]}, right: targetIndex}
  ]).survivors[0];
  for (let net = 1; net <= 6; net++) {
    for (let target = 0; target < 7; target++) {
      const base = Number(todayFor(net, target).toDecimalString());
      const shifted = Number(todayFor(net, (target + 3) % 7).toDecimalString());
      assert.equal(shifted, (base + 3) % 7, 'moving the stated day moves the answer with it');
    }
  }
});

test('a percentage chain is unaffected by the order of the two factors', () => {
  for (const [p1, p2] of [[25, 20], [10, 30], [50, 20]]) {
    const up = Fraction.from(100 + p1).div(100);
    const down = Fraction.from(100 - p2).div(100);
    assert.ok(up.mul(down).eq(down.mul(up)), 'the net factor does not depend on the order');
  }
});
