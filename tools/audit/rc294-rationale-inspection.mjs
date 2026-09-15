#!/usr/bin/env node
// RC2.9.4-A1. Fifty rendered distractor rationales, sampled across every
// family and band, for manual inspection: the stem, the option chosen, the
// engine's derivation, the misconception id, and the rationale as shown.
// Usage: node tools/audit/rc294-rationale-inspection.mjs > rc2/RC294_RATIONALE_INSPECTION.md
import Engine from '../../src/index.js';
const engine = new Engine();
const L = ['A', 'B', 'C', 'D', 'E', 'F'];
const out = ['# RC2.9.4-A1 — 50 rendered distractor rationales for manual inspection', ''];
let k = 0;
const families = engine.listFamilies().map(f => f.id);
outer: for (let round = 0; round < 10; round++) {
  for (const family of families) {
    const band = ['easy', 'medium', 'hard'][round % 3];
    let q; try { q = engine.generateQuestion({family, difficulty: band, seed: `rc294-inspect|${family}|${round}`}); } catch { continue; }
    const letters = L.filter(l => q.metadata.options_meta[l] && !q.metadata.options_meta[l].correct);
    const l = letters[round % letters.length];
    const m = q.metadata.options_meta[l];
    k++;
    out.push(`## ${k}. ${q.generator_id} (${family}/${q.difficulty})`);
    out.push(`- stem: ${q.question}${q.display_expression ? ` ⟨${q.display_expression}⟩` : ''}`);
    out.push(`- key: ${q.correct_option}) ${q.correct_value}`);
    out.push(`- chosen: ${l}) ${q.options[l]}  · derivation «${m.derivation}»  · ${m.misconceptionId}`);
    out.push(`- rationale: ${q.explanation.distractor_analysis[l]}`);
    out.push('');
    if (k >= 50) break outer;
  }
}
process.stdout.write(out.join('\n') + '\n');
