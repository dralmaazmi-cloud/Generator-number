// RC2.9.4 Phase A — the ANALYTICS suite: the stratified trend model held to
// its false-claim budget and its sensitivity, the uncertainty-aware status
// wording at every threshold boundary, and the completion/accuracy headline.
// Nothing here needs the engine: the trend and the judgement are functions
// of (family, answered, correct) rows, which is exactly what makes them
// checkable by hand.

import test from 'node:test';
import assert from 'node:assert/strict';

import {stratifiedTrend, judge, unitLine, wilson, STATUS, LEAN, TREND, EVIDENCE, buildPerformanceReport}
  from '../performance-model.js';

// --- synthetic histories -------------------------------------------------------

function lcg(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
const FAMILIES = ['averages', 'percentages', 'ratios', 'speed'];

/** Rows for a learner with no true change: correctness drawn at the family's accuracy. */
function nullHistory({n, accuracy, order, seed}) {
  const rand = lcg(seed);
  // Family accuracies spread around the target so a blocked order carries a
  // composition artefact (strong family first, weak family last).
  const spread = [0.25, 0.1, -0.1, -0.25].map(d => Math.min(0.95, Math.max(0.05, accuracy + d)));
  const rows = [];
  for (let i = 0; i < n; i++) {
    const f = order === 'blocked' ? Math.floor((i * FAMILIES.length) / n) : i % FAMILIES.length;
    rows.push({family: FAMILIES[f], answered: true, correct: rand() < spread[f]});
  }
  return rows;
}
const shuffled = (rows, rand) => { const a = rows.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const claims = t => t.status === TREND.TREND;

test('A2 permutation property: no true change → false trend ≤ 1% overall and 0 for n ≤ 16', () => {
  const histories = [];
  for (const accuracy of [0.3, 0.5, 0.7]) for (const n of [12, 16, 20, 30, 50]) for (const order of ['mixed', 'blocked']) for (const rep of [0, 1]) {
    histories.push({n, accuracy, order, seed: 1000 * n + 100 * accuracy * 10 + (order === 'blocked' ? 7 : 3) + rep});
  }
  assert.ok(histories.length >= 50, `${histories.length} histories`);
  let total = 0, falseClaims = 0, falseSmall = 0;
  for (const h of histories) {
    const rows = nullHistory(h);
    const rand = lcg(h.seed * 31 + 1);
    const orders = [rows];
    for (let k = 0; k < 200; k++) orders.push(shuffled(rows, rand));
    for (const o of orders) {
      total++;
      const t = stratifiedTrend(o.map((r, i) => ({...r, index: i})));
      if (claims(t)) { falseClaims++; if (h.n <= 16) falseSmall++; }
    }
  }
  assert.ok(total >= 50 * 201, `${total} evaluations`);
  assert.equal(falseSmall, 0, `${falseSmall} false trends at n ≤ 16`);
  assert.ok(falseClaims / total <= 0.01, `false trend rate ${(100 * falseClaims / total).toFixed(2)}% over ${total}`);
});

test('A2 composition artefact: a strong family first and a weak family last is not a decline', () => {
  const rows = [];
  for (let i = 0; i < 20; i++) rows.push({family: 'averages', answered: true, correct: i % 10 !== 9});   // 90%
  for (let i = 0; i < 20; i++) rows.push({family: 'percentages', answered: true, correct: i % 10 < 3}); // 30%
  const ab = stratifiedTrend(rows);
  const ba = stratifiedTrend([...rows.slice(20), ...rows.slice(0, 20)]);
  assert.equal(ab.status, TREND.INSUFFICIENT, JSON.stringify(ab));
  assert.equal(ba.status, TREND.INSUFFICIENT, JSON.stringify(ba));
  assert.equal(ab.comparable, 0, 'no family is answered in both halves, so nothing is comparable');
});

function genuine({n, first, second, seed = 7}) {
  const rand = lcg(seed);
  const rows = [];
  for (let i = 0; i < n; i++) {
    const p = i < n / 2 ? first : second;
    rows.push({family: FAMILIES[i % FAMILIES.length], answered: true, correct: rand() < p});
  }
  return rows;
}

test('A2 sensitivity: strong changes are detected; moderate changes at n = 50 about half the time', () => {
  // The false-claim budget (≤ 1% overall, 0 at n ≤ 16) is what bounds the
  // power: with fifty questions over four families each half of a stratum
  // holds about six answers, so a 40-point within-skill change reaches
  // p ≤ 0.02 in roughly half of the draws and a 20-point change rarely does.
  // These floors are what the model achieves, published in
  // rc2/RC294_ANALYTICS_EVIDENCE.md, and are held here so they cannot erode.
  const detect = (n, a, b) => { let d = 0; for (let seed = 0; seed < 20; seed++) { const t = stratifiedTrend(genuine({n, first: a, second: b, seed})); if (t.status === TREND.TREND && t.direction === (b > a ? 'IMPROVING' : 'DETERIORATING')) d++; } return d; };
  assert.ok(detect(20, 0.15, 0.95) >= 15, 'strong improvement at n = 20');
  assert.ok(detect(20, 0.95, 0.15) >= 15, 'strong decline at n = 20');
  assert.ok(detect(30, 0.3, 0.9) >= 12, 'strong improvement at n = 30');
  assert.ok(detect(50, 0.45, 0.85) >= 8, 'moderate (40-point) improvement at n = 50');
  assert.ok(detect(50, 0.85, 0.45) >= 8, 'moderate (40-point) decline at n = 50');
  // Never the wrong direction.
  for (let seed = 0; seed < 20; seed++) {
    const t = stratifiedTrend(genuine({n: 50, first: 0.45, second: 0.85, seed}));
    assert.notEqual(t.direction, 'DETERIORATING');
  }
});

test('A2 confidence reflects comparable evidence and evidence strength, not raw delta', () => {
  const small = stratifiedTrend(genuine({n: 20, first: 0.1, second: 1.0, seed: 3}));
  const large = stratifiedTrend(genuine({n: 50, first: 0.1, second: 1.0, seed: 3}));
  assert.equal(small.direction, 'IMPROVING');
  assert.equal(large.direction, 'IMPROVING');
  assert.ok(['low', 'medium'].includes(small.confidence), `20 comparable answers: ${small.confidence}`);
  assert.equal(large.confidence, 'high');
  // A 12-question sitting never claims, however large the raw difference.
  const tiny = stratifiedTrend(genuine({n: 12, first: 0.0, second: 1.0, seed: 3}));
  assert.notEqual(tiny.status, TREND.TREND);
  assert.equal(tiny.status, TREND.INSUFFICIENT);
});

test('A2 determinism: the same rows always give the same p-value', () => {
  const rows = genuine({n: 30, first: 0.4, second: 0.8, seed: 5});
  assert.equal(JSON.stringify(stratifiedTrend(rows)), JSON.stringify(stratifiedTrend(rows)));
});

// --- A3: the thresholds ------------------------------------------------------------

test('A3 boundary cases: no firm claim at n = 4, DEVELOPING is visible, one answer never flips wording violently', () => {
  const expected = {
    '3/3': [STATUS.INSUFFICIENT, null], '2/3': [STATUS.INSUFFICIENT, null],
    '2/4': [STATUS.DEVELOPING, LEAN.WEAK], '3/4': [STATUS.DEVELOPING, LEAN.STRONG],
    '4/5': [STATUS.DEVELOPING, LEAN.STRONG],
    '4/8': [STATUS.DEVELOPING, LEAN.WEAK], '5/8': [STATUS.DEVELOPING, LEAN.MIXED],
    '5/10': [STATUS.DEVELOPING, LEAN.WEAK], '6/10': [STATUS.DEVELOPING, LEAN.MIXED], '7/10': [STATUS.DEVELOPING, LEAN.STRONG],
    '8/10': [STATUS.STRENGTH, null],
    '15/20': [STATUS.DEVELOPING, LEAN.STRONG], '16/20': [STATUS.STRENGTH, null]
  };
  for (const [k, [status, lean]] of Object.entries(expected)) {
    const [c, n] = k.split('/').map(Number);
    const j = judge(c, n);
    assert.equal(j.status, status, `${k}: ${j.status}`);
    assert.equal(j.lean, lean, `${k}: lean ${j.lean}`);
    const line = unitLine({label: 'النسب', correct: c, n, percentage: Math.round((c / n) * 100), status: j.status, lean: j.lean, confidence: 'low'});
    assert.match(line, /النسب: \d+\/\d+/);
  }
  // A weakness needs the interval to exclude a coin flip; a strength needs it to exclude 60%.
  assert.equal(judge(3, 10).status, STATUS.WEAKNESS);
  assert.equal(judge(4, 10).status, STATUS.WEAKNESS);
  assert.ok(wilson(5, 10).hi > EVIDENCE.status.weaknessCeiling, '5/10 cannot be called a weakness');
  assert.ok(wilson(8, 10).lo >= EVIDENCE.status.strengthFloor, '8/10 can be called a strength');
});

// --- A4: the headline ----------------------------------------------------------------

function fakeQuestion(i, family = 'averages') {
  return {family, family_ar: 'المتوسط الحسابي', correct_option: 'A', difficulty: 'easy', options: {A: '1', B: '2'},
    metadata: {options_meta: {A: {correct: true}, B: {correct: false, misconceptionId: 'USED_GIVEN_VALUE_AS_ANSWER', derivation: '2'}},
      task_signature: 'FORWARD_COMPUTE/AVERAGE', sub_idea_signature: `s${i % 3}`, template_id: 'AVG_E_ADD', target_skill: 'k', estimated_steps: 2}};
}

test('A4 headline: completion and accuracy are separate; unanswered is not wrong outside exam mode', () => {
  const questions = Array.from({length: 10}, (_, i) => fakeQuestion(i));
  const responses = questions.map((q, i) => (i < 3 ? {selected: 'A', correct: true, timeSeconds: 30} : {selected: null, correct: false, timeSeconds: null}));
  const training = buildPerformanceReport({questions, responses, settings: {mode: 'training'}});
  const lines = training.text.find(s => s.id === 'overall').lines;
  assert.match(lines[0], /أجبت عن 3 من 10 أسئلة/);
  assert.match(lines[1], /3 من 3 إجابات صحيحة \(100% من المُجاب عنه\)/);
  assert.ok(!lines.some(l => /30%/.test(l)), lines.join(' | '));
  assert.ok(lines.some(l => /لا توجد بيانات كافية/.test(l)));
  const exam = buildPerformanceReport({questions, responses, settings: {mode: 'exam'}});
  const examLines = exam.text.find(s => s.id === 'overall').lines;
  assert.ok(examLines.some(l => /نتيجة الامتحان على مجموع الأسئلة: 30%/.test(l)), examLines.join(' | '));
});
