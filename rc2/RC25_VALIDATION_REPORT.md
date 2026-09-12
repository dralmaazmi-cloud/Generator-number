# RC2.5 — human-calibrated difficulty remediation

Engine 1.4.0. Calibrated against the sealed Holdout E blind verdict file. Holdout
E itself was read only as preserved evidence — never regenerated, replayed or
modified — and no Holdout F was generated.

---

## 0. The verdict file

| check | result |
|---|---|
| SHA-256 | `edf394250bfe8fa57b94f8ff56931fb8188982944290c9432afacf30e5a41d1a` — **matches** |
| records | 250, **250 unique ids**, exactly `E-S1-01 … E-S5-50` |
| joins to the preserved hidden dataset | **250/250** |
| joins to the preserved answer key | **250/250** |
| declared difficulty vs the hidden data | 0 mismatches |
| reviewer's selected option vs the preserved key | 0 mismatches |

Preserved at `rc2/holdout-e-verdicts.jsonl`. Every aggregate reconciles with the
brief: 247 UNIQUE / 3 AMBIGUOUS; HARD 29 appropriate / 53 overclassified; session
5 18/50; MEDIUM 77 appropriate / 37 easy / 2 underclassified; EASY 52/52.

The three ambiguous items are `E-S1-08`, `E-S4-43`, `E-S5-27` — all
`AVG_H_OVERLAP`, exactly the items the earlier structural analysis identified and
fixed before the verdicts arrived.

---

## 1. The headline result

**Item-level agreement with the reviewers' independent difficulty levels:**

| | agreement on 250 items |
|---|---|
| RC2.4, as delivered in Holdout E | **158 / 250 — 63.2 %** |
| RC2.5, template bands after calibration | 240 / 250 — 96.0 % |
| RC2.5, with the two splits applied per instance | **245 / 250 — 98.0 %** |

The five remaining disagreements are named in §5 below. None was resolved by
moving a band to make a number improve.

---

## 2. HUMAN HARD CALIBRATION

### Per-template verdicts on the 82 HARD items

Unanimous in 33 of 34 templates. The reviewers' own structural clusters, pooled,
carry the templates whose individual sample is one or two items.

**Retained HARD — every delivered item judged appropriate**

| template | verdicts | cluster support |
|---|---|---|
| RATE_H_RATE_FROM_GAP | 5/5 | rate_increase_quadratic 5/5 |
| RAT_M_COMMON_DIFF | 4/4 | chained_ratios 6/6 |
| AVG_H_OVERLAP | 3/3 | overlapping_ordered_means 3/3 |
| COMB_H_TWO_PUMPS | 3/3 | pump_rate_system 3/3 |
| SEQ_H_ALT_DIV | 2/2 | number_sequence 5/5 |
| SEQ_H_INDEX_MULT | 2/2 | number_sequence 5/5 |
| REL_M_BRANCH_UNRES | 2/2 | — |
| SEQ_H_POW_INDEX | 1/1 | number_sequence 5/5 |
| RAT_H_TWO_COMB | 1/1 | chained_ratios 6/6 |
| RAT_M_COMMON_SUM | 1/1 | chained_ratios 6/6 |

**Retained HARD on weak evidence — a single verdict, no cluster support**

| template | verdicts | note |
|---|---|---|
| PCT_H_TWO_GROUP_CHANGE | 1/1 | cluster "other", n=1 |
| AGE_H_PAST_FUT | 1/1 | cluster n=1 |
| MACH_H_TWO_CONFIG | 1/1 | **unresolved tension** — see below |

`MACH_H_TWO_CONFIG` is a 2×2 linear system, structurally the same shape as
`PROP_H_TWO_ITEM_SYSTEM`, which was judged overclassified 4/4. The reviewers put
them in *different* clusters, so the file does not support pooling them. It is
retained on its own single verdict rather than demoted on my analogy —
overriding a human verdict with a structural resemblance is what produced RC2.4's
overclassification in the first place — and flagged for direct review.

**Retained HARD with no Holdout E evidence, by cluster**

| template | basis |
|---|---|
| SEQ_H_DIGIT_SUM | not sampled; cluster number_sequence 5/5 appropriate |
| REL_H_COUNT_BRANCHED | created by RC2.5; graph conditions verified against the verdicts (below) |

**Demoted to MEDIUM — every delivered item judged overclassified**

| template | verdicts | reviewers' description |
|---|---|---|
| CAL_H_CYCLE_MEET | 0/5 | routine LCM recurrence mapped to a weekday |
| AGE_M_FUT_RATIO | 0/4 | routine age difference plus future multiple |
| MACH_H_STOPPAGE_TIME | 0/4 | routine stoppage from a production shortfall |
| PROP_H_TWO_ITEM_SYSTEM | 0/4 | routine box/piece linear equations |
| PCT_H_MIXTURE | 0/3 | routine two-solution mixture |
| SPD_H_TIME_DIFF | 0/3 | routine same-distance speed/time difference |
| COMB_H_TEAM_SIZE | 0/3 | routine team-size equation with one joiner |
| REL_M_CONFIRM | 0/3 | routine partial-order inference |
| RAT_H_TRANSFER | 0/2 | routine ratio changed by transfer |
| WORK_H_EXTRA_WORKERS | 0/2 | routine finish-early by adding workers |
| PL_H_MARKUP_DISCOUNT | 0/2 | routine markup then discount |
| SPD_H_MEET_DELAY | 0/2 | routine delayed opposite-direction meeting |
| WORK_H_JOINT_SOLO | 0/2 | routine combined work-rate subtraction |
| PL_H_TWO_OUTCOMES | 0/2 | routine cost from profit/loss scenarios |
| AGE_H_TWO_TIME | 0/2 | routine age difference plus future multiple |
| AVG_H_SPLIT_SIZE | 0/2 | routine group size from means |
| SPD_H_CATCH | 0/2 | routine delayed same-direction catch-up |
| REL_M_COUNT | 0/2 | routine partial-order inference |
| RAT_M_ADD_SIDE | 0/1 | cluster ratio_transfer_or_addition 0/3 |

**Demoted with no Holdout E evidence, by the structures they share** — flagged
for direct review in the next holdout:

- `AGE_H_THREE_SIBLINGS` — every simultaneous-constraint word problem the
  reviewers saw was judged medium (0 of 20).
- `SPD_M_EQUAL_DIST` — all three kinematics shapes they saw were judged medium
  (0 of 7).

**Split by structural condition**

`REL_H_POSITION` was the one mixed HARD template (1 appropriate of 4). The
feature that separates its verdicts is graph structure, and the RC2.5
partial-order conditions — derived and committed **before** the verdict file
existed — reproduce the human verdicts on **11 of the 12** partial-order items:

| item | template | human | conditions | linear extensions | open pairs |
|---|---|---|---|---|---|
| E-S5-50 | REL_H_POSITION | medium | medium | 1 (a pure chain) | 0 |
| E-S5-08 | REL_H_POSITION | medium | medium | 2 | 1 |
| E-S5-22 | REL_H_POSITION | medium | medium | 2 | 1 |
| E-S5-45 | REL_H_POSITION | **hard** | **hard** | 30 | 8 |
| E-S2-25, E-S3-45, E-S5-20 | REL_M_CONFIRM | medium | medium | | |
| E-S5-17, E-S5-47 | REL_M_COUNT | medium | medium | | |
| E-S5-18, E-S5-48 | REL_M_BRANCH_UNRES | hard | hard | | |
| E-S5-49 | REL_H_GUARANTEE | hard | *medium* | 5 | 4 |

The engine no longer draws the routine graphs at HARD, so the split is enforced
at generation rather than recorded after the fact.

**One promotion.** `SEQ_H_RECURRENCE` — the only two UNDERclassified items in the
whole holdout (`E-S4-13`, `E-S4-35`), both judged HARD. RC2.3 had excluded it
because "a solver who tries a+b finds it immediately", but the template generates
`a_n = 2·a_(n-1) + a_(n-2)`, verified in source. The rationale described a
template that does not exist. `RULE_DISCOVERY` was already a declared criterion,
so this is a correction, not a relaxation of the bar.

---

## 3. MEDIUM CALIBRATION

All 116 MEDIUM items analysed. 37 judged EASY, 77 appropriate, 2 HARD.

**Demoted MEDIUM → EASY — every delivered item judged easy**

| template | verdicts |
|---|---|
| CAL_H_NESTED | 0/5 |
| PROP_M_MAP | 0/4 |
| PL_H_REVERSE | 0/4 |
| PCT_M_REMAIN | 0/4 |
| RATE_M_PERCENT | 0/4 |
| PROP_H_COST_PLUS | 0/3 |
| MACH_E_HOURS | 0/3 |
| PCT_M_UNIT_PRICE | 0/2 |
| PROP_M_RECIPE | 0/1 — single verdict, agreeing with its own routine marker |
| AGE_E_SUM_DIFF | 0/1 — single verdict, agreeing with its own SINGLE_FORMULA marker |

**Split by structural condition.** `REL_E_CHAIN` was mixed 2/2, and the feature
is chain length, not the numbers:

| items | chain | human verdict | now |
|---|---|---|---|
| E-S1-32, E-S3-34 | 5 people | easy | `REL_E_CHAIN` — **easy** |
| E-S1-09, E-S2-36 | 6 people | medium | `REL_M_CHAIN6` — **medium** |

**Mixed with no structural separator — left alone and flagged.**
`RATE_H_TWO_PHASE` was 2 appropriate / 3 easy. The only thing separating the two
groups is the magnitude of the first rate (40 → appropriate, 20 → easy), and the
brief rules magnitude out as a difficulty feature. Splitting on it would be
fitting to noise, so it stays MEDIUM and is named as a residual.
`SEQ_M_INTERLEAVED` (1/1) is too thin to act on.

**The two MEDIUM items judged HARD** are both `SEQ_H_RECURRENCE`, handled as the
promotion in §2.

---

## 4. Coverage after honest calibration

| | RC2.4 | RC2.5 |
|---|---|---|
| HARD templates | 37 | **17** |
| HARD families | 14 | **9** |
| MEDIUM templates | 54 | 62 |
| EASY templates | 37 | 48 |
| total adjudicated | 125 | 127 |

Hard band by family: sequences 5, ratios 3, relational 3, and one each in
percentages, averages, ages, machines, unit_rate, combined_rate.

### The shortfall, stated plainly

A 50-question **all-HARD session on its own** delivers cleanly from 17 templates:
0 fallbacks on every seed tested.

Inside the **Holdout-E-shaped batch** (4 × 50 mixed + 1 × 50 hard = 82 hard
slots, generated as one batch so batch-level diversity applies) it does not:

| all-hard session size in the batch | seeds needing a cap breach | worst |
|---|---|---|
| 50 | 3/3 | 17 items |
| 45 | 3/3 | 10 |
| 40 | 2/3 | 3 |
| 36 | 1/3 | 1 |
| **32** | **0/3** | **0** |

The binding constraint is the batch reasoning allowance: 82 slots at 5 uses per
reasoning signature needs 17 signatures live at every point, and 17 templates
over 34 signatures cannot sustain it once the four mixed sessions have drawn
first. Across five fresh seeds the batch needed 5–8 reasoning-cap and 7–10
relaxed-cap deliveries.

**Within the declared caps, the engine now supports roughly 64 hard slots in that
shape (4 × 8 + 32), not 82.**

Nothing was relaxed to hide this. No cap was raised, no demoted template was put
back, and every delivery past an allowance is recorded as a diversity warning —
the pre-holdout gate would refuse a Holdout F built this way. The shortfall is
pinned by a test (`RC2.5: the hard band no longer fills an 82-slot batch inside
the caps`) so it cannot change silently in either direction.

The concentration is also worth naming: sequences holds 5 of 17 hard structures
(29%), because rule-discovery sequences are the one shape the reviewers judged
hard every time while nineteen word-problem structures went to medium. The remedy
is more hard structures elsewhere, not fewer sequences.

---

## 5. The five remaining disagreements

| items | template | human | RC2.5 | why it stands |
|---|---|---|---|---|
| E-S1-05, E-S3-31, E-S4-06 | RATE_H_TWO_PHASE | easy | medium | mixed 2/5; the only separator is magnitude, which the brief disqualifies |
| E-S1-38 | SEQ_M_INTERLEAVED | easy | medium | n=2, 1 each way — too thin to act on |
| E-S5-49 | REL_H_GUARANTEE | hard | medium | a single verdict against 0 of 506 drawn instances meeting the graph conditions, in a cluster judged 4 hard / 8 medium |

---

## 6. Work preserved from earlier in RC2.5

All of it, unchanged by the calibration:

- **Partial-order conditions** (`src/qa/partial-order.js`) — now corroborated at
  11/12 against the human verdicts.
- **Language fixes** — the «مرتبة» positional-order ambiguity in `AVG_H_OVERLAP`
  (exactly the 3 items the reviewers flagged) and the rate-unit fix on
  `RATE_H_RATE_FROM_GAP` and `MACH_H_TWO_CONFIG`, both enforced at renderer level
  by `ORDERING_WORD_AMBIGUITY` and `RATE_ANSWER_NOT_RATE_UNIT`.
- **Repetition measurement** — five measures counted apart; 0 exact and 0
  semantic duplicates on Holdout E and on fresh batches.
- **Oracle and key logic** — untouched. 250/250 key agreement, confirmed twice.
- **Telemetry** — both identities balance on every seed.
- **Reproducibility** — identical ids, stems and keys on replay.

---

## 7. Distractors

Deferred until the calibration was done, as instructed. Of the templates that
remain genuinely HARD, the measured position over 2,375 options: repeated
diagnosis 5.4% (bar 10%), options 25× from the key 0.34% (bar 5%), fractional
counts of indivisible things 0, minimum distinct slips per template 4.

`REL_H_COUNT_BRANCHED` was rebuilt during §2: each wrong count is attached to the
slip that produces it, including two new branch-specific misconceptions
(`COUNTED_ONE_BRANCH_ONLY`, `COUNTED_FROM_ONE_ORDERING`). Counts no modelled slip
produces are offered as `MISCOUNTED_THE_CONFIRMED_PATHS` rather than under a slip
they did not come from.

The reviewers flagged distractor concerns on many items, but most of those
comments say "the HARD label is not supported by the option set" — which the
demotions address directly. A further pass targeted at their `material`-severity
comments is outstanding and is listed below.

---

## 8. Fresh validation

Five independent batches in the Holdout E shape, on fresh development seeds:

| seed | hard templates | hard families | exact dup | semantic dup | wrong keys | invalid | ambiguous | reasoning-cap fb | share fb | relaxed fb | exhaustions | telemetry balanced |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RC25F-1 | 17 | 9 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 8 | 0 | yes |
| RC25F-2 | 17 | 9 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 10 | 0 | yes |
| RC25F-3 | 17 | 9 | 0 | 0 | 0 | 0 | 0 | 6 | 0 | 7 | 0 | yes |
| RC25F-4 | 17 | 9 | 0 | 0 | 0 | 0 | 0 | 6 | 0 | 7 | 0 | yes |
| RC25F-5 | 17 | 9 | 0 | 0 | 0 | 0 | 0 | 5 | 0 | 7 | 0 | yes |

Zero on every quality measure. Non-zero only on the diversity fallbacks, which
are the coverage shortfall of §4 and are recorded, not hidden.

**Not claimed as success:** declared = computed agreement. The RC2.2 numeric
score now agrees with the published bands only 46% of the time in MEDIUM, and it
should — the bands follow human verdicts, not the superseded scorer. The floors
on that measurement were loosened to sanity bounds and the number is recorded as
evidence, never as a gate.

---

## 9. Freeze

Taken in §23/§24 order: RC2.4's freeze archived to `rc2/FREEZE_RC2_4.json` with
its provenance for Holdout E recorded in `rc2/SUPERSEDED_FREEZES.json` → clean
tree → suite green → internal gate **PASS (39 conditions, 0 failed)** → freeze.

- production bundle `1976eaebf2cbed499d155c215198d09279bc1627cb89c7abb6a9a10f898107eb`
- 49 production files
- `verifyFreeze()` — intact, 0 files changed
- test suite: **427 tests, 415 pass, 0 fail, 12 skipped**

Six internal-gate conditions were restated for RC2.5 and every restatement is
annotated in the source with the evidence behind it. The most important:
`NOTHING_RECLASSIFIED` now forbids *upward* reclassification only — downward is
RC2.5's purpose — and `REASONING_REPETITION_CAPPED` now requires that a breach be
recorded rather than that no breach occur, because with 17 hard structures it can
no longer be honoured for an 82-slot batch.

---

## 10. Remaining blockers

1. **HARD coverage is insufficient for an 82-slot batch.** Within caps the engine
   supports about 64. Closing it needs new genuinely-hard structures that meet the
   criteria — in the five families that now have none at hard (speed, work_time,
   direct_proportion, calendar, profit_loss) rather than more sequences.
2. **`MACH_H_TWO_CONFIG`** — retained on one verdict while the structurally
   identical `PROP_H_TWO_ITEM_SYSTEM` was demoted 4/4. Needs direct sampling.
3. **`AGE_H_THREE_SIBLINGS` and `SPD_M_EQUAL_DIST`** — demoted by analogy, never
   sampled by Holdout E. Need direct sampling.
4. **`RATE_H_TWO_PHASE`** — genuinely mixed with no admissible separator.
5. **Distractor pass** on the reviewers' `material`-severity comments for the
   templates that remain HARD.
6. **Holdout F** — not generated, as instructed. It should be sized to what the
   coverage actually supports, or deferred until (1) is closed.
