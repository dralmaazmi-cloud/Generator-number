#!/usr/bin/env node
// RC2.7-7. The BEFORE measurement, taken INSIDE the frozen RC2.6 package.
//
// §7 asks for a before/after comparison "using identical definitions". The only
// way to have that is to run the RC2.7 measurement code against the RC2.6
// engine, which is what this does: the same signature functions, the same
// repetition definitions, the same session shape.
//
// RC2.6 published five of the nine dimensions. The other four are DERIVED here
// from what it did publish, exactly as RC2.7 derives them, so neither side gets
// a dimension the other lacks:
//
//   skill_signature            family/subskill
//   target_signature           asked_unknown
//   entity_pattern             read off the rendered stem
//   parameterization_signature template id + the shape of its parameters
//   stem_structure             'fixed' — RC2.6 had one sentence shape per
//                              template, which is the finding, not an omission
//
// HOW TO RUN IT. Unpack RC2_6_SOURCE_540f16e.zip, copy src/compose/entities.js,
// src/compose/novelty.js, src/qa/construction.js and tools/audit/rc27-validation.mjs
// from the RC2.7 package into it, then run this file there. It imports the
// RC2.6 engine and the RC2.7 measurement code, which is exactly the arrangement
// "identical definitions" requires. Run inside the RC2.7 package it measures
// RC2.7, which is what tools/audit/rc27-family-surface.mjs is for.
//
// `stem_skeleton` is RECOMPUTED rather than read, because the RC2.6 version
// masked names by substring: الخسارة became الخ@ (سارة is a name), which
// inflated the distinct-skeleton count for every family whose stems mention a
// loss. Using the published field would credit RC2.6 with variety it never had.

import {writeFileSync} from 'node:fs';

import Engine from '../../src/index.js';
import {FAMILY_REGISTRY} from '../../src/registry.js';
import {stemSkeleton, skillSignature, entityPattern, parameterizationSignature} from '../../src/qa/construction.js';
import {NAME_POOL, entityKindsIn} from '../../src/compose/entities.js';
import {repetition, gates} from './rc27-validation.mjs';

function decorate(q) {
  const m = q.metadata ?? {};
  m.stem_skeleton = stemSkeleton(q.question, NAME_POOL);
  m.skill_signature = skillSignature({family: q.family, subskill: q.subskill});
  m.target_signature = m.asked_unknown ?? 'default';
  m.entity_pattern = entityPattern(entityKindsIn(q.question));
  m.parameterization_signature = parameterizationSignature(m.template_id, m.parameters ?? {});
  m.stem_structure = 'fixed';
  return q;
}

const PLAN = [
  {count: 50, difficulty: 'mixed', family: 'random'},
  {count: 50, difficulty: 'mixed', family: 'random'},
  {count: 50, difficulty: 'mixed', family: 'random'},
  {count: 50, difficulty: 'mixed', family: 'random'},
  {count: 50, difficulty: 'hard', family: 'random'}
];

function batch(seed) {
  const e = new Engine();
  e.resetTelemetry();
  const b = e.generateMockBatch({seed, sessions: PLAN});
  const sessions = b.sessions.map((s, i) => {
    const rows = s.questions.map(decorate);
    return {
      session: `SESSION-${i + 1}`, kind: i === 4 ? 'ALL_HARD' : 'MIXED',
      delivered: rows.length, repetition: repetition(rows), gates: gates(rows),
      capWarnings: (s.validation.diversity_warnings ?? []).length
    };
  });
  const all = b.sessions.flatMap(s => s.questions);
  const t = e.getTelemetry();
  return {seed, questions: all.length, repetition: repetition(all), gates: gates(all),
    telemetryBalanced: Boolean(t.reconciliation?.balanced && t.sessionReconciliation?.balanced), sessions};
}

/** Per-family surface, on the same sampling the AFTER inventory uses. */
function inventory(perBand = 200) {
  const e = new Engine();
  const families = [];
  for (const f of FAMILY_REGISTRY) {
    const rows = [];
    for (const band of ['easy', 'medium', 'hard']) {
      if (!f.difficulties.includes(band)) continue;
      for (let i = 0; i < perBand; i++) {
        try { rows.push(decorate(e.generateQuestion({family: f.id, difficulty: band, seed: `INV-${f.id}-${band}-${i}`}))); }
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

// Guarded, so importing this file never measures anything or writes a file. An
// unguarded top-level run here once overwrote a BEFORE measurement with an
// AFTER one, which is the quietest way possible to lose a comparison.
if (import.meta.url === `file://${process.argv[1]}`) main();

function main() {
const seeds = ['RC27-V1', 'RC27-V2', 'RC27-V3', 'RC27-V4', 'RC27-V5'];
const out = {
  schema: 'rc27-before-v1',
  measuredAgainst: 'RC2.6 frozen source, commit 540f16e',
  generatedAt: new Date().toISOString(),
  batches: seeds.map(batch),
  families: inventory(Number(process.env.PER_BAND ?? 200))
};
writeFileSync(process.argv[2] ?? 'RC27_BEFORE.json', JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({
  batches: out.batches.map(b => ({
    seed: b.seed, constructions: b.repetition.constructions, skeletons: b.repetition.stemSkeletons,
    entities: b.repetition.entities, longestSimilarRun: b.repetition.longestSimilarRun,
    exact: b.gates ? b.repetition.exactDuplicates : null, semantic: b.repetition.semanticDuplicates
  }))
}, null, 2));
}
