#!/usr/bin/env node
// RC2.9.1. Rebuild generator_manifest.json from the engine it describes.
//
// The manifest was written by hand and then left behind: it claimed 107
// templates while the engine held 155, and its per-family lists had not moved
// since RC2.4. A manifest that disagrees with the runtime is worse than no
// manifest, because it is the file an integrator reads to find out what the
// generator can do.
//
// So it is derived rather than maintained: the families come from the registry,
// the bands from the structural adjudication, and the subskills from the
// engine's own output. Running this after a template is added is the only way
// the file stays true, and tests/rc2-version-consistency.test.mjs fails if it
// drifts again.

import {writeFileSync, readFileSync} from 'node:fs';
import Engine, {ENGINE_VERSION} from '../../src/index.js';
import {FAMILY_REGISTRY} from '../../src/registry.js';
import {ADJUDICATED_TEMPLATE_IDS, TEMPLATE_STRUCTURE} from '../../src/qa/structure.js';

/** One subskill line per template, read off what the engine actually renders. */
function subskills() {
  const engine = new Engine();
  const out = new Map();
  for (const fam of engine.listFamilies().map(f => f.id)) {
    for (let i = 0; i < 200 && out.size < ADJUDICATED_TEMPLATE_IDS.length; i++) {
      for (const d of ['easy', 'medium', 'hard']) {
        try {
          const q = engine.generateQuestion({family: fam, difficulty: d, seed: `manifest|${fam}|${i}|${d}`});
          if (!out.has(q.generator_id)) out.set(q.generator_id, q.subskill ?? '');
        } catch { /* band gap */ }
      }
    }
  }
  return out;
}

export function buildManifest() {
  const subskill = subskills();
  const families = {};
  for (const f of FAMILY_REGISTRY) {
    const bands = {easy: [], medium: [], hard: []};
    for (const id of [...f.templates].sort()) {
      const band = TEMPLATE_STRUCTURE[id]?.band;
      if (!band) continue;
      bands[band].push({id, subskill: subskill.get(id) ?? ''});
    }
    families[f.id] = {family_ar: f.ar, templates: bands};
  }
  const count = Object.values(families)
    .reduce((n, f) => n + Object.values(f.templates).reduce((m, b) => m + b.length, 0), 0);
  return {
    engine_version: ENGINE_VERSION,
    template_count: count,
    generated_by: 'tools/audit/rc291-manifest.mjs — derived from the engine, never edited by hand',
    families
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const manifest = buildManifest();
  const before = JSON.parse(readFileSync('generator_manifest.json', 'utf8'));
  writeFileSync('generator_manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  console.log(`template_count ${before.template_count} → ${manifest.template_count}`
    + ` · engine_version ${before.engine_version} → ${manifest.engine_version}`);
}
