# RC2.7 — Generative breadth and true question diversity

**Final report.** Baseline `540f16e` (RC2.6, frozen). One question decides this
release: *does a long session now feel like a genuinely large and varied question
universe rather than a small template bank with changed numbers and names?* The
answer is at the end, with the measurements and the rendered questions behind it.

---

## 1. Baseline verification

| check | result |
| --- | --- |
| supplied package SHA-256 | `63c8d1279e4f270e2dbac469df7ec50407ad48f8d7e0c55df5cdea6e4660a0d2` — **matches** |
| commit | `540f16ea9a8d5866f1bb93f3017e76f410befd75`, tree `7eff92c5f678a6f5cd327204e9d19cc36a263385` |
| freeze-managed files | 50 of 50 byte-identical to the hashes in `rc2/FREEZE.json` |
| `verifyFreeze()` inside the package | `intact: true`, bundle `aaad3d96…81507` recomputed unchanged |
| package vs commit tree | `src/`, `tests/`, `tools/` diff clean, file for file |
| regression suite at baseline | 438 tests, 426 pass, 0 fail, 12 skipped |
| engine runs standalone | `generateQuestion` and `generateMockBatch` both produce from a clean unzip |

The RC2.6 freeze was then archived to `rc2/FREEZE.RC2_6.json` with its reason
recorded in `rc2/SUPERSEDED_FREEZES.json`. §24 follows §23: production was about
to move, and a freeze that no longer describes the engine is worse than none.

---

## 2. BEFORE inventory, and the causes of repetition

The measurement that matters is not how many templates exist — RC2.6 had 137 and
the number flatters. It is how many questions a reader can tell apart.

`tools/audit/rc27-before.mjs` runs the RC2.7 measurement code against the RC2.6
engine inside the unpacked baseline, so both sides of every figure below use the
same sampling, the same definitions and the same functions.

### 2.1 Per family, before

| family | templates | stem skeletons | per template | constructions | targets |
| --- | ---: | ---: | ---: | ---: | ---: |
| sequences | 11 | 3 | 0.27 | 18 | 4 |
| ratios | 7 | 16 | 2.29 | 10 | 8 |
| percentages | 9 | 12 | 1.33 | 9 | 9 |
| averages | 9 | 9 | 1 | 9 | 9 |
| ages | 8 | 20 | 2.5 | 8 | 5 |
| speed | 10 | 30 | 3 | 12 | 12 |
| work_time | 11 | 45 | 4.09 | 11 | 11 |
| machines | 9 | 27 | 3 | 9 | 8 |
| direct_proportion | 10 | 51 | 5.1 | 13 | 8 |
| fractions | 3 | 163 | 54.33 | 8 | 3 |
| unit_rate | 7 | 10 | 1.43 | 7 | 6 |
| combined_rate | 8 | 23 | 2.88 | 8 | 7 |
| relational | 9 | 82 | 9.11 | 29 | 19 |
| calendar | 9 | 175 | 19.44 | 9 | 8 |
| odd_one_out | 7 | 1 | 0.14 | 7 | 1 |
| profit_loss | 10 | 12 | 1.2 | 11 | 11 |

**Eleven of the sixteen families produced between 0.1 and 5.1 stem skeletons per
template.** In `averages` it was exactly 1.00: nine templates, nine sentences, and
every instance of each one differing only in its numbers. `odd_one_out` had a
single skeleton for the whole family and `sequences` three.

### 2.2 The four causes

1. **A template was a fixed sentence with numeric holes.** Nothing above the
   parameter draw varied: not the situation, not the order of the facts, not the
   shape of the sentence. This is the whole of causes (2)–(4) as well.
2. **The construction signature could not see past the template.** RC2.6 defaulted
   `scenario` to the template id and `direction` to `forward`, so
   `construction_signature` was `template|asked` wearing another name, and a
   measure defined that way cannot report the defect it is measuring.
3. **93% of items ran forward from givens to a value.** Of 8,800 sampled
   questions, 8,202 were `forward` and 598 `reverse`; there was no construction
   comparing two stated alternatives, none asking for a largest or smallest
   admissible value, and none asking what must be true.
4. **Entities were eighteen personal names.** Every stem that named anyone named a
   person, from a pool of 24 of which 18 ever appeared.

A fifth cause was a measurement defect: `stemSkeleton` masked names by substring,
so `الخسارة` became `الخ@` (`سارة` is a name). That inflated the distinct-skeleton
count for every family whose stems mention a loss. It is fixed, and the BEFORE
figures here are recomputed with the fixed function rather than read from what
RC2.6 published — crediting the baseline with variety it never had would make the
comparison meaningless in the flattering direction.

---

## 3. Design and architecture

Four new modules, and no change to any oracle, answer key or difficulty rule.

| module | what it does |
| --- | --- |
| `src/compose/scenarios.js` | Seven scenario pools — aggregate, production, trade, journey, population, catalogue, split — each entry bringing its own agents, counted things, verbs and unit of measure. Not a synonym list: two instances of one template set in two scenarios differ in every noun a reader sees and in *what is being counted*. |
| `src/compose/realize.js` | Joins a template's finished CLAUSES into one of four Arabic sentence structures (compact, sequential, listed, question-first) in one of three information orders (given, rotated, outcome-first). A template hands over clauses, never a sentence, so the mathematics, the units and the number/unit agreement are settled before this file sees them. |
| `src/compose/entities.js` | The entity pools: 48 personal names declared with gender, plus 26 sites and 12 apparatus, so a question can be set somewhere without naming anyone. Gender is declared, not guessed — `رشا` and `سامي` end alike and differ in gender, so a heuristic would produce wrong Arabic in exactly the cases that matter. |
| `src/compose/novelty.js` | The session-level novelty scheduler. §5 below. |

`composeSentences` in `src/families/_shared.js` is what made this affordable across
the whole generator: most stems were already written as «fact. fact. ask?», which
*is* the clause list the realization layer wants, so 104 templates gained the other
sentence shapes without being rewritten. A stem that is one sentence has nothing to
split and is returned unchanged, marked `fixed`, rather than cut somewhere that
would not survive reordering.

Every question now publishes nine independent signatures rather than one aggregate:
`skill_signature`, `structural_reasoning_signature`, `construction_signature`,
`target_signature`, `scenario_signature`, `stem_skeleton`, `stem_structure`,
`entity_pattern`, `parameterization_signature`. They are kept apart because a
reader perceives them apart: two questions can share a skill and differ in every
other respect, and two can share a sentence shape while testing different skills.

---

## 4. New constructions, by family

Eight structures, 137 → 145 templates. None is an existing construction with a new id.

| id | family | band | what is new about it |
| --- | --- | --- | --- |
| `SEQ_M_LINEAR_RECUR` | sequences | medium | `a(n+1) = k·a(n) + c`, asked forwards, backwards, or two terms ahead. Its competing reading — the differences multiply by k — is a consequence of the rule, so the two never disagree on the answer. |
| `SEQ_M_CYCLE3` | sequences | medium | A three-operation cycle, printed twice over so the repetition is visible rather than guessed. |
| `SEQ_M_PAIR_RULE` | sequences | medium | Terms read two at a time, the second a function of the first. |
| `SEQ_H_DIGIT_PRODUCT` | sequences | hard | The step is the product of the term's digits. Unlike the digit-sum rule its steps do not grow monotonically, so no difference pattern competes. |
| `SEQ_M_WRONG_TERM` | sequences | medium | The target is not the continuation at all: which printed term breaks the rule. The six printed terms are the six options. |
| `PROP_H_BREAK_EVEN` | direct_proportion | hard | The givens describe two RULES and what is asked is where they cross, with the strict inequality separated from the equality — so the equal point is a wrong option, not the key. |
| `RAT_H_MAX_PART` | ratios | hard | A largest admissible value under a ceiling and a wholeness condition at once. Dividing the bound by the ratio term, the natural first move, is wrong. |
| `MACH_H_MIN_SECOND_TYPE` | machines | hard | A smallest admissible count: derive the shortfall, invert it onto the second rate, round UP because a fraction of a machine cannot be hired. |

Hard coverage is **30 structures across 14 families**, no family holding more than
a fifth. `machines` reaches hard again — but not by re-promoting `MACH_H_TWO_CONFIG`,
which the RC2.6 calibration demoted and which is still medium. `tests/rc23-structure.test.mjs`
asserts that machines may reach hard *only* through the structure added here.

---

## 5. Sequence, scenario, Arabic and entity expansion

**Sequences (§4).** Eleven templates shared three stem skeletons and four asked
unknowns. The rule space gains multiply-add, a repeating three-operation cycle,
grouped terms and a digit-product rule; the target space gains a wrong term, a
previous term and a term two positions ahead. Every sequence still prints enough
supporting terms for its rule, and where a second reading exists it is one that
agrees.

**Arabic.** Four genuinely different sentence structures, not four wordings of one:
a compact sentence with the givens conjoined; a sequence of short sentences; an
explicit `المعطيات:` list; and the exam layout `المطلوب: … المعطيات: …`, where the
requested quantity is a noun phrase rather than an interrogative. Information order
varies where the clauses are self-contained, including outcome-first — a clause
beginning «ثم» or referring back to «الباقي» is not self-contained and such a
template keeps its order.

**Lexicon.** Twenty new units, each with the four forms the lexicon has always
required, so a composed stem inflects exactly as a hand-written one. `npm run
test:units` passes outright for the first time: one violation introduced here (by
declaring «قيمة» a unit) is reworded, and three that predate RC2.7 are routed
through the formatter.

**Entities.** 24 → 48 personal names with declared gender, plus sites and
apparatus. Everything that must agree with a drawn entity is STORED rather than
derived — the object suffix (`باعه` vs `باعها`), the feminine marker on a passive
verb (`بيع` vs `بيعت`), the nominative form for a passive subject, each seller's own
conjugated verbs — because a table that cannot produce wrong agreement is better
than one that can and relies on being used carefully.

---

## 6. Novelty and distractor controls

The caps that existed before bound one dimension each. Neither said anything about
how a session *reads*: two questions can respect every cap and still arrive one
after the other as the same situation, asked the same way, in the same sentence
shape. The scheduler binds four things they could not:

1. the exact combination — reasoning + construction + target + stem — may not repeat inside a session at all;
2. two consecutive questions may not match on three or more dimensions;
3. no construction, target, scenario, entity pattern or sentence shape may dominate, and no single named entity may appear more than 6 times in fifty, or more than 3 per fifty across a whole batch;
4. a candidate matching an earlier question on five or more dimensions is deprioritised rather than taken first.

**Nothing is silent.** The verdict that decides whether a breach is recorded is
taken at COMMIT, on the question actually being delivered — not carried from
wherever the candidate was chosen, because the relaxed fallback can arrive from a
branch that never consulted the scheduler, and a control consulted on only some
paths can be bypassed without anyone being told. Every relaxation appears twice:
as a `NOVELTY_FALLBACK` session warning naming its dimension, and as a breach in
`validation.novelty.breaches`. A test asserts the two lists have the same length.

The vetoes are **staged** like the template preference before them — binding for
the first two thirds of the retry budget, advisory after. A veto that held to the
last retry did not make sessions more varied; it made the loop fall through to the
fallback, which is free to breach the OLDER caps on reasoning and template share.
That showed up as a reasoning path repeating six times against a cap of five.

**Distractors.** The eight new structures carry options derived from the slips
their own reasoning path produces — stopping at the equal point rather than the
first point beyond it; dividing by one rate instead of the gap between two;
rounding down where a whole machine is needed; summing a term's digits instead of
multiplying them; continuing the first run of a pair instead of applying the pair
rule. Nine new misconception entries name them. Every existing guard still holds:
a wrong option must be the product of a nameable mistake, its stated derivation
must actually produce it, and no option may be a duplicate, an equivalent, or
accidentally correct.

---

## 7. BEFORE vs AFTER

Identical definitions on both sides. Five independent seeded 250-question batches
(4 mixed sessions of 50 + 1 all-hard session of 50), same five seeds before and after.

### 7.1 Per family — the surface a reader sees

| family | templates | stem skeletons | per template | constructions | targets |
| --- | ---: | ---: | ---: | ---: | ---: |
| sequences | 11 → 16 | 3 → **5** | 0.27 → 0.31 | 18 → 25 | 4 → 7 |
| ratios | 7 → 8 | 16 → **36** | 2.29 → 4.5 | 10 → 11 | 8 → 9 |
| percentages | 9 → 9 | 12 → **20** | 1.33 → 2.22 | 9 → 9 | 9 → 9 |
| averages | 9 → 9 | 9 → **272** | 1 → 30.22 | 9 → 63 | 9 → 9 |
| ages | 8 → 8 | 20 → **49** | 2.5 → 6.13 | 8 → 8 | 5 → 5 |
| speed | 10 → 10 | 30 → **162** | 3 → 16.2 | 12 → 59 | 12 → 12 |
| work_time | 11 → 11 | 45 → **84** | 4.09 → 7.64 | 11 → 11 | 11 → 11 |
| machines | 9 → 10 | 27 → **210** | 3 → 21 | 9 → 67 | 8 → 9 |
| direct_proportion | 10 → 11 | 51 → **116** | 5.1 → 10.55 | 13 → 14 | 8 → 9 |
| fractions | 3 → 3 | 163 → **163** | 54.33 → 54.33 | 8 → 8 | 3 → 3 |
| unit_rate | 7 → 7 | 10 → **128** | 1.43 → 18.29 | 7 → 47 | 6 → 6 |
| combined_rate | 8 → 8 | 23 → **166** | 2.88 → 20.75 | 8 → 56 | 7 → 7 |
| relational | 9 → 9 | 82 → **82** | 9.11 → 9.11 | 29 → 29 | 19 → 19 |
| calendar | 9 → 9 | 175 → **208** | 19.44 → 23.11 | 9 → 9 | 8 → 8 |
| odd_one_out | 7 → 7 | 1 → **1** | 0.14 → 0.14 | 7 → 7 | 1 → 1 |
| profit_loss | 10 → 10 | 12 → **79** | 1.2 → 7.9 | 11 → 66 | 11 → 11 |
| **total** | **137 → 145** | **679 → 1781** | | | |

Distinct stem skeletons across the generator: **679 → 1781**, a factor of 2.6.

### 7.2 Per 250-question batch (mean of 5 seeds)

| measure | BEFORE | AFTER |
| --- | ---: | ---: |
| distinct constructions | 120.8 | 168.2 |
| largest construction group | 5 | 5 |
| distinct stem skeletons | 142.2 | 203.4 |
| largest stem-skeleton group | 16 | 9.8 |
| distinct skills | 114.8 | 111.4 |
| parameter-only variants, largest group | 5 | 5 |
| reasoning+target, largest group | 5 | 5 |
| distinct entities | 22 | 30.8 |
| largest entity group | 16.2 | 18.4 |
| longest similar-question run | 2.2 | 2 |
| exact duplicates | 0 | 0 |
| semantic duplicates | 0 | 0 |

### 7.3 Per 50-question mixed session (mean of 20 sessions)

| measure | BEFORE | AFTER |
| --- | ---: | ---: |
| distinct constructions (of 50) | 46 | 49.4 |
| largest construction group | 2 | 1.4 |
| distinct stem skeletons (of 50) | 44.9 | 48.5 |
| largest stem-skeleton group | 3.2 | 2 |
| distinct skills | 45.7 | 46.8 |
| distinct entities | 18.2 | 25.2 |
| largest entity group | 4.1 | 5.6 |
| longest similar-question run | 0.3 | 0.2 |

### 7.4 The all-hard session — where the pressure is

| measure | BEFORE | AFTER |
| --- | ---: | ---: |
| distinct constructions (of 50) | 31 | 35 |
| largest construction group | 2.6 | 3 |
| distinct stem skeletons (of 50) | 32.8 | 41 |
| largest stem-skeleton group | 5.8 | 4.4 |
| distinct skills | 28.6 | 28 |
| distinct entities | 19.8 | 21.6 |
| largest entity group | 6.4 | 5.2 |
| longest similar-question run | 1.6 | 2 |

Fifty hard slots drawn from 30 hard structures cannot satisfy the novelty controls,
and they are not pretended to: the all-hard sessions record 21.6 recorded relaxations on
average, each naming the dimension it relaxed. That is the honest reading of a
coverage limit, not a diversity claim.

### 7.5 What did not improve, and why

Three figures in the tables above are flat or worse. They are reported because a
report that only lists the numbers that moved is not evidence.

- **Largest construction group, largest parameter-only group, largest
  reasoning+target group — all 5, before and after, at batch level.** These are
  the RC2.2/RC2.3 batch caps doing exactly what they were built to do: five is
  `maxReasoningRepeatsPerBatch`. No RC2.7 control can reduce a number another
  control is holding at its ceiling, and raising the cap to make the figure look
  better would be the opposite of the brief.
- **Distinct skills, 114.8 → 111.4 per batch.** A skill is `family/subskill`, and
  eight of the new structures share subskills with the band they were added to
  while the batch size is unchanged — so a fixed 250 slots spread across slightly
  fewer skill labels. Healthy recurrence of a skill is not a defect, and the
  brief says so; what must not recur is the construction, which fell from a
  largest group of 2 to 1.4 per session.
- **Largest entity group at batch level, 16.2 → 18.4.** RC2.6 stems frequently
  named no entity at all, so its concentration figure was low for the wrong
  reason. RC2.7 names entities far more often (22 → 30.8 distinct) and bounds
  the concentration rather than avoiding it. One remediation cycle already
  brought the worst observed case from 25 to 17 by adding a batch-level budget;
  the residual is stated as a ceiling in §10.

---

## 8. Validation results

`node tools/audit/rc27-validation.mjs` — five batches, a same-seed replay, and a
4,000-draw stress run. Full record in `rc2/RC27_VALIDATION.json`. Accepted: **true**.

| seed | questions | wrong keys | ambiguous | no valid answer | duplicate options | exact dup | semantic dup | exhaustions | telemetry |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| RC27-V1 | 250 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | balanced |
| RC27-V2 | 250 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | balanced |
| RC27-V3 | 250 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | balanced |
| RC27-V4 | 250 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | balanced |
| RC27-V5 | 250 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | balanced |

| seed | novelty rejections | of which dominance | fallbacks | novelty exhaustions |
| --- | ---: | ---: | ---: | ---: |
| RC27-V1 | 603 | 531 | 34 | 0 |
| RC27-V2 | 535 | 454 | 32 | 0 |
| RC27-V3 | 580 | 507 | 37 | 0 |
| RC27-V4 | 607 | 547 | 35 | 0 |
| RC27-V5 | 631 | 564 | 39 | 0 |

**Reproducibility.** 3 seeds replayed in fresh engines, 
0 failures. Item ids, chosen options and answer values all identical.

**Stress.** 4000 draws across all three bands: 4000 delivered, 
0 exhausted (rate 0), telemetry balanced, 
longest similar run 2, every safety gate zero.

**Regression.** 454 tests, 435 pass, 0 fail, 19 skipped (12 pre-existing, 7 freeze
tests that stand down until §24 retakes the freeze). `npm run test:units` passes.

**Internal gate.** `PASS` — 39 conditions, 0 failed.

### Required gates

| gate | required | observed |
| --- | --- | --- |
| wrong keys | 0 | 0 |
| published ambiguous items | 0 | 0 |
| published NO_VALID_ANSWER items | 0 | 0 |
| duplicate / equivalent options | 0 | 0 |
| exact duplicates | 0 | 0 |
| semantic duplicates | 0 | 0 |
| reproducibility failures | 0 | 0 |
| telemetry failures | 0 | 0 |
| unexplained fallback or cap breach | 0 | 0 — every relaxation carries its dimension and appears as both a session warning and a recorded breach |

---

## 9. Human-review examples

`rc2/RC27_EXAMPLES.md` renders, for every family, its three largest repeated
construction groups with the questions exactly as a candidate would meet them.
One group, to show what the table above means in practice — the same construction,
the same mathematics, four sentence shapes:

> المعطيات: متوسط الصفحات كلها في سجل عدد صفحات 11 كتابًا هو 22 صفحة؛ متوسط أول 6 كتب في السجل هو 18 صفحة؛ متوسط آخر 6 كتب فيه هو 24 صفحة. فما عدد صفحات الكتاب الذي يقع في الموضع الأوسط من السجل؟
>
> — `AVG_H_OVERLAP` · hard · listed/given

> متوسط أعداد الزوار كلها في سجل عدد الزوار في 5 أيام هو 17 زائرًا. متوسط أول 3 أيام في السجل هو 19 زائرًا. متوسط آخر 3 أيام فيه هو 12 زائرًا. فما عدد زوار اليوم الذي يقع في الموضع الأوسط من السجل؟
>
> — `AVG_H_OVERLAP` · hard · sequential/given

> المطلوب: عدد زوار اليوم الذي يقع في الموضع الأوسط من السجل. المعطيات: متوسط أعداد الزوار كلها في سجل عدد الزوار في 9 أيام هو 13 زائرًا؛ متوسط أول 5 أيام في السجل هو 12 زائرًا؛ متوسط آخر 5 أيام فيه هو 17 زائرًا.
>
> — `AVG_H_OVERLAP` · hard · question_first/given

> متوسط أوزان 5 صناديق في مستودع هو 12 كيلوجرامًا، وأُدخل إلى المستودع صندوق وزنه 27 كيلوجرامًا. فما متوسط الأوزان بعد الإضافة؟
>
> — `AVG_E_ADD` · medium · compact/given

Under RC2.6 all four read: «متوسط 6 قيم هو 20. أضيفت قيمة جديدة مقدارها 27. فما
متوسط القيم بعد الإضافة؟» with different numbers.

---

## 10. Remaining weak families and safe diversity ceilings

| family | ceiling | why, and what was done instead |
| --- | --- | --- |
| `odd_one_out` | 1 stem skeleton | Six numbers and «which does not belong». There is one way to ask it, and rewording the line would be synonym replacement, which the brief does not count. Its breadth is in the RULES the sets are built on (7 rule families) and is bounded per session by the construction cap. |
| `sequences` | ~5 stem skeletons | A row of numbers and a one-line question. RC2.7 widened what the family can ASK (a wrong term, a previous term, a term two ahead) and what its rules can BE (multiply-add, an operation cycle, paired terms, a digit-product step) instead: 18 → 25 constructions and 4 → 7 targets. The variety a reader meets is in the run, not the sentence. |
| `fractions` | unchanged | Three templates, already 163 skeletons because the fraction names themselves vary. No scenario layer was added; nothing here was repetitive. |
| `relational` | unchanged | 82 skeletons and 29 constructions from graph shape alone, the widest in the generator before RC2.7 and still so. |
| the all-hard session | 30 hard structures for 50 slots | Arithmetic, not taste: filling 50 slots from 30 structures cannot satisfy a cap that wants no structure twice. Reported as recorded relaxations rather than hidden. Raising it means adding hard structures, which is RC2.4/2.6/2.7 work, not a cap change. |
| entity concentration across a batch | 3 per 50 | About thirty entity words are in play; a 250-question batch names ~325 of them, so the mean word appears ~11 times. The cap sits at 15 for such a batch — half as much again as the mean. A tighter cap is arithmetically unsatisfiable and would generate breaches without preventing anything. |

---

## 11. The question

**Does a long session now feel like a genuinely large and varied question universe
rather than a small template bank with changed numbers and names?**

For a 50-question mixed session: **yes**, and the measurements say why rather than
asserting it.

- 49.4 distinct constructions out of 50, the largest group holding 1.4 items
- 48.5 distinct stem skeletons out of 50
- 25.2 distinct named entities, none appearing more than 6 times
- longest run of questions that read alike: 0.2
- zero exact duplicates, zero semantic duplicates, zero wrong keys, zero ambiguous items

For a 50-question **all-hard** session the answer is *better than before, and
bounded by coverage*: 30 hard structures cannot fill 50 slots without repetition,
and the release says so with recorded relaxations instead of a claim.

The evidence is `rc2/RC27_BEFORE.json`, `rc2/RC27_VALIDATION.json`,
`rc2/RC27_FAMILY_SURFACE.json` and `rc2/RC27_EXAMPLES.md`; every figure in this
report is read from them.

---

## 12. Final commit and repository status

| field | value |
| --- | --- |
| release | `RC2.7` |
| frozen commit | `1c982ee7b1d1c742aa11d23a9b783316d556a23c` |
| tree SHA | `706b82f9a119d64598871b679ae4c08e6b4743b9` |
| production bundle SHA-256 | `b694f614df6882e6bf78b653c0136ac28c4cbf2a859b608a0d04d40eea7d9d42` |
| production files | 54 |
| engine version | 1.4.0 |
| tests at freeze | 454 |
| development corpus | `rc2/RC27_DEVELOPMENT_CORPUS.json`, 10000 questions on 5 RC2.7 seeds, sha `ec5a65ab272b7bdd…` |
| sign-off holdout | `AUDIT-2026-09-13-G` — NAMED, not generated (`holdoutGenerated: false`) |
| spent holdouts | `AUDIT-2026-09-12-B` (FAILED_DIAGNOSTIC_HOLDOUT), `AUDIT-2026-09-12-C` (REVIEWED_AND_SPENT), `AUDIT-2026-09-12-D` (REVIEWED_AND_SPENT), `AUDIT-2026-09-12-E` (REVIEWED_AND_SPENT), `AUDIT-2026-09-13-F` (SEALED_AND_SPENT) |
| freeze verification | `verifyFreeze()` reports intact, recomputed bundle identical |
| working tree | clean at the freeze; §24 refuses a dirty one |

The RC2.6 freeze it supersedes is kept whole in `rc2/FREEZE.RC2_6.json`, and the
reason it was superseded is recorded in `rc2/SUPERSEDED_FREEZES.json`.

**The next blind holdout has not been generated.** The brief withholds it, and
`AUDIT-2026-09-13-G` is named here so that whatever is eventually drawn on it is
drawn against a stated engine rather than against whatever the tree happened to
hold that day.

