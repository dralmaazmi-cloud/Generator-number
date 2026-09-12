# RC1 MANUAL BLIND REVIEW — CONSOLIDATED REPORT

**MANUAL BLIND REVIEW COMPLETE: 250 / 250**

RC1 frozen at `7b5d4617295c98a8ed0f87d204f4745dd5db05dd`. No production code was
modified during this review; `git diff 7b5d461 -- src app.js report.js index.html
styles.css question.schema.json generator_manifest.json vercel.json` is empty.

### Who reviewed what

| Questions | Families | Reviewer |
|---|---|---|
| 92 | calendar, fractions, ratios, percentages, averages, ages | the earlier review round (not repeated here) |
| **158** | odd_one_out, relational, sequences, speed, work_time, machines, combined_rate, unit_rate, direct_proportion, profit_loss | **this round** |

Findings from the first 92 are carried forward in section 11 exactly as recorded.
I did not re-derive them and do not claim to have verified them.

### What "manual" means here, stated plainly

For the 158 I solved every question from the stem and the six options alone,
before revealing the key, the oracle result, the explanation or the provenance.
Where a mechanical check was needed I wrote a **fresh** checker for this audit
that imports none of the production QA modules — an independent competing-rule
library for odd-one-out and a brute-force linear-extension enumerator for
relational. Each is labelled below. The generator's own oracle was read only
afterwards, as reference.

One caveat you should weigh: I am the same system that wrote RC1. This is a
blind review in procedure, not an independent second party.

---

## A. KEY INTEGRITY (the 158 reviewed this round)

| Verdict | Count |
|---|---|
| PASS — correct unique key | **158 / 158** |
| WRONG_KEY | 0 |
| NO_VALID_KEY | 0 |
| MULTIPLE_VALID_KEYS | 0 |

Every published key matched my independent answer. Per family: odd_one_out 16/16,
relational 16/16, sequences 16/16, speed 17/17, work_time 16/16, machines 16/16,
combined_rate 15/15, unit_rate 16/16, direct_proportion 15/15, profit_loss 15/15.

**This is the good news and it is real.** Every defect below is about something
other than the arithmetic.

## B. BY SESSION

| Session | Total | Reviewed this round | easy/med/hard | Difficulty mismatch | Known Arabic flag |
|---|---|---|---|---|---|
| S1 | 50 | 32 | 13/29/8 | 25 | 3 |
| S2 | 50 | 31 | 13/29/8 | 29 | 2 |
| S3 | 50 | 32 | 13/29/8 | 29 | 3 |
| S4 | 50 | 31 | 13/29/8 | 26 | 2 |
| S5 | 50 | 32 | 0/0/50 | 9 | 3 |

## C. BY FAMILY (all 16)

| Family | n | Reviewer | Key verdict | Difficulty mismatch | Key-neighbour distractors |
|---|---|---|---|---|---|
| ages | 15 | first 92 | carried forward | 11 | 18 |
| averages | 15 | first 92 | carried forward | 2 | 23 |
| calendar | 16 | first 92 | carried forward | 2 | 0 |
| combined_rate | 15 | this round | 15/15 PASS | 13 | 16 |
| direct_proportion | 15 | this round | 15/15 PASS | 4 | 0 |
| fractions | 15 | first 92 | carried forward | 11 | 5 |
| machines | 16 | this round | 16/16 PASS | 9 | 16 |
| odd_one_out | 16 | this round | 16/16 PASS | 7 | 0 |
| percentages | 16 | first 92 | carried forward | 6 | 10 |
| profit_loss | 15 | this round | 15/15 PASS | 10 | 16 |
| ratios | 15 | first 92 | carried forward | 9 | 10 |
| relational | 16 | this round | 16/16 PASS | 9 | 0 |
| sequences | 16 | this round | 16/16 PASS | 4 | 27 |
| speed | 17 | this round | 17/17 PASS | 7 | 25 |
| unit_rate | 16 | this round | 16/16 PASS | 6 | 4 |
| work_time | 16 | this round | 16/16 PASS | 8 | 24 |

66 distinct templateIds were exercised by the 158.

---

## D. NEW BLOCKERS

Every item here is a **MANUAL REVIEW FINDING** unless marked otherwise. None
appears in `SIGNOFF_RC1.md`.

### D-1. The ambiguity check cannot fire when only one simple rule exists — **NEW_RC1_SIGNOFF_DEFECT**

`checkOddOneOutAmbiguity` (`src/qa/ambiguity.js:103-113`) filters the rule list to
complexity ≤ 3, then looks for a **pair** of rules with different outliers. If
exactly one simple rule survives the filter, no pair can form and the verdict is
`ambiguous: false` — however badly that one rule disagrees with the key. Worse,
`supportsIntended` is computed from the **unfiltered** list, so a rule the checker
itself considers too hard to see still certifies the item.

Evidence (AUTOMATED, running the production checker on the frozen sets):

| Question | Set | Published key | Rules the checker calls simple | Verdict |
|---|---|---|---|---|
| **S1/27** `ODD_H_SQ_MINUS` | {24,35,75,48,63,15} | **75** | `mult3` (c1) → **35** | `ambiguous=false` |
| **S5/08** `ODD_H_SQ_MINUS` | {24,63,15,30,48,35} | **30** | `mult3` (c1) → **35** | `ambiguous=false` |

In both, the *only* rule the engine treats as humanly simple points at 35, and the
published key is a different number. The intended rule `sqMinus1` is complexity 4
and is filtered out before the comparison. A candidate who reasons "all are
multiples of 3 except 35" — the simplest correct reading available — is marked
wrong. 2 of the 3 `ODD_H_SQ_MINUS` instances in the sample are affected.

### D-2. Only the "all but one fails" framing is tested — **NEW_RC1_SIGNOFF_DEFECT**

`findSingleOutlierRules` tests `failing.length === 1` only. It never tests
"exactly one number **satisfies** P", and the rule grammar contains no
digit-magnitude class at all. Both are standard odd-one-out framings.

| Question | Set | Key | Competing class the checker cannot see |
|---|---|---|---|
| S3/27 `ODD_E_MULT` | {16,18,32,20,24,28} | 18 (multiples of 4) | **16 is the only perfect square** |
| S1/08 `ODD_M_CUBES` | {512,343,216,624,125,64} | 624 | all three-digit **except 64** |
| S4/21 `ODD_M_CUBES` | {64,27,8,268,125,216} | 268 | **8 is the only single-digit** |
| S4/10 `ODD_E_SQUARES` | {73,81,64,36,100,49} | 73 | all two-digit **except 100** |
| S2/07, S2/39 `ODD_M_PRIME2` | {14,12,26,6,10,22} | 12 | all two-digit **except 6** |
| S3/13 `ODD_M_PRIME2` | {10,24,6,14,26,22} | 24 | all two-digit **except 6** |
| S5/22 `ODD_H_PRIME_OFFSET` | {12,11,19,13,9,17} | 12 | **9 is the only square**, and the only single-digit |

### D-3. `ODD_H_PRIME_OFFSET` publishes rules its own model says nobody will see — **NEW_RC1_SIGNOFF_DEFECT**

S5/46 = {21,23,15,13,19,17}, key **19**, rule "prime + 10". Running the production
checker: *"rules it treats as simple (c≤3): (none)"*. The single rule in the whole
grammar that fits is complexity 4 — above the engine's own ceiling for what a
candidate can see. The natural reading, primality, singles out **two** numbers
(21 and 15), neither of which is the key. The set is also six consecutive odd
numbers, which hides the intended structure further.

S5/22 is the mirror image: intended rule `primePlus6` (c4), but the set is solvable
in one second by "which one is even". A Hard item with a trivial solution path.

### D-4. `REL_H_POSITION_UNCERTAIN` is a constant-answer template — **NEW_RC1_SIGNOFF_DEFECT**

AUTOMATED, over the frozen 10k corpus:

| Template | n | Distinct published answers | Most common |
|---|---|---|---|
| **REL_H_POSITION_UNCERTAIN** | **91** | **1** | `لا يمكن تحديده` — **100%** |

All 5 instances in the audit sample (S4/18, S5/12, S5/26, S5/43, S5/49) answer
"cannot be determined", and so do all 91 in the corpus. A candidate who meets this
template once answers every future instance correctly without reading it. It is
the most exploitable leak found in this review, and it is in the Hard band.

My independent enumerator confirms the key is *correct* every time — the partial
order genuinely never determines that position. The defect is that the template
can never generate a determinate case, so the question carries no information.

### D-5. Narrow answer-value spaces — **NEW_RC1_SIGNOFF_DEFECT**

AUTOMATED, over the frozen 10k corpus:

| Template | Declared | n | Distinct answers | The whole answer set |
|---|---|---|---|---|
| REL_H_POSITION_UNCERTAIN | hard | 91 | 1 | `لا يمكن تحديده` (100%) |
| PL_E_LOSS | easy | 104 | 3 | 20% (40%), 10% (36%), 25% (24%) |
| PL_M_TOTAL_COST | medium | 114 | 3 | 20% (44%), 10% (37%), 25% (19%) |
| **COMB_H_STAGED** | **hard** | 89 | **3** | 5h (36%), 3h (34%), 4h (30%) |
| **SPD_H_TIME_DIFF** | **hard** | 73 | **4** | 300 (37%), 240 (25%), 360 (25%), 180 (14%) |
| SPD_M_EQUAL_DIST | medium | 81 | 4 | 720 (44%), 480 (27%), 360 (19%), 240 (10%) |
| MACH_E_REQUIRED | easy | 113 | 4 | 8 (35%), 12 (27%), 10 (22%), 6 (17%) |
| COMB_M_SOLO_THEN | medium | 122 | 4 | 4h (34%), 6h (30%), 5h (24%), 3h (13%) |

Always picking the modal value beats the 16.7% guessing baseline by a wide margin
— 44% on `PL_M_TOTAL_COST`, 36% on a **Hard** template. This is independent of the
rank-calibration blocker: it needs no rank reasoning, only template recognition.

### D-6. Key-neighbour distractors carrying a registered misconception id — **NEW_RC1_SIGNOFF_DEFECT**

The development round reported that the random near-miss fallback was *deleted
entirely* and that distractor provenance went 0% → 100%. Both statements are true
of the code. But the practice survived under a label.

Classification of all 1,250 wrong options across the 250 questions (MANUAL
criterion, applied mechanically): a distractor is a `GENERIC_KEY_NEIGHBOR` when its
printed derivation is literally the key plus or minus a small constant, with no
operation drawn from the task.

| Class | Count | Share of all wrong options |
|---|---|---|
| REAL_MISCONCEPTION / PLAUSIBLE_PROCEDURAL_ERROR | 1,057 | 84.6% |
| **GENERIC_KEY_NEIGHBOR** | **193** | **15.4%** |

`OFF_BY_ONE_STEP` is used 272 times across the 250; **193 of those (71%) are
`key ± n`**. Genuinely justified instances do exist — `90 × (1.5 − 0.5)` (used the
wrong duration), `15 × (36 + 1)`, `(8 + 12) × (3 − 1)`, `30 × (7 + 1)` — 79 in
total. The remaining 193 are not mistakes a candidate can make; they are the
answer with a number added.

Five questions have three or more of their five distractors in this class.
The worst is **S5/32 `WORK_H_WORKERS_EFF` (Hard)**, where **four of five** are:

```
A  9    [KEY]
B  7.2  FAILED_TO_UPDATE_COUNT  << 90 ÷ (10 × 1.25)
C  8    OFF_BY_ONE_STEP  << 9 − 1
D  11   OFF_BY_ONE_STEP  << 9 + 2
E  10   OFF_BY_ONE_STEP  << 9 + 1
F  7    OFF_BY_ONE_STEP  << 9 − 2
```

The option set is {7, 7.2, 8, 9, 10, 11}: a tight integer run with the key at its
centre and one outlier. No arithmetic is needed to shortlist it.

One derivation in the sample is written `8 ± 5` (S5/42) — the `±` is an admission
that no particular error produces the value.

### D-7. Misattributed misconception feedback — **NEW_RC1_SIGNOFF_DEFECT**

`USED_SUM_OF_SPEEDS_IN_CHASE` is applied **195** times in the corpus, of which
**154 (79%)** are on `SPD_M_EQUAL_DIST` and `SPD_H_TIME_DIFF` — neither of which
contains a chase. The candidate is told, in Arabic, that they made an error the
question cannot elicit.

S5/24 (no chase in the stem) shows both halves of the problem:

> **D** `(50 + 100) × 3` → *"جمعت السرعتين في مسألة لحاق، والصحيح أن تطرحهما."*
> **F** `50 × 100 × 3 ÷ (50 + 100)` → the same sentence, though that derivation is
> a harmonic-mean form, not a sum of speeds.

### D-8. Option-specific feedback is not as specific as reported — **NEW_RC1_SIGNOFF_DEFECT**

AUTOMATED, over the frozen 10k corpus, stripping the mechanical
`اخترت X، وهي ناتج Y` prefix and comparing the explanatory sentence that follows:

| Measure | Value |
|---|---|
| Questions where two or more wrong options carry the **identical** explanatory sentence | **6,117 / 10,000 (61.2%)** |
| Wrong options carrying a non-unique explanatory sentence | **11,276 / 50,000 (22.6%)** |

The "100% option-specific feedback" figure in the development report counted the
derivation prefix, which differs trivially because the numbers differ. The
*pedagogical content* is duplicated on nearly a quarter of all wrong options. On
S5/32 the same sentence appears four times.

### D-9. The difficulty band model is miscalibrated in one direction — **NEW_RC1_SIGNOFF_DEFECT**

See section I. 47.2% mismatch, and the errors are one-directional.

### D-10. Two new Arabic defect classes, outside the known averages pattern

See section E.

---

## E. LANGUAGE DEFECTS

### Known (carried forward, not re-counted as discoveries)

`فما متوسط القيم 9؟` — definite plural followed by a bare numeral. 13 questions in
the audit sample, all flagged in `audit.arabicFlag`; 548 / 10,000 in the corpus;
6 of 7 `averages` templates. Recorded in `SIGNOFF_RC1.md` §8.

### New, found this round — **MANUAL REVIEW FINDING**

Both are **case (إعراب) errors on the dual**, a category the validator does not
examine at all.

| # | Defect | Exact phrase | Recommended form | Template | Corpus scope | In sample |
|---|---|---|---|---|---|---|
| 1 | مضاف إليه in the nominative instead of the genitive | `يستطيع 6 عمال إنجاز **مهمتان** خلال 4 أيام` | `إنجاز **مهمتين**` | `WORK_E_VOLUME` | 37 / 10,000 (0.37%) | **S2/24** |
| 2 | dual after `كل` in the nominative, plus verb non-agreement | `كل **سنتيمتران تمثل** 10 كيلومترات` | `كل **سنتيمترين يمثلان**` (or `كل سنتيمتر يمثل 5 كيلومترات`) | `PROP_M_MAP` | 23 / 10,000 (0.23%) | **S2/19** |

Defect class: `AR_DUAL_WRONG_CASE`. Both survive because
`checkArabicNumberUnits` matches only *numeral → lexicon-unit* pairs across 21
words; `مهمة` and `سنتيمتر` in the dual are outside both the direction and the
lexicon.

**Totals:** known 13 in-sample / 548 corpus; new 2 in-sample / 60 corpus;
**15 affected questions in the 250**.

Correctly-formed duals elsewhere (`توقفت آلتان`, `عملا معًا`, `ينجزان`) are
nominative in subject position and are right. I found no further Arabic defect in
the 158 beyond these two classes.

---

## F. EXPLANATION / PEDAGOGY DEFECTS

| Check | Result |
|---|---|
| Explanation reaches the published key | **0 real failures.** An automated pass flagged 397/8,495, but every one inspected was my matcher's artifact — `-10` rendered as `انخفاض 10%`, or an odd-one-out step ending on the rule constant. Reported as clean. |
| Quick method general, not fitted to the sampled numbers | No failures found in the 158. Spot-checked the staged templates: `المتبقي ÷ (العمال الباقون × معامل الكفاءة)` and `حل س × (1 ÷ 50 − 1 ÷ 100) = 3` are both general statements. |
| Explanation consistent with the stem | **Fails on the "chase" family — D-7**, 154 corpus occurrences. |
| Feedback consistent with its own derivation | **Fails on D-7** (a harmonic-mean derivation described as a sum of speeds) and is vacuous on the 193 key-neighbour options of D-6. |
| Incorrect general rule or reminder | None found in the 158. |
| Hidden-fraction semantic reversal (`previous ÷ next` vs `next ÷ previous`) | Carried forward from the first 92. Not re-counted; `fractions` was not in my scope. |

---

## G. DISTRACTOR QUALITY

All 250 questions, 1,250 wrong options.

| Class | Count | Share |
|---|---|---|
| REAL_MISCONCEPTION | 1,025 | 82.0% |
| PLAUSIBLE_PROCEDURAL_ERROR | 32 | 2.6% |
| **GENERIC_KEY_NEIGHBOR** | **193** | **15.4%** |
| ARBITRARY_VALUE | 0 | 0% |
| REUSED_GIVEN_VALUE — with a valid rationale | 35 (`USED_GIVEN_VALUE_AS_ANSWER`, all defensible) | 2.8% |
| REUSED_GIVEN_VALUE — without a real rationale | 0 | 0% |

**`OFF_BY_ONE_STEP`: 272 total across the 250; 79 genuinely justified; 193 not.**

For the 158 reviewed this round: 790 wrong options, 57 distinct misconception ids,
151 `OFF_BY_ONE_STEP` of which 124 are key-neighbours and 27 justified.

No distractor was invented without provenance, and no impossible value was
published. The failure is that provenance was accepted as a substitute for
pedagogical reality.

---

## H. AMBIGUITY

No ambiguity was found outside `odd_one_out`. Sequences: 16/16
`UNAMBIGUOUS_RULE` (S1/45, S3/22 and S2/05 admit a second rule that yields the
*same* answer — `ALTERNATIVE_RULE_SAME_ANSWER`, which is not a defect). Relational:
16/16 uniquely determined, with no `RELATIONAL_NON_UNIQUE`,
`RELATIONAL_FALSE_CERTAINTY`, `RELATIONAL_MISSED_TRANSITIVITY` or
`RELATIONAL_UNSTATED_ASSUMPTION`. The seven numeric families: no ambiguity.

`odd_one_out` — 10 of 16 affected:

| Question | Set | Key | Competing rule | Its outlier | Verdict |
|---|---|---|---|---|---|
| **S1/27** | {24,35,75,48,63,15} | 75 (n²−1) | **multiples of 3** (complexity 1) | **35** | **AMBIGUOUS** |
| **S5/08** | {24,63,15,30,48,35} | 30 (n²−1) | **multiples of 3** (complexity 1) | **35** | **AMBIGUOUS** |
| **S3/27** | {16,18,32,20,24,28} | 18 (mult. of 4) | **only perfect square** | **16** | **AMBIGUOUS** |
| **S5/22** | {12,11,19,13,9,17} | 12 (prime+6) | **only square / only single-digit** | **9** | **AMBIGUOUS** |
| S1/08 | {512,343,216,624,125,64} | 624 (cubes) | all three-digit except one | 64 | BORDERLINE |
| S2/07 | {14,12,26,6,10,22} | 12 (2×prime) | all two-digit except one | 6 | BORDERLINE |
| S2/39 | {12,10,26,22,14,6} | 12 (2×prime) | all two-digit except one | 6 | BORDERLINE |
| S3/13 | {10,24,6,14,26,22} | 24 (2×prime) | all two-digit except one | 6 | BORDERLINE |
| S4/10 | {73,81,64,36,100,49} | 73 (squares) | all two-digit except one | 100 | BORDERLINE |
| S4/21 | {64,27,8,268,125,216} | 268 (cubes) | only single-digit | 8 | BORDERLINE |
| S5/46 | {21,23,15,13,19,17} | 19 (prime+10) | — no competing *unique* rule, but the intended rule is above the engine's own simplicity ceiling and primality yields two candidates, neither the key | — | **UNAMBIGUOUS but undiscoverable (D-3)** |
| S1/40, S2/28, S2/50, S3/42, S4/35 | — | — | alternatives agree with the key | — | UNAMBIGUOUS |

**4 AMBIGUOUS + 6 BORDERLINE + 1 undiscoverable = 11 of 16 odd-one-out questions
carry an ambiguity or discoverability defect (68.75%).** None was caught by the
production checker; all eleven were published with `ambiguous=false`.

Method note: my acceptance test for a competing rule is that the five
non-outliers form a class a candidate would recognise. Artifacts such as
"divisible by 7 → 343 in a set of cubes" were discarded.

---

## I. DIFFICULTY MATRIX — declared vs computed, all 250

```
                    Computed
Declared      Easy   Medium   Hard      n    mismatch
Easy             6       43      3     52    46 (88.5%)
Medium           0       56     60    116    60 (51.7%)
Hard             0       12     70     82    12 (14.6%)
```

| Transition | Count |
|---|---|
| Easy → Medium | 43 |
| Easy → Hard | 3 |
| Medium → Easy | **0** |
| Medium → Hard | 60 |
| Hard → Medium | 12 |
| Hard → Easy | **0** |
| **Total mismatch** | **118 / 250 = 47.2%** |

### Manual assessment

The errors are **one-directional**: the computed band is never *lower* than
declared for Easy or Medium, and `Medium → Easy` and `Hard → Easy` are both zero.
That is a signature of a miscalibrated threshold, not of miscategorised questions.

`bandFor` (`src/qa/complexity.js:36`) uses `score ≤ 4.5 → easy`, `≤ 9.5 → medium`.
Take S1/01 `WORK_E_INVERSE`: *"8 workers finish a job in 18 days; how long for
12?"* — one inverse-proportion insight and `8 × 18 ÷ 12`. Declared **Easy**;
computed score 5.3 → **Medium**. The declared label is the defensible one; the
model over-scores. 43 of the 52 declared-Easy questions are this case.

| Assessment | Count | Basis |
|---|---|---|
| `JUSTIFIED_MISMATCH` — the declared label is right and the model over-scores | ~103 (all 46 Easy mismatches, and the 57 Medium→Hard cases that are two-step arithmetic) | the Easy band is effectively unreachable at these thresholds |
| `MISCLASSIFIED_DIFFICULTY` | **12** — the `Hard → Medium` cases | these are genuinely not hard; see below |
| `UNCERTAIN` | 3 (Easy → Hard) | too few to generalise |

The 12 `Hard → Medium` cases are the ones where the *declared* label is
indefensible, and they overlap exactly with D-3 and D-4: a Hard item solvable by
"which one is even" (S5/22), and a Hard item whose answer is always "cannot be
determined" (the five `REL_H_POSITION_UNCERTAIN`). For those, no reasoning burden
justifies the Hard label — I looked for one and there is none.

**Conclusion: `complexity_band` cannot currently be used as a QA signal.** With an
88.5% disagreement rate on Easy it carries no information about the declared
label, and the two are not measuring the same thing.

---

## J. RC2 SCOPE ADDITIONS

Defect **classes** to add. No implementation is proposed here.

| # | Class | Where |
|---|---|---|
| 7 | `AMBIGUITY_LONE_SIMPLE_RULE_NEVER_COMPETES` — a single simple rule disagreeing with the key cannot trigger rejection, and `supportsIntended` is satisfied from the unfiltered list | `src/qa/ambiguity.js:103-113` |
| 8 | `AMBIGUITY_INVERSE_FRAMING_AND_MAGNITUDE_BLIND_SPOT` — only "all but one fails" is tested; no digit-magnitude class in the grammar | `src/qa/ambiguity.js:84-92` |
| 9 | `UNDISCOVERABLE_INTENDED_RULE` — a template may publish a rule above the engine's own simplicity ceiling | `ODD_H_PRIME_OFFSET`, `ODD_H_SQ_MINUS` |
| 10 | `CONSTANT_ANSWER_TEMPLATE` — 91/91 identical answers | `REL_H_POSITION_UNCERTAIN` |
| 11 | `NARROW_ANSWER_VALUE_SPACE` — ≤4 distinct answers over ~100 instances, including Hard templates | 8 templates listed in D-5 |
| 12 | `GENERIC_KEY_NEIGHBOR_DISTRACTOR` — `key ± n` accepted because it carries a registered misconception id; 15.4% of all wrong options | `src/qa/misconceptions.js` + every family using `OFF_BY_ONE_STEP` |
| 13 | `MISATTRIBUTED_MISCONCEPTION_FEEDBACK` — feedback describing an error the stem cannot elicit; 154 occurrences | `SPD_M_EQUAL_DIST`, `SPD_H_TIME_DIFF` |
| 14 | `FEEDBACK_SPECIFICITY_OVERSTATED` — 22.6% of wrong options share an explanatory sentence; the reported 100% counted the derivation prefix | measurement + `src/qa/misconceptions.js` |
| 15 | `DIFFICULTY_BAND_MISCALIBRATION` — 47.2% one-directional mismatch; `complexity_band` unusable as a signal | `src/qa/complexity.js:36` |
| 16 | `AR_DUAL_WRONG_CASE` — `إنجاز مهمتان`, `كل سنتيمتران تمثل`; the validator checks no case at all | `WORK_E_VOLUME`, `PROP_M_MAP`, `src/arabic/units.js` |

---

## 11. FINDINGS PRESERVED FROM EARLIER ROUNDS

Recorded as previously established. Items marked *(first 92)* were found by the
earlier review and are carried forward unchanged; I did not re-derive them.

| # | Finding | Source |
|---|---|---|
| 1 | Rank-driven distractor selection | `SIGNOFF_RC1.md` §5 |
| 2 | Arabic averages agreement defect — 13 in sample, 548 in corpus | `SIGNOFF_RC1.md` §8 |
| 3 | Incomplete rejection telemetry; 2 dead reason codes | `SIGNOFF_RC1.md` §2 |
| 4 | Seeded reproducibility qualification (fresh engine only) | `SIGNOFF_RC1.md` §7 |
| 5 | Incomplete degeneracy-model coverage — 79.3% | `SIGNOFF_RC1.md` §6-B |
| 6 | PDF visual-order / presentation-form text layer | `RC2_SCOPE_CANDIDATES.md` #6 |
| 7 | Hidden-fraction semantic reversal (`previous ÷ next` vs `next ÷ previous`) | *(first 92)* |
| 8 | Ratio-invariant escape cases | *(first 92)* |
| 9 | Odd-one-out ambiguity identified in the first round | *(first 92)* — now substantially extended by section H |
| 10 | Version traceability mismatch | *(first 92)* |
| 11 | Distractor-quality concern | *(first 92)* — now quantified in section G |

---

## 14. EVIDENCE INDEX

| Conclusion | Kind | Produced by |
|---|---|---|
| 158/158 key agreement | **MANUAL** solve, then reveal | recorded answer maps + `tools/audit/compare-manual.mjs` |
| odd-one-out competing rules | **MANUAL** judgement over an **independent automated** sweep | `tools/audit/independent-oddoneout.mjs` (imports no production QA module) |
| relational uniqueness | **MANUAL** reasoning, confirmed by **independent automated** enumeration | `tools/audit/independent-relational.mjs` (brute-force linear extensions) |
| production ambiguity checker behaviour | **AUTOMATED**, the generator's own code | `src/qa/ambiguity.js` run on the frozen sets |
| constant-answer and narrow-answer templates | **AUTOMATED** | `qa-artifacts/corpus.jsonl.gz` |
| distractor classification | **MANUAL** criterion, applied mechanically | `audit-rc1/blind-audit-250.jsonl` |
| feedback duplication, misattribution | **AUTOMATED** | `qa-artifacts/corpus.jsonl.gz` |
| difficulty matrix | **AUTOMATED** counts, **MANUAL** assessment | `audit-rc1/blind-audit-250.jsonl` |
| Arabic dual-case defects | **MANUAL** reading, scope **AUTOMATED** | S2/19, S2/24 + corpus scan |

One correction to my own work, recorded: my first relational parser treated the
question clause `أنهم أسرع من` as a relation and produced three false
disagreements. That was my tool's defect, not the engine's; fixed, and the
corrected run is 16/16.

---

**RC1 MANUAL BLIND REVIEW COMPLETE — 250/250**
