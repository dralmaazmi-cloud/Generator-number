// RC2.9.3-5 — the performance model, held to its evidence rules with synthetic
// learners whose profile is known in advance.
//
// Every profile is played against REAL sessions from the engine (the questions,
// their metadata and their wrong options are the engine's own); only the
// answers are synthetic. So what is tested is the model's reading of the data
// the product actually has, not of a fixture shaped to please it.

import test from 'node:test';
import assert from 'node:assert/strict';

import Engine from '../src/index.js';
import {MISCONCEPTIONS} from '../src/qa/misconceptions.js';
import {buildPerformanceReport, performanceText, weakFamiliesFrom, EVIDENCE, STATUS, ERROR_TYPE}
  from '../performance-model.js';

const engine = new Engine();
const text = id => MISCONCEPTIONS[id] ?? id;
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * A sitting over the named families: `perFamily` real questions from each,
 * drawn one at a time so the sitting has the size the profile needs. (A
 * fifty-question planned session over three families is one the engine
 * refuses — too few distinct constructions — and what the model reads is the
 * questions with their metadata, not the plan.)
 */
function session(seed, families, perFamily = 10) {
  const out = [];
  const bands = ['easy', 'medium', 'medium', 'hard'];
  for (const f of families) {
    let drawn = 0;
    for (let i = 0; i < perFamily * 6 && drawn < perFamily; i++) {
      try {
        out.push(engine.generateQuestion({family: f, difficulty: bands[i % bands.length], seed: `${seed}|${f}|${i}`}));
        drawn++;
      } catch { /* a band the family does not serve */ }
    }
    assert.equal(drawn, perFamily, `${f} must yield ${perFamily} questions`);
  }
  return out;
}
const reference = q => 20 + 20 * (q.metadata.estimated_steps ?? 2);

/** A wrong option built from `misconceptionId` if the question offers one, else any wrong option. */
function wrongLetter(q, misconceptionId = null) {
  const meta = q.metadata.options_meta;
  const byId = misconceptionId ? LETTERS.find(l => meta[l] && !meta[l].correct && meta[l].misconceptionId === misconceptionId) : null;
  return byId ?? LETTERS.find(l => meta[l] && !meta[l].correct);
}
const right = (q, time = reference(q)) => ({selected: q.correct_option, checked: true, correct: true, timeSeconds: time});
const wrong = (q, id = null, time = reference(q)) => ({selected: wrongLetter(q, id), checked: true, correct: false, timeSeconds: time});
const blank = () => ({selected: null, checked: true, correct: false, timeSeconds: null});

const report = (questions, responses) => buildPerformanceReport({questions, responses}, text);
const family = (r, id) => r.levels.family.find(f => f.id === id);

// ---------------------------------------------------------------------------

test('Profile A: strong averages, weak at working backwards, average ratios', () => {
  // The learner cannot recover an original value from a result — the
  // REVERSE_RECOVER task, which percentages and ratios both ask — and is fine
  // at everything else. A seed whose sitting carries enough of those to judge.
  const isReverse = q => q.metadata.task_signature.startsWith('REVERSE_RECOVER');
  let qs = null;
  for (let i = 0; i < 40 && !qs; i++) {
    const cand = session(`rc293-perf-A-${i}`, ['averages', 'percentages', 'ratios', 'speed'], 12);
    const reverse = cand.filter(isReverse);
    if (reverse.length >= EVIDENCE.minForClaim && reverse.length <= 10) qs = cand;
  }
  assert.ok(qs, 'a sitting with enough working-backwards questions must exist');
  let speedTurn = 0;
  const responses = qs.map(q => {
    if (isReverse(q)) return wrong(q);
    // speed asks nothing backwards; there the learner is average: two right, one wrong.
    if (q.family === 'speed') return (speedTurn++ % 3 === 2) ? wrong(q) : right(q);
    return right(q);
  });
  const r = report(qs, responses);

  assert.equal(family(r, 'averages').status, STATUS.STRENGTH);
  assert.ok(r.strengths.some(f => f.id === 'averages'));
  assert.equal(family(r, 'speed').status, STATUS.MIXED, 'an average family is neither strength nor weakness');
  assert.ok(!r.weaknesses.some(f => f.id === 'speed'), 'specificity: no weakness is invented for an average family');
  // The task is weak even where its families are not.
  const reverse = r.levels.task.find(t => t.id === 'REVERSE_RECOVER');
  assert.equal(reverse.status, STATUS.WEAKNESS);
  assert.ok(['percentages', 'ratios'].includes(reverse.topFamily));
  assert.ok(r.hiddenWeakTasks.some(t => t.id === 'REVERSE_RECOVER') || r.weaknesses.some(f => f.id === reverse.topFamily),
    'sensitivity: the weak task must surface, as a hidden weak task or through its family');
  assert.ok(r.recommendations.some(x => x.family === reverse.topFamily));
  assert.equal(new Set(r.recommendations.map(x => x.family)).size, r.recommendations.length, 'one recommendation per family');
  // Every statement carries a confidence.
  for (const f of r.levels.family) assert.ok(['none', 'low', 'medium', 'high'].includes(f.confidence));
  // The text says the same thing.
  const improve = r.text.find(s => s.id === 'improve').lines.join(' ');
  assert.match(improve, /العمل بالعكس|النسب|التناسب/);
});

test('Profile B: accurate but slow — a speed note, never a weakness', () => {
  const qs = session('rc293-perf-B', ['averages', 'percentages', 'ratios', 'profit_loss']);
  const r = report(qs, qs.map(q => right(q, Math.round(2.2 * reference(q)))));
  assert.equal(r.weaknesses.length, 0);
  assert.equal(r.overall.status, STATUS.STRENGTH);
  assert.ok(r.speed.notes.some(n => n.kind === 'ACCURATE_BUT_SLOW'));
  assert.equal(r.speed.confidence, 'low', 'speed is only ever a low-confidence note');
  const overall = r.text.find(s => s.id === 'overall').lines.join(' ');
  assert.match(overall, /الثقة: منخفضة/);
  assert.match(overall, /لا عن الفهم/);
});

test('Profile C: fast but error-prone — rushed errors are named as such', () => {
  const qs = session('rc293-perf-C', ['averages', 'percentages', 'ratios', 'profit_loss']);
  const r = report(qs, qs.map((q, i) => (i % 5 < 3 ? wrong(q, null, Math.max(2, Math.round(0.3 * reference(q)))) : right(q, Math.round(0.4 * reference(q))))));
  assert.ok(r.speed.notes.some(n => n.kind === 'RUSHED_ERRORS' || n.kind === 'FAST_BUT_ERROR_PRONE'));
  assert.ok(r.weaknesses.length > 0, 'a 40% learner has weaknesses with this much evidence');
  assert.equal(r.overall.status, STATUS.WEAKNESS);
});

test('Profile D: only three answered — INSUFFICIENT EVIDENCE everywhere, no invention', () => {
  const qs = session('rc293-perf-D', ['averages', 'percentages', 'ratios']);
  const responses = qs.map((q, i) => (i < 3 ? (i < 2 ? right(q) : wrong(q)) : blank()));
  const r = report(qs, responses);
  assert.equal(r.overall.answered, 3);
  assert.equal(r.overall.status, STATUS.INSUFFICIENT);
  assert.equal(r.overall.confidence, 'none');
  for (const level of Object.values(r.levels)) for (const u of level) assert.equal(u.status, STATUS.INSUFFICIENT, `${u.id}`);
  assert.deepEqual(r.strengths, []);
  assert.deepEqual(r.weaknesses, []);
  assert.deepEqual(r.errorPatterns, []);
  assert.deepEqual(r.recommendations, []);
  assert.equal(r.trend.status, STATUS.INSUFFICIENT);
  assert.equal(r.speed.status, STATUS.INSUFFICIENT);
  const lines = r.text.flatMap(s => s.lines).join(' ');
  assert.match(lines, /لا توجد أدلة كافية/);
  assert.doesNotMatch(lines, /نقطة ضعف مؤكدة|أداء عام قوي/);
});

test('Profile E: one isolated error changes nothing', () => {
  const qs = session('rc293-perf-E', ['averages', 'percentages', 'ratios', 'profit_loss']);
  const slip = 7;
  const r = report(qs, qs.map((q, i) => (i === slip ? wrong(q, q.metadata.target_misconception) : right(q))));
  assert.equal(r.weaknesses.length, 0);
  assert.deepEqual(r.errorPatterns, [], 'one error is not a pattern');
  assert.equal(r.errorTypes.wrong, 1);
  assert.equal(r.errorTypes.dominant, null, 'no dominant error type is claimed from one error');
  assert.equal(family(r, qs[slip].family).status, STATUS.STRENGTH, 'the family with the single slip is still a strength');
  assert.deepEqual(r.recommendations, []);
});

test('Profile F: the same denominator misconception, again and again', () => {
  const ID = 'USED_SALE_PRICE_AS_DENOMINATOR';
  let qs = null;
  for (let i = 0; i < 40 && !qs; i++) {
    const cand = session(`rc293-perf-F-${i}`, ['averages', 'percentages', 'ratios', 'profit_loss'], 12);
    if (cand.filter(q => LETTERS.some(l => cand && q.metadata.options_meta[l]?.misconceptionId === ID)).length >= 5) qs = cand;
  }
  assert.ok(qs, 'a session offering the misconception five times must exist');
  let planted = 0;
  const responses = qs.map(q => {
    const offers = LETTERS.some(l => q.metadata.options_meta[l]?.misconceptionId === ID);
    if (offers && planted < 5) { planted++; return wrong(q, ID); }
    return right(q);
  });
  const r = report(qs, responses);
  assert.equal(r.errorPatterns.length, 1);
  assert.equal(r.errorPatterns[0].id, ID);
  assert.equal(r.errorPatterns[0].count, 5);
  assert.equal(r.errorPatterns[0].confidence, 'medium');
  assert.equal(r.errorPatterns[0].errorType, ERROR_TYPE.METHOD);
  const patterns = r.text.find(s => s.id === 'patterns').lines.join(' ');
  assert.ok(patterns.includes(MISCONCEPTIONS[ID].replace(/\.$/, '')), 'the pattern names the misconception in the learner\'s own feedback words');
  // No double counting: the pattern and any family weakness it causes are one recommendation.
  assert.equal(new Set(r.recommendations.map(x => x.family)).size, r.recommendations.length);
});

test('Profile G/H: improving and deteriorating learners are told which way they moved', () => {
  const qs = session('rc293-perf-G', ['averages', 'percentages', 'ratios', 'profit_loss']);
  const half = qs.length / 2;
  const improving = report(qs, qs.map((q, i) => (i < half ? (i % 10 < 3 ? right(q) : wrong(q)) : (i % 10 < 9 ? right(q) : wrong(q)))));
  assert.equal(improving.trend.direction, 'IMPROVING');
  assert.ok(improving.trend.delta >= EVIDENCE.trend.minDelta);
  assert.match(improving.text.find(s => s.id === 'overall').lines.join(' '), /تحسّن واضح/);

  const deteriorating = report(qs, qs.map((q, i) => (i < half ? (i % 10 < 9 ? right(q) : wrong(q)) : (i % 10 < 3 ? right(q) : wrong(q)))));
  assert.equal(deteriorating.trend.direction, 'DETERIORATING');
  assert.match(deteriorating.text.find(s => s.id === 'overall').lines.join(' '), /تراجع/);

  // A learner who is steady is not told a story.
  const steady = report(qs, qs.map((q, i) => (i % 4 === 0 ? wrong(q) : right(q))));
  assert.equal(steady.trend.direction, 'STABLE');
  assert.doesNotMatch(steady.text.find(s => s.id === 'overall').lines.join(' '), /تحسّن|تراجع/);
});

test('Evidence and confidence are calibrated to counts, not to accuracy', () => {
  const qs = session('rc293-perf-cal', ['averages', 'percentages', 'ratios', 'profit_loss', 'speed', 'ages', 'sequences', 'fractions'], 16);
  const r = report(qs, qs.map(q => right(q)));
  for (const f of r.levels.family) {
    const expected = f.n >= 15 ? 'high' : f.n >= 8 ? 'medium' : f.n >= 4 ? 'low' : 'none';
    assert.equal(f.confidence, expected, `${f.id} n=${f.n}`);
    assert.equal(f.status, f.n >= EVIDENCE.minForClaim ? STATUS.STRENGTH : STATUS.INSUFFICIENT);
  }
  // Below the claim threshold a perfect score is still not a strength.
  const three = qs.filter(q => q.family === r.levels.family.at(-1).id).slice(0, 3);
  const small = report(three, three.map(q => right(q)));
  assert.equal(small.levels.family[0].status, STATUS.INSUFFICIENT);
  assert.deepEqual(small.strengths, []);
});

test('The report is deterministic and survives missing data', () => {
  const qs = session('rc293-perf-det', ['averages', 'percentages']);
  const responses = qs.map((q, i) => (i % 3 ? right(q) : wrong(q)));
  assert.equal(JSON.stringify(report(qs, responses)), JSON.stringify(report(qs, responses)));
  assert.equal(buildPerformanceReport({}).overall.answered, 0);
  assert.equal(buildPerformanceReport(null).text.length, 5);
  assert.equal(performanceText(report(qs, responses)).length, 5);
});

test('The weak-family chooser uses the same evidence rule as the report', () => {
  const stats = {
    averages: {attempts: 3, correct: 0},      // too little evidence, however bad
    ratios: {attempts: 4, correct: 2},        // exactly the line: weak
    percentages: {attempts: 10, correct: 6},  // 60%: not a weakness
    speed: {attempts: 12, correct: 3}         // weak, more evidence first
  };
  const weak = weakFamiliesFrom(stats, ['averages', 'ratios', 'percentages', 'speed', 'ages']);
  assert.deepEqual(weak.map(x => x.id), ['speed', 'ratios']);
});
