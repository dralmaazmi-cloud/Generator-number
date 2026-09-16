#!/usr/bin/env node
// RC2.9.4 clarification Q2. How much of the achieved PV+ND is forced by the
// pools, and how much is the scheduler's.
//
// Three quantities per band, all measured, none asserted:
//
//   floor          100 − maximum matching over EVERY reachable (PV,ND) pair
//                  (rc294-keyspace.mjs), i.e. what no scheduler can beat;
//   pool-optimal   100 − maximum matching over the pairs the product path
//                  ACTUALLY realized in the measured journeys, i.e. the best a
//                  perfect re-ordering of the delivered items could have done;
//   achieved       what the classifier scores on the worst rolling 100.
//
//   achieved = floor + (pool-optimal − floor)   … selection: fresh pairs existed
//                                                  and the planner did not take them
//            + (achieved − pool-optimal)        … ordering: the delivered items
//                                                  were sequenced so first
//                                                  occurrences were wasted
//
// The optimal is then DEMONSTRATED, not claimed: the matched pairs are turned
// back into real questions by their generating seeds, assembled into a 100-item
// sample, and scored with the shipped classifier.
//
// Usage: node tools/audit/rc294-scheduler-bound.mjs [easy,medium] [journeys] [sittings] [count]

import Engine from '../../src/index.js';
import {measureSample} from '../../src/qa/perceptual-classify.js';
import {enumerateBand, maximumMatching} from './rc294-keyspace.mjs';

const [BANDS = 'easy,medium', J = '6', S = '4', C = '30'] = process.argv.slice(2);
const engine = new Engine();

const keyOf = q => [`${q.metadata.template_id ?? q.generator_id}|${q.metadata.task_signature}`,
  q.metadata.user_perceptual_signature];

function journey(band, label, sittings, count) {
  const questions = [];
  let history = null;
  const refusals = [];
  for (let s = 0; s < sittings; s++) {
    try {
      const session = engine.generatePractice({seed: `${label}-s${s + 1}`, count, difficulty: band, diversityHistory: history});
      questions.push(...session.questions);
      history = session.diversity_history;
    } catch (e) { refusals.push({sitting: s + 1, code: e.code ?? String(e.message).slice(0, 60)}); }
  }
  return {questions, refusals};
}

function worstWindow(questions) {
  let worst = null;
  for (let start = 0; start + 100 <= questions.length; start += 10) {
    const rows = questions.slice(start, start + 100);
    const m = measureSample(rows, {label: `Q${start + 1}-${start + 100}`});
    const pv = m.counts.PARAMETER_ONLY_VARIANT, nd = m.counts.NEAR_DUPLICATE_CONSTRUCTION;
    const poolOptimal = 100 - maximumMatching(rows.map(keyOf)).size;
    const row = {start: start + 1, pv, nd, flagged: pv + nd, poolOptimal,
      distinctPv: new Set(rows.map(q => keyOf(q)[0])).size,
      distinctNd: new Set(rows.map(q => keyOf(q)[1])).size};
    if (!worst || row.flagged > worst.flagged) worst = row;
  }
  return worst;
}

function oracleSample(space, band, size = 100) {
  // The maximum matching, realized as REAL questions and then ORDERED so the
  // other rolling gates are respected too: every matched pair is the first
  // appearance of both its keys, the filler is drawn on fresh seeds so no item
  // is a literal duplicate, no signature is used more than three times in the
  // hundred, and no two adjacent items read as similar. If such an order
  // exists, the matching bound is not only a bound but a deliverable hundred.
  const {pairs} = maximumMatching(space.edgeList);
  const seedOf = new Map(space.edgeSeeds.map(e => [`${e.pv}>>${e.nd}`, e]));
  const drawn = new Map();
  const draw = (e, suffix = '') => {
    const seed = `${e.seed}${suffix}`;
    if (!drawn.has(seed)) drawn.set(seed, engine.generateQuestion({family: e.family, difficulty: band, seed}));
    return drawn.get(seed);
  };
  const matched = [];
  for (const [nd, pv] of pairs) {
    if (matched.length >= size) break;
    const e = seedOf.get(`${pv}>>${nd}`);
    matched.push({...e, matched: true, q: draw(e)});
  }
  // Filler, on FRESH seeds: the text must be new even though the idea is not.
  const used = new Map(matched.map(e => [e.q.metadata.user_perceptual_signature, 1]));
  const filler = [];
  let attempt = 0;
  while (matched.length + filler.length < size && attempt < 20000) {
    const e = space.edgeSeeds[attempt % space.edgeSeeds.length];
    const q = draw(e, `|fill${Math.floor(attempt / space.edgeSeeds.length)}`);
    attempt++;
    const sig = q.metadata.user_perceptual_signature;
    if ((used.get(sig) ?? 0) >= 3) continue;
    used.set(sig, (used.get(sig) ?? 0) + 1);
    filler.push({...e, matched: false, q});
  }
  const keyOfRow = r => [`${r.q.metadata.template_id ?? r.q.generator_id}|${r.q.metadata.task_signature}`,
    r.q.metadata.user_perceptual_signature, r.q.family, r.q.metadata.task_signature];
  const similar = (a, b) => !a || !b ||
    keyOfRow(a)[1] === keyOfRow(b)[1] || (a.q.family === b.q.family && keyOfRow(a)[3] === keyOfRow(b)[3]);
  // Order: matched items open their own keys; among the legal candidates take
  // the one whose signature has been unused longest.
  const pending = [...matched, ...filler];
  const openedNd = new Set(), openedPv = new Set();
  const lastAt = new Map();
  const ordered = [];
  while (pending.length) {
    const prev = ordered[ordered.length - 1];
    const score = e => {
      const [pv, nd] = keyOfRow(e);
      const opensBoth = e.matched && !openedNd.has(nd) && !openedPv.has(pv);
      const age = ordered.length - (lastAt.get(nd) ?? -50);
      return (opensBoth ? 1000 : 0) + Math.min(age, 60);
    };
    let best = -1, bestScore = -Infinity, bestAny = -1, bestAnyScore = -Infinity;
    for (let i = 0; i < pending.length; i++) {
      const sc = score(pending[i]);
      if (sc > bestAnyScore) { bestAnyScore = sc; bestAny = i; }
      if (!similar(prev, pending[i]) && sc > bestScore) { bestScore = sc; best = i; }
    }
    const [e] = pending.splice(best >= 0 ? best : bestAny, 1);
    const [pv, nd] = keyOfRow(e);
    openedNd.add(nd); openedPv.add(pv);
    lastAt.set(nd, ordered.length);
    ordered.push(e);
  }
  const rows = ordered.map(e => e.q);
  const m = measureSample(rows, {label: `oracle-${band}`});
  return {matched: matched.length, items: rows.length,
    pv: m.counts.PARAMETER_ONLY_VARIANT, nd: m.counts.NEAR_DUPLICATE_CONSTRUCTION,
    flagged: m.flagged, cluster: m.largestPerceptualCluster, run: m.longestSimilarRun,
    exactDuplicates: m.exactDuplicates,
    gates: {flaggedAtMost8: m.flagged <= 8, ndAtMost5: m.counts.NEAR_DUPLICATE_CONSTRUCTION <= 5,
      clusterAtMost3: m.largestPerceptualCluster <= 3, noRunOfThree: m.longestSimilarRun <= 2,
      noDuplicates: m.exactDuplicates === 0}};
}

function familyMatching(space) {
  // Each matched pair belongs to the family that produced it.
  const {pairs} = maximumMatching(space.edgeList);
  const famOf = new Map(space.edgeSeeds.map(e => [`${e.pv}>>${e.nd}`, e.family]));
  const counts = new Map();
  for (const [nd, pv] of pairs) {
    const f = famOf.get(`${pv}>>${nd}`) ?? '?';
    counts.set(f, (counts.get(f) ?? 0) + 1);
  }
  return counts;
}

const out = {};
for (const band of BANDS.split(',')) {
  const space = enumerateBand(band, {perFamily: 4000, patience: 900});
  const realized = [];
  const journeys = [];
  for (let j = 1; j <= Number(J); j++) {
    const r = journey(band, `rc294c-${band}-j${j}`, Number(S), Number(C));
    for (const q of r.questions) realized.push(keyOf(q));
    const w = worstWindow(r.questions);
    journeys.push({label: `j${j}`, questions: r.questions.length, refusals: r.refusals.length, ...w});
  }
  const union = [...space.edgeList, ...realized];
  const unionMatch = maximumMatching(union).size;
  const realizedMatch = maximumMatching(realized).size;
  const floor = Math.max(0, 100 - unionMatch);
  const mean = k => Number((journeys.reduce((a, r) => a + r[k], 0) / journeys.length).toFixed(1));
  const oracle = oracleSample(space, band);
  const fam = familyMatching(space);
  out[band] = {
    band,
    reachable: {pvKeys: space.pvKeys, ndKeys: space.ndKeys, pairs: space.edges, matching: space.matching},
    unionMatching: unionMatch, realizedOnlyMatching: realizedMatch, floor,
    achievedWorstMean: {pv: mean('pv'), nd: mean('nd'), flagged: mean('flagged')},
    achievedWorstMax: Math.max(...journeys.map(r => r.flagged)),
    poolOptimalMean: mean('poolOptimal'),
    decomposition: {
      floor,
      selection: Number((mean('poolOptimal') - floor).toFixed(1)),
      ordering: Number((mean('flagged') - mean('poolOptimal')).toFixed(1))
    },
    oracle,
    journeys,
    familyMatching: Object.fromEntries([...fam].sort((a, b) => b[1] - a[1]))
  };
  const o = out[band];
  console.log(`\n=== ${band.toUpperCase()} ===`);
  console.log(`reachable pairs ${space.edges}, maximum matching ${space.matching}; with journey pairs folded in: ${unionMatch}`);
  console.log(`FLOOR (no scheduler can beat)            : ${floor}`);
  console.log(`pool-optimal on the delivered items      : ${o.poolOptimalMean}`);
  console.log(`achieved, worst rolling 100, mean of ${J}  : ${o.achievedWorstMean.flagged}  (PV ${o.achievedWorstMean.pv}, ND ${o.achievedWorstMean.nd}), max ${o.achievedWorstMax}`);
  console.log(`decomposition: floor ${floor} + selection ${o.decomposition.selection} + ordering ${o.decomposition.ordering}`);
  console.log(`offline optimal assembled and CLASSIFIED : ${oracle.matched} matched, PV ${oracle.pv} + ND ${oracle.nd} = ${oracle.flagged} (cluster ${oracle.cluster}, run ${oracle.run}, dup ${oracle.exactDuplicates}, other gates ${JSON.stringify(oracle.gates)})`);
  console.log('family              matched pairs');
  for (const [f, n] of Object.entries(o.familyMatching)) console.log(`${f.padEnd(18)} ${String(n).padStart(3)}`);
}

const {writeFileSync} = await import('node:fs');
writeFileSync(process.env.RC294_BOUND_OUT ?? 'rc2/RC294_SCHEDULER_BOUND.json', JSON.stringify(out, null, 2) + '\n');
