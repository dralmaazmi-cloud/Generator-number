# RC2.3 — HARD QUALITY FIX: validation report

RC2.2 was mathematically reliable and its HARD label was not human-valid. The
independent Holdout D audit is the authority for that: 250 of 250 keys correct,
one ambiguous item, 82 items released as HARD and 38 of them genuinely hard.

The cause was not a threshold. RC2.2 had made the published band identical to
the computed complexity band, which drove declared/computed agreement to 100%
while 44 items were mislabelled — a number that was true and meant nothing. A
single numeric axis cannot separate «قطعت سيارة نصف المسافة بسرعة 60 والنصف
الآخر بسرعة 50», where the asked quantity is hidden inside two expressions that
must be combined into an equation, from «عمل جهاز بمعدل 20 لمدة 3 ساعات ثم ارتفع
معدله 20%», which announces every step in the order the sentence states them.
Both have four operations and a chain of three.

RC2.3 decides the band by STRUCTURE and keeps the score as evidence.

---

## 1. HARD template adjudication

`src/qa/structure.js` adjudicates all 107 templates on the KIND of reasoning
they demand. The rule is stated so it can be argued with:

> A template is HARD_CAPABLE only if solving it requires at least one structural
> criterion below. Number of operations, number of steps, size of the numbers
> and depth of a dependency chain never qualify a template on their own — those
> are workload.

**Structural criteria** (a claim about the solution, not the answer):

| criterion | test |
| --- | --- |
| `SIMULTANEOUS_CONSTRAINTS` | Two or more conditions pin the answer jointly and cannot be discharged one after the other. |
| `COMPOSED_INVERSION` | The asked quantity sits behind a composition of two or more different transformations. Inverting ONE is routine. |
| `CROSS_PART_INTEGRATION` | Information from separate parts of the stem must be brought onto one footing before any step can be taken. |
| `RULE_DISCOVERY` | The rule is not stated and is not settled by the first thing a solver would try. |
| `PARTIAL_ORDER_BRANCHING` | Reasoning over an incomplete order in which some relations stay undetermined. |
| `STRATEGY_SELECTION` | More than one route exists and the efficient one is not signalled by the surface form. |

**Routine markers** — `SINGLE_FORMULA`, `FIXED_PIPELINE`, `REPEATED_OPERATION`.
A template carrying only these cannot be HARD, whatever it computes.

### Results

| band | templates | families |
| --- | --- | --- |
| EASY_CAPABLE | 37 | 14 |
| MEDIUM_CAPABLE | 51 | 14 |
| HARD_CAPABLE | **19** | **5** |

Criteria in use across the 19: `SIMULTANEOUS_CONSTRAINTS` 12, `CROSS_PART_INTEGRATION` 9,
`STRATEGY_SELECTION` 7, `COMPOSED_INVERSION` 5, `PARTIAL_ORDER_BRANCHING` 5,
`RULE_DISCOVERY` 2.

Every template is single-band. The brief allows a second band "only if its
parameters can genuinely change the reasoning burden"; in this engine a template
function fixes the SHAPE of its solution and its parameters vary the numbers
inside it. `tests/rc23-structure.test.mjs` samples every template across many
draws and fails if the structural evidence ever differs between draws, which is
what would make a second band legitimate. It does not.

Named by the brief as shapes that must not be HARD, and are not:
`PCT_M_SUCCESSIVE` and `PCT_H_CHAIN_VALUE` (chained percentages), `PROP_H_COST_PLUS`
(fixed-fee unit cost), `RATE_H_TWO_PHASE` and `MACH_M_NEW_FAST` (rate after
percentage), `PCT_E_REVERSE_ONE` and `PL_H_REVERSE` (straightforward reverse
percentage), `RAT_E_SPLIT` (simple ratio split), all seven `AVG_*` (routine
averages). Also demoted: the staged worker-day, machine and combined-rate
templates (`WORK_H_TWO_STAGE`, `MACH_H_STAGE_UP`, `COMB_H_STAGED` and their
siblings) — more stages is more arithmetic, not more reasoning.

### Independent regression evidence

The adjudication was written from template structure with no item id and no
per-item verdict in front of it. Applied afterwards to Holdout D's 82 HARD items:

| | |
| --- | --- |
| released as HARD by RC2.2 | 82 |
| independent audit says genuinely hard | **38** |
| RC2.3 adjudication keeps as HARD_CAPABLE | **37** |
| RC2.3 adjudication demotes | 45 |
| difference from the audit | **−1** |

This is the only genuinely independent check available, and it agrees to within
one item. No Holdout-D item id appears anywhere in production; the regression is
computed in `tools/audit/rc23-structure.mjs`.

---

## 2. HARD session selection

Selection and the published label now read one adjudication, so an ALL_HARD
session cannot contain an easier template — not as a policy but because there is
no other pool to draw from. Family pools are gone: each family lists the
templates it can build and `bandPool` asks the adjudication which are eligible.
`FAMILY_REGISTRY.difficulties` is derived the same way and is no longer written
down.

Six ALL_HARD sessions, 300 questions, fresh seeds: **0 not from a HARD_CAPABLE
structure, 0 failed sessions, 19 distinct templates, 5 families.**

The brief also requires explicit failure rather than quiet filling. A
single-band session of `count` questions needs at least
`ceil(count / maxTemplateIdRepeatsPerSession)` distinct structures, and the
engine checks that **before drawing anything**:

```
INSUFFICIENT_BAND_COVERAGE: 50 hard slots need 13 distinct structures,
the selected families hold 2 (families with none at hard: …)
```

Previously the shortage was discovered at question forty-three, after hundreds
of discards, and resolved by relaxing a cap.

---

## 3. MEDIUM / EASY cleanup

The same adjudication moved items in both directions.

**Easy that required multi-stage reasoning → up.** `SPD_H_CATCH` (head start
recast in closing speed) went easy → **hard**, alongside `SPD_H_MEET_DELAY`, so
two templates with one structure are no longer two bands apart. `AVG_H_TARGET`
and `SEQ_M_INTERLEAVED` easy → medium; `ODD_H_SQ_MINUS` and `ODD_H_TRIANGULAR`
easy → medium (the property is a transformation of the number, not the number).

**Medium that was really easy → down.** `RAT_E_SPLIT`, `AVG_E_ADD` and
`AVG_E_REMOVE` medium → easy: one relationship applied, at most twice.

No family is forced to serve every band. `fractions` serves easy only,
`machines` medium only, `ratios` easy and hard with no medium, `ages` medium and
hard with no easy.

Two templates, `PROP_E_COST` and `PROP_M_RECIPE`, had fallen out of every RC2.2
pool and stopped being generated at all — nothing reported it, because the
inventory count was pinned at what was left. Both are reachable again, and the
inventory test now pins 107.

---

## 4. Distractors

Measured on 4,000 fresh questions (20,000 wrong options).

| shape | before | after |
| --- | --- | --- |
| non-whole option where the answer counts indivisible things | 4.87% of candidates | **0.63% of published options** |
| a diagnosis already on the page repeated | 14.9% | **6.9% overall, 4.2% excluding the two families that repeat by construction** |
| option outside a template's declared answer bounds | 0 | **0** |

Two generator-level repairs:

**Count-unit plausibility.** `unitFormat` now carries the unit it is bound to, so
`buildBase` knows without a template saying so whether the asked quantity counts
indivisible things (workers, machines, pieces, boxes, tasks, people, items,
words — not hours, dirhams, km or cups). A mistake landing on 8.67 workers is a
real slip but not an answer anyone would write, and next to five whole numbers it
is a free elimination. The unit is in the question, not the key, so this reads
nothing about the answer. Demoted, never dropped: a template with nothing better
still uses it, so no answer space narrows.

**Misconception spread.** `makeOptionSet` now round-robins across distinct
misconceptions when choosing five from the candidate pool. This selects on
provenance — which slip a candidate came from — never on value, key or the shape
of the resulting set.

### What was deliberately not done, and why

Out-of-scale options run at 3.5% at a 25× threshold. Sampling them shows they
are almost entirely legitimate misconception-derived values: `STOPPED_AT_UNIT_RATE`,
`STOPPED_AT_INTERMEDIATE_TOTAL`, `REVERSED_DIRECT_PROPORTION`,
`USED_SUM_OF_SPEEDS_IN_CHASE`. Suppressing them would mean choosing which options
appear by comparing them to the published answer, which OBSERVE_NEVER_TARGET
forbids, and the RC2.2 brief said plainly not to suppress legitimate distractors
merely because they are numerically far from the key. RC2.2 tried a bounds rule
on the averages templates, measured that it would have killed the
"stopped at the intermediate total" slip, and reverted it.

**Area 4 is therefore PARTIALLY ADDRESSED.** Two of the three named shapes are
repaired at generator level and measured; the third — "obviously impossible
magnitudes" — is reported rather than suppressed, because on inspection the
options carrying it are diagnosing real mistakes. A residual thinness remains in
specific templates (`COMB_M_TOGETHER_SOLO`, `FRAC_M_3`, `AVG_H_COMB_ADD`) whose
plausible candidate pools sometimes offer fewer than five distinct slips; that is
a supply problem in those templates, named here rather than half-fixed.

---

## 5. Repetition

Three kinds counted apart, on three 250-question multi-session batches (4 mixed
+ 1 ALL_HARD), fresh seeds:

| | batch A | batch B | batch C |
| --- | --- | --- | --- |
| exact duplicates | **0** | **0** | **0** |
| semantic duplicates | **0** | **0** | **0** |
| distinct reasoning paths | 114 | 119 | 121 |
| most-used reasoning path | 5 | 5 | 5 |
| cap breaches warned | 0 | 0 | 0 |
| distinct templates (reuse, not a defect) | 91 | 95 | 98 |

Caps: 3 per session, 5 per batch. Ordinary template reuse is untouched.

One new cap. The per-session cap counted a VARIANT — a template paired with the
quantity it asks for — so a template askable three ways could occupy **nine of
fifty** slots and no diversity warning was raised, because no variant had
exceeded anything. Measured on RC2.3 hard sessions it did exactly that.
`maxTemplateIdRepeatsPerSession` (4) bounds how much of a session one template's
surface may occupy; the variant cap is right and stays, because different
asked-unknowns are genuinely different reasoning. Hard sessions now show a
maximum share of 4 in 50, down from 9.

Session discards are counted by reason where they happen. The §23 gate used to
reconstruct that from a hand-written list of reason codes; the list was missing
the two codes added since, so three named discards were reported as anonymous.

---

## 6. Language

**The 125% rise.** RC2.1 attached «من القيمة السابقة» at 100% and above; the
Holdout D audit found that still ambiguous, correctly — «بنسبة 125% من القيمة
السابقة» names the base without saying whether the 125% is the increment or the
result. The word carrying the ambiguity is «بنسبة», a ratio, which a result can
be as easily as an increment. «بمقدار» cannot: it is additive and only additive.

Every rise now renders as «بمقدار {p}% من القيمة السابقة», at any percentage, so
the threshold is gone too. One stem — `MACH_H_STAGE_UP` — had never gone through
the renderer at all («فزادت إنتاجيتها ${pct}%»), so the RC2.1 fix had never
applied to it.

**Nested fractions.** «ثلث نصف ربع سُدس عدد يساوي 2» stacks four scopes with no
syntax between them — a reading difficulty, not the reasoning the item measures.
Now: «ثلث عدد، ثم نصف الناتج، ثم ربع الناتج، ثم سُدس الناتج، فكان الناتج 2. فما
العدد؟» — the same order the published solution takes, so stem and explanation
cannot drift apart.

---

## Validation

Fresh development seeds `RC23-DEV-PI … RC23-DEV-UPSILON`, used by no earlier
release. 10,000 questions.

| measurement | result |
| --- | --- |
| wrong keys | **0** of 10,000 (oracle disagreement, post-shuffle key mismatch, zero/multiple correct options, correct-value mismatch: all 0) |
| ambiguous questions published | **0** (499 odd-one-out items: 411 CLEAN, 88 BORDERLINE, 0 published ambiguous or undiscoverable) |
| invalid or unclassified Arabic | **0** of 82,825 constructions |
| templates reached | **107** of 107; families 16 of 16 |
| exhaustions | **0** |
| latency | p50 0.85 ms, p95 1.56 ms, p99 2.12 ms (885 questions/second) |
| seed reproducibility | identical through both APIs |

### Fresh band samples, 300 each, unseen seeds

| | hard | medium | easy |
| --- | --- | --- | --- |
| released at the wrong band | 0 | 0 | 0 |
| structural contradictions | **0** | **0** | **0** |
| distinct templates reached | 19/19 | 51/51 | 37/37 |
| exhausted | 0 | 0 | 0 |
| p95 latency | 3 ms | 2 ms | 2 ms |

"Structural contradictions" re-adjudicates each question against what it
publishes — an item claiming `SIMULTANEOUS_CONSTRAINTS` that solves no equation
and holds no joint conditions is a contradiction. The check is one-directional
and is reported as such: it can falsify an entry, it cannot confirm one. It did
falsify one during development — `AGE_H_PAST_FUT` claimed
`SIMULTANEOUS_CONSTRAINTS` while discharging its two conditions in sequence. The
claim was removed; the template stays hard on its other two criteria.

### Proportion of genuinely HARD questions

**100% of released hard items come from HARD_CAPABLE structures — and that
figure is a check on the wiring, not a finding.** Selection and the label read
one adjudication, so it is true by construction; a value below 1 would mean the
wiring has a hole. The measurement that is not circular is the Holdout D
regression above (−1 item against an independent human audit) and the
contradiction count (0 of 900).

### Score vs structure — evidence, not a target

The RC2.2 complexity score no longer decides anything, and it is still computed
and published beside the band. How often it would have agreed:

| band | agreement |
| --- | --- |
| hard | 97% |
| easy | 85% |
| medium | 58% |
| whole 10,000-question corpus | **79.7%** |

This number is now meaningful in a way it was not under RC2.2, precisely because
it can be wrong: the two views are independent. It is reported, and it is not a
target. Driving it to 100% would mean fitting one to the other, which is the
circularity RC2.2 fell into.

### Distractor weakness and repetition

Reported in sections 4 and 5. Summary: 0 options outside declared bounds, 0.63%
non-whole counts, 4.2% repeated diagnoses outside the two structural families,
0 exact and 0 semantic duplicates in 750 questions across three batches, most-used
reasoning path 5 of 250.

### Gate and suite

`npm test` — 398 tests, **0 failures**, 12 skipped (each with a stated
supersession and a named replacement).
`npm run test:units` — PASS. `npm run test:stress` — PASS.
§23 internal gate — **PASS, 35 conditions, 0 failed**: ten new RC2.3 conditions
added and two RC2.2 conditions removed, against 27 before.

Two RC2.2 gate conditions were replaced rather than relaxed:
`DIFFICULTY_GATE_HOLDS` checked that the released band equalled the computed one,
which RC2.2 had made true by construction; `ALL_HARD_IS_HARD` required eight
families in a hard session, which only five can supply without routine filler.
The families figure is now measured and reported by `HARD_COVERAGE_REPORTED`
instead of being met.

Correspondingly, four RC2.2 tests are marked superseded with the reason and the
replacement named, not deleted.

---

## The blocker

The engine holds **19 HARD_CAPABLE structures across 5 of 16 families**.

| band | structures | families | mean uses per structure in a 250-question batch |
| --- | --- | --- | --- |
| easy | 37 | 14 | 2.22 |
| medium | 51 | 14 | 1.61 |
| **hard** | **19** | **5** | **4.32** |

The five that can contribute: `sequences` (2), `ratios` (5), `ages` (3),
`speed` (4), `relational` (5).

The eleven that cannot contribute anything to a hard session:
`percentages`, `averages`, `work_time`, `machines`, `direct_proportion`,
`fractions`, `unit_rate`, `combined_rate`, `calendar`, `odd_one_out`,
`profit_loss`.

A 50-question ALL_HARD session is deliverable — 19 structures against a floor of
13 — but only just, and it costs about six discarded candidates per delivered
question. A 250-question batch draws 82 hard slots from 19 structures. Under
RC2.2 the same session drew on 32 templates across 10 families, and the audit
found 44 of those items were not hard; the honest position is that RC2.2 had
10 families because 11 of them were supplying routine work, not because the
coverage existed.

The brief anticipates this exactly: *"If the current generator cannot produce
enough genuinely hard and diverse questions, fail explicitly and report which
families need new HARD templates."* It also says not to invent new templates
before the capability audit. The audit is done and the answer is that new HARD
templates are needed, in these families and of these shapes:

| family | what it lacks | the shape a HARD template would need |
| --- | --- | --- |
| `percentages` | any hard structure | a percentage relation that must be inverted through a composition, or two percentage conditions holding at once (e.g. a discount and a margin both stated against different bases) |
| `work_time` | any hard structure | two crews whose combined and individual rates are given only relationally, so the rate must come out of an equation |
| `machines` | any hard structure | output known for two overlapping configurations, with the per-machine rate unstated |
| `combined_rate` | any hard structure | an unknown number of workers or an unknown rate recovered from two staged totals |
| `averages` | any hard structure | an average that constrains a set jointly with a second condition — a known element and a target both fixed |
| `profit_loss` | any hard structure | cost recovered from two prices at different margins, requiring simultaneous conditions |
| `direct_proportion`, `unit_rate` | any hard structure | a rate that must be inferred from a comparison rather than stated |
| `calendar` | any hard structure | modular reasoning with an unknown offset constrained from two observations |
| `sequences` | only 2 | further rules whose discovery is not settled by the first check |
| `ages` | only 3 | three-person relations across two time points |
| `odd_one_out`, `fractions` | structurally bounded | these two are correctly capped; a single-property search and a chain of unit fractions do not become hard by adding layers |

Nine families could carry a genuinely hard template of a shape they do not have
yet. Two are correctly at their ceiling.

---

## Targets

| target | status |
| --- | --- |
| 0 wrong keys | **met** — 0 of 10,000 |
| 0 ambiguous questions in validation | **met** — 0 published |
| HARD questions overwhelmingly genuinely hard | **met** — 0 routine structures released as hard; independent regression agrees to within one item of the human audit |
| no easy/medium filler in ALL_HARD | **met** — 0 of 300 |
| materially better distractors | **partly met** — two of the three named shapes repaired and measured; the third reported rather than suppressed, with reasons |
| materially lower reasoning repetition | **met** — one template's share of a session down from 9 in 50 to 4; 0 exact and 0 semantic duplicates |
| enough genuinely HARD structures | **NOT met** — 19 structures over 5 of 16 families |

The bar was not lowered to reach any of these.

---

## Freeze

RC2.3 is frozen at commit `337cff33`, taken after the §23 gate passed 35/35 on
`fede1994` with a clean tree. Production is byte-identical between the gated and
the frozen commit — the only difference is the gate's own result file — and
`verifyFreeze()` confirms the bundle is intact. The RC2.2 freeze is archived at
`rc2/FREEZE_RC2_2.json` and recorded in `rc2/SUPERSEDED_FREEZES.json` as spent —
Holdout D was generated from exactly that production state.

**No holdout has been generated.** The next sign-off seed is declared in
`tools/audit/rc2-development-corpus.mjs` and used nowhere — it is deliberately
not written out here, because the §23 gate scans this directory for it and a
report that names it would be indistinguishable from one that used it. Holdouts
B, C and D are recorded as spent and are not reused. Stage 1 has not been
started.

---

## Appendix — all 107 template capability classifications

**sequences** — serves easy, medium, hard

| template | capability | structural criteria / routine markers | why |
| --- | --- | --- | --- |
| `SEQ_E_ARITH` | EASY_CAPABLE | SINGLE_FORMULA | Constant difference; found by the first check. |
| `SEQ_E_GEO` | EASY_CAPABLE | SINGLE_FORMULA | Constant ratio between adjacent terms; the first thing a solver checks is the answer. |
| `SEQ_H_RECURRENCE` | MEDIUM_CAPABLE | FIXED_PIPELINE | Each term from the previous two; a solver who tries a+b finds it immediately. |
| `SEQ_M_ALT_OPS` | MEDIUM_CAPABLE | FIXED_PIPELINE | Alternating add/multiply; both operands are visible once the alternation is seen. |
| `SEQ_M_DOUBLE_DIFF` | MEDIUM_CAPABLE | FIXED_PIPELINE | Doubling differences; one layer below the surface. |
| `SEQ_M_INC_DIFF` | MEDIUM_CAPABLE | FIXED_PIPELINE | Differences of differences — the second move in the standard repertoire. |
| `SEQ_M_INTERLEAVED` | MEDIUM_CAPABLE | FIXED_PIPELINE | Two strands must be separated first, but "look at every other term" is the standard second move. |
| `SEQ_H_ALT_DIV` | HARD_CAPABLE | RULE_DISCOVERY, STRATEGY_SELECTION | Two alternating operations where one operand advances between applications — neither the alternation nor the advancing divisor is visible from differences or ratios alone. |
| `SEQ_H_POW_INDEX` | HARD_CAPABLE | RULE_DISCOVERY, STRATEGY_SELECTION | Nothing works until the solver subtracts each term’s POSITION, which no difference or ratio check suggests; only then do the powers appear. |

**ratios** — serves easy, hard

| template | capability | structural criteria / routine markers | why |
| --- | --- | --- | --- |
| `RAT_E_KNOWN` | EASY_CAPABLE | SINGLE_FORMULA | One part is given; divide and multiply. |
| `RAT_E_SPLIT` | EASY_CAPABLE | SINGLE_FORMULA | Simple ratio split — named by the brief as not hard, and it is not medium either: total ÷ parts × share. |
| `RAT_H_TRANSFER` | HARD_CAPABLE | SIMULTANEOUS_CONSTRAINTS, COMPOSED_INVERSION, CROSS_PART_INTEGRATION | Two ratios plus the unstated fact that the transfer conserves the total; the conservation is what makes the equation solvable and it is not in the sentence. |
| `RAT_H_TWO_COMB` | HARD_CAPABLE | CROSS_PART_INTEGRATION, STRATEGY_SELECTION | As RAT_M_COMMON_SUM, asking for the term that was not part of the given combination. |
| `RAT_M_ADD_SIDE` | HARD_CAPABLE | SIMULTANEOUS_CONSTRAINTS, COMPOSED_INVERSION | A before-ratio and an after-ratio hold at once; neither can be evaluated alone, so the part value has to come out of an equation. |
| `RAT_M_COMMON_DIFF` | HARD_CAPABLE | CROSS_PART_INTEGRATION, STRATEGY_SELECTION | As RAT_M_COMMON_SUM, with the joint condition given as a difference. |
| `RAT_M_COMMON_SUM` | HARD_CAPABLE | CROSS_PART_INTEGRATION, STRATEGY_SELECTION | Two ratios stated about different pairs must be put on one scale through the shared term before a sum of two NON-adjacent terms means anything. |

**percentages** — serves easy, medium

| template | capability | structural criteria / routine markers | why |
| --- | --- | --- | --- |
| `PCT_E_OF` | EASY_CAPABLE | SINGLE_FORMULA | One percentage of one value. |
| `PCT_E_REVERSE_ONE` | MEDIUM_CAPABLE | SINGLE_FORMULA | Straightforward reverse percentage — named by the brief as not hard. One factor, one division. |
| `PCT_H_CHAIN_VALUE` | MEDIUM_CAPABLE | FIXED_PIPELINE, REPEATED_OPERATION | Direct chained percentages — named by the brief as not hard. Two applications of one idea. |
| `PCT_H_REVERSE_CHAIN` | MEDIUM_CAPABLE | FIXED_PIPELINE | Two factors multiplied, then one division. The composition is inverted in a single move that the sentence signposts, so it does not reach COMPOSED_INVERSION. |
| `PCT_M_REMAIN` | MEDIUM_CAPABLE | FIXED_PIPELINE | Percentage of a remainder; the order is the order of the clauses. |
| `PCT_M_SUCCESSIVE` | MEDIUM_CAPABLE | FIXED_PIPELINE, REPEATED_OPERATION | Chained percentages then one comparison against the original. Four operations, one idea. |
| `PCT_M_UNIT_PRICE` | MEDIUM_CAPABLE | FIXED_PIPELINE | Unit price, then a percentage, then a count. Each step is announced by the sentence. |

**averages** — serves easy, medium

| template | capability | structural criteria / routine markers | why |
| --- | --- | --- | --- |
| `AVG_E_ADD` | EASY_CAPABLE | SINGLE_FORMULA | Total from average, adjust, re-average. One relationship used twice. |
| `AVG_E_REMOVE` | EASY_CAPABLE | SINGLE_FORMULA | As AVG_E_ADD, downward. |
| `AVG_H_COMB_ADD` | MEDIUM_CAPABLE | FIXED_PIPELINE, REPEATED_OPERATION | Three totals pooled. One more addition than AVG_M_COMBINE and nothing else. |
| `AVG_H_TARGET` | MEDIUM_CAPABLE | FIXED_PIPELINE | Required total minus current total. Works backwards through ONE relationship, which is not COMPOSED_INVERSION. |
| `AVG_M_ADD_PAIR` | MEDIUM_CAPABLE | FIXED_PIPELINE | As AVG_M_COMBINE with a pair given by its own average. |
| `AVG_M_COMBINE` | MEDIUM_CAPABLE | FIXED_PIPELINE | Two totals reconstructed and pooled; routine averaging, named by the brief as not hard. |
| `AVG_M_REPLACE` | MEDIUM_CAPABLE | FIXED_PIPELINE | Replacement as a delta on the total. |

**ages** — serves medium, hard

| template | capability | structural criteria / routine markers | why |
| --- | --- | --- | --- |
| `AGE_E_MULT_DIFF` | MEDIUM_CAPABLE | SINGLE_FORMULA | Ratio and difference at one time point; parts arithmetic, no second time point. |
| `AGE_E_SUM_DIFF` | MEDIUM_CAPABLE | SINGLE_FORMULA | Sum and difference at one time point; the half-the-difference move is a standard named technique. |
| `AGE_M_FUT_SUM_DIFF` | MEDIUM_CAPABLE | FIXED_PIPELINE | Shift the sum back by 2×years, then sum-and-difference. The shift is mechanical and the sentence orders it. |
| `AGE_M_RATIO_FUT_SUM` | MEDIUM_CAPABLE | FIXED_PIPELINE | As AGE_M_FUT_SUM_DIFF with a ratio; the two conditions are still evaluated one after the other. |
| `AGE_H_PAST_FUT` | HARD_CAPABLE | COMPOSED_INVERSION, CROSS_PART_INTEGRATION | Three time points: a future sum must be carried back through the present to a past ratio before either condition can be used. |
| `AGE_H_TWO_TIME` | HARD_CAPABLE | SIMULTANEOUS_CONSTRAINTS, CROSS_PART_INTEGRATION | As AGE_M_FUT_RATIO; the equation is unavoidable. |
| `AGE_M_FUT_RATIO` | HARD_CAPABLE | SIMULTANEOUS_CONSTRAINTS, CROSS_PART_INTEGRATION | A difference NOW and a ratio LATER; neither time point can be resolved alone, so an unknown must be carried across both. |

**speed** — serves easy, medium, hard

| template | capability | structural criteria / routine markers | why |
| --- | --- | --- | --- |
| `SPD_E_DISTANCE` | EASY_CAPABLE | SINGLE_FORMULA | distance = speed × time. |
| `SPD_E_TIME` | EASY_CAPABLE | SINGLE_FORMULA | time = distance ÷ speed. |
| `SPD_M_AVG` | MEDIUM_CAPABLE | FIXED_PIPELINE | Total distance over total time; the trap is real but the route is announced. |
| `SPD_M_TWO_TIME` | MEDIUM_CAPABLE | FIXED_PIPELINE, REPEATED_OPERATION | Two leg times added, then a unit conversion. One idea twice. |
| `SPD_H_CATCH` | HARD_CAPABLE | CROSS_PART_INTEGRATION, STRATEGY_SELECTION | The head start has to be turned into a distance and the chase recast in closing speed — a frame the sentence does not offer. |
| `SPD_H_MEET_DELAY` | HARD_CAPABLE | CROSS_PART_INTEGRATION, STRATEGY_SELECTION | As SPD_H_CATCH, approaching rather than chasing, with the gap reduced by the delay first. |
| `SPD_H_TIME_DIFF` | HARD_CAPABLE | SIMULTANEOUS_CONSTRAINTS, COMPOSED_INVERSION | The distance is defined only by the DIFFERENCE of two times it produces; nothing numeric can be computed before the equation is formed. |
| `SPD_M_EQUAL_DIST` | HARD_CAPABLE | SIMULTANEOUS_CONSTRAINTS, COMPOSED_INVERSION | The unknown distance appears inside both leg times and cannot be evaluated until the two are combined into one equation. |

**work_time** — serves easy, medium

| template | capability | structural criteria / routine markers | why |
| --- | --- | --- | --- |
| `WORK_E_INVERSE` | EASY_CAPABLE | SINGLE_FORMULA | worker-days is constant; one multiplication and one division. |
| `WORK_E_VOLUME` | EASY_CAPABLE | SINGLE_FORMULA | Workers scale with the work when time is fixed. |
| `WORK_M_EFF` | EASY_CAPABLE | SINGLE_FORMULA | One efficiency factor, applied inversely to the time. |
| `WORK_H_TWO_STAGE` | MEDIUM_CAPABLE | FIXED_PIPELINE, REPEATED_OPERATION | Three stages of the same worker-day accounting. More arithmetic, no new idea. |
| `WORK_H_WORKERS_EFF` | MEDIUM_CAPABLE | FIXED_PIPELINE | Worker-day accounting with one efficiency factor inserted. The factor is stated where it applies. |
| `WORK_M_CHANGE` | MEDIUM_CAPABLE | FIXED_PIPELINE | As WORK_M_TARGET with the crew size changing; still one stage after another. |
| `WORK_M_TARGET` | MEDIUM_CAPABLE | FIXED_PIPELINE | worker-days done, remaining, divided by a fixed span. Each step follows the clause before it. |

**machines** — serves medium

| template | capability | structural criteria / routine markers | why |
| --- | --- | --- | --- |
| `MACH_E_HOURS` | MEDIUM_CAPABLE | FIXED_PIPELINE | machine-hour rate, then a new machine-hour total. |
| `MACH_E_REQUIRED` | MEDIUM_CAPABLE | FIXED_PIPELINE | machine-hour rate, then the count needed. Routine both ways. |
| `MACH_H_STAGE_UP` | MEDIUM_CAPABLE | FIXED_PIPELINE, REPEATED_OPERATION | MACH_M_SUBSET_UP with a second stage appended. Six operations, still one idea per clause. |
| `MACH_H_TWO_TYPES` | MEDIUM_CAPABLE | FIXED_PIPELINE | Two group rates summed, then multiplied by a time. |
| `MACH_M_NEW_FAST` | MEDIUM_CAPABLE | FIXED_PIPELINE | Routine rate-after-percentage — named by the brief as not hard. |
| `MACH_M_STOP` | MEDIUM_CAPABLE | FIXED_PIPELINE, REPEATED_OPERATION | Two stages of the same rate × count × hours product. |
| `MACH_M_SUBSET_UP` | MEDIUM_CAPABLE | FIXED_PIPELINE | The group splits into upgraded and not, but the split is stated; the rates then add. |

**direct_proportion** — serves easy, medium

| template | capability | structural criteria / routine markers | why |
| --- | --- | --- | --- |
| `PROP_E_COST` | EASY_CAPABLE | SINGLE_FORMULA | Unit price then scale, or the same rate read the other way. |
| `PROP_E_ITEMS` | EASY_CAPABLE | SINGLE_FORMULA | Unit value then scale. |
| `PROP_M_FRAC_UNIT` | EASY_CAPABLE | SINGLE_FORMULA | Unit weight then scale; the unit value is fractional, which is arithmetic, not reasoning. |
| `PROP_H_COMPOUND` | MEDIUM_CAPABLE | FIXED_PIPELINE | Unit value, scale, then one reserve factor. Announced in that order. |
| `PROP_H_COST_PLUS` | MEDIUM_CAPABLE | FIXED_PIPELINE | Simple fixed-fee unit cost — named by the brief as not hard. Unit price, scale, add the fee once. |
| `PROP_M_MAP` | MEDIUM_CAPABLE | FIXED_PIPELINE | Lengths pooled, then one scale factor applied. |
| `PROP_M_RECIPE` | MEDIUM_CAPABLE | FIXED_PIPELINE | Two ingredients scaled from one batch ratio. |

**fractions** — serves easy

| template | capability | structural criteria / routine markers | why |
| --- | --- | --- | --- |
| `FRAC_E_2` | EASY_CAPABLE | REPEATED_OPERATION | Two successive fractions of one number. |
| `FRAC_H_4` | EASY_CAPABLE | REPEATED_OPERATION | Four successive fractions — the item the Holdout C review first named as scored hard while being one idea repeated. |
| `FRAC_M_3` | EASY_CAPABLE | REPEATED_OPERATION | Three successive fractions. Chain length is workload. |

**unit_rate** — serves easy, medium

| template | capability | structural criteria / routine markers | why |
| --- | --- | --- | --- |
| `RATE_E_DIRECT` | EASY_CAPABLE | SINGLE_FORMULA | Rate then scale. |
| `RATE_E_TIME` | EASY_CAPABLE | SINGLE_FORMULA | Rate then divide. |
| `RATE_M_SCALE` | EASY_CAPABLE | SINGLE_FORMULA | Rate then scale, with a consumption unit. |
| `RATE_H_TARGET` | MEDIUM_CAPABLE | FIXED_PIPELINE | Rate, percentage, then a division. Same pipeline as RATE_M_PERCENT, asked the other way. |
| `RATE_H_TWO_PHASE` | MEDIUM_CAPABLE | FIXED_PIPELINE, REPEATED_OPERATION | Rate-after-percentage with a second phase appended and the two outputs added. |
| `RATE_M_PERCENT` | MEDIUM_CAPABLE | FIXED_PIPELINE | Routine rate-after-percentage — named by the brief as not hard. |

**combined_rate** — serves easy, medium

| template | capability | structural criteria / routine markers | why |
| --- | --- | --- | --- |
| `COMB_E_OUTPUT` | EASY_CAPABLE | SINGLE_FORMULA | Rates add, then multiply by time. |
| `COMB_E_THREE` | EASY_CAPABLE | SINGLE_FORMULA | Three rates add. One more addend than COMB_E_OUTPUT. |
| `COMB_E_TIME` | EASY_CAPABLE | SINGLE_FORMULA | Rates add, then divide into a target. |
| `COMB_H_STAGED` | MEDIUM_CAPABLE | FIXED_PIPELINE, REPEATED_OPERATION | Three stages of the same accounting. The third stage adds one subtraction. |
| `COMB_M_SOLO_THEN` | MEDIUM_CAPABLE | FIXED_PIPELINE | As COMB_M_TOGETHER_SOLO, reversed order of stages. |
| `COMB_M_TOGETHER_SOLO` | MEDIUM_CAPABLE | FIXED_PIPELINE | Joint stage, remainder, solo stage. The clauses give the order. |

**relational** — serves easy, medium, hard

| template | capability | structural criteria / routine markers | why |
| --- | --- | --- | --- |
| `REL_E_BETWEEN` | EASY_CAPABLE | SINGLE_FORMULA | Four statements that chain into one total order; read off the position. |
| `REL_E_CHAIN` | MEDIUM_CAPABLE | FIXED_PIPELINE | Five statements given out of order that still resolve to one total chain; assembling it is the whole task. |
| `REL_H_GUARANTEE` | HARD_CAPABLE | SIMULTANEOUS_CONSTRAINTS, PARTIAL_ORDER_BRANCHING | Requires separating what an undetermined branch can and cannot support. |
| `REL_H_POSITION` | HARD_CAPABLE | SIMULTANEOUS_CONSTRAINTS, PARTIAL_ORDER_BRANCHING | A position that is fixed even though the order as a whole is not. |
| `REL_M_BRANCH_UNRES` | HARD_CAPABLE | SIMULTANEOUS_CONSTRAINTS, PARTIAL_ORDER_BRANCHING | Asks which pair stays undetermined — answerable only by reasoning about the set of consistent orderings. |
| `REL_M_CONFIRM` | HARD_CAPABLE | SIMULTANEOUS_CONSTRAINTS, PARTIAL_ORDER_BRANCHING | The order is partial; each candidate statement must be tested against EVERY consistent ordering, not against one chain. |
| `REL_M_COUNT` | HARD_CAPABLE | SIMULTANEOUS_CONSTRAINTS, PARTIAL_ORDER_BRANCHING | Counts who is certainly above a person: transitive closure over a branching order. |

**calendar** — serves easy, medium

| template | capability | structural criteria / routine markers | why |
| --- | --- | --- | --- |
| `CAL_E_AFTER` | EASY_CAPABLE | SINGLE_FORMULA | Two days back. |
| `CAL_E_TOM` | EASY_CAPABLE | SINGLE_FORMULA | One day back. |
| `CAL_H_LONG` | EASY_CAPABLE | SINGLE_FORMULA | Remainder modulo 7. One idea, whatever the size of the number. |
| `CAL_M_COMPOUND` | EASY_CAPABLE | SINGLE_FORMULA | Two offsets added into one, then applied once. |
| `CAL_M_TWO_SHIFT` | EASY_CAPABLE | REPEATED_OPERATION | The same shift twice. |
| `CAL_H_NESTED` | MEDIUM_CAPABLE | FIXED_PIPELINE | Offsets combine with signs and the result is read backwards; two ideas, both signposted. |

**odd_one_out** — serves easy, medium

| template | capability | structural criteria / routine markers | why |
| --- | --- | --- | --- |
| `ODD_E_MULT` | EASY_CAPABLE | SINGLE_FORMULA | Multiples of a small number; visible on inspection. |
| `ODD_E_SQUARES` | EASY_CAPABLE | SINGLE_FORMULA | Perfect squares; visible on inspection. |
| `ODD_M_CUBES` | EASY_CAPABLE | SINGLE_FORMULA | Perfect cubes; one familiar list away. |
| `ODD_M_PRIME2` | EASY_CAPABLE | SINGLE_FORMULA | Twice a prime; one division away. |
| `ODD_M_PRONIC` | EASY_CAPABLE | SINGLE_FORMULA | n(n+1); one multiplication table away from the surface. |
| `ODD_H_SQ_MINUS` | MEDIUM_CAPABLE | FIXED_PIPELINE | The property is a transformation of the number (n²−1), not the number — a search layer the easy ones do not have. |
| `ODD_H_TRIANGULAR` | MEDIUM_CAPABLE | FIXED_PIPELINE | Triangular numbers; a second search layer, but a single stated property once found. |

**profit_loss** — serves easy, medium

| template | capability | structural criteria / routine markers | why |
| --- | --- | --- | --- |
| `PL_E_LOSS` | EASY_CAPABLE | SINGLE_FORMULA | As PL_E_PROFIT, downward. |
| `PL_E_PROFIT` | EASY_CAPABLE | SINGLE_FORMULA | Difference, then a percentage of the cost. |
| `PL_H_CHAIN` | MEDIUM_CAPABLE | FIXED_PIPELINE, REPEATED_OPERATION | Direct chained percentages then a comparison — named by the brief as not hard. |
| `PL_H_REVERSE` | MEDIUM_CAPABLE | SINGLE_FORMULA | Straightforward reverse percentage — named by the brief as not hard. |
| `PL_M_DISC_MARK` | MEDIUM_CAPABLE | FIXED_PIPELINE | One discount then one markup, in the order stated. |
| `PL_M_TOTAL_COST` | MEDIUM_CAPABLE | FIXED_PIPELINE | Costs pooled first, then the routine profit percentage. |
