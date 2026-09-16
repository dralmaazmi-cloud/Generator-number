#!/usr/bin/env node
// RC2.9.5. The one rolling measurement every table in this release is made
// with. Two things are fixed here that RC2.9.4 got wrong or left implicit:
//
//   * the rolling 100-window advances in steps of TEN, not fifty. RC2.9.4's
//     acceptance stepped by fifty and missed a perceptual cluster of four at
//     EASY (finding 1.2);
//   * the IN-SITTING experience is measured separately from the rolling
//     hundred. A repeat met ten minutes apart is worse than one met a week
//     apart, and a rolling window cannot see the difference.
//
// Usage:
//   node tools/audit/rc295-rolling.mjs [difficulty] [counts] [sittings] [journeys] [label]
//   RC295_ROLLING_OUT=path node tools/audit/rc295-rolling.mjs mixed 10,20,30 4 8 new-mix

import Engine from '../../src/index.js';
import {measureSample, classify} from '../../src/qa/perceptual-classify.js';

const [DIFFICULTY = 'mixed', COUNTS = '10,20,30', SITTINGS = '4', JOURNEYS = '8', LABEL = 'run'] =
  process.argv.slice(2);

export const GATES = Object.freeze({flagged: 8, nd: 5, cluster: 3, run: 2, duplicates: 0});

/** Every rolling 100-window, advanced in steps of ten. */
export function rollingWindows(questions, step = 10) {
  const out = [];
  for (let start = 0; start + 100 <= questions.length; start += step) {
    const rows = questions.slice(start, start + 100);
    const m = measureSample(rows, {label: `Q${start + 1}-${start + 100}`});
    out.push({
      at: start + 1,
      pv: m.counts.PARAMETER_ONLY_VARIANT,
      nd: m.counts.NEAR_DUPLICATE_CONSTRUCTION,
      flagged: m.flagged,
      cluster: m.largestPerceptualCluster,
      run: m.longestSimilarRun,
      duplicates: rows.length - new Set(rows.map(q => q.metadata.normalized_stem_identity)).size
    });
  }
  return out;
}

export const worstOf = windows => windows.reduce((a, w) => ({
  pv: Math.max(a.pv, w.pv), nd: Math.max(a.nd, w.nd), flagged: Math.max(a.flagged, w.flagged),
  cluster: Math.max(a.cluster, w.cluster), run: Math.max(a.run, w.run),
  duplicates: Math.max(a.duplicates, w.duplicates)
}), {pv: 0, nd: 0, flagged: 0, cluster: 0, run: 0, duplicates: 0});

/** What one sitting feels like: repeats inside the sitting the learner sits. */
export function sittingMetrics(rows) {
  const labelled = classify(rows);
  const bySig = new Map();
  for (const r of labelled) bySig.set(r.perceptual, (bySig.get(r.perceptual) ?? 0) + 1);
  const byFamilyTask = new Map();
  for (const r of labelled) {
    const k = `${r.family}|${r.task}`;
    byFamilyTask.set(k, (byFamilyTask.get(k) ?? 0) + 1);
  }
  const bands = {easy: 0, medium: 0, hard: 0};
  for (const q of rows) if (bands[q.difficulty] !== undefined) bands[q.difficulty]++;
  return {
    n: rows.length,
    distinctSignatures: bySig.size,
    maxSignatureRepeat: Math.max(0, ...bySig.values()),
    signaturesSeenTwice: [...bySig.values()].filter(v => v > 1).length,
    maxFamilyTaskRepeat: Math.max(0, ...byFamilyTask.values()),
    duplicates: rows.length - new Set(rows.map(q => q.metadata.normalized_stem_identity)).size,
    bands
  };
}

export function runJourney(engine, {difficulty, count, sittings, seedPrefix}) {
  const questions = [];
  const perSitting = [];
  const refusals = [];
  let history = null;
  for (let s = 0; s < sittings; s++) {
    let session;
    try {
      session = engine.generatePractice({seed: `${seedPrefix}-s${s + 1}`, count, difficulty, diversityHistory: history});
    } catch (e) {
      refusals.push({sitting: s + 1, code: e.code ?? String(e.message).slice(0, 70)});
      continue;
    }
    history = session.diversity_history;
    questions.push(...session.questions);
    perSitting.push(sittingMetrics(session.questions));
  }
  return {questions, perSitting, refusals};
}

export function measureConfig(engine, {difficulty, count, sittings, journeys, seedPrefix}) {
  const rows = [];
  const sittingRows = [];
  const bands = {easy: 0, medium: 0, hard: 0};
  let total = 0;
  const refusals = [];
  for (let j = 1; j <= journeys; j++) {
    const r = runJourney(engine, {difficulty, count, sittings, seedPrefix: `${seedPrefix}-j${j}`});
    refusals.push(...r.refusals.map(x => ({journey: j, ...x})));
    const windows = rollingWindows(r.questions);
    rows.push({journey: j, questions: r.questions.length, windows: windows.length, worst: worstOf(windows)});
    sittingRows.push(...r.perSitting);
    for (const q of r.questions) { if (bands[q.difficulty] !== undefined) bands[q.difficulty]++; total++; }
  }
  const worst = worstOf(rows.map(r => r.worst));
  const sittingWorst = {
    maxSignatureRepeat: Math.max(0, ...sittingRows.map(s => s.maxSignatureRepeat)),
    maxFamilyTaskRepeat: Math.max(0, ...sittingRows.map(s => s.maxFamilyTaskRepeat)),
    duplicates: Math.max(0, ...sittingRows.map(s => s.duplicates)),
    medianDistinct: median(sittingRows.map(s => s.distinctSignatures)),
    sittingsWithARepeat: sittingRows.filter(s => s.maxSignatureRepeat > 1).length,
    sittings: sittingRows.length
  };
  const split = {
    easy: pct(bands.easy, total), medium: pct(bands.medium, total), hard: pct(bands.hard, total),
    counts: bands, total
  };
  const pass = worst.flagged <= GATES.flagged && worst.nd <= GATES.nd && worst.cluster <= GATES.cluster
    && worst.run <= GATES.run && worst.duplicates <= GATES.duplicates;
  return {difficulty, count, sittings, journeys, journeysDetail: rows, worst, sittingWorst, split,
    refusals, gatesPass: pass};
}

const pct = (n, total) => Number((100 * n / Math.max(1, total)).toFixed(1));
const median = xs => { if (!xs.length) return null; const a = [...xs].sort((x, y) => x - y); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };

if (import.meta.url === `file://${process.argv[1]}`) {
  const engine = new Engine();
  const results = [];
  for (const count of COUNTS.split(',').map(Number)) {
    const r = measureConfig(engine, {
      difficulty: DIFFICULTY, count, sittings: Number(SITTINGS), journeys: Number(JOURNEYS),
      seedPrefix: `rc295|${LABEL}|${DIFFICULTY}|${count}`
    });
    results.push(r);
    console.log(`\n=== ${LABEL} · ${DIFFICULTY} · ${Number(JOURNEYS)} journeys × ${SITTINGS} sittings × ${count} ===`);
    console.log(`windows advance in steps of 10; ${r.journeysDetail.reduce((a, x) => a + x.windows, 0)} windows measured`);
    console.log(`worst rolling 100 : PV+ND ${r.worst.flagged} (gate ${GATES.flagged}) · ND ${r.worst.nd} (${GATES.nd}) · cluster ${r.worst.cluster} (${GATES.cluster}) · streak ${r.worst.run} (${GATES.run}) · duplicates ${r.worst.duplicates} (0) → ${r.gatesPass ? 'PASS' : 'FAIL'}`);
    console.log(`in-sitting        : max signature repeat ${r.sittingWorst.maxSignatureRepeat} · sittings with a repeat ${r.sittingWorst.sittingsWithARepeat}/${r.sittingWorst.sittings} · median distinct ${r.sittingWorst.medianDistinct} · duplicates ${r.sittingWorst.duplicates}`);
    console.log(`band split        : easy ${r.split.easy}% · medium ${r.split.medium}% · hard ${r.split.hard}% (${r.split.total} questions)`);
    if (r.refusals.length) console.log(`refusals          : ${JSON.stringify(r.refusals.slice(0, 5))}`);
  }
  const {writeFileSync} = await import('node:fs');
  writeFileSync(process.env.RC295_ROLLING_OUT ?? `rc2/RC295_ROLLING_${LABEL}.json`,
    JSON.stringify({label: LABEL, difficulty: DIFFICULTY, step: 10, gates: GATES, results}, null, 2) + '\n');
}
