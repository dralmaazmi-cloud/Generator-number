#!/usr/bin/env node
// RC2.9.4-B1. What EASY and MEDIUM actually hold, counted the way a user
// perceives it, and how a single-band journey reads over its rolling hundred.
//
// Two parts, both from the engine as shipped:
//   capacity  — per family×band: templates, sub-ideas, tasks, targets,
//               information structures, perceptual constructions, presentation
//               keys, and how concentrated the realized draws are;
//   journeys  — N independent single-band journeys of S sittings × C questions,
//               history carried as the product carries it, every rolling
//               100-window measured with the RC2.9.2 classifier.
//
// Usage: node tools/audit/rc294-band-capacity.mjs [easy|medium|both] [journeys] [sittings] [count]

import Engine from '../../src/index.js';
import {blueprintsForBand} from '../../src/compose/blueprints.js';
import {measureSample, classify, presentationKey} from '../../src/qa/perceptual-classify.js';

const [which = 'both', J = '6', S = '4', C = '30'] = process.argv.slice(2);
const bands = which === 'both' ? ['easy', 'medium'] : [which];
const engine = new Engine();
const families = engine.listFamilies().map(f => f.id);

export function capacityMap(band, perFamily = 250) {
  const rows = [];
  for (const family of families) {
    const seen = {template: new Map(), subIdea: new Map(), task: new Map(), target: new Map(), info: new Map(), perceptual: new Map(), presentation: new Map()};
    let drawn = 0;
    for (let i = 0; i < perFamily; i++) {
      let q; try { q = engine.generateQuestion({family, difficulty: band, seed: `rc294-cap|${band}|${family}|${i}`}); } catch { continue; }
      drawn++;
      const m = q.metadata;
      const bump = (map, k) => map.set(k, (map.get(k) ?? 0) + 1);
      bump(seen.template, q.generator_id); bump(seen.subIdea, m.sub_idea_signature); bump(seen.task, m.task_signature);
      bump(seen.target, m.reasoning_target_pair); bump(seen.info, m.information_structure); bump(seen.perceptual, m.user_perceptual_signature);
      bump(seen.presentation, presentationKey({family, task: m.task_signature, perceptual: m.user_perceptual_signature}));
    }
    const top = map => Math.max(0, ...map.values()) / Math.max(1, drawn);
    rows.push({family, band, drawn, blueprints: blueprintsForBand(band, [family]).length,
      templates: seen.template.size, subIdeas: seen.subIdea.size, tasks: seen.task.size, targets: seen.target.size,
      infoStructures: seen.info.size, perceptual: seen.perceptual.size, presentations: seen.presentation.size,
      topPerceptualShare: Number(top(seen.perceptual).toFixed(2)), topPresentationShare: Number(top(seen.presentation).toFixed(2))});
  }
  return rows;
}

export function singleBandJourney(band, {label, sittings = 4, count = 30}) {
  const questions = [];
  let history = null;
  const refusals = [];
  for (let s = 0; s < sittings; s++) {
    try {
      const session = engine.generatePractice({seed: `${label}-s${s + 1}`, count, difficulty: band, diversityHistory: history});
      questions.push(...session.questions);
      history = session.diversity_history;
    } catch (e) { refusals.push({sitting: s + 1, code: e.code ?? String(e.message).slice(0, 80)}); }
  }
  const windows = [];
  for (let start = 0; start + 100 <= questions.length; start += 10) {
    const rows = questions.slice(start, start + 100);
    const m = measureSample(rows, {label: `Q${start + 1}-${start + 100}`});
    windows.push({label: `Q${start + 1}–${start + 100}`, pv: m.counts.PARAMETER_ONLY_VARIANT, nd: m.counts.NEAR_DUPLICATE_CONSTRUCTION,
      flagged: m.flagged, cluster: m.largestPerceptualCluster, run: m.longestSimilarRun,
      dup: rows.length - new Set(rows.map(q => q.metadata.normalized_stem_identity)).size});
  }
  const perSitting = [];
  for (let s = 0; s < sittings; s++) { const rows = questions.slice(s * count, (s + 1) * count); if (rows.length) { const m = measureSample(rows, {label: `S${s + 1}`}); perSitting.push({sitting: s + 1, n: rows.length, flagged: m.flagged, nd: m.counts.NEAR_DUPLICATE_CONSTRUCTION}); } }
  const families = new Map(); for (const q of questions) families.set(q.family, (families.get(q.family) ?? 0) + 1);
  return {label, band, questions: questions.length, refusals, windows, perSitting, families: Object.fromEntries([...families].sort())};
}

export const worst = windows => windows.reduce((a, w) => ({pv: Math.max(a.pv, w.pv), nd: Math.max(a.nd, w.nd), flagged: Math.max(a.flagged, w.flagged), cluster: Math.max(a.cluster, w.cluster), run: Math.max(a.run, w.run), dup: Math.max(a.dup, w.dup)}), {pv: 0, nd: 0, flagged: 0, cluster: 0, run: 0, dup: 0});

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const band of bands) {
    console.log(`\n=== ${band.toUpperCase()} capacity (250 draws per family) ===`);
    console.log('family              bp  tpl  sub  task tgt  info perc pres  topPerc topPres');
    for (const r of capacityMap(band)) console.log(`${r.family.padEnd(18)} ${String(r.blueprints).padStart(3)} ${String(r.templates).padStart(4)} ${String(r.subIdeas).padStart(4)} ${String(r.tasks).padStart(4)} ${String(r.targets).padStart(4)} ${String(r.infoStructures).padStart(4)} ${String(r.perceptual).padStart(4)} ${String(r.presentations).padStart(4)}   ${String(r.topPerceptualShare).padStart(5)}   ${String(r.topPresentationShare).padStart(5)}`);
    console.log(`\n=== ${band.toUpperCase()} journeys: ${J} × (${S} sittings × ${C}) ===`);
    console.log('journey  questions refusals | worst window: PV  ND  PV+ND cluster run dup | per-sitting flagged');
    for (let j = 1; j <= Number(J); j++) {
      const r = singleBandJourney(band, {label: `rc294-${band}-j${j}`, sittings: Number(S), count: Number(C)});
      const w = worst(r.windows);
      console.log(`${r.label.padEnd(18)} ${String(r.questions).padStart(4)} ${String(r.refusals.length).padStart(3)}      | ${String(w.pv).padStart(3)} ${String(w.nd).padStart(3)} ${String(w.flagged).padStart(5)} ${String(w.cluster).padStart(6)} ${String(w.run).padStart(4)} ${String(w.dup).padStart(3)} | ${r.perSitting.map(s => s.flagged).join(' ')}${r.refusals.length ? '  ' + JSON.stringify(r.refusals) : ''}`);
    }
  }
}
