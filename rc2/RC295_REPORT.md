# RC2.9.5 — EASY breadth, fixed 50/40/10 mix, no difficulty selector

Release report. Tables first; every number below is produced by a tool in
`tools/audit/` on the tree this release freezes, and every tool is named next
to its table so a reviewer can re-run it.

```
release                  RC2.9.5              engine 1.5.5
frozen commit            457bc8e8d020e68ce81f6b1393e1b8d9174527d6
production bundle        3f8988c4b5e1080d41b3bc018ec2277a5a782f5c432eec7db64db41dfc379db1
production files         65
delivery zip             RC2_9_5_GENERATOR_READY.zip
  sha256                 in rc2/RC295_PACKAGE.json, written after the build
baselines in the zip     rc2/baseline/rc292, rc293, rc294
verifyFreeze (extracted) intact — 0 changed, 0 added, 0 removed
§23 internal gate        PASS, 39 of 39 conditions
sign-off holdout         AUDIT-2026-09-13-N — named, not generated
```

The delivery zip's own sha256 is published in `rc2/RC295_PACKAGE.json` rather
than in this table, because this report is inside the archive it would name and
a file cannot carry the hash of an archive that contains it. The two hashes a
reviewer verifies the ENGINE with — the frozen commit and the production bundle
— are above, and `verifyFreeze()` recomputes the second from the extracted zip.

EASY matching **53 → 92**, the target in Q2 of the clarification. MEDIUM
matching unchanged at 85. Mixed band split 50 / 40 / 10, realised exactly.

---

## 1. Section 1 closure

### 1.1 D1, as a measured number

`tools/audit/rc295-rationale-audit.mjs` — 800 drawn questions, 4,000 wrong options.

| measurement | RC2.9.4 | RC2.9.5 | gate |
|---|---|---|---|
| distinct reason sentences | 175 | 274 | — |
| sentences spanning ≥ 4 families | 30 | 13 | — |
| …of those, naming an operation | 9 | 0 | 0 |
| …of those, outside the declared neutral set | 30 | 0 | 0 |
| declared neutral set size | 0 (none declared) | 12 | ≤ 12 |
| neutral sentences naming an operation | — | 0 | 0 |
| reasons naming an operation **the solution does not use** | 63 | 0 | 0 |
| reasons contradicting their own derivation | 0 | 0 | 0 |
| factual fallback shown (no truthful reason available) | — | 116 (2.9%) | ≤ 5% |

Both gates are met. The count that was missing in RC2.9.4 — a reason naming an
operation the SOLUTION does not use, as distinct from the one the DERIVATION
uses — was 63 and is 0. The check is now two-sided: `rationaleProblems` is
handed `q.metadata.operation_kinds` (what solving the item actually requires)
as well as the option's own derivation, and a sentence that claims an
operation absent from either is refused at publication, not merely counted.

The fallback is the honest alternative to a vaguer sentence (trap 6): where no
truthful diagnostic sentence exists for a wrong option, the learner is shown
what the value factually is instead of a reason that would fit any answer.

**The declared family-neutral set, in full.** Twelve sentences. Each describes
a slip in the PROCESS — the same slip whatever the question is about — and
none names an operation; the proof is mechanical (`namesAnOperation()` over the
DID-verb table, the solution-claim table and the operation-noun table) and runs
as a test, `tests/rc295-rationale.test.mjs`.

 1. أعدت قيمة معطاة في السؤال بدل القيمة المطلوبة.
 2. توقفت عند قيمة وسيطة ولم تكمل الخطوة الأخيرة.
 3. طبّقت الخطوة نفسها مرتين بدل مرة واحدة.
 4. زدت أو نقصت خطوة واحدة عن العدد الصحيح من الخطوات.
 5. أسقطت إحدى المراحل من الحساب.
 6. أعطيت مقدار الفرق بين القيمتين بدل القيمة المطلوبة نفسها.
 7. طبّقت العملية في الاتجاه المعاكس.
 8. توقفت بعد المرحلة الأولى ولم تكمل بقية المراحل المطلوبة.
 9. قرأت مقدار الخطوة خطأً بوحدة واحدة.
10. استخدمت إحدى الحالتين وأهملت الأخرى، والحالتان معًا هما ما يحدد القيمة.
11. توقفت عند قيمة الوحدة الواحدة ولم تكمل إلى الكمية المطلوبة.
12. طبّقت المعدل على عدد وحدات غير الذي يخصه.

Everything else is rendered per family from a site pattern that names the
relation the item is about (`FAMILY_SUBJECT`), so a reason is specific to what
the learner was doing rather than neutral enough to fit anything.

### 1.2 Cluster at step 10

Every rolling window in this release advances in steps of **10**.
`tools/audit/rc295-rolling.mjs`, 8 journeys × 4 sittings.

| band | count | release | PV | ND | PV+ND (≤8) | cluster (≤3) | streak (≤2) | dup (0) | gates |
|---|---|---|---|---|---|---|---|---|---|
| EASY | 30 | RC2.9.4 | 42 | 10 | 48 | 4 | 2 | 0 | FAIL |
| EASY | 30 | RC2.9.5 | 12 | 5 | 12 | 3 | 2 | 0 | FAIL |
| MEDIUM | 30 | RC2.9.4 | 15 | 3 | 16 | 2 | 2 | 0 | FAIL |
| MEDIUM | 30 | RC2.9.5 | 16 | 4 | 16 | 3 | 2 | 0 | FAIL |

The RC2.9.4 EASY row is finding 1.2 reproduced: at step 50 its acceptance saw
a cluster of 3; at step 10 it is 4, over the gate. EASY improves from 48
flagged to 12 and from a cluster of 4 to 3, and still does not meet the gate —
which is why §2 removes single-band practice rather than shipping it. Both
rows are measurement paths (`bandSession: true`), not product paths. MEDIUM is
unchanged, as this release requires.

### 1.3 «÷ 1» in derivations

`shownDerivation` strips a printed identity from both sides now: a trailing
`÷ 1` or `× 1`, and a leading `1 ×`. Over the same 4,000 wrong options the
count of printed identities is 0. Held by `tests/rc295-rationale.test.mjs`.

---

## 2. EASY capacity BEFORE / AFTER, per family, in classifier units

`tools/audit/rc294-band-capacity.mjs both 6 4 30` — 250 draws per family, counted
the way the perceptual classifier counts, not by template.

| family | sub-ideas | tasks | information structures | asked unknowns | perceptual constructions |
|---|---|---|---|---|---|
| sequences | 11 → **13** | 4 → **6** | 4 → **5** | 11 → **13** | 15 → **17** |
| ratios | 4 → **7** | 3 → **6** | 3 → **3** | 7 → **10** | 2 → **5** |
| percentages | 3 → **7** | 3 → **7** | 3 → **7** | 3 → **7** | 3 → **6** |
| averages | 4 → **7** | 2 → **6** | 3 → **6** | 4 → **8** | 4 → **8** |
| ages | 7 → **9** | 3 → **5** | 4 → **6** | 7 → **9** | 7 → **9** |
| speed | 4 → **6** | 4 → **7** | 2 → **5** | 5 → **8** | 5 → **8** |
| work_time | 3 → **6** | 2 → **5** | 2 → **4** | 3 → **6** | 3 → **6** |
| machines | 4 → **6** | 4 → **6** | 2 → **2** | 4 → **6** | 4 → **6** |
| direct_proportion | 4 → **6** | 3 → **5** | 1 → **3** | 5 → **7** | 4 → **6** |
| fractions | 3 → **5** | 2 → **5** | 1 → **4** | 3 → **6** | 3 → **6** |
| unit_rate | 3 → **5** | 2 → **5** | 2 → **5** | 3 → **6** | 3 → **6** |
| combined_rate | 3 → **6** | 2 → **5** | 1 → **4** | 2 → **5** | 3 → **6** |
| relational | 3 → **3** | 3 → **5** | 2 → **2** | 5 → **7** | 4 → **6** |
| calendar | 5 → **5** | 2 → **3** | 1 → **3** | 5 → **7** | 5 → **7** |
| odd_one_out | 5 → **7** | 1 → **4** | 1 → **3** | 2 → **5** | 5 → **8** |
| profit_loss | 2 → **5** | 2 → **5** | 2 → **4** | 3 → **6** | 2 → **5** |
| **total** | 68 → **103** | 42 → **85** | 34 → **66** | 72 → **116** | 72 → **115** |

The number that decides the release is not in this table, because a per-family
sum is not what a rolling hundred can hold. That is the maximum matching over
the reachable (PV, ND) pairs, from `tools/audit/rc294-keyspace.mjs`, enumerated
to saturation:

| band | templates | PV keys | ND keys | (PV,ND) edges | **max matching** | forced repeats per 100 |
|---|---|---|---|---|---|---|
| EASY, RC2.9.4 | 66 | 73 | 66 | 88 | **53** | 47 |
| EASY, RC2.9.5 | 110 | 117 | 105 | 132 | **92** | 8 |
| MEDIUM, RC2.9.4 | 88 | 91 | 121 | 133 | **85** | 15 |
| MEDIUM, RC2.9.5 | 88 | 91 | 121 | 133 | **85** | 15 |

EASY reaches the target of 92 exactly. MEDIUM is byte-identical: no MEDIUM
template was added, removed or re-adjudicated, and the §23 gate now pins
MEDIUM at 88 and HARD at 30 so that promise is a gate condition, not a claim.

At 50 easy per rolling hundred against a matching of 92, the margin the brief
asks for is **92 − 50 = 42** constructions. That is the headroom a later
60/30/10 would spend; this release does not spend it.

---

## 3. The new constructions, per family

44 constructions, every one of them EASY. For each: the task signature
and asked unknown the classifier reads, the information structure it is
presented in, and the §4 dimension it changes. None is a reskin — the matching
count is the proof, and it moved from 53 to 92.

### sequences (2)

| construction | task / asked unknown | information structure | dimension changed (§4) |
|---|---|---|---|
| `SEQ_E_FIRST_ABOVE` | FIND_THRESHOLD/TERM · firstTermAboveBound | RUN_CONSTANT_DIFFERENCE | what is asked (the first term past a threshold) |
| `SEQ_E_SUM_SHOWN` | COMBINE_PARTS/NUMBER · sumOfShownTerms | VALUE_LIST | what is asked (the sum of what is shown, not the next term) |

### ratios (3)

| construction | task / asked unknown | information structure | dimension changed (§4) |
|---|---|---|---|
| `RAT_E_COMMON_FACTOR` | IDENTIFY_RULE/NUMBER · ratioCommonFactor | DIRECT_GIVENS | task — identify a property of the pair |
| `RAT_E_PART_COUNT` | DECOMPOSE_COMBINED/COUNT · ratioPartCount | PARTITION_OF_WHOLE | what is asked (how many equal parts the ratio makes) |
| `RAT_E_SHARE_GAP` | DECOMPOSE_COMBINED/QUANTITY · ratioShareGap | PARTITION_OF_WHOLE | what is asked (the gap between shares, not a share) |

### percentages (4)

| construction | task / asked unknown | information structure | dimension changed (§4) |
|---|---|---|---|
| `PCT_E_REMAINING_PERCENT` | FIND_REMAINDER/PERCENT · remainingPercent | REMAINDER_AFTER_PARTS | what is asked (the percent left, in percent units) |
| `PCT_E_SHARE_PERCENT` | FORWARD_COMPUTE/PERCENT · percentFromParts | CONTEXT_THEN_NUMBERS | direction — recover the percent from part and whole |
| `PCT_E_WHICH_OFFER` | COMPARE_ALTERNATIVES/MONEY · largerDiscountValue | TWO_CONFIGURATIONS | task — compare two discounts, not compute one |
| `PCT_E_WHOLE` | RECOVER_ORIGINAL/QUANTITY · wholeFromPercent | GIVEN_INSIDE_THE_QUESTION | direction — recover the whole from a percent of it |

### averages (4)

| construction | task / asked unknown | information structure | dimension changed (§4) |
|---|---|---|---|
| `AVG_E_COMPARE_MEANS` | COMPARE_ALTERNATIVES/AVERAGE · higherMean | TWO_CONFIGURATIONS | task — compare two configurations, not compute one |
| `AVG_E_COUNT_FROM_MEAN` | DECOMPOSE_COMBINED/COUNT · countFromMean | GIVEN_INSIDE_THE_QUESTION | what is asked (how many values, not their size) |
| `AVG_E_RANGE` | COMPARE_ALTERNATIVES/QUANTITY · rangeOfValues | VALUE_LIST | dependency — extremes of a list, not its centre |
| `AVG_E_TOTAL_FROM_MEAN` | DECOMPOSE_COMBINED/QUANTITY · totalFromMean | GIVENS_LISTED_THEN_ASK | direction — recover the total from the mean |

### ages (2)

| construction | task / asked unknown | information structure | dimension changed (§4) |
|---|---|---|---|
| `AGE_E_GAP` | COMPARE_ALTERNATIVES/AGE · ageGapNow | DIRECT_GIVENS | what is asked (the gap itself, not a member age) |
| `AGE_E_TOTAL_AFTER` | COMBINE_PARTS/AGE · sumOfAgesAfterYears | RELATION_AT_TWO_TIMES | direction — both ages shifted forward, then combined |

### speed (3)

| construction | task / asked unknown | information structure | dimension changed (§4) |
|---|---|---|---|
| `SPD_E_COMPARE` | COMPARE_ALTERNATIVES/SPEED · fasterSpeed | TWO_CONFIGURATIONS | task — compare two speeds |
| `SPD_E_REMAINING` | FIND_REMAINDER/DISTANCE · remainingDistance | REMAINDER_AFTER_PARTS | what is asked (the distance left) |
| `SPD_E_TOTAL_TRIP` | COMBINE_PARTS/DISTANCE · twoLegDistance | CONTEXT_THEN_NUMBERS | dependency — two legs at two speeds, one distance |

### work_time (3)

| construction | task / asked unknown | information structure | dimension changed (§4) |
|---|---|---|---|
| `WORK_E_OUTPUT_IN_DAYS` | FORWARD_COMPUTE/QUANTITY · outputOverDays | CONTEXT_THEN_NUMBERS | direction — forward from a daily rate |
| `WORK_E_RATE_FROM_TOTAL` | DECOMPOSE_COMBINED/RATE · dailyRateFromTotal | CONTEXT_THEN_NUMBERS | direction — recover the daily rate from a total |
| `WORK_E_REMAINING_DAYS` | FIND_REMAINDER/DURATION · remainingDays | REMAINDER_AFTER_PARTS | what is asked (days left, after part is done) |

### machines (2)

| construction | task / asked unknown | information structure | dimension changed (§4) |
|---|---|---|---|
| `MACH_E_LOST_OUTPUT` | FIND_REMAINDER/QUANTITY · lostOutputWhileStopped | TWO_CONFIGURATIONS | dependency — output NOT produced, a counterfactual |
| `MACH_E_TOTAL_TWO_TYPES` | COMBINE_PARTS/QUANTITY · totalOfTwoMachineTypes | TWO_CONFIGURATIONS | dependency — two rates, two counts, one total |

### direct_proportion (2)

| construction | task / asked unknown | information structure | dimension changed (§4) |
|---|---|---|---|
| `PROP_E_TOTAL_TWO_ITEMS` | COMBINE_PARTS/MONEY · totalOfTwoItems | TWO_CONFIGURATIONS | dependency — two independent unit prices, one total |
| `PROP_E_UNIT_VALUE` | DECOMPOSE_COMBINED/MONEY · unitValueOnly | GIVENS_LISTED_THEN_ASK | what is asked (the unit value, not a scaled total) |

### fractions (3)

| construction | task / asked unknown | information structure | dimension changed (§4) |
|---|---|---|---|
| `FRAC_E_COUNT_PARTS` | DECOMPOSE_COMBINED/COUNT · partCount | PARTITION_OF_WHOLE | what is asked (how many parts, not how big) |
| `FRAC_E_PART_OF` | SHARE_PROPORTIONALLY/QUANTITY · partOfQuantity | VALUE_AS_RELATION | information structure — the fraction is SAID, not written |
| `FRAC_E_REMAINING_FRACTION` | FIND_REMAINDER/QUANTITY · remainingAmountAfterOnePart | REMAINDER_AFTER_PARTS | what is asked (what survives, not what was taken) |

### unit_rate (3)

| construction | task / asked unknown | information structure | dimension changed (§4) |
|---|---|---|---|
| `RATE_E_BETTER_DEAL` | COMPARE_ALTERNATIVES/MONEY · cheaperUnitPrice | TWO_CONFIGURATIONS | task — compare two offers by unit price |
| `RATE_E_BUDGET_COUNT` | REQUIRED_INPUT/COUNT · countWithinBudget | GIVEN_INSIDE_THE_QUESTION | what is asked (how many a budget buys) |
| `RATE_E_UNIT_PRICE` | DECOMPOSE_COMBINED/MONEY · unitPriceFromTotal | CONTEXT_THEN_NUMBERS | direction — recover the unit price from a total |

### combined_rate (3)

| construction | task / asked unknown | information structure | dimension changed (§4) |
|---|---|---|---|
| `COMB_E_ONE_ALONE` | DECOMPOSE_COMBINED/RATE · otherRateFromJoint | GIVENS_LISTED_THEN_ASK | direction — recover one rate from the joint rate |
| `COMB_E_SHARE_OF_OUTPUT` | DECOMPOSE_COMBINED/QUANTITY · shareOfJointOutput | TWO_CONFIGURATIONS | what is asked (one worker's share of joint output) |
| `COMB_E_TIME_FOR_TARGET` | REQUIRED_INPUT/DURATION · timeForJointTarget | CONTEXT_THEN_NUMBERS | direction — the input a target requires |

### relational (2)

| construction | task / asked unknown | information structure | dimension changed (§4) |
|---|---|---|---|
| `REL_E_COUNT_BELOW` | COUNT_SATISFYING/COUNT · countBelowInChain | RELATIONAL_STATEMENTS | task — count positions in the chain |
| `REL_E_FALSE_STATEMENT` | JUDGE_INDETERMINACY/STATEMENT · impossibleStatementInChain | RELATIONAL_STATEMENTS | task — judge which statement cannot hold |

### calendar (2)

| construction | task / asked unknown | information structure | dimension changed (§4) |
|---|---|---|---|
| `CAL_E_BEFORE` | REVERSE_RECOVER/DATE · dayBeforeOffset | CALENDAR_BACKWARD | direction — count backwards from today |
| `CAL_E_DAYS_BETWEEN` | MEASURE_INTERVAL/COUNT · daysUntilDay | TWO_ENDPOINTS | what is asked (an interval, not a landing day) |

### odd_one_out (3)

| construction | task / asked unknown | information structure | dimension changed (§4) |
|---|---|---|---|
| `ODD_E_COUNT_MATCHING` | COUNT_SATISFYING/COUNT · countMatchingRule | SET_DISPLAY | task — count what satisfies a stated rule |
| `ODD_E_EXTEND` | EXTEND_BY_PROPERTY/NUMBER · setMember | SET_EXTENSION | task — extend the set by its rule |
| `ODD_E_PROPERTY` | IDENTIFY_RULE/RULE · sharedProperty | RULE_CHOICE | task — identify the rule, not the member |

### profit_loss (3)

| construction | task / asked unknown | information structure | dimension changed (§4) |
|---|---|---|---|
| `PL_E_BETTER_SALE` | COMPARE_ALTERNATIVES/MONEY · largerProfitAmount | GIVENS_LISTED_THEN_ASK | task — compare two deals |
| `PL_E_COST_FROM_PROFIT` | RECOVER_ORIGINAL/MONEY · costFromProfitAmount | GIVEN_INSIDE_THE_QUESTION | direction — recover the cost from the profit |
| `PL_E_SELL_PRICE` | FORWARD_COMPUTE/MONEY · sellPriceFromRate | DIRECT_GIVENS | solution path — cost plus a rate of cost |

No construction needs two chained operations; each is one step from the givens,
which is what keeps it structurally EASY. The §23 condition
`STRUCTURE_ADJUDICATION_COMPLETE` asserts 228 templates with MEDIUM at 88 and
HARD at 30, so none of these could have been a promoted MEDIUM idea.

---

## 4. Information structures BEFORE / AFTER, per family

Counted by the classifier (`INFO_STRUCTURE_BY_TEMPLATE`), EASY band, same 250
draws per family as §2.

| family | before | after | structures now reachable at EASY |
|---|---|---|---|
| sequences | 4 | **5** | RUN_CONSTANT_DIFFERENCE, VALUE_LIST |
| ratios | 3 | **3** | DIRECT_GIVENS, PARTITION_OF_WHOLE |
| percentages | 3 | **7** | CONTEXT_THEN_NUMBERS, GIVEN_INSIDE_THE_QUESTION, REMAINDER_AFTER_PARTS, TWO_CONFIGURATIONS |
| averages | 3 | **6** | GIVENS_LISTED_THEN_ASK, GIVEN_INSIDE_THE_QUESTION, TWO_CONFIGURATIONS, VALUE_LIST |
| ages | 4 | **6** | DIRECT_GIVENS, RELATION_AT_TWO_TIMES |
| speed | 2 | **5** | CONTEXT_THEN_NUMBERS, REMAINDER_AFTER_PARTS, TWO_CONFIGURATIONS |
| work_time | 2 | **4** | CONTEXT_THEN_NUMBERS, REMAINDER_AFTER_PARTS |
| machines | 2 | **2** | TWO_CONFIGURATIONS |
| direct_proportion | 1 | **3** | GIVENS_LISTED_THEN_ASK, TWO_CONFIGURATIONS |
| fractions | 1 | **4** | PARTITION_OF_WHOLE, REMAINDER_AFTER_PARTS, VALUE_AS_RELATION |
| unit_rate | 2 | **5** | CONTEXT_THEN_NUMBERS, GIVEN_INSIDE_THE_QUESTION, TWO_CONFIGURATIONS |
| combined_rate | 1 | **4** | CONTEXT_THEN_NUMBERS, GIVENS_LISTED_THEN_ASK, TWO_CONFIGURATIONS |
| relational | 2 | **2** | RELATIONAL_STATEMENTS |
| calendar | 1 | **3** | CALENDAR_BACKWARD, TWO_ENDPOINTS |
| odd_one_out | 1 | **3** | RULE_CHOICE, SET_DISPLAY, SET_EXTENSION |
| profit_loss | 2 | **4** | DIRECT_GIVENS, GIVENS_LISTED_THEN_ASK, GIVEN_INSIDE_THE_QUESTION |
| **total** | 34 | **66** | |

Six information structures are new to the declared taxonomy in this release —
`CONTEXT_THEN_NUMBERS`, `GIVEN_INSIDE_THE_QUESTION`, `GIVENS_LISTED_THEN_ASK`,
`VALUE_AS_RELATION`, `REMAINDER_AFTER_PARTS`, `CALENDAR_BACKWARD` — and the rest
are existing structures now reachable in families that had only one.

The five families the brief named as stuck at ONE structure all move:
fractions 1 → 4, combined_rate 1 → 4, direct_proportion 1 → 3, calendar 1 → 3,
odd_one_out 1 → 3.

None of this is synonym swapping (trap 3). A structure changes what a reader
must do to extract the givens — read a relation instead of a number
(`VALUE_AS_RELATION`: «أُخذ ثلث العدد» rather than «أُخذ 12»), take a given out
of the question sentence itself (`GIVEN_INSIDE_THE_QUESTION`: «إذا كان 25% من
عدد يساوي 50، فما هذا العدد؟»), or read a setting before any number arrives
(`CONTEXT_THEN_NUMBERS`). The proof that it is not decoration is that the
matching count moved; a synonym would not have moved it.

§11 below is the other half of the check the brief asks for: every new
structure is reviewed as rendered Arabic, not as a template.

---

## 5. Mixed acceptance — the three tables of §7.2

`tools/audit/rc295-rolling.mjs mixed 10,20,30 4 8`, the same 8 product-path
journeys in each table, windows advancing in steps of 10.

Gates: PV+ND ≤ 8 · ND ≤ 5 · largest perceptual cluster ≤ 3 · longest
repeated-experience streak ≤ 2 · literal duplicate stems = 0.

**(a) OLD mix 25/60/15 · RC2.9.4 content — the baseline**

| count | windows | PV | ND | PV+ND | cluster | streak | dup | easy% | medium% | hard% | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 30 | 50 | 20 | PASS |
| 20 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 25 | 60 | 15 | PASS |
| 30 | 24 | 1 | 0 | 1 | 1 | 1 | 0 | 26.7 | 56.7 | 16.7 | PASS |

**(b) NEW mix 50/40/10 · RC2.9.4 content — the STEP 3 checkpoint**

| count | windows | PV | ND | PV+ND | cluster | streak | dup | easy% | medium% | hard% | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 50 | 40 | 10 | PASS |
| 20 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 50 | 40 | 10 | PASS |
| 30 | 24 | 3 | 1 | 4 | 2 | 1 | 0 | 50 | 40 | 10 | PASS |

**(c) NEW mix 50/40/10 · RC2.9.5 content — the release**

| count | windows | PV | ND | PV+ND | cluster | streak | dup | easy% | medium% | hard% | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 50 | 40 | 10 | PASS |
| 20 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 50 | 40 | 10 | PASS |
| 30 | 24 | 0 | 1 | 1 | 2 | 1 | 0 | 50 | 40 | 10 | PASS |

Read across the worst row (count 30): the mix change on its own cost three
points of PV and one cluster step — 1 → 4 flagged, cluster 1 → 2 — and the new
constructions returned it: 4 → 1 flagged, PV 3 → 0. That is the whole point of
measuring the mix in isolation at STEP 3 (trap 5b): without table (b) neither
of the other two numbers could be attributed to anything.

§7.2(b) holds: the new mix meets every §7.1 gate on RC2.9.4 content, so the
pigeonhole reasoning behind 50% was sound and no content was needed to make
the mix safe.

**Migration across the change** (`tools/audit/rc295-migration.mjs`, decision (a):
keep the history). 8 journeys of 2 sittings × 30 captured from the RC2.9.4
engine and continued on this one, every rolling 100 spanning the boundary:

| measurement | value | gate |
|---|---|---|
| worst PV+ND in a window spanning the change | 1 | ≤ 8 |
| worst ND | 1 | ≤ 5 |
| worst cluster | 2 | ≤ 3 |
| worst streak | 1 | ≤ 2 |
| stems repeated across the boundary | 0 | 0 |

Keeping the history costs nothing measurable and keeps the learner's cooldown,
so decision (a) stands. `tests/rc295-single-mode.test.mjs` holds it: a journey
written before the change is accepted, and the next sitting repeats none of it.

---

## 6. In-sitting repeats, counts 10 and 30

The learner experiences the sitting, not the hundred. Gates: no perceptual
signature twice in a 10-question sitting; at most twice in a 30-question
sitting; no literal duplicate stem.

| configuration | count | sittings | max signature repeat | sittings carrying a repeat | median distinct | duplicates | gate |
|---|---|---|---|---|---|---|---|
| old mix / RC2.9.4 | 10 | 32 | 1 | 0 | 10 | 0 | PASS (≤1) |
| old mix / RC2.9.4 | 30 | 32 | 1 | 0 | 30 | 0 | PASS (≤2) |
| new mix / RC2.9.4 | 10 | 32 | 1 | 0 | 10 | 0 | PASS (≤1) |
| new mix / RC2.9.4 | 30 | 32 | 2 | 2 | 30 | 0 | PASS (≤2) |
| new mix / RC2.9.5 | 10 | 32 | 1 | 0 | 10 | 0 | PASS (≤1) |
| new mix / RC2.9.5 | 30 | 32 | 2 | 2 | 30 | 0 | PASS (≤2) |

No 10-question sitting in any configuration carries a signature twice. At 30,
the worst is a pair, inside the allowance, in 2 of 32 sittings.

---

## 7. Realised band split over ≥ 1,000 questions

`tools/audit/rc295-band-split.mjs 10,20,30,50 1200` — through `generatePractice`,
the product path, 1,200 delivered questions at every session size the product
offers. Declared weights: easy 0.50, medium 0.40, hard 0.10.

| checkpoint | count | sittings | delivered | easy% | medium% | hard% |
|---|---|---|---|---|---|---|
| STEP 3 (mix only) | 10 | 120 | 1200 | 50 | 40 | 10 |
| STEP 3 (mix only) | 20 | 60 | 1200 | 50 | 40 | 10 |
| STEP 3 (mix only) | 30 | 40 | 1200 | 50 | 40 | 10 |
| STEP 3 (mix only) | 50 | 24 | 1200 | 50 | 40 | 10 |
| release | 10 | 120 | 1200 | 50 | 40 | 10 |
| release | 20 | 60 | 1200 | 50 | 40 | 10 |
| release | 30 | 40 | 1200 | 50 | 40 | 10 |
| release | 50 | 24 | 1200 | 50 | 40 | 10 |

Exact at every size, at both checkpoints. A single sitting carries the same
proportions: 5/4/1 at 10, 10/8/2 at 20, 15/12/3 at 30, 25/20/5 at 50.

RC2.9.4 for comparison, measured the same way: 26.7 / 56.7 / 16.7 — the declared
0.25/0.60/0.15 was never realised exactly because it was never read. STEP 3
found that: `MIXED_DIFFICULTY_WEIGHTS` was declared in `src/index.js` and
`_buildDifficultySchedule` carried its own 0.25/0.15 literals, so editing the
weights table changed nothing. Both now read `MIXED_SHARE`, and
`sessionCapacity` reads it too rather than repeating the numbers a third time.
That is why the realised split is now exact rather than approximate.

**Known and accepted limitation.** At 10% hard, a 10-question sitting carries
one hard item, so the analytics minimum of four attempts per skill is never
reached for HARD and the post-test report will not characterise hard
performance. This is stated in `src/index.js` beside the weights, and is the
consequence the brief names and accepts.

---

## 8. Correctness on a fresh corpus

`tools/audit/rc2-development-corpus.mjs 10000 rc295` — 10,000 questions on the
RC2.9 development seeds, 228 templates, 16 families,
3335 easy / 3335 medium / 3330 hard. Every one of the 44 new constructions appears.

| check | measured | required |
|---|---|---|
| wrong keys — oracle disagreement | 0 | 0 |
| wrong keys — post-shuffle key mismatch | 0 | 0 |
| wrong keys — correct value mismatch | 0 | 0 |
| zero correct options | 0 | 0 |
| duplicate options — multiple correct | 0 | 0 |
| ambiguous items published | 0 | 0 |
| undiscoverable items published | 0 | 0 |
| explanation arithmetic errors (derivation mismatch) | 0 | 0 |
| distractor rationale contradictions (§1.1 definition) | 0 | 0 |
| distractor rationales claiming an unused solution operation | 0 | 0 |
| inapplicable misconception on an option | 0 | 0 |
| two wrong options sharing one derivation | 0 | 0 |
| Arabic constructions classified | 106,000 | — |
| …invalid | 0 | 0 |
| …unclassified | 0 | 0 |
| answer-derived options with no attribution | 0 | 0 |
| retry exhaustions | 0 | 0 |
| deterministic replay | passes | passes |

Deterministic replay is the §23 condition `REPRODUCIBLE` — the same seed replays
identically through `generateQuestion` and `generatePractice` — and is part of
the 39 of 39 PASS recorded in the freeze.

One measurement changed in this release, and it is a measurement change rather
than an engine change. The odd-one-out ambiguity check asks whether more than
one rule nominates a DIFFERENT member of the set as the odd one. Three of this
release's constructions ask something else — how many members satisfy a stated
rule, which rule they all satisfy, which number extends the set — so their key
is a count, a rule or a number outside the set. Scored through that check, a
count of 4 was read as "the outlier is 4" and one competing rule was reported
for a question nobody is being asked. Those 133 of 364 items are now
counted apart under `notAnOutlierTask` instead of being scored by a test that
does not apply to them, and `publishedAmbiguous` is 0.

---

## 9. Key stability — the per-seed diff

`tools/audit/rc294-zero-diff.mjs` builds a per-draw surface hash (stem,
displayed expression, options, key, template, band, parameters, all six
signatures, steps and every option derivation) from an engine root, over the
same 10,000 reference draws. `tools/audit/rc295-key-stability.mjs` compares two
manifests and attributes every difference. The RC2.9.4 root is the extracted
`RC2_9_4_GENERATOR_READY.zip` (sha256 085c15d1…d865), not a reconstruction.

| outcome | seeds | what it means |
|---|---|---|
| identical | 7,533 | the draw is byte-identical to RC2.9.4 |
| NEW_TEMPLATE_DRAWN | 1,191 | the seed now lands on a construction added in this release |
| POOL_SHIFT | 1,239 | a different pre-existing template; the pool reindexed, no template changed |
| SAME_TEMPLATE_CHANGED | 37 | same template, different rendered surface |
| AVAILABILITY | 0 | one side exhausted and the other did not |

The only rows that mean a question a learner could have met was edited are the
37, and all of them are in one family:

| template | band | seeds | cause |
|---|---|---|---|
| `FRAC_H_4` | structurally EASY | 28 | fractions family entry, RNG stream |
| `FRAC_M_3` | structurally EASY | 9 | fractions family entry, RNG stream |

The cause is exact and is not a content edit. The fractions family entry gained
one line for the three new EASY constructions:

```js
if (!pinTemplate && difficulty === 'easy' && rng.bool()) return rng.pick(Object.values(EASY))(ctx);
```

That `rng.bool()` is spent on every EASY call, which advances the stream by one
draw for the two chain templates that are structurally EASY (`structuralBandOf`
puts FRAC_M_3 and FRAC_H_4 at easy — the RC2.2 adjudication, unchanged here).
Those 37 draws get different NUMBERS from the same construction, the same steps
and the same solution path. Nothing outside fractions moved: **no MEDIUM or
HARD blueprint changed its rendering on any of the 10,000 seeds**, which is
exactly what §7.5 and trap 9 ask to be checked.

Manifest digests, so the comparison can be reproduced: RC2.9.4
`d4b2dfda9c69525f829e0ea089a92663…`, RC2.9.5 `c1da98c8410f8407d26c15bfdfc89e07…`.

---

## 10. Analytics — no drift

`tools/audit/rc294-analytics-evidence.mjs` re-run on this tree, output in
`rc2/RC295_ANALYTICS_EVIDENCE.md`.

| section | RC2.9.4 vs RC2.9.5 |
|---|---|
| 1. null permutation matrix (201 orderings per history) | byte-identical |
| 2. sensitivity, genuine within-skill change, 20 draws each | byte-identical |
| 3. the thirteen threshold-boundary lines, as Arabic | byte-identical |
| 4. synthetic learners A–L | differs |

```
$ diff <(sed -n 1,72p rc2/RC294_ANALYTICS_EVIDENCE.md) \
       <(sed -n 1,72p rc2/RC295_ANALYTICS_EVIDENCE.md)
(no output)
```

Sections 1–3 are the model measured against synthetic histories with no engine
question in them; they are the drift test, and there is none. Section 4 draws
REAL engine questions and answers them synthetically, so it moves when the
engine draws different questions — which §9 shows it does for 2,467 of 10,000
seeds. That is input drift, not model drift, and the model code is untouched in
this release.

The trend feature remains silent at product sizes. That RC2.9.4 finding stands
and is explicitly out of scope here; no change was made to it.

---

## 11. Rendered samples for every new construction

`tools/audit/rc295-new-construction-samples.mjs` → **`rc2/RC295_NEW_CONSTRUCTIONS.md`**,
which carries three rendered instances of each of the 44 new constructions —
the stem, the six options with the key marked, the worked steps, the quick
method, and the one-line reason behind every wrong option. Constructions with
fewer than three drawable instances: **0**.

That file is the deliverable for this section; it is read as Arabic assessment
material, not as metadata. One sample from each family is reproduced here so
the report stands on its own:

- **sequences** · `SEQ_E_FIRST_ABOVE` — متتالية حسابية تبدأ بالحد 7 وفرقها الثابت 6. ما أول حد فيها يتجاوز 54؟
- **ratios** · `RAT_E_COMMON_FACTOR` — ما أكبر عدد يقسم طرفَي النسبة 18 : 48 معًا؟
- **percentages** · `PCT_E_REMAINING_PERCENT` — أنفقت أسرة 15% من دخلها الشهري على السكن، و25% منه على الطعام. كم نسبة ما تبقّى من الدخل؟
- **averages** · `AVG_E_COMPARE_MEANS` — في نادٍ سُجّلت مجموعتان: الأولى 6 قيم مجموعها 60، والثانية 3 قيم مجموعها 42. ما المتوسط الأعلى بين المجموعتين؟
- **ages** · `AGE_E_GAP` — عمر راشد 30 سنة وعمر أحمد 17 سنة. كم سنة الفرق بين عمريهما؟
- **speed** · `SPD_E_COMPARE` — قطع أحمد 120 كيلومترًا في 3 ساعات، وقطعت فاطمة 110 كيلومترات في ساعتين. ما سرعة الأسرع منهما؟
- **work_time** · `WORK_E_OUTPUT_IN_DAYS` — في ورشة نجارة ينجز الفريق 12 قطعة في اليوم الواحد بوتيرة ثابتة. كم قطعة ينجز الفريق في 5 أيام؟
- **machines** · `MACH_E_LOST_OUTPUT` — في خط إنتاج 6 آلات متطابقة في الإنتاجية، تنتج كل منها 9 قطع/ساعة. توقفت آلة واحدة طوال 4 ساعات. كم قطعة فُقدت بسبب التوقف؟
- **direct_proportion** · `PROP_E_TOTAL_TWO_ITEMS` — في متجر، اشترىت هند 5 كتب ثمن الواحد 12 درهمًا، و6 بطاقات ثمن الواحدة 15 درهمًا. كم دفعت في المجموع؟
- **fractions** · `FRAC_E_COUNT_PARTS` — لدى مزارع 12 كيلوجرامًا من التمر، ويعبئها في صناديق يسع كل صندوق كيلوجرامان. كم صندوقًا يحتاج؟
- **unit_rate** · `RATE_E_BETTER_DEAL` — في بقالة تُباع 6 علب بمبلغ 72 درهمًا، وفي مخبز تُباع 10 علب بمبلغ 90 درهمًا. ما سعر العلبة الواحدة في العرض الأوفر؟
- **combined_rate** · `COMB_E_ONE_ALONE` — المعطيات: آلتا تعبئة تنتجان معًا 16 زجاجة/ساعة؛ الأولى وحدها تنتج 6 زجاجات/ساعة. المطلوب: معدل الآلة الثانية وحدها.
- **relational** · `REL_E_COUNT_BELOW` — راشد أسرع من مريم. علي أسرع من سامي. مريم أسرع من علي. سامي أسرع من ليان. كم شخصًا أبطأ من سامي؟
- **calendar** · `CAL_E_BEFORE` — إذا كان اليوم هو الجمعة، فما اليوم الذي كان قبل 4 أيام؟
- **odd_one_out** · `ODD_E_COUNT_MATCHING` — كم عددًا من الأعداد الآتية ينطبق عليه أنه مربع كامل؟
- **profit_loss** · `PL_E_BETTER_SALE` — في متجر أدوات، صفقة أولى تكلفتها 150 درهمًا وربحها 30%، وصفقة ثانية تكلفتها 300 درهم وربحها 25%. ما أكبر ربح بالدرهم بين الصفقتين؟

Reading the rendered file, rather than the templates, found three Arabic
defects that the classifier passes and a reader does not. All three are fixed
in this release:

| defect | where | fix |
|---|---|---|
| «تنتج الثانية قميصان/ساعة» — a rate symbol renders one form in every case, so it was wrong as a verb's object | `COMB_E_TIME_FOR_TARGET` | the sentence puts the rate in a predicate: «معدل العاملة الأولى …» |
| «أنفق 2 أثمان هذا المبلغ» — a numeral in front of a fraction plural is not Arabic | `FRAC_E_REMAINING_FRACTION` | draws from the closed list of fractions Arabic says in one construct |
| «اشترى زبون كتابان» — nominative dual as a verb's object | `PROP_E_TOTAL_TWO_ITEMS` | `u(n, 'book', 'oblique')`, and the buyer is named |

`formOf()` and the تمييز logic are untouched (trap 7). Every new stem runs
through the same `formatNumberWithUnit` path as every old one; the corpus scan
in §8 classifies 106,000 constructions across the release with 0 invalid and 0
unclassified.

A fourth reading found a diversity defect rather than a grammar one: a
fifty-question mixed session showed only 14 distinct entity words, under the
RC2.7 gate of 15, because the new constructions are abstract. Seven of them now
name the shop, workshop, venue or person their story already implied —
17 / 22 / 19 on the three reference seeds.

---

## 12. What was not achieved, and its ceiling

### The EASY matching target was met

92 of 92. Margin over the 50% share: **42 constructions**. Nothing in §3 fell
short, so §8 of the brief does not apply to the capacity target.

### Single-band practice still does not meet the rolling gate

| band | PV+ND | gate | verdict |
|---|---|---|---|
| EASY, 8 × 4 × 30 | 12 | ≤ 8 | FAIL |
| MEDIUM, 8 × 4 × 30 | 16 | ≤ 8 | FAIL |

This is not a shortfall against this release's scope — it is the reason §2
removes single-band practice from the product and the engine. Both rows are
measurement paths reached only by passing `bandSession: true` in as many words.
EASY improved from 48 to 12 and MEDIUM is unchanged at 16, as required.

### A 100-question sitting is over the gate

| configuration | PV+ND | ND | cluster | verdict |
|---|---|---|---|---|
| mixed, 6 journeys × 2 sittings × 50 | 1 | 1 | 2 | PASS |
| mixed, 6 journeys × 2 sittings × 100 | 9 | 9 | 3 | FAIL |

The ceiling is exact and follows from §2: a journey of 2 × 100 needs 100 EASY
constructions and EASY holds 92, so a window spanning the sitting boundary
cannot be filled without a repeat. The product caps a sitting at 50
(`syncCountCapacity` in `app.js`), so no learner can produce this
configuration, and at 50 the same measurement passes with PV+ND 1. It is
recorded rather than dropped.

### The mix was not raised above 50% easy

Deliberate, per §6 and trap 1. The breadth work reaching 92 does not license
60/30/10 in this release; that is a separate release with its own acceptance
run, and the 42-construction margin above is what it would spend.

### HARD performance is not characterised by the analytics

Stated in §7 above as a known, accepted consequence of 10% hard: a 10-question
sitting carries one hard item, below the four-attempt evidence minimum. No
action taken, by the brief's instruction.

### Four older acceptance pins were re-derived rather than left failing

At the STEP 3 checkpoint four pins measuring a single 100-question sitting
failed under the new mix (RC2.8-7 label conditions, RC2.8-3 rejection rate,
RC2.9.2-C cooldown pressure, RC2.9.2-I sequence rule breadth). All four pass on
the released tree: the breadth work relieved exactly the pressure that broke
them. The full suite is green, and the §23 gate — 39 conditions including
`SUITE_GREEN`, `STRESS_GREEN`, `LANGUAGE_CLEAN`, `AMBIGUITY_CLEAN`,
`FEEDBACK_TRUTHFUL` and `REPRODUCIBLE` — is 39 of 39 PASS at the frozen commit.

---

## Re-verifying this release

```sh
unzip RC2_9_5_GENERATOR_READY.zip -d rc295 && cd rc295
node -e 'import("./tools/audit/rc2-freeze.mjs").then(m=>console.log(m.verifyFreeze()))'
npm test
node tools/audit/rc2-internal-gate.mjs
node tools/audit/rc295-rolling.mjs mixed 10,20,30 4 8
node tools/audit/rc295-band-split.mjs 10,20,30,50 1200
node tools/audit/rc294-keyspace.mjs easy,medium 4000 900
node tools/audit/rc295-rationale-audit.mjs
node tools/audit/rc295-new-construction-samples.mjs | less
```

`rc2/baseline/rc294/`, `rc293/` and `rc292/` carry each earlier release's
production files, recovered from git and checked against that release's own
per-file hashes, so a matched-seed comparison needs nothing but this zip.
