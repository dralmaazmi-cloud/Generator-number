#!/usr/bin/env node
// RC2.7-7. The per-family surface, AFTER.
//
// The mirror of tools/audit/rc27-before.mjs, which runs the same measurement
// inside the frozen RC2.6 package. Same sampling, same definitions, same
// functions — the only difference is the engine underneath, which is the point
// of the comparison.

import {writeFileSync, mkdirSync} from 'node:fs';

import Engine from '../../src/index.js';
import {FAMILY_REGISTRY} from '../../src/registry.js';
import {repetition} from './rc27-validation.mjs';

export function surface(perBand = 200) {
  const e = new Engine();
  const families = [];
  for (const f of FAMILY_REGISTRY) {
    const rows = [];
    for (const band of ['easy', 'medium', 'hard']) {
      if (!f.difficulties.includes(band)) continue;
      for (let i = 0; i < perBand; i++) {
        try { rows.push(e.generateQuestion({family: f.id, difficulty: band, seed: `INV-${f.id}-${band}-${i}`})); }
        catch { /* refused */ }
      }
    }
    const r = repetition(rows);
    families.push({
      family: f.id, sampled: rows.length, templates: f.templates.length,
      concepts: new Set(rows.map(q => q.subskill)).size,
      reasoningStructures: r.repeatedReasoningTarget.distinct,
      constructions: r.constructions.distinct,
      scenarios: r.scenarios.distinct,
      stemSkeletons: r.stemSkeletons.distinct,
      stemSkeletonsPerTemplate: Number((r.stemSkeletons.distinct / f.templates.length).toFixed(2)),
      requestedTargets: new Set(rows.map(q => q.metadata.target_signature)).size,
      entityWords: r.entities.distinct,
      largestConstructionShare: rows.length ? Number((r.constructions.largestGroup / rows.length).toFixed(4)) : 0
    });
  }
  return families;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const families = surface(Number(process.env.PER_BAND ?? 200));
  mkdirSync('rc2', {recursive: true});
  writeFileSync(process.argv[2] ?? 'rc2/RC27_FAMILY_SURFACE.json',
    JSON.stringify({schema: 'rc27-family-surface-v1', generatedAt: new Date().toISOString(), families}, null, 2) + '\n');
  console.log(JSON.stringify(families, null, 1).slice(0, 400));
}
