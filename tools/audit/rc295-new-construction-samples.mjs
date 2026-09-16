#!/usr/bin/env node
// RC2.9.5 §7. Three rendered instances of every construction this release adds,
// as a learner meets them: the stem, the options with the key marked, the
// worked steps, and the one-line rationale behind each wrong option.
//
// A capacity number says a cell holds N ideas. It does not say the Arabic is
// sayable or that the idea is worth meeting, and only reading them does.
//
// Usage: node tools/audit/rc295-new-construction-samples.mjs > rc2/RC295_NEW_CONSTRUCTIONS.md

import {readFileSync} from 'node:fs';
import Engine from '../../src/index.js';
import {FAMILY_REGISTRY} from '../../src/registry.js';

const NEW = JSON.parse(readFileSync(new URL('./rc295-new-templates.json', import.meta.url), 'utf8'));
const engine = new Engine();

const familyOf = id => {
  for (const def of FAMILY_REGISTRY) if ((def.templates ?? []).includes(id)) return def.id;
  return null;
};

const out = [];
const say = s => out.push(s);
say('# RC2.9.5 — the new constructions, rendered');
say('');
say(`${NEW.length} constructions, three instances each, drawn from the engine as shipped.`);
say('');
let failures = 0;
for (const id of NEW) {
  const family = familyOf(id);
  say(`## ${id}  ·  ${family}`);
  say('');
  let shown = 0;
  for (let i = 0; shown < 3 && i < 40; i++) {
    let q;
    try { q = engine.generateQuestion({family, difficulty: 'easy', seed: `rc295-sample-${id}-${i}`, templateId: id}); }
    catch { continue; }
    if (q.generator_id !== id) continue;
    shown++;
    say(`**${shown}.** ${q.question}`);
    say('');
    say(Object.entries(q.options).map(([l, v]) => `${l}) ${v}${l === q.correct_option ? '  ✔' : ''}`).join('  ·  '));
    say('');
    say('- الخطوات: ' + q.explanation.steps.join(' '));
    say('- الطريقة السريعة: ' + (q.explanation.fast_method ?? '—'));
    const meta = q.metadata.options_meta ?? {};
    for (const [l, m] of Object.entries(meta)) {
      if (m.correct) continue;
      say(`- ${l}) ${m.value} — ${m.rationale ?? m.derivation ?? m.misconceptionId}`);
    }
    say('');
  }
  if (shown < 3) { failures++; say(`_only ${shown} instance(s) could be drawn_`); say(''); }
}
say(`---`);
say(`Constructions with fewer than three drawable instances: ${failures}.`);
console.log(out.join('\n'));
