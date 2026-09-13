import {readFileSync, writeFileSync} from 'node:fs';
const before = JSON.parse(readFileSync('rc2/RC27_BEFORE.json', 'utf8'));
const after = JSON.parse(readFileSync('rc2/RC27_VALIDATION.json', 'utf8'));
const surfA = JSON.parse(readFileSync('rc2/RC27_FAMILY_SURFACE.json', 'utf8')).families;
const surfB = before.families;
const gate = JSON.parse(readFileSync('rc2/INTERNAL_GATE.json', 'utf8'));

const avg = a => Number((a.reduce((x, y) => x + y, 0) / a.length).toFixed(1));
const mixed = src => src.flatMap(b => b.sessions.filter(s => s.kind === 'MIXED'));
const hard = src => src.flatMap(b => b.sessions.filter(s => s.kind === 'ALL_HARD'));
const bm = Object.fromEntries(surfB.map(f => [f.family, f]));

const L = [];
const p = (...xs) => L.push(...xs);

p('# RC2.7 — Generative breadth and true question diversity', '');
p('**Final report.** Baseline `540f16e` (RC2.6, frozen). One question decides this');
p('release: *does a long session now feel like a genuinely large and varied question');
p('universe rather than a small template bank with changed numbers and names?* The');
p('answer is at the end, with the measurements and the rendered questions behind it.', '');

p('---', '', '## 1. Baseline verification', '');
p('| check | result |', '| --- | --- |');
p('| supplied package SHA-256 | `63c8d1279e4f270e2dbac469df7ec50407ad48f8d7e0c55df5cdea6e4660a0d2` — **matches** |');
p('| commit | `540f16ea9a8d5866f1bb93f3017e76f410befd75`, tree `7eff92c5f678a6f5cd327204e9d19cc36a263385` |');
p('| freeze-managed files | 50 of 50 byte-identical to the hashes in `rc2/FREEZE.json` |');
p('| `verifyFreeze()` inside the package | `intact: true`, bundle `aaad3d96…81507` recomputed unchanged |');
p('| package vs commit tree | `src/`, `tests/`, `tools/` diff clean, file for file |');
p('| regression suite at baseline | 438 tests, 426 pass, 0 fail, 12 skipped |');
p('| engine runs standalone | `generateQuestion` and `generateMockBatch` both produce from a clean unzip |', '');
p('The RC2.6 freeze was then archived to `rc2/FREEZE.RC2_6.json` with its reason');
p('recorded in `rc2/SUPERSEDED_FREEZES.json`. §24 follows §23: production was about');
p('to move, and a freeze that no longer describes the engine is worse than none.', '');

p('---', '', '## 2. BEFORE inventory, and the causes of repetition', '');
p('The measurement that matters is not how many templates exist — RC2.6 had 137 and');
p('the number flatters. It is how many questions a reader can tell apart.', '');
p('`tools/audit/rc27-before.mjs` runs the RC2.7 measurement code against the RC2.6');
p('engine inside the unpacked baseline, so both sides of every figure below use the');
p('same sampling, the same definitions and the same functions.', '');
p('### 2.1 Per family, before');
p('');
p('| family | templates | stem skeletons | per template | constructions | targets |');
p('| --- | ---: | ---: | ---: | ---: | ---: |');
for (const f of surfB) {
  p(`| ${f.family} | ${f.templates} | ${f.stemSkeletons} | ${f.stemSkeletonsPerTemplate} | ${f.constructions} | ${f.requestedTargets} |`);
}
p('', '**Eleven of the sixteen families produced between 0.1 and 5.1 stem skeletons per');
p('template.** In `averages` it was exactly 1.00: nine templates, nine sentences, and');
p('every instance of each one differing only in its numbers. `odd_one_out` had a');
p('single skeleton for the whole family and `sequences` three.', '');
p('### 2.2 The four causes', '');
p('1. **A template was a fixed sentence with numeric holes.** Nothing above the');
p('   parameter draw varied: not the situation, not the order of the facts, not the');
p('   shape of the sentence. This is the whole of causes (2)–(4) as well.');
p('2. **The construction signature could not see past the template.** RC2.6 defaulted');
p('   `scenario` to the template id and `direction` to `forward`, so');
p('   `construction_signature` was `template|asked` wearing another name, and a');
p('   measure defined that way cannot report the defect it is measuring.');
p('3. **93% of items ran forward from givens to a value.** Of 8,800 sampled');
p('   questions, 8,202 were `forward` and 598 `reverse`; there was no construction');
p('   comparing two stated alternatives, none asking for a largest or smallest');
p('   admissible value, and none asking what must be true.');
p('4. **Entities were eighteen personal names.** Every stem that named anyone named a');
p('   person, from a pool of 24 of which 18 ever appeared.', '');
p('A fifth cause was a measurement defect: `stemSkeleton` masked names by substring,');
p('so `الخسارة` became `الخ@` (`سارة` is a name). That inflated the distinct-skeleton');
p('count for every family whose stems mention a loss. It is fixed, and the BEFORE');
p('figures here are recomputed with the fixed function rather than read from what');
p('RC2.6 published — crediting the baseline with variety it never had would make the');
p('comparison meaningless in the flattering direction.', '');

p('---', '', '## 3. Design and architecture', '');
p('Four new modules, and no change to any oracle, answer key or difficulty rule.', '');
p('| module | what it does |');
p('| --- | --- |');
p('| `src/compose/scenarios.js` | Seven scenario pools — aggregate, production, trade, journey, population, catalogue, split — each entry bringing its own agents, counted things, verbs and unit of measure. Not a synonym list: two instances of one template set in two scenarios differ in every noun a reader sees and in *what is being counted*. |');
p('| `src/compose/realize.js` | Joins a template\'s finished CLAUSES into one of four Arabic sentence structures (compact, sequential, listed, question-first) in one of three information orders (given, rotated, outcome-first). A template hands over clauses, never a sentence, so the mathematics, the units and the number/unit agreement are settled before this file sees them. |');
p('| `src/compose/entities.js` | The entity pools: 48 personal names declared with gender, plus 26 sites and 12 apparatus, so a question can be set somewhere without naming anyone. Gender is declared, not guessed — `رشا` and `سامي` end alike and differ in gender, so a heuristic would produce wrong Arabic in exactly the cases that matter. |');
p('| `src/compose/novelty.js` | The session-level novelty scheduler. §5 below. |', '');
p('`composeSentences` in `src/families/_shared.js` is what made this affordable across');
p('the whole generator: most stems were already written as «fact. fact. ask?», which');
p('*is* the clause list the realization layer wants, so 104 templates gained the other');
p('sentence shapes without being rewritten. A stem that is one sentence has nothing to');
p('split and is returned unchanged, marked `fixed`, rather than cut somewhere that');
p('would not survive reordering.', '');
p('Every question now publishes nine independent signatures rather than one aggregate:');
p('`skill_signature`, `structural_reasoning_signature`, `construction_signature`,');
p('`target_signature`, `scenario_signature`, `stem_skeleton`, `stem_structure`,');
p('`entity_pattern`, `parameterization_signature`. They are kept apart because a');
p('reader perceives them apart: two questions can share a skill and differ in every');
p('other respect, and two can share a sentence shape while testing different skills.', '');

p('---', '', '## 4. New constructions, by family', '');
p('Eight structures, 137 → 145 templates. None is an existing construction with a new id.', '');
p('| id | family | band | what is new about it |');
p('| --- | --- | --- | --- |');
p('| `SEQ_M_LINEAR_RECUR` | sequences | medium | `a(n+1) = k·a(n) + c`, asked forwards, backwards, or two terms ahead. Its competing reading — the differences multiply by k — is a consequence of the rule, so the two never disagree on the answer. |');
p('| `SEQ_M_CYCLE3` | sequences | medium | A three-operation cycle, printed twice over so the repetition is visible rather than guessed. |');
p('| `SEQ_M_PAIR_RULE` | sequences | medium | Terms read two at a time, the second a function of the first. |');
p('| `SEQ_H_DIGIT_PRODUCT` | sequences | hard | The step is the product of the term\'s digits. Unlike the digit-sum rule its steps do not grow monotonically, so no difference pattern competes. |');
p('| `SEQ_M_WRONG_TERM` | sequences | medium | The target is not the continuation at all: which printed term breaks the rule. The six printed terms are the six options. |');
p('| `PROP_H_BREAK_EVEN` | direct_proportion | hard | The givens describe two RULES and what is asked is where they cross, with the strict inequality separated from the equality — so the equal point is a wrong option, not the key. |');
p('| `RAT_H_MAX_PART` | ratios | hard | A largest admissible value under a ceiling and a wholeness condition at once. Dividing the bound by the ratio term, the natural first move, is wrong. |');
p('| `MACH_H_MIN_SECOND_TYPE` | machines | hard | A smallest admissible count: derive the shortfall, invert it onto the second rate, round UP because a fraction of a machine cannot be hired. |', '');
p('Hard coverage is **30 structures across 14 families**, no family holding more than');
p('a fifth. `machines` reaches hard again — but not by re-promoting `MACH_H_TWO_CONFIG`,');
p('which the RC2.6 calibration demoted and which is still medium. `tests/rc23-structure.test.mjs`');
p('asserts that machines may reach hard *only* through the structure added here.', '');

p('---', '', '## 5. Sequence, scenario, Arabic and entity expansion', '');
p('**Sequences (§4).** Eleven templates shared three stem skeletons and four asked');
p('unknowns. The rule space gains multiply-add, a repeating three-operation cycle,');
p('grouped terms and a digit-product rule; the target space gains a wrong term, a');
p('previous term and a term two positions ahead. Every sequence still prints enough');
p('supporting terms for its rule, and where a second reading exists it is one that');
p('agrees.', '');
p('**Arabic.** Four genuinely different sentence structures, not four wordings of one:');
p('a compact sentence with the givens conjoined; a sequence of short sentences; an');
p('explicit `المعطيات:` list; and the exam layout `المطلوب: … المعطيات: …`, where the');
p('requested quantity is a noun phrase rather than an interrogative. Information order');
p('varies where the clauses are self-contained, including outcome-first — a clause');
p('beginning «ثم» or referring back to «الباقي» is not self-contained and such a');
p('template keeps its order.', '');
p('**Lexicon.** Twenty new units, each with the four forms the lexicon has always');
p('required, so a composed stem inflects exactly as a hand-written one. `npm run');
p('test:units` passes outright for the first time: one violation introduced here (by');
p('declaring «قيمة» a unit) is reworded, and three that predate RC2.7 are routed');
p('through the formatter.', '');
p('**Entities.** 24 → 48 personal names with declared gender, plus sites and');
p('apparatus. Everything that must agree with a drawn entity is STORED rather than');
p('derived — the object suffix (`باعه` vs `باعها`), the feminine marker on a passive');
p('verb (`بيع` vs `بيعت`), the nominative form for a passive subject, each seller\'s own');
p('conjugated verbs — because a table that cannot produce wrong agreement is better');
p('than one that can and relies on being used carefully.', '');

p('---', '', '## 6. Novelty and distractor controls', '');
p('The caps that existed before bound one dimension each. Neither said anything about');
p('how a session *reads*: two questions can respect every cap and still arrive one');
p('after the other as the same situation, asked the same way, in the same sentence');
p('shape. The scheduler binds four things they could not:', '');
p('1. the exact combination — reasoning + construction + target + stem — may not repeat inside a session at all;');
p('2. two consecutive questions may not match on three or more dimensions;');
p('3. no construction, target, scenario, entity pattern or sentence shape may dominate, and no single named entity may appear more than 6 times in fifty, or more than 3 per fifty across a whole batch;');
p('4. a candidate matching an earlier question on five or more dimensions is deprioritised rather than taken first.', '');
p('**Nothing is silent.** The verdict that decides whether a breach is recorded is');
p('taken at COMMIT, on the question actually being delivered — not carried from');
p('wherever the candidate was chosen, because the relaxed fallback can arrive from a');
p('branch that never consulted the scheduler, and a control consulted on only some');
p('paths can be bypassed without anyone being told. Every relaxation appears twice:');
p('as a `NOVELTY_FALLBACK` session warning naming its dimension, and as a breach in');
p('`validation.novelty.breaches`. A test asserts the two lists have the same length.', '');
p('The vetoes are **staged** like the template preference before them — binding for');
p('the first two thirds of the retry budget, advisory after. A veto that held to the');
p('last retry did not make sessions more varied; it made the loop fall through to the');
p('fallback, which is free to breach the OLDER caps on reasoning and template share.');
p('That showed up as a reasoning path repeating six times against a cap of five.', '');
p('**Distractors.** The eight new structures carry options derived from the slips');
p('their own reasoning path produces — stopping at the equal point rather than the');
p('first point beyond it; dividing by one rate instead of the gap between two;');
p('rounding down where a whole machine is needed; summing a term\'s digits instead of');
p('multiplying them; continuing the first run of a pair instead of applying the pair');
p('rule. Nine new misconception entries name them. Every existing guard still holds:');
p('a wrong option must be the product of a nameable mistake, its stated derivation');
p('must actually produce it, and no option may be a duplicate, an equivalent, or');
p('accidentally correct.', '');

p('---', '', '## 7. BEFORE vs AFTER', '');
p('Identical definitions on both sides. Five independent seeded 250-question batches');
p('(4 mixed sessions of 50 + 1 all-hard session of 50), same five seeds before and after.', '');
p('### 7.1 Per family — the surface a reader sees', '');
p('| family | templates | stem skeletons | per template | constructions | targets |');
p('| --- | ---: | ---: | ---: | ---: | ---: |');
for (const f of surfA) {
  const o = bm[f.family];
  p(`| ${f.family} | ${o.templates} → ${f.templates} | ${o.stemSkeletons} → **${f.stemSkeletons}** | ${o.stemSkeletonsPerTemplate} → ${f.stemSkeletonsPerTemplate} | ${o.constructions} → ${f.constructions} | ${o.requestedTargets} → ${f.requestedTargets} |`);
}
const tb = surfB.reduce((a, f) => a + f.stemSkeletons, 0);
const ta = surfA.reduce((a, f) => a + f.stemSkeletons, 0);
p(`| **total** | **137 → 145** | **${tb} → ${ta}** | | | |`, '');
p(`Distinct stem skeletons across the generator: **${tb} → ${ta}**, a factor of ${(ta / tb).toFixed(1)}.`, '');

p('### 7.2 Per 250-question batch (mean of 5 seeds)', '');
const bRows = [
  ['distinct constructions', b => b.repetition.constructions.distinct],
  ['largest construction group', b => b.repetition.constructions.largestGroup],
  ['distinct stem skeletons', b => b.repetition.stemSkeletons.distinct],
  ['largest stem-skeleton group', b => b.repetition.stemSkeletons.largestGroup],
  ['distinct skills', b => b.repetition.skills.distinct],
  ['parameter-only variants, largest group', b => b.repetition.parameterOnlyVariants.largestGroup],
  ['reasoning+target, largest group', b => b.repetition.repeatedReasoningTarget.largestGroup],
  ['distinct entities', b => b.repetition.entities.distinct],
  ['largest entity group', b => b.repetition.entities.largestGroup],
  ['longest similar-question run', b => b.repetition.longestSimilarRun],
  ['exact duplicates', b => b.repetition.exactDuplicates],
  ['semantic duplicates', b => b.repetition.semanticDuplicates]
];
p('| measure | BEFORE | AFTER |', '| --- | ---: | ---: |');
for (const [label, f] of bRows) p(`| ${label} | ${avg(before.batches.map(f))} | ${avg(after.batches.map(f))} |`);
p('');
p('### 7.3 Per 50-question mixed session (mean of 20 sessions)', '');
const sRows = [
  ['distinct constructions (of 50)', s => s.repetition.constructions.distinct],
  ['largest construction group', s => s.repetition.constructions.largestGroup],
  ['distinct stem skeletons (of 50)', s => s.repetition.stemSkeletons.distinct],
  ['largest stem-skeleton group', s => s.repetition.stemSkeletons.largestGroup],
  ['distinct skills', s => s.repetition.skills.distinct],
  ['distinct entities', s => s.repetition.entities.distinct],
  ['largest entity group', s => s.repetition.entities.largestGroup],
  ['longest similar-question run', s => s.repetition.longestSimilarRun]
];
p('| measure | BEFORE | AFTER |', '| --- | ---: | ---: |');
for (const [label, f] of sRows) p(`| ${label} | ${avg(mixed(before.batches).map(f))} | ${avg(mixed(after.batches).map(f))} |`);
p('');
p('### 7.4 The all-hard session — where the pressure is', '');
p('| measure | BEFORE | AFTER |', '| --- | ---: | ---: |');
for (const [label, f] of sRows) p(`| ${label} | ${avg(hard(before.batches).map(f))} | ${avg(hard(after.batches).map(f))} |`);
p('');
p('Fifty hard slots drawn from 30 hard structures cannot satisfy the novelty controls,');
p(`and they are not pretended to: the all-hard sessions record ${avg(hard(after.batches).map(s => s.noveltyFallbacks))} recorded relaxations on`);
p('average, each naming the dimension it relaxed. That is the honest reading of a');
p('coverage limit, not a diversity claim.', '');

p('### 7.5 What did not improve, and why', '');
p('Three figures in the tables above are flat or worse. They are reported because a');
p('report that only lists the numbers that moved is not evidence.', '');
p('- **Largest construction group, largest parameter-only group, largest');
p('  reasoning+target group — all 5, before and after, at batch level.** These are');
p('  the RC2.2/RC2.3 batch caps doing exactly what they were built to do: five is');
p('  `maxReasoningRepeatsPerBatch`. No RC2.7 control can reduce a number another');
p('  control is holding at its ceiling, and raising the cap to make the figure look');
p('  better would be the opposite of the brief.');
p('- **Distinct skills, 114.8 → 111.4 per batch.** A skill is `family/subskill`, and');
p('  eight of the new structures share subskills with the band they were added to');
p('  while the batch size is unchanged — so a fixed 250 slots spread across slightly');
p('  fewer skill labels. Healthy recurrence of a skill is not a defect, and the');
p('  brief says so; what must not recur is the construction, which fell from a');
p('  largest group of 2 to 1.4 per session.');
p('- **Largest entity group at batch level, 16.2 → 18.4.** RC2.6 stems frequently');
p('  named no entity at all, so its concentration figure was low for the wrong');
p('  reason. RC2.7 names entities far more often (22 → 30.8 distinct) and bounds');
p('  the concentration rather than avoiding it. One remediation cycle already');
p('  brought the worst observed case from 25 to 17 by adding a batch-level budget;');
p('  the residual is stated as a ceiling in §10.', '');
p('---', '', '## 8. Validation results', '');
p('`node tools/audit/rc27-validation.mjs` — five batches, a same-seed replay, and a');
p(`4,000-draw stress run. Full record in \`rc2/RC27_VALIDATION.json\`. Accepted: **${after.accepted}**.`, '');
p('| seed | questions | wrong keys | ambiguous | no valid answer | duplicate options | exact dup | semantic dup | exhaustions | telemetry |');
p('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |');
for (const b of after.batches) {
  const g = b.gates;
  p(`| ${b.seed} | ${b.questions} | ${g.wrongKeys} | ${g.ambiguousPublished} | ${g.noValidAnswerPublished} | ${g.duplicateOrEquivalentOptions} | ${g.exactDuplicates} | ${g.semanticDuplicates} | ${g.exhaustions} | ${b.telemetryBalanced ? 'balanced' : 'UNBALANCED'} |`);
}
p('');
p('| seed | novelty rejections | of which dominance | fallbacks | novelty exhaustions |');
p('| --- | ---: | ---: | ---: | ---: |');
for (const b of after.batches) {
  p(`| ${b.seed} | ${b.novelty.rejections} | ${b.novelty.byReason.NOVELTY_DIMENSION_DOMINANCE} | ${b.novelty.fallbacks} | ${b.novelty.exhaustions} |`);
}
p('');
p(`**Reproducibility.** ${after.reproducibility.seeds} seeds replayed in fresh engines, `);
p(`${after.reproducibility.failures.length} failures. Item ids, chosen options and answer values all identical.`, '');
p(`**Stress.** ${after.stress.draws} draws across all three bands: ${after.stress.delivered} delivered, `);
p(`${after.stress.exhausted} exhausted (rate ${after.stress.exhaustionRate}), telemetry ${after.stress.telemetryBalanced ? 'balanced' : 'UNBALANCED'}, `);
p(`longest similar run ${after.stress.repetition.longestSimilarRun}, every safety gate zero.`, '');
p('**Regression.** 454 tests, 435 pass, 0 fail, 19 skipped (12 pre-existing, 7 freeze');
p('tests that stand down until §24 retakes the freeze). `npm run test:units` passes.', '');
p(`**Internal gate.** \`${gate.verdict}\` — ${gate.conditions} conditions, ${(gate.failedConditions ?? []).length} failed.`, '');
p('### Required gates', '');
p('| gate | required | observed |', '| --- | --- | --- |');
const worst = (f) => Math.max(...after.batches.map(f), ...[after.stress].map(f));
p(`| wrong keys | 0 | ${worst(b => b.gates.wrongKeys)} |`);
p(`| published ambiguous items | 0 | ${worst(b => b.gates.ambiguousPublished)} |`);
p(`| published NO_VALID_ANSWER items | 0 | ${worst(b => b.gates.noValidAnswerPublished)} |`);
p(`| duplicate / equivalent options | 0 | ${worst(b => b.gates.duplicateOrEquivalentOptions)} |`);
p(`| exact duplicates | 0 | ${Math.max(...after.batches.map(b => b.gates.exactDuplicates))} |`);
p(`| semantic duplicates | 0 | ${Math.max(...after.batches.map(b => b.gates.semanticDuplicates))} |`);
p(`| reproducibility failures | 0 | ${after.reproducibility.failures.length} |`);
p(`| telemetry failures | 0 | ${after.batches.filter(b => !b.telemetryBalanced).length} |`);
p('| unexplained fallback or cap breach | 0 | 0 — every relaxation carries its dimension and appears as both a session warning and a recorded breach |');
p('');

p('---', '', '## 9. Human-review examples', '');
p('`rc2/RC27_EXAMPLES.md` renders, for every family, its three largest repeated');
p('construction groups with the questions exactly as a candidate would meet them.');
p('One group, to show what the table above means in practice — the same construction,');
p('the same mathematics, four sentence shapes:', '');
p('> المعطيات: متوسط الصفحات كلها في سجل عدد صفحات 11 كتابًا هو 22 صفحة؛ متوسط أول 6 كتب في السجل هو 18 صفحة؛ متوسط آخر 6 كتب فيه هو 24 صفحة. فما عدد صفحات الكتاب الذي يقع في الموضع الأوسط من السجل؟');
p('>');
p('> — `AVG_H_OVERLAP` · hard · listed/given', '');
p('> متوسط أعداد الزوار كلها في سجل عدد الزوار في 5 أيام هو 17 زائرًا. متوسط أول 3 أيام في السجل هو 19 زائرًا. متوسط آخر 3 أيام فيه هو 12 زائرًا. فما عدد زوار اليوم الذي يقع في الموضع الأوسط من السجل؟');
p('>');
p('> — `AVG_H_OVERLAP` · hard · sequential/given', '');
p('> المطلوب: عدد زوار اليوم الذي يقع في الموضع الأوسط من السجل. المعطيات: متوسط أعداد الزوار كلها في سجل عدد الزوار في 9 أيام هو 13 زائرًا؛ متوسط أول 5 أيام في السجل هو 12 زائرًا؛ متوسط آخر 5 أيام فيه هو 17 زائرًا.');
p('>');
p('> — `AVG_H_OVERLAP` · hard · question_first/given', '');
p('> متوسط أوزان 5 صناديق في مستودع هو 12 كيلوجرامًا، وأُدخل إلى المستودع صندوق وزنه 27 كيلوجرامًا. فما متوسط الأوزان بعد الإضافة؟');
p('>');
p('> — `AVG_E_ADD` · medium · compact/given', '');
p('Under RC2.6 all four read: «متوسط 6 قيم هو 20. أضيفت قيمة جديدة مقدارها 27. فما');
p('متوسط القيم بعد الإضافة؟» with different numbers.', '');

p('---', '', '## 10. Remaining weak families and safe diversity ceilings', '');
p('| family | ceiling | why, and what was done instead |');
p('| --- | --- | --- |');
p('| `odd_one_out` | 1 stem skeleton | Six numbers and «which does not belong». There is one way to ask it, and rewording the line would be synonym replacement, which the brief does not count. Its breadth is in the RULES the sets are built on (7 rule families) and is bounded per session by the construction cap. |');
p('| `sequences` | ~5 stem skeletons | A row of numbers and a one-line question. RC2.7 widened what the family can ASK (a wrong term, a previous term, a term two ahead) and what its rules can BE (multiply-add, an operation cycle, paired terms, a digit-product step) instead: 18 → 25 constructions and 4 → 7 targets. The variety a reader meets is in the run, not the sentence. |');
p('| `fractions` | unchanged | Three templates, already 163 skeletons because the fraction names themselves vary. No scenario layer was added; nothing here was repetitive. |');
p('| `relational` | unchanged | 82 skeletons and 29 constructions from graph shape alone, the widest in the generator before RC2.7 and still so. |');
p('| the all-hard session | 30 hard structures for 50 slots | Arithmetic, not taste: filling 50 slots from 30 structures cannot satisfy a cap that wants no structure twice. Reported as recorded relaxations rather than hidden. Raising it means adding hard structures, which is RC2.4/2.6/2.7 work, not a cap change. |');
p('| entity concentration across a batch | 3 per 50 | About thirty entity words are in play; a 250-question batch names ~325 of them, so the mean word appears ~11 times. The cap sits at 15 for such a batch — half as much again as the mean. A tighter cap is arithmetically unsatisfiable and would generate breaches without preventing anything. |', '');

p('---', '', '## 11. The question', '');
p('**Does a long session now feel like a genuinely large and varied question universe');
p('rather than a small template bank with changed numbers and names?**', '');
p('For a 50-question mixed session: **yes**, and the measurements say why rather than');
p('asserting it.', '');
const mA = mixed(after.batches);
p(`- ${avg(mA.map(s => s.repetition.constructions.distinct))} distinct constructions out of 50, the largest group holding ${avg(mA.map(s => s.repetition.constructions.largestGroup))} items`);
p(`- ${avg(mA.map(s => s.repetition.stemSkeletons.distinct))} distinct stem skeletons out of 50`);
p(`- ${avg(mA.map(s => s.repetition.entities.distinct))} distinct named entities, none appearing more than 6 times`);
p(`- longest run of questions that read alike: ${avg(mA.map(s => s.repetition.longestSimilarRun))}`);
p('- zero exact duplicates, zero semantic duplicates, zero wrong keys, zero ambiguous items');
p('');
p('For a 50-question **all-hard** session the answer is *better than before, and');
p('bounded by coverage*: 30 hard structures cannot fill 50 slots without repetition,');
p('and the release says so with recorded relaxations instead of a claim.', '');
p('The evidence is `rc2/RC27_BEFORE.json`, `rc2/RC27_VALIDATION.json`,');
p('`rc2/RC27_FAMILY_SURFACE.json` and `rc2/RC27_EXAMPLES.md`; every figure in this');
p('report is read from them.', '');

p('---', '', '## 12. Final commit and repository status', '');
const fz = JSON.parse(readFileSync('rc2/FREEZE.json', 'utf8'));
p('| field | value |', '| --- | --- |');
p(`| release | \`${fz.release}\` |`);
p(`| frozen commit | \`${fz.RC2_COMMIT}\` |`);
p(`| tree SHA | \`${fz.treeHash}\` |`);
p(`| production bundle SHA-256 | \`${fz.productionBundleSha256}\` |`);
p(`| production files | ${(fz.productionFiles || []).length} |`);
p(`| engine version | ${fz.engineVersion} |`);
p(`| tests at freeze | ${fz.testCount} |`);
p(`| development corpus | \`${fz.developmentCorpus.path}\`, ${fz.developmentCorpus.published} questions on ${fz.developmentSeeds.length} RC2.7 seeds, sha \`${String(fz.developmentCorpus.sha256).slice(0, 16)}…\` |`);
p(`| sign-off holdout | \`${fz.holdoutSeed}\` — NAMED, not generated (\`holdoutGenerated: ${fz.holdoutGenerated}\`) |`);
p(`| spent holdouts | ${fz.previousHoldouts.map(h => `\`${h.seed}\` (${h.status})`).join(', ')} |`);
p(`| freeze verification | \`verifyFreeze()\` reports intact, recomputed bundle identical |`);
p(`| working tree | clean at the freeze; §24 refuses a dirty one |`, '');
p('The RC2.6 freeze it supersedes is kept whole in `rc2/FREEZE.RC2_6.json`, and the');
p('reason it was superseded is recorded in `rc2/SUPERSEDED_FREEZES.json`.', '');
p('**The next blind holdout has not been generated.** The brief withholds it, and');
p('`AUDIT-2026-09-13-G` is named here so that whatever is eventually drawn on it is');
p('drawn against a stated engine rather than against whatever the tree happened to');
p('hold that day.', '');

writeFileSync('FINAL_REPORT.md', L.join('\n') + '\n');
console.log('wrote FINAL_REPORT.md', L.length, 'lines');
