#!/usr/bin/env node
// RC2.9.4-A5. The Phase-A zero-diff manifest.
//
// Phase A may change what a learner is TOLD about a wrong option and how a
// sitting is READ; it may not change a single question. This tool walks the
// same 10,000 draws the development corpus makes (the RC2.9.3 seeds, the same
// band rotation, the same seed strings) through an engine root and records,
// per draw, a hash of everything the freeze list names: stem, displayed
// expression, options, key, template, band, parameters, and the perceptual,
// construction, sub-idea and task signatures. Two manifests from two roots
// are then compared draw by draw.
//
// Usage:
//   node tools/audit/rc294-zero-diff.mjs manifest <engineRoot> <out.json> [questions]
//   node tools/audit/rc294-zero-diff.mjs compare <a.json> <b.json>

import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const BANDS = ['easy', 'medium', 'hard'];

export async function manifest(root, questions = 10000) {
  const {default: Engine} = await import(pathToFileURL(resolve(root, 'src/index.js')).href);
  const {RC293_DEVELOPMENT_SEEDS} = await import(pathToFileURL(resolve(root, 'tools/audit/rc2-development-corpus.mjs')).href);
  const engine = new Engine();
  const seeds = RC293_DEVELOPMENT_SEEDS;
  const perSeed = Math.ceil(questions / seeds.length);
  const rows = [];
  let drawn = 0;
  for (const seed of seeds) {
    for (let i = 0; i < perSeed && drawn < questions; i++) {
      const band = BANDS[i % 3];
      const qSeed = `${seed}-${band}-${i}`;
      drawn++;
      let q;
      try { q = engine.generateQuestion({family: 'random', difficulty: band, seed: qSeed}); }
      catch (e) { rows.push({seed: qSeed, exhausted: e.code ?? String(e.message).slice(0, 40)}); continue; }
      const m = q.metadata;
      const surface = {
        template: q.generator_id, family: q.family, difficulty: q.difficulty,
        question: q.question, display: q.display_expression ?? null,
        options: q.options, correct_option: q.correct_option, correct_value: q.correct_value,
        parameters: m.parameters,
        signatures: [m.user_perceptual_signature, m.user_construction_signature, m.sub_idea_signature,
          m.task_signature, m.normalized_stem_identity, m.reasoning_target_pair, m.skill_signature],
        steps: q.explanation.steps, how_to_start: q.explanation.how_to_start,
        fast_method: q.explanation.fast_method, remember: q.explanation.remember,
        options_meta_values: Object.fromEntries(Object.entries(m.options_meta).map(([l, o]) => [l, [o.value, o.misconceptionId, o.derivation]]))
      };
      rows.push({seed: qSeed, template: q.generator_id, hash: createHash('sha256').update(JSON.stringify(surface)).digest('hex')});
    }
  }
  const digest = createHash('sha256').update(JSON.stringify(rows)).digest('hex');
  return {schema: 'rc294-zero-diff-manifest-v1', root: resolve(root), questions, drawn: rows.length,
    exhausted: rows.filter(r => r.exhausted).length, digest, rows};
}

export function compare(a, b) {
  const byA = new Map(a.rows.map(r => [r.seed, r]));
  const differ = [];
  for (const r of b.rows) {
    const o = byA.get(r.seed);
    if (!o) { differ.push({seed: r.seed, why: 'missing in A'}); continue; }
    if (o.hash !== r.hash || o.exhausted !== r.exhausted) differ.push({seed: r.seed, why: 'surface differs', a: o.template ?? o.exhausted, b: r.template ?? r.exhausted});
  }
  return {same: differ.length === 0 && a.rows.length === b.rows.length, drawsA: a.rows.length, drawsB: b.rows.length, differ: differ.slice(0, 20), differCount: differ.length};
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [mode, x, y, n] = process.argv.slice(2);
  if (mode === 'manifest') {
    const m = await manifest(x, Number(n ?? 10000));
    writeFileSync(y, JSON.stringify(m) + '\n');
    console.log(JSON.stringify({root: m.root, drawn: m.drawn, exhausted: m.exhausted, digest: m.digest}));
  } else if (mode === 'compare') {
    console.log(JSON.stringify(compare(JSON.parse(readFileSync(x, 'utf8')), JSON.parse(readFileSync(y, 'utf8'))), null, 1));
  } else throw new Error('usage: manifest <root> <out> [n] | compare <a> <b>');
}
