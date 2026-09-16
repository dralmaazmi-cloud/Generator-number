#!/usr/bin/env node
// RC2.9.4 clarification Q3. What the trend estimator does on REAL product-path
// sessions, rather than on null histories.
//
// Part A  appearance rate: simulated learners with heterogeneous per-family
//         ability and a mild real learning drift between sittings, answering
//         sessions the product actually generates (mixed/easy/medium × 10/20/30,
//         3–4 sittings). Reported: the share of completed sittings whose report
//         carries a trend line, split IMPROVING / DETERIORATING, and the number
//         of COMPARABLE STRATA per sitting.
// Part B  detection grid: a true change of E points is planted as a step — the
//         first half is answered at (base − E/2) and the second at (base + E/2),
//         so the half-to-half difference the model measures is exactly E — and
//         the detection rate is counted at n = 20, 30, 50 for E = 15…40, in both
//         directions.
//
// Usage: node tools/audit/rc294-trend-power.mjs [journeysPerConfig] [gridReplicates]

import Engine from '../../src/index.js';
import {buildPerformanceReport, EVIDENCE} from '../../performance-model.js';

const [JOURNEYS = '24', REPS = '150'] = process.argv.slice(2);
const engine = new Engine();
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

function answerAll(questions, p, rnd) {
  return questions.map((q, i) => {
    const correct = rnd() < p(q, i, questions.length);
    const wrong = LETTERS.filter(l => l !== q.correct_option);
    return {selected: correct ? q.correct_option : wrong[Math.floor(rnd() * wrong.length)],
      checked: true, correct, timeSeconds: 35 + Math.floor(rnd() * 70)};
  });
}
const report = (questions, responses) => buildPerformanceReport({questions, responses, settings: {mode: 'training'}});

// ---------------------------------------------------------------- Part A
function partA(perConfig) {
  const configs = [];
  for (const difficulty of ['mixed', 'easy', 'medium']) for (const count of [10, 20, 30]) configs.push({difficulty, count});
  const rows = [];
  const strata = [];
  let sittingsTotal = 0, journeysTotal = 0;
  const tally = {TREND: 0, NO_TREND_DETECTED: 0, INSUFFICIENT_TREND_EVIDENCE: 0};
  const direction = {IMPROVING: 0, DETERIORATING: 0};
  const perConfigRows = [];
  for (const {difficulty, count} of configs) {
    const local = {TREND: 0, sittings: 0, comparable: []};
    for (let j = 0; j < perConfig; j++) {
      const rnd = mulberry(hash(`rc294c|A|${difficulty}|${count}|${j}`));
      // A learner: each family has its own standing ability; sittings improve
      // slightly, as a real learner does, and there is per-question noise.
      const ability = new Map();
      const abilityOf = f => { if (!ability.has(f)) ability.set(f, 0.25 + 0.6 * rnd()); return ability.get(f); };
      const sittings = 3 + (j % 2);
      let history = null;
      journeysTotal++;
      for (let s = 0; s < sittings; s++) {
        let session;
        try { session = engine.generatePractice({seed: `rc294c-A|${difficulty}|${count}|${j}|s${s}`, count, difficulty, diversityHistory: history}); }
        catch { break; }
        history = session.diversity_history;
        const gain = 0.02 * s;
        const responses = answerAll(session.questions, q => Math.min(0.97, Math.max(0.03, abilityOf(q.family) + gain)), rnd);
        const r = report(session.questions, responses);
        sittingsTotal++; local.sittings++;
        tally[r.trend.status] = (tally[r.trend.status] ?? 0) + 1;
        if (r.trend.status === 'TREND') { direction[r.trend.direction]++; local.TREND++; }
        const nStrata = r.trend.strata?.length ?? 0;
        strata.push(nStrata); local.comparable.push(nStrata);
      }
    }
    perConfigRows.push({difficulty, count, sittings: local.sittings, trend: local.TREND,
      trendPct: Number((100 * local.TREND / Math.max(1, local.sittings)).toFixed(1)),
      medianStrata: median(local.comparable)});
  }
  rows.push(...perConfigRows);
  return {journeys: journeysTotal, sittings: sittingsTotal, tally, direction,
    trendPct: Number((100 * tally.TREND / Math.max(1, sittingsTotal)).toFixed(2)),
    medianComparableStrata: median(strata),
    strataDistribution: countBy(strata), perConfig: rows};
}
const median = xs => { if (!xs.length) return null; const a = [...xs].sort((x, y) => x - y); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
const countBy = xs => { const m = new Map(); for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1); return Object.fromEntries([...m].sort((a, b) => a[0] - b[0])); };

// ---------------------------------------------------------------- Part B
function grid(reps, sign) {
  const out = [];
  for (const count of [20, 30, 50]) {
    for (const effect of [0.15, 0.20, 0.25, 0.30, 0.40]) {
      let detected = 0, rightWay = 0, insufficient = 0, n = 0;
      const comparable = [];
      for (let k = 0; k < reps; k++) {
        const rnd = mulberry(hash(`rc294c|B|${sign}|${count}|${effect}|${k}`));
        let session;
        try { session = engine.generatePractice({seed: `rc294c-B|${sign}|${count}|${effect}|${k}`, count, difficulty: 'mixed'}); }
        catch { continue; }
        const base = 0.55;
        const p = (q, i, total) => {
          const half = Math.floor(total / 2);
          const level = i < half ? base - sign * effect / 2 : base + sign * effect / 2;
          return Math.min(0.97, Math.max(0.03, level));
        };
        const r = report(session.questions, answerAll(session.questions, p, rnd));
        n++;
        comparable.push(r.trend.strata?.length ?? 0);
        if (r.trend.status === 'TREND') {
          detected++;
          if (r.trend.direction === (sign > 0 ? 'IMPROVING' : 'DETERIORATING')) rightWay++;
        } else if (r.trend.status === 'INSUFFICIENT_TREND_EVIDENCE') insufficient++;
      }
      out.push({count, effectPoints: Math.round(effect * 100), sessions: n, detected,
        detectedPct: Number((100 * detected / Math.max(1, n)).toFixed(1)),
        correctDirection: rightWay,
        insufficientPct: Number((100 * insufficient / Math.max(1, n)).toFixed(1)),
        medianStrata: median(comparable)});
    }
  }
  return out;
}

const A = partA(Number(JOURNEYS));
console.log(`\n=== Q3a/b — appearance rate on real product-path sessions ===`);
console.log(`journeys ${A.journeys}, completed sittings ${A.sittings}`);
console.log(`TREND ${A.tally.TREND} (${A.trendPct}%)  NO_TREND_DETECTED ${A.tally.NO_TREND_DETECTED}  INSUFFICIENT ${A.tally.INSUFFICIENT_TREND_EVIDENCE}`);
console.log(`of the trend lines: IMPROVING ${A.direction.IMPROVING}, DETERIORATING ${A.direction.DETERIORATING}`);
console.log(`Q3e — median comparable strata per sitting: ${A.medianComparableStrata}   distribution ${JSON.stringify(A.strataDistribution)}`);
console.log('config            sittings  TREND   %     median strata');
for (const r of A.perConfig) console.log(`${r.difficulty.padEnd(7)} x${String(r.count).padStart(2)}      ${String(r.sittings).padStart(6)} ${String(r.trend).padStart(6)} ${String(r.trendPct).padStart(6)}   ${r.medianStrata}`);

const up = grid(Number(REPS), +1);
const down = grid(Number(REPS), -1);
const show = (title, rows) => {
  console.log(`\n=== ${title} ===`);
  console.log('n    effect  sessions  detected   %      correct direction  insufficient%  median strata');
  for (const r of rows) console.log(`${String(r.count).padStart(3)}  ${String(r.effectPoints).padStart(5)}  ${String(r.sessions).padStart(8)}  ${String(r.detected).padStart(7)} ${String(r.detectedPct).padStart(6)}  ${String(r.correctDirection).padStart(16)}  ${String(r.insufficientPct).padStart(12)}  ${r.medianStrata}`);
};
show('Q3c — planted TRUE IMPROVEMENT', up);
show('Q3d — planted TRUE DECLINE', down);
console.log(`\nthresholds in force: ${JSON.stringify(EVIDENCE.trend)}`);

const {writeFileSync} = await import('node:fs');
writeFileSync(process.env.RC294_TREND_OUT ?? 'rc2/RC294_TREND_POWER.json',
  JSON.stringify({appearance: A, improvement: up, decline: down, thresholds: EVIDENCE.trend}, null, 2) + '\n');
