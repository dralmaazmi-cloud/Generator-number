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

## A. KEY INTEGRITY — two metrics, kept apart

> **SUPERSEDED CLAIM — CORRECTION RECORD.** The earlier draft of this report said
> *"158/158 PASS — correct unique key"* while also classifying four odd-one-out
> questions as AMBIGUOUS. Those two statements cannot both hold under one
> definition. That combined claim is withdrawn. The metrics are separated below,
> and the word "unique" is no longer applied to any question classified AMBIGUOUS.

### A-1. Intended-rule key match
*Does the published key match the generator's intended mathematical rule?*

| Verdict | 158 this round | 250 consolidated |
|---|---|---|
| PASS | **158 / 158** | 158 assessed by me, all PASS |
| WRONG_KEY | 0 | 0 in my scope |
| NO_VALID_KEY | 0 | 0 in my scope |
| MULTIPLE_VALID_KEYS | 0 | 0 in my scope |

Per family: odd_one_out 16/16, relational 16/16, sequences 16/16, speed 17/17,
work_time 16/16, machines 16/16, combined_rate 15/15, unit_rate 16/16,
direct_proportion 15/15, profit_loss 15/15.

For the other 92 I hold no per-question verdicts of my own. They are recorded as
reviewed by the earlier round and are **not** counted here as assessed by me.

### A-2. Question-level uniqueness
*Does the published question have only one defensible answer under the approved
exam-level ambiguity policy?*

| Verdict | 158 this round | 250 consolidated |
|---|---|---|
| UNIQUE | **148** | 148 assessed, 92 not assessed by me |
| BORDERLINE — a competing pattern exists, its salience debatable | **6** | 6 |
| **NOT_UNIQUE (AMBIGUOUS)** | **4** | **4** |
| **Total** | **158** | 158 assessed of 250 |

All 10 non-UNIQUE questions (4 AMBIGUOUS + 6 BORDERLINE) are in `odd_one_out`.
The 148 UNIQUE are the 142 questions of the other nine families, plus the 5 CLEAN
and 1 UNDISCOVERABLE odd-one-out questions: 142 + 5 + 1 = 148.

A question counted UNIQUE may still be defective on another axis: **S5/46 is
UNIQUE but UNDISCOVERABLE** (D-3), and is flagged there rather than here.

**The honest summary is therefore: the arithmetic is sound — every intended rule
produces the published key — but four published questions admit a second
defensible answer, and they must not be described as having a unique key.**

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

### D-5. Narrow answer-value spaces — **STATISTICAL_LEAKAGE_RISK**

AUTOMATED, over the frozen 10k corpus. **No universal "≤4 distinct answers is
invalid" rule is proposed or implied.** Answer-space size alone is not a defect:
a counting question has six possible answers by construction and that is fine.
What matters is the conditional guessing advantage a candidate gains from
recognising the template.

| Template | Declared | n | Answer-space size | Modal frequency | Entropy (bits, max 2.58) | Advantage over the 1/6 baseline |
|---|---|---|---|---|---|---|
| **REL_H_POSITION_UNCERTAIN** | hard | 91 | **1** | **100.0%** | **0.00** | **+83.3 pts** |
| SPD_M_EQUAL_DIST | medium | 81 | 4 | 44.4% | 1.81 | +27.8 pts |
| PL_M_TOTAL_COST | medium | 114 | 3 | 43.9% | 1.51 | +27.2 pts |
| PL_E_LOSS | easy | 104 | 3 | 40.4% | 1.55 | +23.7 pts |
| SPD_H_TIME_DIFF | hard | 73 | 4 | 37.0% | 1.92 | +20.3 pts |
| COMB_H_STAGED | hard | 89 | 3 | 36.0% | 1.58 | +19.3 pts |
| REL_M_COUNT | medium | 78 | 6 | 35.9% | 2.22 | +19.2 pts |
| MACH_E_REQUIRED | easy | 113 | 4 | 34.5% | 1.95 | +17.8 pts |
| WORK_M_EFF | medium | 90 | 5 | 34.4% | 2.16 | +17.8 pts |
| COMB_M_SOLO_THEN | medium | 122 | 4 | 33.6% | 1.93 | +16.9 pts |
| PL_E_PROFIT | easy | 92 | 5 | 32.6% | 2.24 | +15.9 pts |
| ODD_M_PRIME2 | medium | 90 | 5 | 31.1% | 2.26 | +14.4 pts |
| COMB_E_TIME | easy | 86 | 4 | 29.1% | 1.99 | +12.4 pts |
| RATE_E_TIME | easy | 120 | 4 | 27.5% | 1.99 | +10.8 pts |
| COMB_M_TOGETHER_SOLO | medium | 129 | 4 | 27.1% | 1.99 | +10.5 pts |
| AGE_H_TWO_TIME | hard | 75 | 6 | 26.7% | 2.46 | +10.0 pts |
| SPD_E_TIME | easy | 97 | 5 | 22.7% | 2.30 | +6.0 pts |

**`REL_H_POSITION_UNCERTAIN` is an unequivocal blocker**: entropy 0.00, one
possible answer, +83.3 points over chance. It is treated separately in D-4.

The rest are **leakage risks to be remediated where materially exploitable**, not
automatic rejections. `REL_M_COUNT` is the clearest illustration of why a
threshold would be wrong: its space is 6, the largest in the table, yet its modal
frequency is 35.9% — the count is rarely large. Size and exploitability are
different quantities.

**Constraint on any remediation**, by the same principle already agreed for
numeric rank: *the answer value may be observed and analysed; it must never
become a runtime target.* No runtime answer-frequency balancing, and no selecting
parameters because they produce a desired answer. The fix belongs in the
parameter space each template can draw from, not in a chooser that watches what
the answer came out as.

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

### D-8. The "100% option-specific feedback" metric was invalid — **QA_METRIC_DEFECT**

AUTOMATED, over the frozen 10k corpus, stripping the mechanical
`اخترت X، وهي ناتج Y` prefix and comparing the explanatory sentence that follows:

| Measure | Value |
|---|---|
| Questions where two or more wrong options carry the identical explanatory sentence | 6,117 / 10,000 (61.2%) |
| Wrong options carrying a non-unique explanatory sentence | 11,276 / 50,000 (22.6%) |

The development report's "option-specific feedback 0% → 100%" counted the
derivation prefix, which differs trivially because the numbers differ. The metric
therefore measured nothing about pedagogical content and should not have been
reported as evidence of feedback quality.

**This is a defect in the measurement, not automatically in the content.** Two
options may legitimately share the same explanation when the same real
misconception produces both — that is correct behaviour, not duplication. The
requirement for RC2 is therefore *not* "every wrong option must have a unique
sentence". It is:

- the feedback must correctly describe **that option's** derivation;
- the misconception must be applicable to **that stem**;
- generic or vacuous feedback is not sufficient;
- misattributed feedback is a defect;
- **identical wording alone is not a defect.**

Where identical wording *is* accompanied by a real failure it is counted under
D-6 (vacuous: the same sentence on four `key ± n` options in S5/32) or D-7
(misattributed: the chase sentence on a non-chase stem). Those two remain
production content defects. D-8 on its own is a metric defect.

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

### Correction to my own earlier statement

> **SUPERSEDED CLAIM — CORRECTION RECORD.** The previous draft said *"I found no
> further Arabic defect in the 158 beyond these two classes."* **That was wrong**
> and is withdrawn. A third defect class is present in the 158, in `profit_loss`,
> which was inside my scope. It is recorded below as a separate class and is not
> merged into the dual-case defect.

### New, found this round — **MANUAL REVIEW FINDING** — three classes

| # | Class | Exact phrase | Recommended form | Template | Corpus scope | In sample |
|---|---|---|---|---|---|---|
| 1 | `AR_DUAL_WRONG_CASE` — مضاف إليه in the nominative instead of the genitive | `يستطيع 6 عمال إنجاز **مهمتان** خلال 4 أيام` | `إنجاز **مهمتين**` | `WORK_E_VOLUME` | 37 / 10,000 (0.37%) | **S2/24** |
| 2 | `AR_DUAL_WRONG_CASE` — dual after `كل` in the nominative, with verb non-agreement | `كل **سنتيمتران تمثل** 10 كيلومترات` | `كل **سنتيمترين يمثلان**` (or `كل سنتيمتر يمثل 5 كيلومترات`) | `PROP_M_MAP` | 23 / 10,000 (0.23%) | **S2/19** |
| 3 | **`AR_DEFINITENESS_RENDERING`** — a definite adjective modifying an indefinite إضافة | `**سعر سلعة المعلن** 200 درهمًا` | `**سعر السلعة المعلن**` | `PL_M_DISC_MARK` | **134 / 10,000 (1.34%)** | **S3/37** |

On class 3: `سعر سلعة` is an إضافة whose مضاف إليه is indefinite, so the whole
phrase is indefinite and cannot take the definite adjective `المعلن`. It is the
most frequent of the three new classes and affects every `PL_M_DISC_MARK`
instance in the corpus.

**Why all three survived:** `checkArabicNumberUnits` matches only
*numeral → lexicon-unit* pairs across 21 words. It examines no case (إعراب), no
definiteness, and no verb agreement, and `مهمة`, `سنتيمتر` and `سلعة` are outside
its lexicon in any event.

### Totals

| | Classes | Corpus questions | Audit-sample questions |
|---|---|---|---|
| Known (averages) | 1 | 548 | 13 |
| **New this round** | **3** | **194** (37 + 23 + 134) | **3** (S2/24, S2/19, S3/37) |
| **Total affected** | **4** | **742** | **16** |

Correctly-formed duals elsewhere (`توقفت آلتان`, `عملا معًا`, `ينجزان`) are
nominative in subject position and are right.

I make no claim that this is exhaustive. Three classes surfaced from reading 158
stems; a native reviewer working through the full 250 should be expected to find
more, and my earlier "no further defect" sentence is exactly the kind of claim
this review should not make.

## F. EXPLANATION / PEDAGOGY DEFECTS

| Check | Result |
|---|---|
| Explanation reaches the published key | **0 real failures.** An automated pass flagged 397/8,495, but every one inspected was my matcher's artifact — `-10` rendered as `انخفاض 10%`, or an odd-one-out step ending on the rule constant. Reported as clean. |
| Quick method general, not fitted to the sampled numbers | **0 failures in the 158.** Spot-checked the staged templates: `المتبقي ÷ (العمال الباقون × معامل الكفاءة)` and `حل س × (1 ÷ 50 − 1 ÷ 100) = 3` are general statements. **But see the `fractions` finding below, observed during this reconciliation pass.** |
| Explanation consistent with the stem | **Fails on the "chase" family — D-7**, 154 corpus occurrences. |
| Feedback consistent with its own derivation | **Fails on D-7**, and is vacuous on the 193 key-neighbour options of D-6. |
| Incorrect general rule or reminder | **Fails on `fractions` — see below.** None found in the 158. |

### Observed during reconciliation, in a family outside my 158

`fractions` was reviewed in the first 92, not by me. While verifying the
carried-forward hidden-fraction finding I confirmed two distinct problems in the
same template and record both so they are not lost:

**F-1. `HIDDEN_FRACTION_SEMANTIC_REVERSAL`** — the reminder, identical on all 197
corpus instances, reads:

> `الكسر المجهول هو نسبة الناتج قبله إلى الناتج بعده.`
> *"the unknown fraction is the ratio of the result before it to the result after it."*

That is `previous ÷ next`, which gives the **denominator**. The fraction itself is
`next ÷ previous`. The worked steps get the right answer — *"30 ÷ 15 = 2، إذن
الكسر المجهول هو النصف"* — by computing 2 and then naming ½, but the rule the
learner is told to remember is reversed. The published keys are correct; the
generalisation taught alongside them is not.

**F-2. `QUICK_METHOD_NOT_GENERAL`** — for the same direction, `fast_method` holds
an instance computation rather than a method: `"30 ÷ 15 = 2."`, `"72 ÷ 12 = 6."`,
`"144 ÷ 24 = 6."` — 67 distinct such strings across the corpus. Every other family
states a general rule in that field. A learner is given no transferable method.

Both are `PEDAGOGICAL_BLOCKER`. Neither changes any key.

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
*same* answer — `ALTERNATIVE_RULE_SAME_ANSWER`, which is not a defect).
Relational: 16/16 uniquely determined, with no `RELATIONAL_NON_UNIQUE`,
`RELATIONAL_FALSE_CERTAINTY`, `RELATIONAL_MISSED_TRANSITIVITY` or
`RELATIONAL_UNSTATED_ASSUMPTION`. The seven numeric families: no ambiguity.

### odd_one_out — four exclusive categories summing to 16

| Category | Count | Definition |
|---|---|---|
| **AMBIGUOUS** | **4** | a comparably simple, exam-plausible competing rule yields a different unique answer |
| **BORDERLINE** | **6** | a competing pattern exists but its psychometric salience is debatable |
| **UNDISCOVERABLE** | **1** | the intended rule is not reasonably recoverable under the engine's own simplicity model |
| **CLEAN** | **5** | no competing rule, or the alternatives agree with the key |
| **Total** | **16** | |

**11 of 16 carry an ambiguity or discoverability concern** (4 + 6 + 1); 5 are
clean.

> **SUPERSEDED CLAIM — CORRECTION RECORD.** The earlier draft said *"10 of 16
> affected"*, which omitted the UNDISCOVERABLE case. Withdrawn; the correct
> figure is 11 of 16.

#### AMBIGUOUS — 4

| Question | Set | Key | Competing rule | Its outlier |
|---|---|---|---|---|
| **S1/27** | {24,35,75,48,63,15} | 75 (n²−1) | **multiples of 3** (complexity 1) | **35** |
| **S5/08** | {24,63,15,30,48,35} | 30 (n²−1) | **multiples of 3** (complexity 1) | **35** |
| **S3/27** | {16,18,32,20,24,28} | 18 (multiples of 4) | **only perfect square** | **16** |
| **S5/22** | {12,11,19,13,9,17} | 12 (prime+6) | **only square / only single-digit** | **9** |

#### BORDERLINE — 6

Every one rests on a digit-magnitude class. Per §8 of the reconciliation
instruction these are **measured and exposed, not automatically converted into a
MUST_REJECT rule**; whether a candidate treats "all three-digit except one" as
the organising principle is a genuine psychometric question, not a settled one.

| Question | Set | Key | Competing pattern | Its outlier |
|---|---|---|---|---|
| S1/08 | {512,343,216,624,125,64} | 624 (cubes) | all three-digit except one | 64 |
| S2/07 | {14,12,26,6,10,22} | 12 (2×prime) | all two-digit except one | 6 |
| S2/39 | {12,10,26,22,14,6} | 12 (2×prime) | all two-digit except one | 6 |
| S3/13 | {10,24,6,14,26,22} | 24 (2×prime) | all two-digit except one | 6 |
| S4/10 | {73,81,64,36,100,49} | 73 (squares) | all two-digit except one | 100 |
| S4/21 | {64,27,8,268,125,216} | 268 (cubes) | only single-digit | 8 |

#### UNDISCOVERABLE — 1

| Question | Set | Key | Why |
|---|---|---|---|
| **S5/46** | {21,23,15,13,19,17} | 19 (prime+10) | the production checker reports **no** rule of complexity ≤ 3 fits this set; primality, the natural reading, singles out **two** numbers (21 and 15), neither the key. The set is also six consecutive odd numbers. |

#### CLEAN — 5

S1/40, S2/28, S2/50, S3/42, S4/35 — alternatives either do not form a coherent
class or agree with the published key.

None of the 11 was caught by the production checker; all were published with
`ambiguous=false`.

Method note: my acceptance test for a competing rule is that the five
non-outliers form a class a candidate would recognise. Artifacts such as
"divisible by 7 → 343 in a set of cubes" were discarded.

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
| **Total** | **118 / 250 = 47.2%** |

### Manual assessment — exact, mutually exclusive, no approximations

> **SUPERSEDED CLAIM — CORRECTION RECORD.** The earlier draft said *"~103
> justified, using all 46 Easy mismatches + 57 Medium→Hard"*. Wrong twice over: it
> lumped the 3 Easy→Hard cases into the justified column and used 57 where the
> matrix says 60. Withdrawn. A second superseded claim is withdrawn with it: that
> **all 12 Hard→Medium mismatches are misclassified**, and that those 12
> *"overlap exactly with D-3 and D-4"*. Neither holds — 7 of the 12 have a
> defensible Hard label, and none of the 12 is a `REL_H_POSITION_UNCERTAIN`
> question.

Corrected below by assessing every transition group, and the 12 Hard→Medium
questions individually.

| Transition | n | Assessment | Reason |
|---|---|---|---|
| Easy → Medium | 43 | `JUSTIFIED_MISMATCH` | the declared label is right and the model over-scores. S1/01 `WORK_E_INVERSE` — *"8 workers finish a job in 18 days; how long for 12?"* — is one inverse-proportion insight and `8 × 18 ÷ 12`. Declared Easy, scored 5.3 → Medium. |
| Medium → Hard | 60 | `JUSTIFIED_MISMATCH` | two-stage arithmetic scored past the 9.5 boundary; the declared Medium is defensible. |
| Easy → Hard | 3 | `UNCERTAIN` | all three are `MACH_E_REQUIRED`, scored **10.9**. A two-step unit-rate problem is not Hard, but it is not Easy either. Both the label and the band look wrong; I will not call either defensible. |
| Hard → Medium | 12 | **split — see below** | assessed one by one |

#### The 12 Hard → Medium questions, individually

| Question | Template | Score | Assessment | Reason |
|---|---|---|---|---|
| S1/27 | `ODD_H_SQ_MINUS` | 8.9 | `MISCLASSIFIED_DIFFICULTY` | its "hardness" is the ambiguity of D-1, not reasoning load |
| S5/08 | `ODD_H_SQ_MINUS` | 8.9 | `MISCLASSIFIED_DIFFICULTY` | same |
| S5/22 | `ODD_H_PRIME_OFFSET` | 8.9 | `MISCLASSIFIED_DIFFICULTY` | solvable in one second by "which one is even" |
| S5/46 | `ODD_H_PRIME_OFFSET` | 8.9 | `MISCLASSIFIED_DIFFICULTY` | hardness is undiscoverability (D-3), not difficulty |
| S5/28 | `COMB_H_THREE` | 5.8 | `MISCLASSIFIED_DIFFICULTY` | `(20 + 18 + 12) × 5` — one addition and one multiplication |
| S2/50 | `ODD_H_SQ_MINUS` | 8.9 | `JUSTIFIED_MISMATCH` | no competing rule here; spotting n²−1 is a genuine hard step |
| S3/26 | `PCT_H_CHAIN_VALUE` | 9.1 | `JUSTIFIED_MISMATCH` | genuinely multi-step; clipped by the 9.5 boundary |
| S5/04 | `PCT_H_CHAIN_VALUE` | 9.1 | `JUSTIFIED_MISMATCH` | same |
| S5/34 | `PCT_H_CHAIN_VALUE` | 9.1 | `JUSTIFIED_MISMATCH` | same |
| S5/02 | `SPD_H_CATCH` | 9.1 | `JUSTIFIED_MISMATCH` | head-start catch-up, three stages |
| S5/06 | `CAL_H_LONG` | 7.6 | `JUSTIFIED_MISMATCH` | long day-shift with a modular step |
| S5/33 | `CAL_H_LONG` | 7.6 | `JUSTIFIED_MISMATCH` | same |

#### Exact totals

| Assessment | Count |
|---|---|
| `JUSTIFIED_MISMATCH` | 43 + 60 + 7 = **110** |
| `UNCERTAIN` | **3** |
| `MISCLASSIFIED_DIFFICULTY` | **5** |
| **Total** | **118** |

This differs from the candidate classification put to me (103 / 3 / 12). Seven of
the twelve Hard→Medium questions have a defensible Hard label and are counted
justified; only five do not.

### A caveat that keeps the matrix from being over-read

**Matrix agreement does not mean the difficulty is right.** The five
`REL_H_POSITION_UNCERTAIN` questions are declared Hard *and* computed Hard, so
they appear nowhere in the 118 — yet their answer is constant across all 91
corpus instances (D-4), which makes the Hard label substantively wrong. An
earlier draft claimed the 12 Hard→Medium cases "overlap exactly with D-3 and
D-4"; they do not. Five of them relate to D-1/D-3, and none is a
`REL_H_POSITION_UNCERTAIN` question.

**Conclusion: `complexity_band` cannot currently be used as a QA signal.** At an
88.5% disagreement rate on declared Easy it carries no information about the
label, and it is blind to the two defects that most damage the Hard band.

## J. RC2 SCOPE ADDITIONS

The complete, numbered inventory lives in `RC2_SCOPE_CANDIDATES.md` and
`RC2_SCOPE_FROZEN.json` — **23 items** (`rc2-scope-frozen-v2`), each with an
explicit classification, none relying on a cross-reference to narrative. The items
this review *added* to that inventory are RC2-007 to RC2-021; RC2-022 and RC2-023
were added afterwards by formal amendment (see the addendum below). No
implementation is proposed here.

| # | Class | Classification |
|---|---|---|
| 7 | `AMBIGUITY_LONE_SIMPLE_RULE_NEVER_COMPETES` | PRODUCTION_BLOCKER · PEDAGOGICAL_BLOCKER |
| 8 | `AMBIGUITY_INVERSE_FRAMING_AND_MAGNITUDE_BLIND_SPOT` | PRODUCTION_BLOCKER |
| 9 | `UNDISCOVERABLE_INTENDED_RULE` | PEDAGOGICAL_BLOCKER |
| 10 | `CONSTANT_ANSWER_TEMPLATE` | PRODUCTION_BLOCKER · STATISTICAL_LEAKAGE_RISK |
| 11 | `NARROW_ANSWER_VALUE_SPACE` | STATISTICAL_LEAKAGE_RISK |
| 12 | `GENERIC_KEY_NEIGHBOR_DISTRACTOR` | PEDAGOGICAL_BLOCKER · STATISTICAL_LEAKAGE_RISK |
| 13 | `MISATTRIBUTED_MISCONCEPTION_FEEDBACK` | PRODUCTION_BLOCKER · PEDAGOGICAL_BLOCKER |
| 14 | `FEEDBACK_SPECIFICITY_METRIC_INVALID` | QA_METRIC_DEFECT |
| 15 | `DIFFICULTY_BAND_MISCALIBRATION` | QA_METRIC_DEFECT |
| 16 | `AR_DUAL_WRONG_CASE` | LANGUAGE_BLOCKER |
| 17 | `AR_DEFINITENESS_RENDERING` | LANGUAGE_BLOCKER |
| 18 | `HIDDEN_FRACTION_SEMANTIC_REVERSAL` | PEDAGOGICAL_BLOCKER |
| 19 | `QUICK_METHOD_NOT_GENERAL` | PEDAGOGICAL_BLOCKER |
| 20 | `RATIO_INVARIANT_ENFORCEMENT_ESCAPE` | PRODUCTION_BLOCKER |
| 21 | `VERSION_TRACEABILITY_MISMATCH` | QA_OBSERVABILITY_BLOCKER |
| 22 | `COMMUTATIVE_FINGERPRINT_CANONICALISATION_ESCAPE` | PRODUCTION_BLOCKER · STATISTICAL_LEAKAGE_RISK |
| 23 | `STRUCTURAL_SEQUENCE_REASONING_SIGNATURE_GAP` | PRODUCTION_BLOCKER · STATISTICAL_LEAKAGE_RISK |

### Addendum — post-reconciliation inspection (RC2-022, RC2-023)

Added by formal scope amendment after this report was reconciled. **Not an
unfinished family review**: the manual blind review is complete at 250/250. These
are two fingerprint-canonicalisation defects found by re-inspecting the same
frozen sample, and both were verified against it before being added.

**RC2-022.** S2/07 and S2/39 are the same set `{6,10,12,14,22,26}` under
`ODD_M_PRIME2`, same rule, same outlier `12` — and both were published in session
S2. Their fingerprints carry an identical canonical
`commutative:{numberSet:[6,10,12,14,22,26]}` but differ in the order-sensitive
`named:{numbers:…}`, so the duplicate check did not fire. Corpus-wide, **259 of
326** semantic groups (79.4%) carry more than one full fingerprint for the same
canonical value — **875 surplus fingerprints from display order alone**, across 7
`odd_one_out` and 3 `fractions` templates.

**RC2-023.** S2/05 and S2/41 run the identical chain
`ADD(4) MUL(2) ADD(5) MUL(3) ADD(6) MUL(4) ADD(7)` and differ only in `firstTerm`
(7 vs 4) — also both in session S2. `SEQ_M_ALT_OPS` produces **exactly 6 distinct
operation patterns across all 70** corpus questions; every one shares its pattern
with another, and `firstTerm` takes 5–6 values per pattern while changing no step
of the reasoning.

Both collisions fall in **session S2 and nowhere else** in the 250: the five audit
sessions show exactly one collision of each type, both in S2. Neither changes any
published key — §A stands at 158/158 intended-rule key match. They are diversity
and leakage defects, not correctness defects.

## 11. FINDINGS PRESERVED FROM EARLIER ROUNDS

Every item below now has its own numbered entry in `RC2_SCOPE_CANDIDATES.md`.
None is left as narrative only.

| # in scope log | Finding | Source | Status in this pass |
|---|---|---|---|
| 1 | Rank-driven distractor selection | `SIGNOFF_RC1.md` §5 | preserved unchanged |
| 2 | Arabic averages agreement defect — 13 in sample, 548 in corpus | `SIGNOFF_RC1.md` §8 | preserved unchanged |
| 3 | Incomplete rejection telemetry; 2 dead reason codes | `SIGNOFF_RC1.md` §2 | preserved unchanged |
| 4 | Seeded reproducibility qualification (fresh engine only) | `SIGNOFF_RC1.md` §7 | preserved unchanged |
| 5 | Incomplete degeneracy-model coverage — 79.3% | `SIGNOFF_RC1.md` §6-B | preserved unchanged |
| 6 | PDF visual-order / presentation-form text layer | delivery pass | preserved unchanged |
| 18 | Hidden-fraction semantic reversal | *(first 92)* | **now verified independently** — reminder text and 197 instances confirmed, §F-1 |
| 19 | Quick method not general (same template) | *(this pass)* | **new** — 67 instance-specific `fast_method` strings, §F-2 |
| 20 | Ratio-invariant enforcement escape | *(first 92)* | **now verified independently** — 93 reducible and 85 equal-sided parameter pairs published in 625 `ratios` questions |
| 21 | Version traceability mismatch | *(first 92)* | **now verified independently** — `ENGINE_VERSION = '1.3.0'` in `src/index.js:25`, but `report.js:34` prints `v1.2.0` and `index.html:23` shows `v1.2.0` |
| 7–17 | found by this review | §D, §E, §H, §I | new |

Item 9 of the earlier narrative — "odd-one-out ambiguity identified in the first
round" — referred to the historical `{30,42,56,72,84,90}` case, which is a
regression fixture, not a question in this RC1 sample. The odd-one-out ambiguity
in *this* sample is the separate and larger finding in §H.

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

### Corrections to my own work, recorded

1. My first relational parser treated the question clause `أنهم أسرع من` as a
   relation and produced three false disagreements. My tool's defect, not the
   engine's; fixed, corrected run 16/16.
2. I wrote *"158/158 PASS — correct unique key"* while also classifying four
   questions AMBIGUOUS. Contradictory. Split into two metrics in §A.
3. I wrote *"10 of 16 affected"* for odd-one-out when my own categories summed to
   11. Corrected in §H, with four exclusive categories summing to 16.
4. I wrote *"~103 justified, all 46 Easy mismatches + 57 Medium→Hard"*, which
   double-counted the 3 Easy→Hard cases and used 57 where the matrix says 60.
   Recomputed exactly in §I: 110 / 3 / 5 = 118.
5. I claimed the 12 Hard→Medium cases *"overlap exactly with D-3 and D-4"*. They
   do not; none is a `REL_H_POSITION_UNCERTAIN` question. Corrected in §I.
6. I wrote *"I found no further Arabic defect in the 158 beyond these two
   classes."* Wrong — `AR_DEFINITENESS_RENDERING` was present in `profit_loss`,
   inside my scope, at 134/10,000. Corrected in §E.

---

**RC1 MANUAL BLIND REVIEW COMPLETE — 250/250**
