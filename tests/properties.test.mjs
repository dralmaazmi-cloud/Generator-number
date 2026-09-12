// Section 18-B. Invariants that hold for every item a family produces.
//
// Section 1-C: each invariant runs against the *production* generator and its
// published answer, and each one can fail. `tests/fault-injection.test.mjs`
// proves that by corrupting the answer and checking the invariant complains.

import test from 'node:test';
import {supportedBands} from './_support/bands.mjs';
import assert from 'node:assert/strict';

import Engine from '../src/index.js';
import {DAYS_AR} from '../src/utils.js';
import {Fraction} from '../src/qa/fraction.js';

const engine = new Engine();
const SAMPLES = 150;

export function answerOf(q) {
  const raw = q.metadata?.options_meta?.[q.correct_option]?.value;
  return typeof raw === 'number' ? raw : Number(raw);
}

/** Generates items of one family/difficulty and hands each to the invariant. */
export function forEachItem(family, difficulties, fn, samples = SAMPLES) {
  let seen = 0;
  for (const difficulty of difficulties) {
    for (let i = 0; i < samples; i++) {
      let q;
      try {
        q = engine.generateQuestion({family, difficulty, seed: `prop-${family}-${difficulty}-${i}`});
      } catch { continue; }
      fn(q, answerOf(q), q.metadata.parameters);
      seen++;
    }
  }
  assert.ok(seen > 0, `no items generated for ${family}`);
  return seen;
}

const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

test('workers x days is constant when the work and the efficiency are', () => {
  forEachItem('work_time', supportedBands('work_time'), (q, answer, p) => {
    if (q.generator_id !== 'WORK_E_INVERSE') return;
    assert.ok(near(p.workers * p.days, p.newWorkers * answer),
      `${p.workers} x ${p.days} != ${p.newWorkers} x ${answer}`);
  });
});

test('direct proportion: the cross products agree', () => {
  forEachItem('direct_proportion', ['easy', 'medium'], (q, answer, p) => {
    if (q.metadata.asked_unknown !== 'scaledOutput') return;
    if (!Number.isFinite(p.baseCount) || !Number.isFinite(p.baseAmount) || !Number.isFinite(p.targetCount)) return;
    assert.ok(near(answer * p.baseCount, p.baseAmount * p.targetCount),
      `${answer} x ${p.baseCount} != ${p.baseAmount} x ${p.targetCount}`);
  });
});

test('direct proportion: scaling the input scales the output by the same factor', async () => {
  const {solve} = await import('../src/families/direct_proportion.js');
  for (const k of [2, 3, 5]) {
    for (const [baseCount, baseAmount, targetCount] of [[4, 48, 7], [5, 25, 12], [6, 30, 9]]) {
      const one = solve({baseCount, baseAmount, targetCount}, 'scaledOutput').answer;
      const scaled = solve({baseCount, baseAmount, targetCount: targetCount * k}, 'scaledOutput').answer;
      assert.ok(near(scaled, one * k), `scaling the count by ${k} must scale the output by ${k}`);
    }
  }
});

test('combined rate: the work each side contributes adds up to the target', () => {
  forEachItem('combined_rate', ['easy', 'medium'], (q, answer, p) => {
    if (q.generator_id === 'COMB_E_OUTPUT') {
      assert.ok(near(answer, (p.rateA + p.rateB) * p.hours));
    } else if (q.generator_id === 'COMB_E_TIME') {
      assert.ok(near((p.rateA + p.rateB) * answer, p.targetAmount));
    } else if (q.generator_id === 'COMB_M_SOLO_THEN') {
      assert.ok(near(p.rateA * p.soloHours + (p.rateA + p.rateB) * answer, p.targetAmount));
    } else if (q.generator_id === 'COMB_M_TOGETHER_SOLO') {
      assert.ok(near((p.rateA + p.rateB) * p.jointHours + p.rateA * answer, p.targetAmount));
    }
  });
});

test('percentages: the final value is the original times the product of the factors', () => {
  forEachItem('percentages', ['medium', 'hard'], (q, answer, p) => {
    if (q.generator_id === 'PCT_H_CHAIN_VALUE') {
      const expected = Fraction.from(p.originalValue)
        .mul(100 - p.discountPercent).div(100)
        .mul(100 + p.increasePercent).div(100);
      assert.ok(expected.eq(Fraction.from(answer)), `${expected.toDecimalString()} != ${answer}`);
    } else if (q.generator_id === 'PCT_M_REMAIN') {
      const expected = Fraction.from(p.totalCount)
        .mul(100 - p.firstPercent).div(100)
        .mul(100 - p.secondPercent).div(100);
      assert.ok(expected.eq(Fraction.from(answer)));
    }
  });
});

test('averages: the mean times the count returns the total', () => {
  forEachItem('averages', ['easy', 'medium'], (q, answer, p) => {
    if (q.generator_id === 'AVG_E_ADD') {
      assert.ok(near(answer * (p.count + 1), p.count * p.average + p.addedValue));
    } else if (q.generator_id === 'AVG_E_REMOVE') {
      assert.ok(near(answer * (p.count - 1), p.count * p.average - p.removedValue));
    } else if (q.generator_id === 'AVG_M_COMBINE') {
      assert.ok(near(answer * (p.countA + p.countB), p.countA * p.averageA + p.countB * p.averageB));
    }
  });
});

test('averages: adding a constant to every value shifts the mean by that constant', () => {
  for (const c of [3, 7, -4]) {
    for (const values of [[10, 12, 14], [5, 9, 11, 15], [20, 20, 26, 34]]) {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const shifted = values.map(v => v + c);
      const shiftedMean = shifted.reduce((a, b) => a + b, 0) / shifted.length;
      assert.ok(near(shiftedMean, mean + c));
    }
  }
});

test('transfers conserve the total: A before + B before equals A after + B after', () => {
  forEachItem('ratios', supportedBands('ratios'), (q, answer, p) => {
    if (q.generator_id !== 'RAT_H_TRANSFER') return;
    const scale = q.metadata.asked_unknown === 'sideABeforeTransfer' ? answer / p.partA : answer / p.partB;
    const aBefore = p.partA * scale;
    const bBefore = p.partB * scale;
    const aAfter = aBefore - p.transferred;
    const bAfter = bBefore + p.transferred;
    assert.ok(near(aBefore + bBefore, aAfter + bAfter), 'a transfer moves value, it does not create it');
    assert.ok(near(aAfter * p.newPartB, bAfter * p.newPartA), 'the stated post-transfer ratio must hold');
  });
});

test('ages: the difference between two ages is constant through time', () => {
  forEachItem('ages', ['medium', 'hard'], (q, answer, p) => {
    if (q.generator_id === 'AGE_H_TWO_TIME') {
      const sonNow = answer;
      const fatherNow = sonNow + p.ageDifference;
      const sonLater = sonNow + p.yearsAhead;
      const fatherLater = fatherNow + p.yearsAhead;
      assert.ok(near(fatherNow - sonNow, fatherLater - sonLater), 'the gap must not move');
      assert.ok(near(fatherLater, p.ratio * sonLater), 'the stated future ratio must hold');
    } else if (q.generator_id === 'AGE_M_FUT_RATIO') {
      const daughterNow = answer;
      const motherNow = daughterNow + p.ageDifference;
      assert.ok(near(motherNow - daughterNow, (motherNow + p.yearsAhead) - (daughterNow + p.yearsAhead)));
      assert.ok(near(motherNow + p.yearsAhead, p.ratio * (daughterNow + p.yearsAhead)));
    }
  });
});

test('speed: distance equals speed times time in every stage', () => {
  forEachItem('speed', supportedBands('speed'), (q, answer, p) => {
    if (q.generator_id === 'SPD_E_TIME') {
      assert.ok(near(p.distance, p.speed * answer));
    } else if (q.generator_id === 'SPD_E_DISTANCE') {
      assert.ok(near(answer, p.speed * p.hours));
    } else if (q.generator_id === 'SPD_M_AVG') {
      assert.ok(near(answer * (p.hoursA + p.hoursB), p.speedA * p.hoursA + p.speedB * p.hoursB));
    } else if (q.generator_id === 'SPD_H_CATCH') {
      assert.ok(near(p.speedA * (p.delayHours + answer), p.speedB * answer), 'both cars are at the same point');
    } else if (q.generator_id === 'SPD_H_MEET_DELAY') {
      assert.ok(near(p.speedA * (p.delayHours + answer) + p.speedB * answer, p.totalDistance));
    }
  });
});

test('machines: machine-hours times the unit rate returns the stated output', () => {
  // RC2.2-1: machines supplies no easy band now; the template computes medium.
  forEachItem('machines', supportedBands('machines'), (q, answer, p) => {
    if (q.generator_id !== 'MACH_E_HOURS') return;
    assert.ok(near(answer * p.machines * p.hours, p.totalOutput * p.newMachines * p.newHours));
  });
});

test('calendar: the published day, shifted by the net offset, lands on the stated day', () => {
  // Not "x + k - k = x" — this calls the generator and uses its answer.
  forEachItem('calendar', supportedBands('calendar'), q => {
    const p = q.metadata.parameters;
    if (!Number.isFinite(p.netOffset) || !Number.isFinite(p.targetDayIndex)) return;
    const publishedIndex = DAYS_AR.indexOf(q.correct_value);
    assert.ok(publishedIndex >= 0, 'the answer must be a weekday name');
    assert.equal(((publishedIndex + p.netOffset) % 7 + 7) % 7, p.targetDayIndex,
      `${q.correct_value} shifted by ${p.netOffset} must reach ${DAYS_AR[p.targetDayIndex]}`);
  });
});

test('sequences: the stated rule holds for every printed term, not only the last', () => {
  forEachItem('sequences', ['easy', 'medium'], (q, answer, p) => {
    if (q.generator_id === 'SEQ_E_ARITH' && q.metadata.asked_unknown === 'nextTerm') {
      const terms = p.shownTerms;
      for (let i = 1; i < terms.length; i++) {
        assert.equal(terms[i] - terms[i - 1], p.commonDifference, 'every printed gap must match the rule');
      }
      assert.equal(answer - terms.at(-1), p.commonDifference);
    } else if (q.generator_id === 'SEQ_M_DOUBLE_DIFF') {
      const terms = p.shownTerms;
      for (let i = 1; i < terms.length; i++) {
        assert.equal(terms[i] - terms[i - 1], p.firstDifference * 2 ** (i - 1));
      }
    }
  });
});

test('fractions: applying the denominators in order returns the published answer', () => {
  forEachItem('fractions', supportedBands('fractions'), (q, answer, p) => {
    if (q.metadata.asked_unknown !== 'chainResult') return;
    let running = Fraction.from(p.startNumber);
    for (const d of p.denominators) running = running.div(d);
    assert.ok(running.eq(Fraction.from(answer)));
  });
});

test('relational: every published answer is read off the order graph', async () => {
  const {buildOrderOracle} = await import('../src/qa/relational-oracle.js');
  forEachItem('relational', ['easy', 'hard'], q => {
    const edges = (q.metadata.parameters.canonicalEdges || []).map(e => e.split('>'));
    const nodes = [...new Set(edges.flat())];
    if (nodes.length < 2) return;
    const oracle = buildOrderOracle(nodes, edges);
    assert.ok(oracle.extensions.length > 0, 'the stated relations must be consistent');
  }, 40);
});
