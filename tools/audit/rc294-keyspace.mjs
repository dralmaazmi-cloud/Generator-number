#!/usr/bin/env node
// RC2.9.4 clarification Q1/Q2. The reachable key space of a band, enumerated by
// generation until saturation, in the units the rolling-diversity gate actually
// uses:
//
//   PV key   `${template_id}|${task_signature}`      (src/qa/perceptual-classify.js)
//   ND key   `metadata.user_perceptual_signature`
//
// An item escapes both labels only when BOTH of its keys are new in the window.
// So the floor over a window of 100 is not 100 − |perceptual|: it is
// 100 − (largest set of reachable items with pairwise distinct PV keys AND
// pairwise distinct ND keys) = 100 − maximum bipartite matching between the two
// key sets over the reachable (pv, nd) edge set. That matching is computed here
// rather than asserted.
//
// Usage: node tools/audit/rc294-keyspace.mjs [easy,medium] [perFamily] [patience]

import Engine from '../../src/index.js';

const [BANDS = 'easy,medium', PER = '4000', PATIENCE = '900'] = process.argv.slice(2);

/** Kuhn's augmenting-path matching; the graphs here are a few hundred nodes. */
export function maximumMatching(edges) {
  const left = [...new Set(edges.map(e => e[0]))];
  const adj = new Map(left.map(l => [l, new Set()]));
  for (const [l, r] of edges) adj.get(l).add(r);
  const matchR = new Map();
  const tryKuhn = (l, seen) => {
    for (const r of adj.get(l)) {
      if (seen.has(r)) continue;
      seen.add(r);
      if (!matchR.has(r) || tryKuhn(matchR.get(r), seen)) { matchR.set(r, l); return true; }
    }
    return false;
  };
  let size = 0;
  for (const l of left) if (tryKuhn(l, new Set())) size++;
  return {size, pairs: matchR};
}

export function enumerateBand(band, {perFamily = Number(PER), patience = Number(PATIENCE)} = {}) {
  const engine = new Engine();
  const families = engine.listFamilies().map(f => f.id);
  const edges = [];
  const edgeSeeds = [];
  const edgeSet = new Set();
  const byFamily = new Map();
  const pvSet = new Set(), ndSet = new Set();
  const pvToNd = new Map(), ndToPv = new Map();
  const templates = new Set();
  let drawn = 0, errors = 0;
  for (const family of families) {
    let sinceNew = 0, famDrawn = 0;
    const famPv = new Set(), famNd = new Set();
    for (let i = 0; i < perFamily && sinceNew < patience; i++) {
      let q;
      try { q = engine.generateQuestion({family, difficulty: band, seed: `rc294-keyspace|${band}|${family}|${i}`}); }
      catch { errors++; sinceNew++; continue; }
      famDrawn++; drawn++;
      const m = q.metadata;
      const pv = `${m.template_id ?? q.generator_id}|${m.task_signature}`;
      const nd = m.user_perceptual_signature;
      templates.add(m.template_id ?? q.generator_id);
      famPv.add(pv); famNd.add(nd);
      const key = `${pv}>>${nd}`;
      if (edgeSet.has(key)) { sinceNew++; continue; }
      edgeSet.add(key); edges.push([pv, nd]);
      edgeSeeds.push({pv, nd, family, seed: `rc294-keyspace|${band}|${family}|${i}`});
      sinceNew = 0;
      pvSet.add(pv); ndSet.add(nd);
      if (!pvToNd.has(pv)) pvToNd.set(pv, new Set());
      if (!ndToPv.has(nd)) ndToPv.set(nd, new Set());
      pvToNd.get(pv).add(nd); ndToPv.get(nd).add(pv);
    }
    byFamily.set(family, {drawn: famDrawn, pv: famPv.size, nd: famNd.size, pvKeys: [...famPv], ndKeys: [...famNd]});
  }
  const matching = maximumMatching(edges);
  const splitPv = [...pvToNd.entries()].filter(([, s]) => s.size > 1);
  const mergedNd = [...ndToPv.entries()].filter(([, s]) => s.size > 1);
  return {
    band, drawn, errors, templates: templates.size,
    pvKeys: pvSet.size, ndKeys: ndSet.size, edges: edges.length,
    matching: matching.size,
    floorPer100: Math.max(0, 100 - matching.size),
    floorIfPvOnly: Math.max(0, 100 - pvSet.size),
    floorIfNdOnly: Math.max(0, 100 - ndSet.size),
    oneToOne: splitPv.length === 0 && mergedNd.length === 0,
    pvKeysWithSeveralNd: splitPv.length,
    ndKeysWithSeveralPv: mergedNd.length,
    meanPvPerNd: Number((edges.length / ndSet.size).toFixed(2)),
    meanNdPerPv: Number((edges.length / pvSet.size).toFixed(2)),
    byFamily: [...byFamily].map(([family, v]) => ({family, drawn: v.drawn, pv: v.pv, nd: v.nd})),
    families: byFamily, edgeList: edges, edgeSeeds
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = {};
  for (const band of BANDS.split(',')) {
    const r = enumerateBand(band);
    out[band] = r;
    console.log(`\n=== ${band.toUpperCase()} — reachable key space (${r.drawn} draws to saturation, ${r.templates} templates) ===`);
    console.log(`distinct PV keys (template_id|task_signature) : ${r.pvKeys}`);
    console.log(`distinct ND keys (user_perceptual_signature)  : ${r.ndKeys}`);
    console.log(`distinct (PV,ND) pairs reachable              : ${r.edges}`);
    console.log(`maximum matching  (max unflagged in a window) : ${r.matching}`);
    console.log(`PV+ND floor per rolling 100 = max(0,100-${r.matching}) = ${r.floorPer100}`);
    console.log(`one-to-one PV<->ND: ${r.oneToOne}  (PV keys with >1 ND: ${r.pvKeysWithSeveralNd}, ND keys with >1 PV: ${r.ndKeysWithSeveralPv}, mean PV per ND ${r.meanPvPerNd})`);
    console.log('family              draws   PV   ND');
    for (const f of r.byFamily) console.log(`${f.family.padEnd(18)} ${String(f.drawn).padStart(6)} ${String(f.pv).padStart(4)} ${String(f.nd).padStart(4)}`);
  }
  const {writeFileSync} = await import('node:fs');
  writeFileSync(process.env.RC294_KEYSPACE_OUT ?? 'rc2/RC294_KEYSPACE.json', JSON.stringify(
    Object.fromEntries(Object.entries(out).map(([b, r]) => [b, {...r, families: undefined, edgeList: undefined}])), null, 2) + '\n');
}
