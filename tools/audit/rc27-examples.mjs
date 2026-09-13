#!/usr/bin/env node
// RC2.7-7. The human-review evidence.
//
// §7 of the brief is explicit that internal metrics are not the finding: for
// each family, its three largest repeated construction groups, with the
// questions RENDERED, and the signatures beside them so a reader can check that
// two items counted as one construction really are one, and two counted as
// different really are different.
//
// Written as Markdown so it can be read rather than parsed.

import {writeFileSync} from 'node:fs';

import Engine from '../../src/index.js';
import {FAMILY_REGISTRY} from '../../src/registry.js';

const PER_BAND = Number(process.env.PER_BAND ?? 120);
const EXAMPLES_PER_GROUP = Number(process.env.EXAMPLES ?? 3);
// The seed prefix is settable so the sample can be redrawn. A rendered example
// is drawn from the same space a sealed holdout was drawn from, so an item here
// can coincide with one there — and this file prints the answer. Delivery scans
// for that and redraws; see SOURCE_PROVENANCE.json.
const TAG = process.env.TAG ?? 'RC27-EX';

const meta = (q, k) => q.metadata?.[k] ?? null;

function sample(engine, family) {
  const f = FAMILY_REGISTRY.find(x => x.id === family);
  const rows = [];
  for (const band of f.difficulties) {
    for (let i = 0; i < PER_BAND; i++) {
      try { rows.push(engine.generateQuestion({family, difficulty: band, seed: `${TAG}-${family}-${band}-${i}`})); }
      catch { /* a refused draw is not evidence */ }
    }
  }
  return rows;
}

function groups(rows) {
  const m = new Map();
  for (const q of rows) {
    const k = meta(q, 'construction_signature');
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(q);
  }
  return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
}

const lines = [];
const engine = new Engine();
lines.push('# RC2.7 — verbatim human-review examples', '');
lines.push('For every family, the three construction groups that recur most, with up to');
lines.push(`${EXAMPLES_PER_GROUP} questions from each rendered exactly as a candidate would see them. If a group`);
lines.push('reads as one question asked repeatedly, that is visible here and nowhere in a');
lines.push('summary statistic.', '');

for (const f of FAMILY_REGISTRY) {
  const rows = sample(engine, f.id);
  const g = groups(rows);
  lines.push(`## ${f.id} — ${f.ar}`, '');
  lines.push(`Sampled ${rows.length} questions across ${f.difficulties.join(', ')}; `
    + `${g.length} distinct constructions, largest group ${g[0]?.[1].length ?? 0}.`, '');
  for (const [signature, items] of g.slice(0, 3)) {
    const first = items[0];
    lines.push(`### ${signature}`, '');
    lines.push(`- occurrences in the sample: **${items.length}** of ${rows.length}`);
    lines.push(`- reasoning signature: \`${meta(first, 'structural_reasoning_signature')}\``);
    lines.push(`- requested target: \`${meta(first, 'target_signature')}\``);
    lines.push(`- scenario: \`${meta(first, 'scenario_signature')}\``);
    lines.push(`- stem skeleton: \`${String(meta(first, 'stem_skeleton')).slice(0, 160)}\``);
    lines.push('');
    for (const q of items.slice(0, EXAMPLES_PER_GROUP)) {
      lines.push(`> ${q.question}`);
      if (q.display_expression) lines.push(`> `, `> \`${q.display_expression}\``);
      lines.push('>', `> — ${q.generator_id} · ${q.difficulty} · ${meta(q, 'stem_structure')}/${meta(q, 'information_order')}`
        + ` · answer ${q.correct_option}) ${q.options[q.correct_option]}`);
      lines.push('');
    }
  }
}

const out = process.argv[2] ?? 'rc2/RC27_EXAMPLES.md';
writeFileSync(out, lines.join('\n') + '\n');
console.log(`wrote ${out}: ${lines.length} lines`);
