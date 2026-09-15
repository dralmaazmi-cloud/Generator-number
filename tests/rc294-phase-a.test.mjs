// RC2.9.4 Phase A — the independent review's feedback and analytics defects,
// each reproduced as a behavioural test BEFORE it was fixed (A0).
//
// The first four are about the rationale a learner is shown for a wrong
// option; the last four are about the performance report. Every test here
// went red against the RC2.9.3 freeze (bde7058) and is what holds the fix.

import test from 'node:test';
import assert from 'node:assert/strict';

import Engine from '../src/index.js';
import {MISCONCEPTIONS} from '../src/qa/misconceptions.js';
import {buildPerformanceReport, STATUS} from '../performance-model.js';

const engine = new Engine();
const L = ['A', 'B', 'C', 'D', 'E', 'F'];
const text = id => MISCONCEPTIONS[id] ?? id;

/** First question (within `tries` seeds) of a template with a wrong option matching `pick`. */
function findOption({family, band, templateId, pick, tries = 400, prefix = 'rc294-a0'}) {
  for (let i = 0; i < tries; i++) {
    let q;
    const bands = band === 'any' ? ['easy', 'medium', 'hard'] : [band];
    for (const b of bands) { try { q = engine.generateQuestion({family, difficulty: b, templateId: templateId ?? undefined, seed: `${prefix}|${templateId}|${i}`}); break; } catch { /* next band */ } }
    if (!q) continue;
    if (templateId && q.generator_id !== templateId) continue;
    for (const l of L) {
      const m = q.metadata.options_meta[l];
      if (!m || m.correct) continue;
      if (pick(m, q)) return {q, letter: l, meta: m, rationale: q.explanation.distractor_analysis[l]};
    }
  }
  return null;
}

// --- A1: rationale truthfulness ---------------------------------------------

test('A0-1: a rationale must not say the learner SUBTRACTED when the derivation ADDED', () => {
  const hit = findOption({family: 'ages', band: 'any', templateId: 'AGE_M_DIFFERENCE_INVARIANT',
    pick: m => m.misconceptionId === 'SUBTRACTED_INSTEAD_OF_ADDED' && /\+/.test(m.derivation) && !/[−-]/.test(m.derivation)});
  assert.ok(hit, 'the review\'s case must be reproducible');
  assert.doesNotMatch(hit.rationale, /طرحت/, `«${hit.rationale}» claims a subtraction the derivation «${hit.meta.derivation}» never made`);
});

test('A0-1b: a rationale must not say the learner MULTIPLIED when the derivation DIVIDED', () => {
  const hit = findOption({family: 'ages', band: 'any', templateId: 'AGE_E_MULT_DIFF',
    pick: m => m.misconceptionId === 'RATE_APPLIED_TO_WRONG_COUNT' && /÷/.test(m.derivation) && !/×/.test(m.derivation)});
  assert.ok(hit, 'the review\'s case must be reproducible');
  assert.doesNotMatch(hit.rationale, /ضربت/, `«${hit.rationale}» claims a multiplication the derivation «${hit.meta.derivation}» never made`);
});

test('A0-2: a ratios question must not receive an averages rationale', () => {
  const hit = ['easy', 'medium', 'hard'].map(band => findOption({family: 'ratios', band, templateId: null, tries: 200,
    pick: m => m.misconceptionId === 'USED_ARITHMETIC_MEAN_OF_AVERAGES'})).find(Boolean);
  assert.ok(hit, 'ratios templates do offer this option');
  assert.doesNotMatch(hit.rationale, /المتوسطين|المجموعتين/, `«${hit.rationale}» on ${hit.q.generator_id}`);
});

test('A0-3: a mixture question must not receive sequence vocabulary', () => {
  // RC2.9.3 explained a mixture option with «…فخرج الحد الذي بعدها خطأً» — a
  // sentence about the next TERM of a sequence.
  let checked = 0;
  const offenders = [];
  for (let i = 0; i < 60; i++) {
    let q;
    for (const band of ['hard', 'medium', 'easy']) {
      try { q = engine.generateQuestion({family: 'percentages', difficulty: band, templateId: 'PCT_H_MIXTURE', seed: `rc294-a0-mix|${i}`}); break; } catch { /* next band */ }
    }
    if (!q || q.generator_id !== 'PCT_H_MIXTURE') continue;
    for (const l of L) {
      const m = q.metadata.options_meta[l]; if (!m || m.correct) continue; checked++;
      const t = q.explanation.distractor_analysis[l];
      if (/النمط|الحد\b|المتتالية/.test(t)) offenders.push(`${m.misconceptionId}: «${t}»`);
    }
  }
  assert.ok(checked >= 50, `the mixture template must be reachable, checked ${checked}`);
  assert.deepEqual(offenders.slice(0, 3), [], `${offenders.length} mixture rationales speak of sequences`);
});

test('A0-4: no rationale may say «وهي ناتج X» about X itself', () => {
  const hit = findOption({family: 'ratios', band: 'any', templateId: 'RAT_M_ADD_SIDE',
    pick: (m, q) => { const mm = /وهي ناتج ([^.،؛]+)\./.exec(q.explanation.distractor_analysis[Object.keys(q.metadata.options_meta).find(k => q.metadata.options_meta[k] === m)] ?? '');
      return Boolean(mm) && /^[\d.]+$/.test(mm[1].trim()) && Number(mm[1]) === m.value; }});
  // The case exists in RC2.9.3 (a «1 × 4» derivation tidied to «4»); after the
  // fix nothing in a broad sweep may render this way, so the sweep is the assertion.
  let vacuous = 0, checked = 0;
  for (const {id: family} of engine.listFamilies()) for (let i = 0; i < 40; i++) for (const band of ['easy', 'medium', 'hard']) {
    let q; try { q = engine.generateQuestion({family, difficulty: band, seed: `rc294-a0-vac|${family}|${i}|${band}`}); } catch { continue; }
    for (const l of L) {
      const m = q.metadata.options_meta[l]; if (!m || m.correct) continue; checked++;
      const mm = /وهي ناتج ([^.،؛]+)\./.exec(q.explanation.distractor_analysis[l] ?? '');
      if (mm && /^[\d.]+$/.test(mm[1].trim()) && Number(mm[1]) === m.value) vacuous++;
    }
  }
  assert.ok(checked > 5000);
  assert.equal(vacuous, 0, `${vacuous} vacuous rationales${hit ? `, e.g. «${hit.rationale}»` : ''}`);
});

// --- A2–A4: the performance report -------------------------------------------

function sitting(seed, families, perFamily = 10) {
  const out = [];
  const bands = ['easy', 'medium', 'medium', 'hard'];
  for (const f of families) {
    let drawn = 0;
    for (let i = 0; i < perFamily * 6 && drawn < perFamily; i++) {
      try { out.push(engine.generateQuestion({family: f, difficulty: bands[i % 4], seed: `${seed}|${f}|${i}`})); drawn++; } catch { /* band not served */ }
    }
    assert.equal(drawn, perFamily);
  }
  return out;
}
const right = q => ({selected: q.correct_option, correct: true, timeSeconds: 60});
const wrong = q => ({selected: L.find(l => q.metadata.options_meta[l] && !q.metadata.options_meta[l].correct), correct: false, timeSeconds: 60});
const report = (qs, rs) => buildPerformanceReport({questions: qs, responses: rs}, text);

test('A0-5/6: the same evidence in a different family order must not flip the trend', () => {
  // averages answered 90% right, percentages 30% right, each family's answers
  // in the same internal order both times; only the family blocks swap.
  const A = sitting('rc294-a0-trend', ['averages'], 12), B = sitting('rc294-a0-trend', ['percentages'], 12);
  const answersA = A.map((q, i) => (i % 10 === 9 ? wrong(q) : right(q)));
  const answersB = B.map((q, i) => (i % 10 < 3 ? right(q) : wrong(q)));
  const ab = report([...A, ...B], [...answersA, ...answersB]);
  const ba = report([...B, ...A], [...answersB, ...answersA]);
  for (const r of [ab, ba]) {
    assert.ok(!['IMPROVING', 'DETERIORATING'].includes(r.trend.direction),
      `family-blocked order produced a ${r.trend.direction} claim from unchanged evidence`);
    assert.doesNotMatch(r.text.find(s => s.id === 'overall').lines.join(' '), /تحسّن|تراجع/);
  }
});

test('A0-7: 2/4 is not a weakness and 3/4 does not disappear', () => {
  const four = sitting('rc294-a0-cliff', ['ratios'], 4);
  const two = report(four, four.map((q, i) => (i < 2 ? right(q) : wrong(q))));
  const three = report(four, four.map((q, i) => (i < 3 ? right(q) : wrong(q))));
  assert.notEqual(two.levels.family[0].status, STATUS.WEAKNESS, '2 of 4 is too little evidence for a weakness');
  const shown = three.text.flatMap(s => s.lines).join(' ');
  assert.match(shown, /3\/4/, '3 of 4 must be visible somewhere in the report');
});

test('A0-8: three answered of ten, all correct, is completion 3/10 and accuracy 3/3, not "30%"', () => {
  const qs = sitting('rc294-a0-headline', ['averages'], 10);
  const r = report(qs, qs.map((q, i) => (i < 3 ? right(q) : {selected: null, correct: false, timeSeconds: null})));
  const overall = r.text.find(s => s.id === 'overall').lines;
  assert.doesNotMatch(overall[0], /30%/, overall[0]);
  assert.match(overall.join(' '), /أجبت عن 3 من 10/);
  assert.match(overall.join(' '), /3 من 3/);
  assert.match(overall.join(' '), /لا توجد (بيانات|أدلة) كافية/);
});
