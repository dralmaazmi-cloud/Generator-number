#!/usr/bin/env node
// RC2.9.4 Phase A — the analytics evidence file: the null permutation matrix,
// the threshold-boundary lines, and the synthetic learner profiles A–L, all
// produced by the shipped model so a reviewer reads what a learner would.
//
// Usage: node tools/audit/rc294-analytics-evidence.mjs > rc2/RC294_ANALYTICS_EVIDENCE.md

import Engine from '../../src/index.js';
import {MISCONCEPTIONS} from '../../src/qa/misconceptions.js';
import {buildPerformanceReport, stratifiedTrend, judge, unitLine, EVIDENCE} from '../../performance-model.js';

const engine = new Engine();
const text = id => MISCONCEPTIONS[id] ?? id;
const L = ['A', 'B', 'C', 'D', 'E', 'F'];
const out = [];
const say = s => out.push(s);

// --- 1. the null permutation matrix ----------------------------------------------
function lcg(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
const FAMS = ['averages', 'percentages', 'ratios', 'speed'];
function nullHistory({n, accuracy, order, seed}) {
  const rand = lcg(seed);
  const spread = [0.25, 0.1, -0.1, -0.25].map(d => Math.min(0.95, Math.max(0.05, accuracy + d)));
  const rows = [];
  for (let i = 0; i < n; i++) { const f = order === 'blocked' ? Math.floor((i * 4) / n) : i % 4; rows.push({family: FAMS[f], answered: true, correct: rand() < spread[f]}); }
  return rows;
}
const shuffled = (rows, rand) => { const a = rows.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
say('# RC2.9.4 Phase A — analytics evidence');
say('');
say(`Trend rule: ${JSON.stringify(EVIDENCE.trend)}; status rule: ${JSON.stringify(EVIDENCE.status)}, strength ≥ ${EVIDENCE.strength}, weakness ≤ ${EVIDENCE.weakness}, claims need ≥ ${EVIDENCE.minForClaim} answered.`);
say('');
say('## 1. Null permutation matrix (no true change; 201 orderings per history: the original + 200 shuffles)');
say('');
say('| n | accuracy | order | histories | evaluations | false IMPROVING/DETERIORATING |');
say('|---|---|---|---|---|---|');
let total = 0, falseTotal = 0, falseSmall = 0;
for (const n of [12, 16, 20, 30, 50]) for (const accuracy of [0.3, 0.5, 0.7]) for (const order of ['mixed', 'blocked']) {
  let evals = 0, falses = 0;
  for (const rep of [0, 1]) {
    const h = {n, accuracy, order, seed: 1000 * n + 100 * accuracy * 10 + (order === 'blocked' ? 7 : 3) + rep};
    const rows = nullHistory(h); const rand = lcg(h.seed * 31 + 1);
    const orders = [rows]; for (let k = 0; k < 200; k++) orders.push(shuffled(rows, rand));
    for (const o of orders) { evals++; if (stratifiedTrend(o).status === 'TREND') falses++; }
  }
  total += evals; falseTotal += falses; if (n <= 16) falseSmall += falses;
  say(`| ${n} | ${accuracy} | ${order} | 2 | ${evals} | ${falses} |`);
}
say('');
say(`Overall false-trend rate: ${falseTotal} of ${total} (${(100 * falseTotal / total).toFixed(2)}%); at n ≤ 16: ${falseSmall}.`);
say('');

// --- 2. sensitivity ---------------------------------------------------------------
function genuine({n, first, second, seed = 7}) { const rand = lcg(seed); const rows = []; for (let i = 0; i < n; i++) { const p = i < n / 2 ? first : second; rows.push({family: FAMS[i % 4], answered: true, correct: rand() < p}); } return rows; }
say('## 2. Sensitivity (genuine within-skill change, mixed family order, 20 random draws each)');
say('');
say('| n | first half | second half | detected | direction |');
say('|---|---|---|---|---|');
for (const [n, a, b] of [[20, 0.15, 0.95], [20, 0.95, 0.15], [30, 0.3, 0.9], [50, 0.45, 0.85], [50, 0.85, 0.45], [50, 0.55, 0.75]]) {
  let det = 0; const dirs = new Set();
  for (let seed = 0; seed < 20; seed++) { const t = stratifiedTrend(genuine({n, first: a, second: b, seed})); if (t.status === 'TREND') { det++; dirs.add(t.direction); } }
  say(`| ${n} | ${Math.round(a * 100)}% | ${Math.round(b * 100)}% | ${det}/20 | ${[...dirs].join(', ') || '—'} |`);
}
say('');
say('A change in the two halves\' SKILL MIX alone (strong family first, weak family last, no within-family change) yields INSUFFICIENT_TREND_EVIDENCE in both orders: no family is answered in both halves, so nothing is comparable.');
say('');

// --- 3. the threshold lines --------------------------------------------------------
say('## 3. Threshold-boundary lines (the exact Arabic a learner reads)');
say('');
say('| c/n | status | lean | Wilson 80% | line |');
say('|---|---|---|---|---|');
for (const [c, n] of [[3, 3], [2, 3], [2, 4], [3, 4], [4, 5], [4, 8], [5, 8], [5, 10], [6, 10], [7, 10], [8, 10], [15, 20], [16, 20]]) {
  const j = judge(c, n);
  const conf = n >= 15 ? 'high' : n >= 8 ? 'medium' : n >= 4 ? 'low' : 'none';
  say(`| ${c}/${n} | ${j.status} | ${j.lean ?? '—'} | ${j.interval ? `[${j.interval.lo.toFixed(2)}, ${j.interval.hi.toFixed(2)}]` : '—'} | ${unitLine({label: 'النسب', correct: c, n, percentage: Math.round((c / n) * 100), status: j.status, lean: j.lean, confidence: conf})} |`);
}
say('');

// --- 4. synthetic learners A–L ------------------------------------------------------
function sitting(seed, families, perFamily = 10) {
  const out = []; const bands = ['easy', 'medium', 'medium', 'hard'];
  for (const f of families) { let drawn = 0; for (let i = 0; i < perFamily * 6 && drawn < perFamily; i++) { try { out.push(engine.generateQuestion({family: f, difficulty: bands[i % 4], seed: `${seed}|${f}|${i}`})); drawn++; } catch { /* band */ } } }
  return out;
}
const interleave = lists => { const out = []; const len = Math.max(...lists.map(l => l.length)); for (let i = 0; i < len; i++) for (const l of lists) if (l[i]) out.push(l[i]); return out; };
const reference = q => 20 + 20 * (q.metadata.estimated_steps ?? 2);
const wrongLetter = (q, id = null) => { const m = q.metadata.options_meta; return (id && L.find(l => m[l] && !m[l].correct && m[l].misconceptionId === id)) ?? L.find(l => m[l] && !m[l].correct); };
const right = (q, t = reference(q)) => ({selected: q.correct_option, correct: true, timeSeconds: t});
const wrong = (q, id = null, t = reference(q)) => ({selected: wrongLetter(q, id), correct: false, timeSeconds: t});
const blank = () => ({selected: null, correct: false, timeSeconds: null});
function show(name, qs, responses, settings = {mode: 'training'}) {
  const r = buildPerformanceReport({questions: qs, responses, settings}, text);
  say(`### ${name} (${qs.length} questions)`); say('');
  for (const sec of r.text) { say(`**${sec.heading}**`); for (const l of sec.lines) say(`- ${l}`); say(''); }
  say(`trend: ${JSON.stringify({status: r.trend.status, direction: r.trend.direction, effect: r.trend.effect, p: r.trend.p, comparable: r.trend.comparable, confidence: r.trend.confidence})}`); say('');
}
say('## 4. Synthetic learners A–L (real engine questions, synthetic answers)');
say('');
const four = ['averages', 'percentages', 'ratios', 'profit_loss'];
const mixed = seed => interleave(four.map(f => sitting(seed, [f], 10)));
{ const isRev = q => q.metadata.task_signature.startsWith('REVERSE_RECOVER'); let qs = null;
  for (let i = 0; i < 40 && !qs; i++) { const c = interleave(['averages', 'percentages', 'ratios', 'speed'].map(f => sitting(`rc293-perf-A-${i}`, [f], 12))); const n = c.filter(isRev).length; if (n >= 4 && n <= 10) qs = c; }
  let t = 0; show('A — strong averages, weak at working backwards, average speed', qs, qs.map(q => isRev(q) ? wrong(q) : q.family === 'speed' ? ((t++ % 3 === 2) ? wrong(q) : right(q)) : right(q))); }
{ const qs = mixed('rc293-perf-B'); show('B — accurate but slow', qs, qs.map(q => right(q, Math.round(2.2 * reference(q))))); }
{ const qs = mixed('rc293-perf-C'); show('C — fast but error-prone', qs, qs.map((q, i) => i % 5 < 3 ? wrong(q, null, Math.max(2, Math.round(0.3 * reference(q)))) : right(q, Math.round(0.4 * reference(q))))); }
{ const qs = interleave(['averages', 'percentages', 'ratios'].map(f => sitting('rc293-perf-D', [f], 10))); show('D — only three answered', qs, qs.map((q, i) => i < 3 ? (i < 2 ? right(q) : wrong(q)) : blank())); }
{ const qs = mixed('rc293-perf-E'); show('E — one isolated error', qs, qs.map((q, i) => i === 7 ? wrong(q, q.metadata.target_misconception) : right(q))); }
{ const ID = 'USED_SALE_PRICE_AS_DENOMINATOR'; let qs = null; for (let i = 0; i < 40 && !qs; i++) { const c = interleave(four.map(f => sitting(`rc293-perf-F-${i}`, [f], 12))); if (c.filter(q => L.some(l => q.metadata.options_meta[l]?.misconceptionId === ID)).length >= 5) qs = c; }
  let planted = 0; show('F — repeated denominator misconception', qs, qs.map(q => { const offers = L.some(l => q.metadata.options_meta[l]?.misconceptionId === ID); if (offers && planted < 5) { planted++; return wrong(q, ID); } return right(q); })); }
{ const qs = mixed('rc293-perf-G'); const h = qs.length / 2; show('G — improving within every family', qs, qs.map((q, i) => i < h ? (i % 10 < 3 ? right(q) : wrong(q)) : (i % 10 < 9 ? right(q) : wrong(q)))); show('H — deteriorating within every family', qs, qs.map((q, i) => i < h ? (i % 10 < 9 ? right(q) : wrong(q)) : (i % 10 < 3 ? right(q) : wrong(q)))); }
{ const A = sitting('rc294-perf-I', ['averages'], 12), B = sitting('rc294-perf-I', ['percentages'], 12);
  const aA = A.map((q, i) => (i % 10 === 9 ? wrong(q) : right(q))), aB = B.map((q, i) => (i % 10 < 3 ? right(q) : wrong(q)));
  show('I — strong family first, weak family last (composition only)', [...A, ...B], [...aA, ...aB]);
  show('I′ — the same evidence, family blocks swapped', [...B, ...A], [...aB, ...aA]); }
{ const qs = mixed('rc294-perf-J'); show('J — steady 75% throughout', qs, qs.map((q, i) => (i % 4 === 0 ? wrong(q) : right(q)))); }
{ const qs = interleave([sitting('rc294-perf-K', ['ratios'], 4), sitting('rc294-perf-K', ['averages'], 4), sitting('rc294-perf-K', ['speed'], 10)]);
  show('K — thin evidence: ratios 2/4, averages 3/4, speed 9/10', qs, qs.map(q => q.family === 'ratios' ? (q.metadata.template_id.endsWith('SPLIT') || Math.random() < 0 ? right(q) : right(q)) : right(q)).map((r, i) => {
    const q = qs[i]; if (q.family === 'ratios') { const k = qs.slice(0, i).filter(x => x.family === 'ratios').length; return k < 2 ? right(q) : wrong(q); }
    if (q.family === 'averages') { const k = qs.slice(0, i).filter(x => x.family === 'averages').length; return k < 3 ? right(q) : wrong(q); }
    const k = qs.slice(0, i).filter(x => x.family === 'speed').length; return k === 5 ? wrong(q) : right(q); })); }
{ const qs = sitting('rc294-perf-L', ['averages'], 10); show('L — three answered of ten, all correct (training)', qs, qs.map((q, i) => (i < 3 ? right(q) : blank()))); show('L′ — the same sitting in exam mode', qs, qs.map((q, i) => (i < 3 ? right(q) : blank())), {mode: 'exam'}); }
process.stdout.write(out.join('\n') + '\n');
