#!/usr/bin/env node
// RC2.9.5 §2.3. Capture journeys as they stood BEFORE this release, from the
// previous release's engine root, so the migration measurement continues real
// pre-change history rather than a reconstruction of it.
//
// Usage: node tools/audit/rc295-capture-before.mjs <engineRoot> <out.json> [journeys] [sittings] [count]

import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const [ROOT, OUT, J = '8', S = '2', C = '30'] = process.argv.slice(2);
const {default: Engine} = await import(pathToFileURL(resolve(ROOT, 'src/index.js')).href);
const engine = new Engine();
const out = [];
for (let j = 1; j <= Number(J); j++) {
  let history;
  const questions = [];
  for (let s = 1; s <= Number(S); s++) {
    const set = engine.generatePractice({seed: `rc295-migration-j${j}-s${s}`, count: Number(C), diversityHistory: history});
    history = set.diversity_history;
    for (const q of set.questions) questions.push({
      difficulty: q.difficulty, family: q.family,
      pv: `${q.metadata.template_id}|${q.metadata.task_signature}`,
      nd: q.metadata.user_perceptual_signature,
      stem: q.metadata.normalized_stem_identity
    });
  }
  out.push({journey: j, questions, history});
}
writeFileSync(OUT, JSON.stringify(out) + '\n');
console.log(`${out.length} journeys captured from ${resolve(ROOT)} (${out[0].questions.length} questions each)`);
