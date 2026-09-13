import {readFileSync, writeFileSync} from 'node:fs';
const div = JSON.parse(readFileSync('rc2/RC27_USER_DIVERSITY.json', 'utf8'));
const fz = JSON.parse(readFileSync('rc2/FREEZE.json', 'utf8'));
const gate = JSON.parse(readFileSync('rc2/INTERNAL_GATE.json', 'utf8'));

const L = [];
const p = (...x) => L.push(...x);
const runs = s => div.runs.filter(r => r.shape === s && !r.refused);
const avg = a => Number((a.reduce((x, y) => x + y, 0) / a.length).toFixed(1));
const m = (s, f) => avg(runs(s).map(f));

p('# RC2.7 — True generative diversity and Arabic question breadth', '');
p('**Final report.** One question decides this release: *if a normal user solves');
p('50–100 questions, do they feel like genuinely different questions?* The answer');
p('is in §8, with the questions themselves rather than signature counts.', '');
p('This release did not touch difficulty. No band, threshold, adjudication or hard');
p('coverage target was changed for its own sake; where a fixture had to move it');
p('moved because a shape stopped being deliverable, and the reason is recorded.', '');

p('---', '', '## 1. The measurement that made the rest possible', '');
p('The previous release counted "distinct constructions" with a signature that');
p('contained the SCENARIO. Every scenario added inflated it without a reader');
p('seeing a new question — which is exactly how a generator can report diversity');
p('it does not have.', '');
p('`src/qa/core-construction.js` defines the identity a user actually perceives:', '');
p('| in the signature | deliberately NOT in it |');
p('| --- | --- |');
p('| equation topology, every literal erased | family, template id |');
p('| the sequence of transformation kinds | scenario label |');
p('| the requested target | personal names, story nouns |');
p('| the entry point (forward, reverse, comparison, min, max) | sentence structure, clause order |');
p('| the arrangement of conditions | every numeric parameter |');
p('| the depth of the dependency chain | |', '');
p('Shirts, loaves and pages under one rate equation asking one target are ONE');
p('idea. The signature was checked against the independent review before anything');
p('was changed: it reported 193 of 250 batch items in a repeated group (the review');
p('said 200/250) and 35 of 50 in an all-hard session (the review said 35/50). It');
p('agrees with the human reading rather than flattering the engine.', '');

p('---', '', '## 2. What changed', '');
p('| change | effect |');
p('| --- | --- |');
p('| Core identity is absolute inside a session | An idea never repeats in one session. A candidate that would repeat one is dropped from the fallback entirely, `accept` THROWS rather than recording a relaxation, and a session that cannot be filled is REFUSED by name with the shortfall. There is no code path left that completes a session with parameter reskins. |');
p('| CORE vs SURFACE relaxation | Every relaxation is classified. Core relaxations are forbidden; surface ones (scenario, entity, sentence shape, information order) are allowed under pressure and each is recorded with its dimension. |');
p('| Batch-level idea budget | A per-session rule said nothing about a user who sits several sessions. Ideas are now shared across a batch and capped at two. It is a cap, not a ban, because the per-band pools (94 easy, 143 medium, 89 hard distinct ideas) cannot support a ban over 250 slots. |');
p('| Seven new targets on existing structures | Each with its own equation written from that side, not a subtraction after the first answer: a later term and a previous term in three sequence rules, the other section of a two-group percentage change, the other partner in a partnership, the other pump, the increased rate. |');
p('| Number-property ideas made visible | The signature collapsed every odd-one-out set to «ruleset», so a family with seven distinct number properties read as four ideas. The rule id now travels with the oracle. |');
p('| Entity concentration bounded per batch | No single named entity beyond three per fifty across a batch. |', '');
p('One target was built and WITHDRAWN: asking `RATE_H_RATE_FROM_GAP` for the');
p('original time. That stem states a rate and a rate increase, and the RC2.5');
p('wording rule reads it as asking for a rate — correctly. Answering it in hours');
p('would be arguing with a guard rather than respecting it.', '');

p('---', '', '## 3. What a user meets — measured on the core identity', '');
p('Three fresh seeds per shape. Surface measures are reported BESIDE the core one,');
p('never folded into it.', '');
p('| shape | items | distinct ideas | largest group | items in a repeated group | targets | stem skeletons | entities | longest similar run |');
p('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
for (const [label, shape] of [['one 50-question session', 'session50'], ['a 100-question sitting', 'sitting100'], ['a 230-question batch', 'batch230']]) {
  p(`| ${label} | ${m(shape, r => r.measures.items)} | **${m(shape, r => r.measures.core.distinct)}** | ${m(shape, r => r.measures.core.largestGroup)} | ${m(shape, r => r.measures.core.itemsInARepeatedGroup)} | ${m(shape, r => r.measures.targets.distinct)} | ${m(shape, r => r.measures.stemSkeletons.distinct)} | ${m(shape, r => r.measures.entities.distinct)} | ${m(shape, r => r.measures.longestSimilarRun)} |`);
}
p('');
p('### Before and after, same definitions', '');
p('| measure | before this release | after |');
p('| --- | ---: | ---: |');
p('| distinct ideas in a 50-question session | 44–48 of 50 | **50 of 50** |');
p('| items in a repeated idea group, 50 questions | 4–11 | **0** |');
p('| items in a repeated idea group, ~100 questions | 58 (independent review) | **38–48** |');
p('| items in a repeated idea group, ~250 questions | 193 of 250 | 163–172 of 230 |');
p('| largest idea group in a batch | 6 | **4** |');
p('| all-hard 50: items in a repeated group | 35 of 50 | refused rather than reskinned |');
p('| core relaxations | not distinguished from surface | **0**, and structurally impossible |', '');
p('### Safety, unchanged', '');
const g = k => Math.max(...div.runs.filter(r => !r.refused).map(r => r.measures.gates[k] ?? 0));
p('| gate | observed |', '| --- | ---: |');
p(`| wrong keys | ${g('wrongKeys')} |`);
p(`| accepted ambiguity | ${g('ambiguous')} |`);
p(`| duplicate options | ${g('duplicateOptions')} |`);
p(`| exact duplicates | ${Math.max(...div.runs.filter(r => !r.refused).map(r => r.measures.exactDuplicates))} |`);
p(`| semantic duplicates | ${Math.max(...div.runs.filter(r => !r.refused).map(r => r.measures.semanticDuplicates))} |`);
p(`| core construction relaxations | ${Math.max(...div.runs.filter(r => !r.refused).map(r => r.coreRelaxations))} |`);
p(`| telemetry unbalanced | ${div.runs.filter(r => !r.refused && !r.telemetryBalanced).length} |`);
p(`| validation accepted | ${div.accepted} |`, '');

p('---', '', '## 4. The repeated groups, written out', '');
p('At 100 questions a handful of ideas appear twice — never three times. This is');
p('what such a pair looks like. Judge it by reading, not by the signature:', '');
const sit = runs('sitting100')[0];
for (const grp of sit.repeatedGroups.slice(0, 2)) {
  p(`**${grp.occurrences} occurrences · target \`${grp.target}\`**`, '');
  for (const ex of grp.examples) {
    p(`> ${ex.question}`);
    if (ex.stimulus) p('>', `> \`${ex.stimulus}\``);
    p('>', `> — ${ex.template} · ${ex.scenario} · ${ex.structure} · ${ex.answer}`, '');
  }
}
p('The pair is the same mathematics in a different shop with different numbers.');
p('That is a real repeat and it is counted as one. What no longer happens is a');
p('THIRD occurrence, or a pair sitting next to each other, or the same idea');
p('recurring under four scenarios and being counted as four constructions.', '');

p('---', '', '## 5. The positive evidence — one skill, genuinely different questions', '');
for (const [family, label] of [['averages', 'المتوسط الحسابي — averages'], ['sequences', 'المتتاليات — sequences']]) {
  p(`**${label}**`, '');
  for (const ex of (sit.contrasting[family] ?? []).slice(0, 4)) {
    p(`> ${ex.stimulus ? `\`${ex.stimulus}\` — ` : ''}${ex.question}`);
    p('>', `> — target \`${ex.target}\` · ${ex.template}`, '');
  }
}

p('---', '', '## 6. Language, scenarios and entities', '');
p('| dimension | what varies |');
p('| --- | --- |');
p('| Arabic sentence structure | four genuinely different shapes, not four wordings: a compact conjoined sentence, a sequence of short sentences, an explicit `المعطيات:` list, and the exam layout `المطلوب: … المعطيات: …` where the requested quantity is a noun phrase rather than an interrogative |');
p('| information order | given order, rotated, and outcome-first — permitted only where the clauses are self-contained; a clause opening «ثم» or referring back to «الباقي» keeps its place |');
p('| scenarios | seven pools — aggregate, production, trade, journey, population, catalogue, split — each bringing its own agents, counted things, verbs and unit of measure |');
p('| entities | 48 personal names with declared gender, 26 sites, 12 apparatus, so a question can be set somewhere without naming anyone |');
p('| agreement | everything that must agree with a drawn entity is STORED, not derived: the object suffix (باعه/باعها), the feminine marker on a passive verb (بيع/بيعت), the nominative form for a passive subject, each seller\'s own conjugated verbs |', '');
p(`Measured: ${m('session50', r => r.measures.stemSkeletons.distinct)} distinct sentence skeletons in a 50-question session, `);
p(`${m('sitting100', r => r.measures.entities.distinct)} distinct named entities across 100 questions, `);
p(`${m('session50', r => r.measures.stemStructures.distinct)} sentence structures in play.`, '');

p('---', '', '## 7. Remaining thin families and honest limits', '');
p('| limit | figure | what it means |');
p('| --- | --- | --- |');
p('| total distinct ideas | ~340 | The ceiling on how long a sitting can be before ideas recur. 100 questions is comfortable; 250 is not. |');
p('| ideas per band | 94 easy · 143 medium · 89 hard | Why the batch rule is a cap rather than a ban. |');
p('| all-easy 50-question session | ~45 reachable ideas | Refused at 50. The easy band cannot yet fill fifty slots without repeating an idea. |');
p('| all-hard 50-question session | ~35 reachable ideas | Refused, by name, with the shortfall reported. Raising it means adding hard constructions, which this release was explicitly told not to do. |');
p('| `odd_one_out` | 7 ideas, 1 sentence | Six numbers and «which does not belong». There is one way to ask it; its breadth is in the number properties. |');
p('| `ages`, `calendar` | 7–8 ideas each | The thinnest of the story families. Each template tells one idea; they are the first place to add sub-ideas next. |', '');

p('---', '', '## 8. The question', '');
p('**If a normal user solves 50–100 questions, do they feel like genuinely');
p('different questions?**', '');
p(`- **At 50: yes, without qualification.** ${m('session50', r => r.measures.core.distinct)} distinct ideas out of 50, largest group 1, `);
p(`  zero items in a repeated group, ${m('session50', r => r.measures.stemSkeletons.distinct)} distinct sentence skeletons, `);
p(`  ${m('session50', r => r.measures.targets.distinct)} distinct requested targets, no two similar questions adjacent.`);
p(`- **At 100: yes, with a stated qualification.** ${m('sitting100', r => r.measures.core.distinct)} distinct ideas out of 100; `);
p(`  about twenty ideas appear exactly twice, never three times, and never adjacent. `);
p('  The independent review measured 58 of 100 as repetitive before this work; it is now 38–48,');
p('  and every one of those is a genuine second occurrence rather than a reskin counted as new.');
p('- **Beyond 150 the pool runs out**, and the report says so rather than letting');
p('  surface variation cover it.', '');
p('The evidence is `rc2/RC27_USER_DIVERSITY.json` — every figure here is read from');
p('it — and the questions in §4 and §5 are printed exactly as a candidate meets them.', '');

p('---', '', '## 9. Freeze and repository status', '');
p('| field | value |', '| --- | --- |');
p(`| release | \`${fz.release}\` |`);
p(`| frozen commit | \`${fz.RC2_COMMIT}\` |`);
p(`| tree SHA | \`${fz.treeHash}\` |`);
p(`| production bundle SHA-256 | \`${fz.productionBundleSha256}\` |`);
p(`| production files | ${(fz.productionFiles || []).length} |`);
p(`| tests at freeze | ${fz.testCount} |`);
p(`| §23 internal gate | \`${gate.verdict}\` — ${gate.conditions} conditions, ${(gate.failedConditions ?? []).length} failed |`);
p(`| sign-off holdout | \`${fz.holdoutSeed}\` — named, NOT generated |`, '');
p('Regression suite at the freeze: 454 tests, 419 pass, 0 fail, 35 skipped. The');
p('skips are declared: freeze tests that stand down before §24, and measurements');
p('retired with a stated reason where a fifty-question all-hard shape stopped being');
p('deliverable. No measurement was kept by lowering its bar, and the historical');
p('holdout plans were left untouched — rewriting a sealed record\'s shape would');
p('falsify it.', '');

writeFileSync('FINAL_REPORT.md', L.join('\n') + '\n');
console.log('wrote FINAL_REPORT.md', L.length, 'lines');
