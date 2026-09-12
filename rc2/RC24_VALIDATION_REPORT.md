# RC2.4 — EXPAND GENUINE HARD COVERAGE: validation report

RC2.3 stopped and said so: 19 HARD_CAPABLE structures across 5 of 16 families,
with 11 families contributing nothing to a hard session. It reported
`RC2.4 HARD COVERAGE STILL INSUFFICIENT` rather than lowering the bar.

RC2.4 raises coverage the only way that was open — by adding structures that
meet the criteria as they already stand.

| | RC2.3 | RC2.4 |
| --- | --- | --- |
| HARD_CAPABLE templates | 19 | **37** |
| HARD-capable families | 5 of 16 | **14 of 16** |
| families contributing nothing to HARD | 11 | **2** |
| total templates | 107 | 125 |

The two families still without a hard structure are `fractions` and
`odd_one_out`, left at their honest ceiling exactly as the brief instructs: a
chain of unit fractions and a single-property search over six numbers do not
become hard by adding layers.

---

## What was NOT done

The brief's four prohibitions, and the evidence each is kept:

| prohibition | evidence |
| --- | --- |
| do not change the RC2.3 structural adjudication | `HARD_CRITERIA` and `ROUTINE_MARKERS` are pinned by name in `tests/rc24-hard-coverage.test.mjs` and by the `NOTHING_RECLASSIFIED` gate condition. Six criteria, three markers, unchanged. |
| do not relax HARD criteria | same pin. No criterion was added, removed or reworded. |
| do not reclassify routine templates upward | all 19 RC2.3 hard templates are still hard, and 17 named routine templates — `PROP_H_COST_PLUS`, `PCT_M_SUCCESSIVE`, `PCT_H_CHAIN_VALUE`, `RATE_H_TWO_PHASE`, `PL_H_CHAIN`, `RAT_E_SPLIT`, `PCT_E_REVERSE_ONE`, `PL_H_REVERSE`, `AVG_M_COMBINE`, `WORK_H_TWO_STAGE`, `MACH_H_STAGE_UP`, `COMB_H_STAGED`, `WORK_M_CHANGE`, `MACH_M_NEW_FAST`, `PCT_H_REVERSE_CHAIN`, `AVG_H_TARGET`, `SEQ_H_RECURRENCE` — are still not hard. Asserted by test and by gate. |
| do not generate Holdout E | not generated. `holdoutGenerated: false` in the freeze; the seed appears in no development evidence, checked by `SIGNOFF_HOLDOUT_UNTOUCHED`. |

A further invariant now holds that did not before: **no hard template carries any
routine marker at all.** Every one of the 37 is structural through and through.

---

## 1. The eighteen templates added

Each was probed at 20–30 draws until it validated clean under the full pipeline —
oracle agreement, Arabic construction classification, explanation sourcing,
displayed-equation re-evaluation, distractor provenance, misconception
applicability and degeneracy.

| family | template | structural criteria | why it is genuinely HARD |
| --- | --- | --- | --- |
| sequences | `SEQ_H_DIGIT_SUM` | RULE_DISCOVERY, STRATEGY_SELECTION | Differences, ratios and second differences all fail; nothing works until the solver stops looking between terms and looks inside one. |
| sequences | `SEQ_H_INDEX_MULT` | RULE_DISCOVERY, STRATEGY_SELECTION | The multiplier itself advances by one each step with a constant added, so neither a fixed ratio nor a fixed difference is ever found and the two parts must be identified together. |
| percentages | `PCT_H_MIXTURE` | SIMULTANEOUS_CONSTRAINTS, CROSS_PART_INTEGRATION | Two unknown volumes are pinned jointly by two conditions — the volumes sum to the total and the dissolved amounts sum to the mixture — and neither given can be evaluated before they are combined. |
| percentages | `PCT_H_TWO_GROUP_CHANGE` | SIMULTANEOUS_CONSTRAINTS, CROSS_PART_INTEGRATION | A rise in one group and a fall in the other are known only through two totals; neither percentage can be applied until the split is found, and the split follows only from both conditions at once. |
| averages | `AVG_H_OVERLAP` | CROSS_PART_INTEGRATION, STRATEGY_SELECTION | Two subsets cover the whole set and share one member; the route to that member is the double count their totals create, which no clause in the stem points at. |
| averages | `AVG_H_SPLIT_SIZE` | SIMULTANEOUS_CONSTRAINTS, STRATEGY_SELECTION | The two group sizes are the unknowns and are linked by the count, so neither average can be used until the pair is solved together. |
| ages | `AGE_H_THREE_SIBLINGS` | SIMULTANEOUS_CONSTRAINTS, CROSS_PART_INTEGRATION | Three ages linked in a chain with only their total given: the chain has to be resolved as one system before the forward shift can be applied to any of them. |
| work_time | `WORK_H_JOINT_SOLO` | COMPOSED_INVERSION, SIMULTANEOUS_CONSTRAINTS | The asked time exists only as a reciprocal: both given times must be converted to rates, combined there, and inverted back, and nothing in the sentence signals leaving the units it states. |
| work_time | `WORK_H_EXTRA_WORKERS` | COMPOSED_INVERSION, STRATEGY_SELECTION | How many workers were added is stated nowhere and is recovered only by holding the worker-day product constant across a span that changed; the conservation is the whole insight. |
| machines | `MACH_H_TWO_CONFIG` | SIMULTANEOUS_CONSTRAINTS, CROSS_PART_INTEGRATION | Two mixed groups and two totals with neither rate stated: no sentence yields a rate on its own, so the two must be brought onto one footing and an unknown eliminated before anything is computable. |
| machines | `MACH_H_STOPPAGE_TIME` | COMPOSED_INVERSION, STRATEGY_SELECTION | The stoppage hour is reported nowhere; it is reached by comparing planned with actual output, reading the shortfall as one machine over the hours it did not work, and inverting back to a clock time. |
| direct_proportion | `PROP_H_TWO_ITEM_SYSTEM` | SIMULTANEOUS_CONSTRAINTS, CROSS_PART_INTEGRATION | Two totals over two different mixes with both unit prices unknown: no clause yields a price on its own, so the two must be combined and one unknown eliminated. |
| unit_rate | `RATE_H_RATE_FROM_GAP` | SIMULTANEOUS_CONSTRAINTS, STRATEGY_SELECTION | The unknown rate appears in two different times whose difference is what is given, so nothing divides out; the solver must recognise a product of two numbers a known distance apart and search the factor pairs. |
| combined_rate | `COMB_H_TWO_PUMPS` | SIMULTANEOUS_CONSTRAINTS, COMPOSED_INVERSION | Two unknown rates are pinned by two facts at once — they sum to the joint rate, and a stated pair of solo spans fills the tank — and the answer is a time, so the equation must be formed in rates and inverted back. |
| combined_rate | `COMB_H_TEAM_SIZE` | COMPOSED_INVERSION, CROSS_PART_INTEGRATION | The team size is stated nowhere and sits inside two different products, over two spans with different team sizes, which must be brought onto one footing before it can be recovered. |
| calendar | `CAL_H_CYCLE_MEET` | CROSS_PART_INTEGRATION, STRATEGY_SELECTION | Two independent cycles must be brought onto one footing before the weekday question can be asked, and neither the common multiple nor the modulo is signalled by the sentence. |
| profit_loss | `PL_H_TWO_OUTCOMES` | SIMULTANEOUS_CONSTRAINTS, COMPOSED_INVERSION | No price is stated at all; two hypothetical outcomes hold at once over the same unknown cost, and only together do they pin it. |
| profit_loss | `PL_H_MARKUP_DISCOUNT` | COMPOSED_INVERSION, STRATEGY_SELECTION | A markup and a discount compose into one net factor and the cost sits behind that composition; the profit is given as an amount, so the factors must be combined before anything can be divided. |

Nine families gained a structure of a shape they did not have; `sequences` and
`ages` deepened shapes they had. `relational` and `ratios` were left alone — they
were already the two deepest hard families and adding more would have concentrated
the band rather than spread it.

### The checks that caught things worth keeping

Writing these templates was not clean-first. What the pipeline rejected:

* **Derivations that stated arithmetic they did not perform.** Several options
  were written as `Math.round(...)` of an exact expression, so the feedback would
  have said "you got 18, which is 88 ÷ 5" — a false sentence about the learner's
  own work. Every derivation is now exact, and `usable()` drops a value that
  needs more precision than the answer format shows.
* **A determinant printed as a positive number beside a negative subtraction.**
  `MACH_H_TWO_CONFIG` offered `|ad − cb|` while its derivation read `2 × 2 − 5 × 3`.
  The elimination is now drawn so the determinant is positive, which fixes the
  option and the step that shows it.
* **`بـسنتين`.** `بـ` glues to what follows, so an age gap of two years rendered a
  dash before a letter. The gaps start at three.
* **Five unclassified Arabic constructions** — a numeral followed by a word the
  lexicon does not know (`ومتوسط`, `منها`, `يصبح`, `ومقسومة`, `لكل`). Reworded
  rather than admitted to the lexicon: the classifier exists to catch exactly this.
* **Four degenerate draws** where a modelled slip landed on the key — halving the
  volume in a mixture whose strength is the plain average, halving the total in a
  two-group split, a stoppage hour equal to the idle hours, equal sibling gaps.
  Each is refused at the draw, on the wrong method's value and never the key's.
* **A false degeneracy claim of my own.** `PCT_H_TWO_GROUP_CHANGE` declared that
  equal rise and fall rates made the split undetermined. They do not; the claim
  was removed rather than worked around.

25 new misconception ids were added, because none of these slips could be reused
from a structure that did not exist.

---

## 2. Acceptance evidence — five ALL_HARD sessions × 50

Fresh seeds. Delivered as one batch, which is how a 250-question assessment is
actually produced and how every holdout so far was generated.

| requirement | result |
| --- | --- |
| 0 non-HARD filler | **0** of 250 |
| 0 wrong keys | **0** |
| 0 ambiguous questions | **0** |
| 0 exact duplicates | **0** |
| 0 semantic duplicates | **0** |
| no single template dominates a session | max **4** of 50, against a cap of 4 |
| materially broader family coverage | **14** families across the batch, 11–14 per session, against RC2.3's 5 |
| materially broader reasoning-signature coverage | **51** distinct signatures across the batch, 33–39 per session, against RC2.3's 23–29 |

### Per-session distribution

| session | delivered | distinct templates | most-used template | distinct families | distinct reasoning signatures | most-used signature | diversity warnings |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 50 | 34 | 2 | 14 | 36 | 2 | 0 |
| 2 | 50 | 34 | 2 | 14 | 34 | 2 | 0 |
| 3 | 50 | 36 | 2 | 14 | 39 | 2 | 0 |
| 4 | 50 | 27 | 4 | 11 | 33 | 3 | 14 |
| 5 | 50 | 28 | 4 | 14 | 33 | 3 | 66 |

| session | family distribution |
| --- | --- |
| 1 | relational 7, sequences 5, ratios 5, percentages 4, ages 4, speed 4, machines 4, combined_rate 4, averages 3, work_time 2, direct_proportion 2, unit_rate 2, calendar 2, profit_loss 2 |
| 2 | ratios 7, relational 6, ages 5, profit_loss 4, sequences 4, percentages 4, speed 4, combined_rate 3, averages 3, calendar 2, work_time 2, machines 2, direct_proportion 2, unit_rate 2 |
| 3 | relational 7, sequences 7, ratios 6, ages 5, speed 5, combined_rate 3, profit_loss 3, averages 3, work_time 3, machines 3, percentages 2, unit_rate 1, calendar 1, direct_proportion 1 |
| 4 | ratios 11, sequences 10, relational 7, speed 6, ages 6, work_time 3, profit_loss 2, averages 2, machines 1, unit_rate 1, percentages 1 |
| 5 | sequences 10, ratios 5, relational 5, ages 4, machines 4, combined_rate 3, profit_loss 3, speed 3, unit_rate 3, calendar 3, direct_proportion 2, percentages 2, averages 2, work_time 1 |

Sessions 4 and 5 carry diversity warnings and a slightly narrower spread, and
that is worth stating plainly rather than burying: a batch of **five** ALL_HARD
sessions asks for 250 hard questions from 37 structures, and by the fourth
session the batch-level reasoning-repetition allowance (5 per signature) is
spent. The fallback then delivers past the cap and records that it did. This is
a heavier ask than any real holdout — a holdout is four mixed sessions plus one
ALL_HARD, 82 hard slots, not 250 — and the brief deliberately specifies the
stress case. The cap was not raised to make the warnings go away.

### Independent sittings

The same five sessions generated with no shared state — five unrelated sittings
rather than one assessment:

| | batch | independent |
| --- | --- | --- |
| filler | 0 | 0 |
| wrong keys | 0 | 0 |
| ambiguous | 0 | 0 |
| exact duplicates | 0 | 7 |
| semantic duplicates | 0 | 7 |
| families across all five | 14 | 14 |
| reasoning signatures across all five | 51 | 47 |

Sessions that share no state can repeat an instance, because nothing connects
them; the batch fingerprint set is what prevents it, and it is what a delivered
assessment uses. Both figures are reported because they answer different
questions — the first whether the engine can deliver 250 clean hard questions,
the second how large the hard instance space is.

---

## 3. Distractor quality of the added templates, measured on their own

3,600 wrong options across 720 items drawn only from the eighteen new templates.

| measure | result |
| --- | --- |
| options without misconception provenance | **0** — structurally impossible; `makeOptionSet` refuses one |
| a diagnosis repeated within one option set | **5.3%** |
| option ≥ 25× from the key | **0.36%** |
| fraction of an indivisible thing offered as a count | **0** |
| templates drawing from fewer than 4 distinct slips | **0** |

| template | items | options | distinct slips | repeated diagnosis | >=25x from key | fractional counts |
| --- | --- | --- | --- | --- | --- | --- |
| `AGE_H_THREE_SIBLINGS` | 40 | 200 | 8 | 0 | 0 | 0 |
| `AVG_H_OVERLAP` | 40 | 200 | 6 | 0 | 3 | 0 |
| `AVG_H_SPLIT_SIZE` | 40 | 200 | 6 | 14 | 0 | 0 |
| `CAL_H_CYCLE_MEET` | 40 | 200 | 5 | 42 | 0 | 0 |
| `COMB_H_TEAM_SIZE` | 40 | 200 | 4 | 52 | 0 | 0 |
| `COMB_H_TWO_PUMPS` | 40 | 200 | 8 | 0 | 0 | 0 |
| `MACH_H_STOPPAGE_TIME` | 40 | 200 | 5 | 43 | 0 | 0 |
| `MACH_H_TWO_CONFIG` | 40 | 200 | 6 | 7 | 1 | 0 |
| `PCT_H_MIXTURE` | 40 | 200 | 7 | 4 | 0 | 0 |
| `PCT_H_TWO_GROUP_CHANGE` | 40 | 200 | 5 | 3 | 0 | 0 |
| `PL_H_MARKUP_DISCOUNT` | 40 | 200 | 6 | 3 | 2 | 0 |
| `PL_H_TWO_OUTCOMES` | 40 | 200 | 6 | 1 | 3 | 0 |
| `PROP_H_TWO_ITEM_SYSTEM` | 40 | 200 | 6 | 13 | 0 | 0 |
| `RATE_H_RATE_FROM_GAP` | 40 | 200 | 7 | 0 | 0 | 0 |
| `SEQ_H_DIGIT_SUM` | 40 | 200 | 5 | 8 | 1 | 0 |
| `SEQ_H_INDEX_MULT` | 40 | 200 | 7 | 0 | 0 | 0 |
| `WORK_H_EXTRA_WORKERS` | 40 | 200 | 8 | 0 | 0 | 0 |
| `WORK_H_JOINT_SOLO` | 40 | 200 | 7 | 0 | 3 | 0 |

Three things were fixed during this measurement rather than reported around:

* **`COMB_H_TEAM_SIZE` offered 980 people** as a team size — the remaining work
  in units, wearing a person label. Every option in that set is now a number a
  learner could write down as a team, and the draw is constrained so the modelled
  slips come out whole.
* **`MACH_H_TWO_CONFIG` was being judged by the count-unit rule**, which demotes a
  fractional option where the answer counts indivisible things. Its answer is a
  RATE whose numerator happens to be a count — 22.5 pieces an hour is a real rate
  — so the template now says `answerIsCount: false` rather than being quietly
  exempted.
* **`WORK_H_EXTRA_WORKERS` drew fractional crews.** Two sampler constraints make
  its modelled slips whole numbers of workers.

No absurd-magnitude filler was used to reach six options anywhere. Where an
option is far from the key it is because the slip that produces it is far from
the key — `SUBTRACTED_TIMES_INSTEAD_OF_RATES` on a work-rate item gives 2 days
against a key of 60, and that is exactly the mistake the item teaches against.

---

## 4. Language and reproducibility

| check | result |
| --- | --- |
| invalid Arabic constructions | **0** of 94,111 classified |
| unclassified Arabic constructions | **0** |
| every count reaches its unit through the central formatter | PASS (`npm run test:units`) |
| seed reproducibility, both APIs | identical |
| telemetry reconciliation | balanced, difference 0, 0 anonymous discards |
| exhaustions in a hard session | **0** |
| latency | p50 0.80 ms, p95 1.40 ms, p99 1.95 ms (925 questions/second) |

---

## 5. RC2.3 preserved

| guarantee | result |
| --- | --- |
| adjudication complete and reachable | 125 of 125, 0 orphans |
| structural difficulty selection | published band IS the structural band, 900 draws, 0 exceptions |
| 0 easier filler in ALL_HARD | 0 of 250 |
| language fixes | the RC2.3 rise wording and unstacked fraction chains hold; RC2.4 added none of its own regressions |
| template dominance cap | max 4 of 50 — and the cap now binds the relaxed fallback too, which it did not before |
| oracle/key correctness | 0 wrong keys in 10,000 |
| session telemetry | reconciles, 0 anonymous |
| seed reproducibility | identical |

### Development corpus, fresh seeds

`RC24-DEV-PHI … RC24-DEV-KOPPA`, used by no earlier release. 10,000 questions.

| measurement | result |
| --- | --- |
| published / exhausted | 10,000 / **0** |
| templates reached | **125** of 125; families 16 of 16 |
| wrong keys | **0** (oracle disagreement, post-shuffle mismatch, zero/multiple correct options, correct-value mismatch: all 0) |
| ambiguous or undiscoverable published | **0** |
| invalid or unclassified Arabic | **0** of 94,111 |
| unattributed answer-derived distractors | **0** |
| distinct reasoning signatures | 237 (RC2.3: 216) |

### Suite and gate

`npm test` — **409 tests, 0 failures**, 12 skipped (each superseded with a stated
reason and a named replacement). `npm run test:units` PASS.
`npm run test:stress` PASS. §23 internal gate — **PASS, 39 conditions, 0 failed**,
four of them added by RC2.4.

Three existing checks moved, and each is a correction rather than an
accommodation:

* **The RC2-012 survivor bar** measured `S1 + S3` and excluded `S1B`, which the
  module itself defines as "still a quantity of the task, but reached one step
  later". The new templates' wrong options are often intermediates their
  solutions compute, so the ratio fell to 0.88 without a single option becoming
  less justified. The bar now counts `S1B` with the strong strata **and bounds
  `S2` directly** — the bookkeeping stratum the bar was written to guard against.
  That is a stricter test in the dimension it cares about, not a looser one.
  Unjustified survivors remain **0**.
* **`BAND_BOUNDARIES`** moved to the tertiles of the 125-template population
  (9.8 / 14.8, from 9.4 / 13.4). Since RC2.3 these govern one reported evidence
  field — `complexity_band` — and no published band. Leaving them would have
  meant a stated rule the code knowingly violates. Score-vs-structure agreement
  is **82.3%**, from 79.7%, and is still reported as evidence rather than as a
  target.
* **The relaxed fallback** bypassed the template-share cap exactly as it once
  bypassed the reasoning cap: the fifth session of an all-hard batch put one
  template in five slots against a cap of four. It now prefers a candidate within
  the cap and records a breach when none exists.

---

## Freeze

RC2.4 is frozen at commit `ac99d2a5`, taken after the §23 gate passed 39/39 on
`bf70124e` with a clean tree. Production is byte-identical between the gated and
the frozen commit, and `verifyFreeze()` confirms the bundle intact. The RC2.3
freeze is archived at `rc2/FREEZE_RC2_3.json` and recorded in
`rc2/SUPERSEDED_FREEZES.json`.

**Holdout E has not been generated.** Holdouts B, C and D are recorded as spent
and are not reused; the next sign-off seed is declared in
`tools/audit/rc2-development-corpus.mjs` and used nowhere. Stage 1 has not been
started.

---

## Appendix — the eighteen added templates, with the criterion that makes each HARD
| family | template | structural criteria | why it is genuinely HARD |
| --- | --- | --- | --- |
| sequences | `SEQ_H_DIGIT_SUM` | RULE_DISCOVERY, STRATEGY_SELECTION | Differences, ratios and second differences all fail; nothing works until the solver stops looking between terms and looks inside one. |
| sequences | `SEQ_H_INDEX_MULT` | RULE_DISCOVERY, STRATEGY_SELECTION | The multiplier itself advances by one each step with a constant added, so neither a fixed ratio nor a fixed difference is ever found and the two parts must be identified together. |
| percentages | `PCT_H_MIXTURE` | SIMULTANEOUS_CONSTRAINTS, CROSS_PART_INTEGRATION | Two unknown volumes are pinned jointly by two conditions — the volumes sum to the total and the dissolved amounts sum to the mixture — and neither given can be evaluated before they are combined. |
| percentages | `PCT_H_TWO_GROUP_CHANGE` | SIMULTANEOUS_CONSTRAINTS, CROSS_PART_INTEGRATION | A rise in one group and a fall in the other are known only through two totals; neither percentage can be applied until the split is found, and the split follows only from both conditions at once. |
| averages | `AVG_H_OVERLAP` | CROSS_PART_INTEGRATION, STRATEGY_SELECTION | Two subsets cover the whole set and share one member; the route to that member is the double count their totals create, which no clause in the stem points at. |
| averages | `AVG_H_SPLIT_SIZE` | SIMULTANEOUS_CONSTRAINTS, STRATEGY_SELECTION | The two group sizes are the unknowns and are linked by the count, so neither average can be used until the pair is solved together. |
| ages | `AGE_H_THREE_SIBLINGS` | SIMULTANEOUS_CONSTRAINTS, CROSS_PART_INTEGRATION | Three ages linked in a chain with only their total given: the chain has to be resolved as one system before the forward shift can be applied to any of them. |
| work_time | `WORK_H_JOINT_SOLO` | COMPOSED_INVERSION, SIMULTANEOUS_CONSTRAINTS | The asked time exists only as a reciprocal: both given times must be converted to rates, combined there, and inverted back, and nothing in the sentence signals leaving the units it states. |
| work_time | `WORK_H_EXTRA_WORKERS` | COMPOSED_INVERSION, STRATEGY_SELECTION | How many workers were added is stated nowhere and is recovered only by holding the worker-day product constant across a span that changed; the conservation is the whole insight. |
| machines | `MACH_H_TWO_CONFIG` | SIMULTANEOUS_CONSTRAINTS, CROSS_PART_INTEGRATION | Two mixed groups and two totals with neither rate stated: no sentence yields a rate on its own, so the two must be brought onto one footing and an unknown eliminated before anything is computable. |
| machines | `MACH_H_STOPPAGE_TIME` | COMPOSED_INVERSION, STRATEGY_SELECTION | The stoppage hour is reported nowhere; it is reached by comparing planned with actual output, reading the shortfall as one machine over the hours it did not work, and inverting back to a clock time. |
| direct_proportion | `PROP_H_TWO_ITEM_SYSTEM` | SIMULTANEOUS_CONSTRAINTS, CROSS_PART_INTEGRATION | Two totals over two different mixes with both unit prices unknown: no clause yields a price on its own, so the two must be combined and one unknown eliminated. |
| unit_rate | `RATE_H_RATE_FROM_GAP` | SIMULTANEOUS_CONSTRAINTS, STRATEGY_SELECTION | The unknown rate appears in two different times whose difference is what is given, so nothing divides out; the solver must recognise a product of two numbers a known distance apart and search the factor pairs. |
| combined_rate | `COMB_H_TWO_PUMPS` | SIMULTANEOUS_CONSTRAINTS, COMPOSED_INVERSION | Two unknown rates are pinned by two facts at once — they sum to the joint rate, and a stated pair of solo spans fills the tank — and the answer is a time, so the equation must be formed in rates and inverted back. |
| combined_rate | `COMB_H_TEAM_SIZE` | COMPOSED_INVERSION, CROSS_PART_INTEGRATION | The team size is stated nowhere and sits inside two different products, over two spans with different team sizes, which must be brought onto one footing before it can be recovered. |
| calendar | `CAL_H_CYCLE_MEET` | CROSS_PART_INTEGRATION, STRATEGY_SELECTION | Two independent cycles must be brought onto one footing before the weekday question can be asked, and neither the common multiple nor the modulo is signalled by the sentence. |
| profit_loss | `PL_H_TWO_OUTCOMES` | SIMULTANEOUS_CONSTRAINTS, COMPOSED_INVERSION | No price is stated at all; two hypothetical outcomes hold at once over the same unknown cost, and only together do they pin it. |
| profit_loss | `PL_H_MARKUP_DISCOUNT` | COMPOSED_INVERSION, STRATEGY_SELECTION | A markup and a discount compose into one net factor and the cost sits behind that composition; the profit is given as an amount, so the factors must be combined before anything can be divided. |
