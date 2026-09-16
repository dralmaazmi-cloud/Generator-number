#!/usr/bin/env node
// RC2.9.5 §7. Key stability with ATTRIBUTION.
//
// A per-seed diff alone says only "2,467 draws changed", which a reviewer
// cannot act on. Every changed draw is attributed to one of four causes, and
// the causes are mutually exclusive and exhaustive:
//
//   NEW_TEMPLATE_DRAWN    the seed now lands on a construction added in this
//                         release. Adding a template to a band pool reassigns
//                         the pool index for every seed after it, so this is
//                         the expected and intended consequence of §4.
//   POOL_SHIFT            the seed lands on a DIFFERENT pre-existing template.
//                         Also pool reindexing: no template changed, the draw
//                         moved.
//   SAME_TEMPLATE_CHANGED the seed lands on the SAME template and the rendered
//                         surface changed. These are the only rows that mean a
//                         question a learner could have seen was edited, and
//                         each one must trace to a §3.1 defect fix.
//   AVAILABILITY          one side exhausted and the other did not.
//
// Usage: node tools/audit/rc295-key-stability.mjs <a.json> <b.json> [out.json]

import {readFileSync, writeFileSync} from 'node:fs';

const [A, B, OUT] = process.argv.slice(2);
const a = JSON.parse(readFileSync(A, 'utf8'));
const b = JSON.parse(readFileSync(B, 'utf8'));

// The constructions this release adds. Declared, not inferred: a template that
// exists on both sides must not be counted as new.
const NEW_TEMPLATES = new Set(JSON.parse(readFileSync(new URL('./rc295-new-templates.json', import.meta.url), 'utf8')));

const byA = new Map(a.rows.map(r => [r.seed, r]));
const buckets = {NEW_TEMPLATE_DRAWN: [], POOL_SHIFT: [], SAME_TEMPLATE_CHANGED: [], AVAILABILITY: []};
let identical = 0;
for (const r of b.rows) {
  const o = byA.get(r.seed);
  if (!o) { buckets.AVAILABILITY.push({seed: r.seed, a: null, b: r.template}); continue; }
  if (o.hash === r.hash && o.exhausted === r.exhausted) { identical++; continue; }
  if (o.exhausted !== r.exhausted) buckets.AVAILABILITY.push({seed: r.seed, a: o.exhausted ?? o.template, b: r.exhausted ?? r.template});
  else if (r.template !== o.template) {
    (NEW_TEMPLATES.has(r.template) ? buckets.NEW_TEMPLATE_DRAWN : buckets.POOL_SHIFT)
      .push({seed: r.seed, a: o.template, b: r.template});
  } else buckets.SAME_TEMPLATE_CHANGED.push({seed: r.seed, template: r.template});
}

const byTemplate = rows => {
  const m = {};
  for (const x of rows) m[x.template ?? x.b] = (m[x.template ?? x.b] ?? 0) + 1;
  return Object.fromEntries(Object.entries(m).sort((p, q) => q[1] - p[1]));
};

const report = {
  schema: 'rc295-key-stability-v1',
  a: {root: a.root, drawn: a.rows.length, digest: a.digest},
  b: {root: b.root, drawn: b.rows.length, digest: b.digest},
  identical,
  changed: b.rows.length - identical,
  attribution: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length])),
  sameTemplateChangedByTemplate: byTemplate(buckets.SAME_TEMPLATE_CHANGED),
  newTemplateDrawnByTemplate: byTemplate(buckets.NEW_TEMPLATE_DRAWN),
  samples: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.slice(0, 5)]))
};
if (OUT) writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n');
console.log(`identical ${identical} / ${b.rows.length}`);
for (const [k, v] of Object.entries(report.attribution)) console.log(`${k.padEnd(22)} ${v}`);
console.log('\nSAME_TEMPLATE_CHANGED by template:');
for (const [t, n] of Object.entries(report.sameTemplateChangedByTemplate)) console.log(`  ${t.padEnd(26)} ${n}`);
