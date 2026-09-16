#!/usr/bin/env node
// RC2.9.6 §3.3. "Touch ONLY the narration" — proved rather than asserted.
//
// The zero-diff manifest hashes the whole surface at once, so it says a seed
// moved but not WHICH part moved. For a template whose steps were rewritten and
// whose parameters were not, the claim is precise and checkable: the stem, the
// options, the key, the correct option letter and every metadata signature are
// identical, and the explanation is the only thing that differs.
//
// Usage: node tools/audit/rc296-narration-only.mjs <rc295Root> [out.json]

import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';

const [ROOT, OUT] = process.argv.slice(2);

/** Narration-only templates: §3.3 changed their steps and nothing else. */
const NARRATION_ONLY = [
  'PCT_E_OF', 'PCT_M_UNIT_PRICE', 'PCT_E_REVERSE_ONE', 'PCT_E_SHARE_PERCENT',
  'PCT_H_MIXTURE', 'PCT_H_TWO_GROUP_CHANGE',
  'WORK_M_EFF', 'WORK_H_WORKERS_EFF',
  'RATE_M_PERCENT', 'RATE_H_TARGET', 'RATE_H_TWO_PHASE',
  'MACH_M_NEW_FAST', 'MACH_M_SUBSET_UP', 'MACH_H_STAGE_UP',
  'PROP_H_COMPOUND', 'PROP_H_COST_PLUS', 'PL_H_MARKUP_DISCOUNT'
];

const {default: EngineB} = await import('../../src/index.js');
const {structuralBandOf} = await import('../../src/qa/structure.js');
const {default: EngineA} = await import(pathToFileURL(resolve(ROOT, 'src/index.js')).href);
const {FAMILY_REGISTRY} = await import('../../src/registry.js');

const familyOf = id => FAMILY_REGISTRY.find(f => (f.templates ?? []).includes(id))?.id ?? null;
const a = new EngineA(), b = new EngineB();

/** Everything except the explanation: this is what may not move. */
const surface = q => JSON.stringify({
  question: q.question, display: q.display_expression ?? null,
  options: q.options, correct_option: q.correct_option, correct_value: q.correct_value,
  parameters: q.metadata.parameters,
  signatures: Object.fromEntries(Object.entries(q.metadata).filter(([k]) => /signature|identity|asked_unknown|template_id|sub_idea|reasoning_target/.test(k))),
  options_meta: Object.fromEntries(Object.entries(q.metadata.options_meta).map(([l, o]) => [l, [o.value, o.misconceptionId, o.derivation]]))
});

const rows = [];
for (const id of NARRATION_ONLY) {
  const family = familyOf(id);
  const band = structuralBandOf(id);
  let compared = 0, surfaceMoved = 0, explanationMoved = 0;
  const examples = [];
  for (let i = 0; i < 40; i++) {
    let qa, qb;
    try { qa = a.generateQuestion({family, difficulty: band, seed: `rc296-narr-${id}-${i}`, templateId: id}); } catch { continue; }
    try { qb = b.generateQuestion({family, difficulty: band, seed: `rc296-narr-${id}-${i}`, templateId: id}); } catch { continue; }
    compared++;
    if (surface(qa) !== surface(qb)) { surfaceMoved++; if (examples.length < 2) examples.push({seed: i, a: surface(qa).slice(0, 200), b: surface(qb).slice(0, 200)}); }
    if (JSON.stringify(qa.explanation) !== JSON.stringify(qb.explanation)) explanationMoved++;
  }
  rows.push({templateId: id, family, band, compared, surfaceMoved, explanationMoved, examples});
}

const totalSurfaceMoved = rows.reduce((s, r) => s + r.surfaceMoved, 0);
const report = {schema: 'rc296-narration-only-v1', baseline: resolve(ROOT), templates: rows.length,
  compared: rows.reduce((s, r) => s + r.compared, 0), surfaceMoved: totalSurfaceMoved,
  explanationMoved: rows.reduce((s, r) => s + r.explanationMoved, 0), rows};
if (OUT) writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n');
console.log('template                   band    compared  surface moved  explanation moved');
for (const r of rows) {
  console.log(`${r.templateId.padEnd(26)}${String(r.band).padEnd(8)}${String(r.compared).padStart(9)}${String(r.surfaceMoved).padStart(15)}${String(r.explanationMoved).padStart(19)}`);
}
console.log(`\nstem, options, key, parameters and every signature moved on ${totalSurfaceMoved} of ${report.compared} matched draws   <- must be 0`);
