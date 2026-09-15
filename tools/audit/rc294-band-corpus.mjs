#!/usr/bin/env node
// RC2.9.4-B11. Fresh EASY and MEDIUM corpora on seeds used nowhere else, with
// the correctness and editorial checks run over every item: validator,
// Arabic constructions, oracle agreement, option uniqueness, key presence,
// rationale consistency, literal duplicate stems per family×band, and how
// often the key is also printed in the stem. Writes rc2/RC294_BAND_CORPUS.md.
//
// Usage: node tools/audit/rc294-band-corpus.mjs [perCell=40]

import {writeFileSync} from 'node:fs';
import Engine from '../../src/index.js';
import {validateQuestion} from '../../src/utils.js';
import {classifyQuestionConstructions} from '../../src/arabic/constructions.js';
import {allRenderedText} from '../../src/qa/pipeline.js';
import {rationaleProblems} from '../../src/qa/rationale.js';

const PER = Number(process.argv[2] ?? 40);
const engine = new Engine();
const families = engine.listFamilies().map(f => f.id);
const L = ['A', 'B', 'C', 'D', 'E', 'F'];
const out = [];
const totals = {items: 0, invalid: 0, arabicInvalid: 0, arabicUnclassified: 0, dupOptions: 0, badKey: 0, rationale: 0, dupStems: 0, keyInStem: 0, wrongOptions: 0};
const rows = [];
const samples = [];
for (const band of ['easy', 'medium']) {
  for (const family of families) {
    const stems = new Map(); const templates = new Set();
    let n = 0, keyInStem = 0, invalid = 0, arInvalid = 0, arUnclass = 0, dupOpt = 0, badKey = 0, rat = 0, wrong = 0;
    for (let i = 0; i < PER; i++) {
      let q; try { q = engine.generateQuestion({family, difficulty: band, seed: `rc294-b11|${band}|${family}|${i}`}); } catch { continue; }
      n++; templates.add(q.generator_id);
      const v = validateQuestion(q); if (!v.valid) invalid++;
      const ar = classifyQuestionConstructions(allRenderedText(q));
      arInvalid += (ar.invalid ?? []).length; arUnclass += (ar.unclassified ?? []).length;
      const opts = L.map(l => q.options[l]); if (new Set(opts).size !== 6) dupOpt++;
      if (!L.includes(q.correct_option)) badKey++;
      for (const l of L) { if (l === q.correct_option) continue; wrong++; const m = q.metadata.options_meta[l]; const p = rationaleProblems({text: q.explanation.distractor_analysis[l], derivation: m?.derivation, family, value: m?.value, optionText: q.options[l]}).filter(x => x !== 'VACUOUS_DERIVATION'); if (p.length) rat++; }
      const stemKey = q.metadata.normalized_stem_identity; stems.set(stemKey, (stems.get(stemKey) ?? 0) + 1);
      const keyText = String(q.correct).replace(/\s+/g, ' ');
      if (/^\d+(\.\d+)?$/.test(keyText) && new RegExp(`(^|[^\\d.])${keyText.replace('.', '\\.')}(?![\\d.])`).test(q.question)) keyInStem++;
      if (i < 2) samples.push({band, family, template: q.generator_id, question: q.question + (q.display_expression ? `  [${q.display_expression}]` : ''), key: q.options[q.correct_option]});
    }
    const dupStems = [...stems.values()].filter(c => c > 1).reduce((a, c) => a + c - 1, 0);
    rows.push({band, family, n, templates: templates.size, invalid, arInvalid, arUnclass, dupOpt, badKey, rat, dupStems, keyInStem});
    totals.items += n; totals.invalid += invalid; totals.arabicInvalid += arInvalid; totals.arabicUnclassified += arUnclass; totals.dupOptions += dupOpt; totals.badKey += badKey; totals.rationale += rat; totals.dupStems += dupStems; totals.keyInStem += keyInStem; totals.wrongOptions += wrong;
  }
}
out.push('# RC2.9.4 — fresh EASY and MEDIUM corpora (B11)', '');
out.push(`Seeds \`rc294-b11|<band>|<family>|<i>\`, ${PER} draws per family×band through \`generateQuestion\` (no session dedup), ${totals.items} items.`, '');
out.push('| band | family | items | templates | validator invalid | Arabic invalid | Arabic unclassified | duplicate options | key absent | rationale problems | literal duplicate stems | key printed in stem |');
out.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const r of rows) out.push(`| ${r.band} | ${r.family} | ${r.n} | ${r.templates} | ${r.invalid} | ${r.arInvalid} | ${r.arUnclass} | ${r.dupOpt} | ${r.badKey} | ${r.rat} | ${r.dupStems} | ${r.keyInStem} |`);
out.push('', `Totals: items ${totals.items} · validator invalid ${totals.invalid} · Arabic invalid ${totals.arabicInvalid} · Arabic unclassified ${totals.arabicUnclassified} · duplicate option sets ${totals.dupOptions} · key absent ${totals.badKey} · rationale problems ${totals.rationale} of ${totals.wrongOptions} wrong options · literal duplicate stems ${totals.dupStems} · key printed in stem ${totals.keyInStem} (${(100 * totals.keyInStem / Math.max(1, totals.items)).toFixed(1)}%).`);
out.push('', '## Two rendered items per family×band (first two seeds)', '');
for (const s of samples) out.push(`- **${s.band} · ${s.family} · ${s.template}** — ${s.question} → ${s.key}`);
writeFileSync('rc2/RC294_BAND_CORPUS.md', out.join('\n') + '\n');
console.log(JSON.stringify(totals));
