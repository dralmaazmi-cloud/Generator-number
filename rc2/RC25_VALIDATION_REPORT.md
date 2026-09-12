# RC2.5 — human-calibrated difficulty remediation

Engine 1.4.0. All measurements on fresh development seeds. Holdout E is read
only as preserved evidence; it was not regenerated, replayed or modified, and no
Holdout F was generated.

---

## 0. Status: the calibration is blocked on evidence that is not here

Section 1 of the brief asks for the independent human verdicts **per template and
per variant**, computed from Holdout E. That requires the sealed blind verdict
file. **It is not present in this session.** Searched: the repository (all
history), `/mnt/attach`, `/mnt/user-data`, the container filesystem, and the full
session transcript. No file with per-item verdicts has ever reached this session.

The aggregates in the brief — 29/82 appropriate, 53/82 overclassified, 18/50 in
session 5, 3 ambiguous, 2 MEDIUM judged HARD — say *how many*. They do not say
*which*, and 53 overclassified items spread across 34 templates by guesswork
would be a fabrication wearing the shape of evidence. So §1's per-template rates,
§3's MEDIUM→EASY attribution, and the identity of the two MEDIUM items judged
HARD are **not** reported here. Everything that does not depend on the per-item
verdicts is complete and is reported below.

`tools/audit/rc25-crosswalk.mjs` contains the join. It reads the verdict file
from `rc2/holdout-e-verdicts.jsonl` (or `rc2/holdout-e-reveal/blind-verdicts.jsonl`,
or `rc2/HOLDOUT_E_VERDICTS.jsonl`), matches field names leniently
(`itemId`/`item_id`/`id`, `verdict`/`difficultyVerdict`/`appropriate`,
`ambiguous`, `keyCorrect`), and produces the per-template and per-variant verdict
tables §1 asks for. Drop the file in and re-run; nothing else is needed.

---

## 1. Crosswalk — all 250 Holdout E items (complete)

`rc2/RC25_CROSSWALK.json`. Every item mapped to its template, family, structural
variant and reasoning signature, from the preserved hidden dataset.

| band | items | templates | families | reasoning signatures |
|---|---|---|---|---|
| easy | 52 | 26 | 14 | 30 |
| medium | 116 | 42 | 14 | 48 |
| hard | 82 | 34 | 14 | 38 |

Key agreement between the hidden dataset and the preserved answer key: **250/250**.

### The 82 HARD items by template

Delivered counts, and where RC2.5 puts each template now.

| family | template | n | RC2.5 band |
|---|---|---|---|
| unit_rate | RATE_H_RATE_FROM_GAP | 5 | hard |
| calendar | CAL_H_CYCLE_MEET | 5 | hard |
| ages | AGE_M_FUT_RATIO | 4 | hard |
| machines | MACH_H_STOPPAGE_TIME | 4 | hard |
| direct_proportion | PROP_H_TWO_ITEM_SYSTEM | 4 | hard |
| ratios | RAT_M_COMMON_DIFF | 4 | hard |
| relational | REL_H_POSITION | 4 | hard |
| percentages | PCT_H_MIXTURE | 3 | hard |
| averages | AVG_H_OVERLAP | 3 | hard |
| speed | SPD_H_TIME_DIFF | 3 | hard |
| combined_rate | COMB_H_TEAM_SIZE | 3 | hard |
| combined_rate | COMB_H_TWO_PUMPS | 3 | hard |
| **relational** | **REL_M_CONFIRM** | **3** | **medium (demoted)** |
| ratios | RAT_H_TRANSFER | 2 | hard |
| work_time | WORK_H_EXTRA_WORKERS | 2 | hard |
| profit_loss | PL_H_MARKUP_DISCOUNT | 2 | hard |
| sequences | SEQ_H_ALT_DIV | 2 | hard |
| speed | SPD_H_MEET_DELAY | 2 | hard |
| work_time | WORK_H_JOINT_SOLO | 2 | hard |
| profit_loss | PL_H_TWO_OUTCOMES | 2 | hard |
| sequences | SEQ_H_INDEX_MULT | 2 | hard |
| ages | AGE_H_TWO_TIME | 2 | hard |
| averages | AVG_H_SPLIT_SIZE | 2 | hard |
| speed | SPD_H_CATCH | 2 | hard |
| relational | REL_M_BRANCH_UNRES | 2 | hard |
| **relational** | **REL_M_COUNT** | **2** | **medium (demoted)** |
| percentages | PCT_H_TWO_GROUP_CHANGE | 1 | hard |
| sequences | SEQ_H_POW_INDEX | 1 | hard |
| ratios | RAT_M_ADD_SIDE | 1 | hard |
| ratios | RAT_H_TWO_COMB | 1 | hard |
| ages | AGE_H_PAST_FUT | 1 | hard |
| machines | MACH_H_TWO_CONFIG | 1 | hard |
| ratios | RAT_M_COMMON_SUM | 1 | hard |
| **relational** | **REL_H_GUARANTEE** | **1** | **medium (demoted)** |

**The size of the gap.** RC2.5's structure-only recalibration moves **6 of the 82**
HARD items to MEDIUM. The blind review found **53** overclassified. Structure
alone therefore accounts for roughly one item in nine of what the reviewers saw.
The remaining 47 cannot be attributed to templates without the per-item verdicts:
they may concentrate in a few templates, or spread thinly across many, and those
two pictures call for opposite remedies. This is the single most important number
in the report and it is why §1 is blocked rather than estimated.

---

## 2. Partial-order questions — explicit graph-complexity conditions (complete)

`src/qa/partial-order.js`. The band of a relational item is now decided by the
**graph it drew**, not by the question it asks.

Required of every HARD partial-order item (all three):

| | condition |
|---|---|
| H1 | `linearExtensionCount >= 2` — the order really is partial; a total order makes every question a lookup |
| H2 | `incomparablePairs >= 2` — more than one pair is open, so "which orderings are consistent" is a real question |
| H3 | no single root-to-sink path answers the question by itself |

And at least one reason it is hard:

| | condition |
|---|---|
| H4a | the question asks about a relation the order does not settle |
| H4b | `branchesCombined >= 2` — the answer needs facts from two or more branches |
| H4c | `transitiveProofDepth >= 3` — the answer rests on a chain of three or more stated relations |

Overriding disqualifier:

| | condition |
|---|---|
| D1 | `plausibleCandidates <= 2` — a two-way choice is a guess, whatever the graph looks like |

A routine transitive conclusion — أ above ب, ب above ج, therefore أ above ج —
fails H1 and H2 and is MEDIUM. A simple linear chain that solves the question
immediately fails H3. Both are what the brief asked for.

### What the measurement found

Every relational template, measured over the graphs it actually draws:

| template | drawn | met the HARD conditions | decision |
|---|---|---|---|
| REL_M_CONFIRM | 529 | **0 (0%)** | **demoted to MEDIUM** |
| REL_H_GUARANTEE | 506 | **0 (0%)** | **demoted to MEDIUM** |
| REL_M_COUNT | 456 | 91 (20%) | **split** |
| REL_H_POSITION | 490 | 122 (25%) | retained, conditions enforced |
| REL_M_BRANCH_UNRES | 519 | 492 (95%) | retained, conditions enforced |

**The two demotions are a structural ceiling, not a sampling accident.**
Both templates ask which *pair relation* is guaranteed. A guaranteed relation is
by definition one with a stated path between its two people — so a single chain
always proves it, and H3 can never hold. No parameter choice makes "find the
provable pair" anything other than a routine transitive conclusion. Neither was
demoted to hit a number; both were demoted because 0 of ~500 instances cleared
the bar.

**The split.** `REL_M_COUNT` was two tasks under one id: counting people whose
support lies on one path (routine — follow the chain) and counting people spread
across branches (no chain contains the answer). They are now `REL_M_COUNT`
(medium) and `REL_H_COUNT_BRANCHED` (hard), each sampled until the graph it drew
is the kind it claims.

After the change, on 3,200 fresh draws:

| template @ delivered band | n | graph met HARD conditions |
|---|---|---|
| REL_H_COUNT_BRANCHED @ hard | 481 | **100%** |
| REL_H_POSITION @ hard | 561 | **100%** |
| REL_M_BRANCH_UNRES @ hard | 558 | **100%** |
| REL_M_COUNT @ medium | 289 | 0% |
| REL_M_CONFIRM @ medium | 357 | 0% |
| REL_H_GUARANTEE @ medium | 317 | 0% |
| REL_E_CHAIN @ medium | 291 | 0% |

Every relational item delivered as HARD now provably meets the conditions; every
one delivered as MEDIUM provably does not.

### Two defects the larger graphs exposed

1. **`REL_H_POSITION` answered "cannot be determined" 100% of the time** under a
   first version of the conditions, because requiring two open pairs while
   measuring candidate count made a pinned position impossible to draw. That is
   RC2-010, the defect the template was rebuilt to fix, coming back. Caught by the
   existing guard test. The band condition no longer reads whether the position
   turned out to be determined — that is the *answer* — and the graph shape was
   redesigned (a settled spine with an open group of three or four at one end, at
   either end) so both outcomes arise. Determined/undetermined is now 68/32, the
   modal answer carries 31.9% (was 100%), answer entropy 3.62 bits.

2. **`المركز undefined` in published stems.** The ordinal table stopped at five
   while the new graphs run to ten people. The stem rendered a literal
   `undefined` and nothing caught it, because the key was still a valid name.
   Ordinals now run to ten and go through `positionWord()`, which throws rather
   than interpolating a gap.

---

## 3. MEDIUM calibration — blocked

Identifying which template/variant causes MEDIUM→EASY leakage requires knowing
which MEDIUM items the reviewers judged EASY. Inspecting the two MEDIUM items
judged HARD requires knowing which two they are. Neither is derivable from the
aggregates. **Not reported.** The join in `rc25-crosswalk.mjs` produces both the
moment the verdict file is available.

What is not blocked, and is done: the relational demotions in §2 move three
templates out of HARD into MEDIUM on structural evidence, and the RC2.3 rule that
a template carrying a routine marker can never sit in HARD still holds for all
126 templates.

---

## 4. Ambiguity and language (complete)

### The overlapping-means ambiguity

The three ambiguous items are structurally identifiable without the verdicts:
`AVG_H_OVERLAP` produced exactly three items in Holdout E (E-S1-08, E-S4-43,
E-S5-27) and is the only template using the ordering word.

The stem read `متوسط N قيم مرتبة هو W…`. **«مرتبة» reads as sorted**, and under
that reading two of the three items are contradictory — a head average of 14 with
a tail average of 8 is impossible in an ascending list — so the item has no
answer. The order meant was positional. The stem now says so with positional
words only:

> في قائمة من 9 قيم، متوسط القيم كلها 14. متوسط أول 5 قيم في القائمة هو 19، ومتوسط آخر 5 قيم فيها هو 11. فما القيمة التي تقع في الموضع الأوسط من القائمة؟

Explanation steps follow («القيمة في الموضع الأوسط», not «القيمة الوسطى»).

**Fixed at renderer level, not in the template.** `src/qa/wording.js` adds
`ORDERING_WORD_AMBIGUITY`: any rendered string that uses the sorting lexeme
(`مرتب/مرتبة/مرتبين/بترتيب`) *without naming a direction* while also selecting by
position (`أول`, `آخر`, `المنتصف`, `الموضع`) is **rejected** by the pipeline. A
stem that genuinely sorts and says `تصاعديًا`/`تنازليًا` has one reading and passes —
the rule is not a ban on the word.

### Rate answers rendered as quantities

Audited every template in the engine. Exactly two ask for a rate and rendered the
answer as a count:

| template | asked | was | now |
|---|---|---|---|
| RATE_H_RATE_FROM_GAP | «فما معدله الأصلي؟» | `60 وحدة` | `60 وحدة/ساعة` |
| MACH_H_TWO_CONFIG | «كم قطعة تنتج آلة واحدة … في الساعة؟» | `24 قطعة` | `24 قطعة/ساعة` |

`RATE_H_TWO_PHASE` and `RATE_M_PERCENT` mention a rate but ask for a quantity;
their `وحدة` options are correct and were left alone.

Also renderer level: `RATE_ANSWER_NOT_RATE_UNIT` rejects any question whose stem
asks for a rate while its options carry no per-unit-time unit. `answer_unit_id`
is now published on every question so the rule can be checked from outside the
engine.

### Arabic regression tests

`tests/rc25-calibration.test.mjs`, 17 tests, all passing. MUST_REJECT on the
Holdout E stem verbatim and on a rate answer in `وحدة`; MUST_ACCEPT on the new
stem, on a genuine sort that names its direction, and on rate-mentioning
quantity questions. Plus live sweeps: 600 mixed questions carry no ordering-word
ambiguity; 800 carry no rate/unit mismatch; 900 relational items contain no
`undefined`.

---

## 5. Distractors (partial — the part that does not need verdicts)

Which templates "remain genuinely HARD" is §1's output, so the full pass waits on
the verdicts. What was done now, for a template that RC2.5 itself makes HARD:

`REL_H_COUNT_BRANCHED` drew its six options from three diagnoses, two of them
assigned by position rather than by derivation — every label below the key shared
one diagnosis, every label above it another. Each wrong count is now attached to
the slip that actually produces it, including two new ones specific to a count
that spans branches:

- `COUNTED_ONE_BRANCH_ONLY` — followed the branch the target sits on and stopped
- `COUNTED_FROM_ONE_ORDERING` — collapsed the partial order into one arrangement and counted from it
- `COUNTED_DIRECT_RELATIONS_ONLY`, `COUNTED_EVERYONE`, `OFF_BY_ONE_STEP`, `RESOLVED_AN_UNRESOLVED_PAIR`

Counts no modelled slip produces are still offered — the set needs five — but as
`MISCOUNTED_THE_CONFIRMED_PATHS`, which is what they are, rather than under a
specific slip they did not come from. Provenance preserved: 6 distinct diagnoses
in play, never fabricated.

Measured over 2,375 options on the hard templates: repeated diagnosis 5.4%
(bar 10%), options 25× from the key 0.34% (bar 5%), fractional counts of
indivisible things 0, minimum distinct slips per template 4.

---

## 6. Repetition, measured five ways (complete)

`tools/audit/rc25-repetition.mjs`, `rc2/RC25_REPETITION.json`.

The blind review's 244/250 uses a broad cluster definition — items sharing a topic
are one cluster. Reproduced on the same rows, that definition puts **250/250** in
some cluster, which is what a definition that counts fourteen topics across 250
questions must report. It is not a finding.

The publication-relevant measures, counted apart:

| measure | Holdout E | fresh RC2.5 batch | bar |
|---|---|---|---|
| exact duplicate (full rendered item) | **0** | **0** | 0 |
| semantic duplicate (same template, same values) | **0** | **0** | 0 |
| same template, largest group in a session | 4 | 4 | ≤ 4 |
| same reasoning signature, largest in a session | 2 | 2 | ≤ 3 |
| same reasoning signature, largest in the batch | 5 | 5 | ≤ 5 |
| cap breaches | none | none | none |

**A correction to my own first measurement.** Keying "exact duplicate" on the
stem alone reported 31 duplicates in Holdout E. They are not duplicates: the
odd-one-out and sequence families carry their numbers in a separate stimulus
block, so thirteen different questions share the instruction line
«أي عدد لا ينتمي إلى المجموعة الآتية؟» and differ entirely below it. The key is
now the full rendered item (stem + stimulus + options), and a shared instruction
line is reported separately as `sharedStemLineOnly`, which is not duplication.

Parameter-only near duplicates — same template and same asked unknown, different
values — are reported as ordinary item variation and bounded by the session caps,
not counted as a defect.

---

## Validation on fresh development seeds

Five independent batches in the Holdout E shape (4 × 50 mixed + 1 × 50 hard,
82 hard slots), generated as one batch each so batch-level diversity applies.

| seed | hard templates | hard families | exact dup | semantic dup | wrong keys | invalid | ambiguous | reasoning-cap fb | template-share fb | relaxed-cap fb | exhaustions | telemetry balanced |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RC25-V1 | 34 | 14 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | yes |
| RC25-V2 | 33 | 14 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | yes |
| RC25-V3 | 34 | 14 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | yes |
| RC25-V4 | 35 | 14 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | yes |
| RC25-V5 | 33 | 14 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | yes |

Seed reproducibility: identical ids, stems and keys on replay.

**Fresh HARD sample under the revised rules.** Hard band: 35 templates over 14
families (RC2.4 had 37 over 14; RC2.5 demoted three relational shapes and added
one). No family holds more than 14.3% of the hard band. Every relational item
delivered as HARD meets the graph conditions (1,600/1,600 measured).

**Fresh EASY/MEDIUM calibration.** 37 easy, 54 medium, 35 hard templates, 126
total. Every template carries exactly one adjudicated band; no template sits in
HARD while carrying a routine marker.

**Not claimed as success:** declared = computed agreement. The RC2.2 complexity
score is published as evidence beside the structural band and is not a gate.

---

## Test suite

409 existing tests + 17 new RC2.5 tests. The two `§24 freeze` tests fail by
design — production moved during this remediation, which is exactly what they
report; the freeze is re-established at the end of a cycle. Eight fixtures were
re-pinned (seeds move whenever the template pool changes) and four RC2.4 gate
assertions were rewritten for RC2.5's intent: downward reclassification is now
the point, upward reclassification is still forbidden and is asserted, and the
three demotions are named so a silent one is caught.

One RC2.3 assertion changed substantively: Holdout D re-adjudicated now keeps 32
of its 82 hard items, against that audit's 38. Two independent human audits now
bracket this and disagree with each other — Holdout D's reviewers said 38/82,
Holdout E's said 29/82 — so the test asserts the count falls in 29..38 rather than
within ±3 of the looser audit. Pinning to Holdout D alone would mean re-fitting
the criteria to the weaker evidence each time the stronger moves.

---

## What is outstanding

1. **The sealed blind verdict file.** Everything in §1 and §3 depends on it.
2. After it lands: per-template and per-variant verdict rates; retain / demote /
   split decisions for the remaining 47 overclassified items; MEDIUM→EASY
   attribution; the two MEDIUM items judged HARD; and the §5 distractor pass over
   whatever set survives as genuinely HARD.
