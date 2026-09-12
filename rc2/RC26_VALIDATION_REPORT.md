# RC2.6 — genuine HARD coverage and construction diversity

Continued from frozen RC2.5 `309c50f`. The human-calibrated difficulty decisions
are untouched: nothing demoted was promoted back, no diversity cap was changed,
and no Holdout F was generated.

---

## 1. Coverage, before and after

| | RC2.5 | RC2.6 |
|---|---|---|
| HARD templates | 17 | **26** |
| HARD families | 9 | **13** |
| HARD slots deliverable in the holdout shape, inside every cap | ~64 | **82** |
| MEDIUM templates | 62 | 63 |
| EASY templates | 48 | 48 |
| total adjudicated | 127 | 137 |

Hard band by family: sequences 5, ratios 3, relational 3, speed 2, work_time 2,
direct_proportion 2, calendar 2, profit_loss 2, and one each in percentages,
averages, ages, unit_rate, combined_rate. No family holds more than 19% of the
band — RC2.5's sequences concentration (29%) is diluted by real additions rather
than by removing sequences.

### New templates by family, and why each is genuinely HARD

**speed**

| template | criteria | the structural reason |
|---|---|---|
| `SPD_H_CURRENT` | SIMULTANEOUS_CONSTRAINTS + COMPOSED_INVERSION | Two unknowns — the boat and the current — neither stated and neither recoverable from one journey. The unlocking step is nowhere in the stem: adding the two derived speeds cancels the current, subtracting them cancels the boat. |
| `SPD_H_LEG_SPLIT` | SIMULTANEOUS_CONSTRAINTS + STRATEGY_SELECTION | A total distance and a total time over two legs whose lengths are never stated. Neither condition fixes the split; the pair does. Dividing distance by time, and halving the distance, are both on the paper and both wrong. |

**work_time**

| template | criteria | the structural reason |
|---|---|---|
| `WORK_H_THREE_PAIRS` | CROSS_PART_INTEGRATION + STRATEGY_SELECTION | Only the three *pairs* are timed. No individual rate is given and none follows from a single pair; that summing the three pair rates counts every worker twice is not in the stem. |
| `WORK_H_SOLO_GAP` | SIMULTANEOUS_CONSTRAINTS + COMPOSED_INVERSION | A joint time and a *difference* between the solo times. The relation must be written with one unknown and inverted through the reciprocal sum — the same reasoning shape as `RATE_H_RATE_FROM_GAP`, which the Holdout E reviewers judged hard 5 of 5. |

**direct_proportion**

| template | criteria | the structural reason |
|---|---|---|
| `PROP_H_REPLACE` | SIMULTANEOUS_CONSTRAINTS + COMPOSED_INVERSION | Part of a mixture is drawn off and replaced by one of its own components. Before and after ratios are two conditions on one unknown, and the drawn-off amount is itself a mixture, not a pure component — which the stem never says. |
| `PROP_H_CAPITAL_TIME` | CROSS_PART_INTEGRATION + STRATEGY_SELECTION | A profit split between partners with different amounts for different durations. Neither dimension decides it alone; the shares follow the product, and the stem does not say so. Splitting by money alone and by time alone are both offered. |

**calendar**

| template | criteria | the structural reason |
|---|---|---|
| `CAL_H_MONTH_LENGTH` | SIMULTANEOUS_CONSTRAINTS + STRATEGY_SELECTION | Two dated weekdays across a month boundary pin the month's length only modulo seven; the answer is the one candidate length that fits. Counting forward from either date settles nothing. |
| `CAL_H_OFFSET_CYCLES` | SIMULTANEOUS_CONSTRAINTS + STRATEGY_SELECTION | Two recurring events whose *starts differ*, so the first shared day is the first solution of a congruence, not the LCM. Taking the LCM is the natural move and is on the paper. This is the demoted `CAL_H_CYCLE_MEET` with the coincident start that made it routine removed. |

**profit_loss**

| template | criteria | the structural reason |
|---|---|---|
| `PL_H_SAME_PRICE_PAIR` | SIMULTANEOUS_CONSTRAINTS + STRATEGY_SELECTION | Two articles at the same selling price, one at +g%, one at −g%. The percentages look symmetric but sit on different costs, so they do not cancel. "No gain and no loss" is the answer most solvers write, and it is an option. |
| `PL_H_REST_MARGIN` | CROSS_PART_INTEGRATION + COMPOSED_INVERSION | Part of a consignment is sold at a known margin and the *overall* target margin is given. The two parts must be brought onto one footing in money before the remainder's rate can be recovered, and the recovery is an inversion, not a subtraction of percentages. |

None of the ten is hard by larger numbers, more steps, decimals, longer stems or
awkward wording. Each was checked against the Holdout E human standard: where a
shape the reviewers judged MEDIUM appears (a 2×2 linear system, a rate-after-
percentage chain), it was not used.

---

## 2. The four uncertain structures, resolved by direct sampling

Each was generated and its actual output read, not argued from resemblance.

| template | what it actually draws | resolution |
|---|---|---|
| `MACH_H_TWO_CONFIG` | a 2×2 linear system in two machine rates — and the sampler allowed the two first-type counts to be **equal**, which collapses the elimination to one subtraction while the explanation still cross-multiplies | **demoted to MEDIUM.** Same structure as `PROP_H_TWO_ITEM_SYSTEM`, which the reviewers judged overclassified 4 of 4; its own single "appropriate" is one item against that four. The degenerate draw is now excluded as well. |
| `AGE_H_THREE_SIBLINGS` | two stated differences and a sum collapse to `3s + 13 = 34` — one linear equation in one unknown | **stays MEDIUM**, now on direct evidence rather than analogy |
| `SPD_M_EQUAL_DIST` | equal half-distances at two speeds with the total time given — one unknown, one equation | **stays MEDIUM**, confirmed directly |
| `RATE_H_TWO_PHASE` | rate × time, a percentage rise, rate × time, add — a four-multiplication fixed pipeline, and rate-after-percentage is a shape the RC2.3 brief names as disqualified | **stays MEDIUM**, confirmed directly. Its 2-of-5 "appropriate" verdicts are a minority with no structural feature separating them from the 3 that were called easy. |

This is the one place RC2.6 moved a template *down*. The rest of the calibration
is unchanged.

---

## 3. Construction diversity

Three signatures are now published on every question beside the reasoning one:

- **`stem_skeleton`** — the stem with every numeral and every personal name
  removed. Two items sharing it are the same sentences.
- **`scenario_signature`** — the situation the stem sets up, independent of what
  is asked.
- **`construction_signature`** — scenario + asked unknown + forward/reverse
  direction. This is the unit the brief calls a genuinely different construction.

Four templates now offer **two constructions over the same relation** — a
different unknown asked, and in three cases a different reasoning direction:

| scenario | constructions |
|---|---|
| boat with and against the current | the current's speed (reverse) / the boat's speed (forward) |
| journey split between two speeds | the first leg's length / the hours at the second speed |
| two articles, same price, equal percentages | the net loss on the pair / the total cost of the pair |
| *(and the rest carry one honest construction each)* | |

The ten added structures yield **13 constructions** across the five families.

### The seven measures, kept apart

Averages over five fresh 250-question batches in the holdout shape:

| measure | value | reading |
|---|---|---|
| 1. exact duplicates | **0** | a defect at any rate above zero |
| 2. semantic duplicates | **0** | a defect at any rate above zero |
| 3. parameter-only variants | 0.793 | items sharing a template *and* asked unknown with another item. This is how an item bank varies and is **not** a defect; it is bounded by the session caps |
| 4. same reasoning skeleton | 0.757 | bounded at 3 per session and 5 per batch; no breach |
| 5. same stem/sentence skeleton | 0.630 | two items with the same sentence shape and different content |
| 6. same scenario structure | 0.850 | 250 questions over 137 templates must reuse situations; the cap is what keeps it from becoming repetition |
| 7. genuinely distinct constructions | **120 per batch** (32 in the hard band alone) | |

Measures 3–6 are *shares of items sitting in a group larger than one*, not defect
rates. In a 250-question paper drawn from 137 templates they are high by
arithmetic: with 120 distinct constructions over 250 items the mean construction
appears twice. What matters is that none runs away, and none does —
`CONSTRUCTION_CAP_PER_BATCH = 6` was not reached in any run
(`overCap: []` on all five seeds).

---

## 4. Distractors

The Holdout E reviewers raised **material**-severity distractor concerns on 21
templates. Of those, 19 carry the same note — *"the hard label is not supported
by the option set: the setup is routine"* — and every one of those 19 is now
MEDIUM, which is what that note asks for.

Two were on templates that remain HARD, and both are resolved and traceable:

| template | the concern | resolution |
|---|---|---|
| `AVG_H_OVERLAP` (3 of 3) | *"the wording creates a competing interpretation under which the premises are inconsistent"* | the «مرتبة» positional-order ambiguity, fixed in RC2.5 at renderer level and rejected by `ORDERING_WORD_AMBIGUITY` |
| `REL_H_POSITION` (3 of 4) | *"the setup is routine"* | exactly the three routine-graph items (E-S5-08, E-S5-22, E-S5-50); the RC2.5 graph conditions no longer draw those graphs at hard. The fourth item, E-S5-45, was judged appropriate **and carried no distractor concern** |

Two still-hard relational templates also had thin provenance and were rebuilt:

- `REL_M_BRANCH_UNRES` drew all six options from **one** diagnosis. Each wrong
  pair is now diagnosed by *how* it is actually settled — stated outright, by one
  transitive step, or by a longer chain. Three diagnoses is the honest ceiling:
  there is no fourth way a determined pair is determined, and inventing one would
  be false provenance.
- `REL_H_POSITION` gained a fourth: a name that can hold an *adjacent* position
  is an off-by-one reading, not a misread order.

Hard-band option quality over 15,000 options: repeated diagnosis 8.4%, options
25× from the key 0.35%, fractional counts of indivisible things 0.

---

## 5. Acceptance

Five fresh batches, sessions 1–4 at 13 EASY / 29 MEDIUM / 8 HARD and session 5 at
50 HARD — **82 hard slots**, generated as one batch.

| requirement | result |
|---|---|
| wrong keys | **0** on all five |
| ambiguity | **0** |
| exact duplicates | **0** |
| semantic duplicates | **0** |
| cap breaches | **0** |
| reasoning fallback | **0** |
| template-share fallback | **0** |
| relaxed delivery | **0** |
| exhaustion | **0** |
| hard slots from non-genuine-HARD structures | **0** |
| telemetry identities balance | yes, all five |

| seed | hard slots | hard templates | hard families | reasoning signatures | construction signatures |
|---|---|---|---|---|---|
| RC26-ACC-1 | 82 | 25 | 13 | 34 | 32 |
| RC26-ACC-2 | 82 | 26 | 13 | 32 | 31 |
| RC26-ACC-3 | 82 | 26 | 13 | 35 | 33 |
| RC26-ACC-4 | 82 | 26 | 13 | 34 | 31 |
| RC26-ACC-5 | 82 | 26 | 13 | 34 | 32 |

### Per-session distribution (run 1; the other four match)

| session | bands | hard templates | hard families | most-used template |
|---|---|---|---|---|
| SESSION-1 | 13 / 29 / 8 | 8 | 8 | 2 of 50 |
| SESSION-2 | 13 / 29 / 8 | 8 | 8 | 2 of 50 |
| SESSION-3 | 13 / 29 / 8 | 8 | 8 | 2 of 50 |
| SESSION-4 | 13 / 29 / 8 | 8 | 8 | 2 of 50 |
| SESSION-5 | 0 / 0 / 50 | 25 | 13 | 4 of 50 (the cap) |

The all-hard session draws 25 of the 26 hard templates across all 13 hard
families, with no template exceeding its cap of 4.

---

## 6. Freeze

§23/§24 order: RC2.5's freeze archived to `rc2/FREEZE_RC2_5.json` with its reason
recorded in `rc2/SUPERSEDED_FREEZES.json` → clean tree → suite green → internal
gate **PASS (39 conditions, 0 failed)** → freeze.

- production bundle `aaad3d966b41cf9a5d8760c8449e8b2abad1bcb43c2c6d198226534679a81507`
- 50 production files
- `verifyFreeze()` — intact, 0 files changed
- test suite: **438 tests, 426 pass, 0 fail, 12 skipped** (11 new RC2.6 tests)

Two internal-gate conditions were updated for RC2.6: the template count (137) and
nothing else. The RC2.5 gate conditions that encode the human calibration —
`NOTHING_RECLASSIFIED` forbidding upward moves, `ALL_HARD_BATCH_ACCEPTS`, the
Holdout D direction check — were left exactly as the calibration set them and
pass unchanged.

The RC2.5 test that pinned the coverage shortfall was **turned around**, not
deleted: it now asserts that an 82-slot batch fits inside every cap, so a future
regression in either direction fails.

---

## 7. What is outstanding

1. **Holdout F** — not generated, as instructed. Coverage now supports the full
   82-slot shape, so it can be generated at the intended size when approved.
2. **The ten new structures have no independent human verdict.** They are
   adjudicated against the criteria and checked against the Holdout E standard by
   construction, but no reviewer has seen them. That is precisely what Holdout F
   is for, and it is the main reason to run one.
3. **`REL_M_BRANCH_UNRES` carries three diagnoses, not four.** Stated as a
   ceiling rather than a defect; re-examine if a fourth genuine slip appears.
4. **Scenario reuse is high by arithmetic** (0.85). The cap holds it, but more
   scenarios per concept would lower it honestly. Adding constructions to the
   existing MEDIUM and EASY bands is the cheapest next gain.
