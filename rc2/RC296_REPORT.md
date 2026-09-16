# RC2.9.6 — family selection must not reach a dead end

Maintenance release. One reachable product dead end and four carried-over
polish items. Tables first; every number is produced by a tool in
`tools/audit/` on the tree this release freezes, named beside its table.

```
release                  RC2.9.6              engine 1.5.6
frozen commit            a36f93e6f269cc14195cea2a67d0e8f96d530c43
production bundle        95e60580761ee275531783325e62259bfb4a0efb2236f289750f94fb0fd21251
production files         65
delivery zip             RC2_9_6_GENERATOR_READY.zip
  sha256                 in rc2/RC296_PACKAGE.json, written after the build
baselines in the zip     rc2/baseline/rc292, rc293, rc294, rc295
verifyFreeze (extracted) intact — 0 changed, 0 added, 0 removed
§23 internal gate        PASS, 39 of 39 conditions
sign-off holdout         AUDIT-2026-09-13-P — named, not generated
baseline measured from   RC2_9_5_GENERATOR_READY.zip
  sha256                 c91ef9bd878662300e2e466cd14fef0a0ba28cfd311e260a1b5c34cc43cd5bd0
```

The archive cannot carry its own hash, so the zip sha256 is published in
`rc2/RC296_PACKAGE.json` beside it. The two hashes that verify the ENGINE —
the frozen commit and the production bundle — are above, and `verifyFreeze()`
recomputes the bundle from the extracted tree.

**Headline.** Of 164 measured family/size cells, the product used to offer 94
and 10 of those then failed. It now offers 79 and **0** fail. Three of the four
polish items are closed; the fourth (§3.3) was reverted for a reason §13 gives
in full.

---

## 1. Family-selection matrix, BEFORE and AFTER

`tools/audit/rc296-family-matrix.mjs 10` — ten attempts per cell through the
PRODUCT path (`generatePracticeForJourney`), not through `generatePractice`.
`cap` is the number the UI shows for that selection; a cell is **offered** when
the count is at or below it.

The invariant is one line: **offered ⇒ served**.

| family | cap before | cap after | 5 before → after | 10 before → after | 14 before → after | 20 before → after | 30 before → after |
|---|---|---|---|---|---|---|---|
| sequences | 16 | **14** | 5/5 → 10/10 | 5/5 → 10/10 | 5/5 → 10/10 | 0/5 → 0/10 | 0/5 → 0/10 |
| speed | 15 | **14** | 5/5 → 10/10 | 5/5 → 10/10 | 5/5 → 10/10 | 0/5 → 0/10 | 0/5 → 0/10 |
| percentages | 10 | **10** | 5/5 → 10/10 | 5/5 → 10/10 | 0/5 → 0/10 | 0/5 → 0/10 | 0/5 → 0/10 |
| averages | 10 | **10** | 5/5 → 10/10 | 5/5 → 10/10 | 0/5 → 0/10 | 0/5 → 0/10 | 0/5 → 0/10 |
| ages | 10 | **0** | 5/5 → 10/10 | 5/5 → 10/10 | 0/5 → 0/10 | 0/5 → 0/10 | 0/5 → 0/10 |
| work_time | 12 | **10** | 5/5 → 10/10 | 5/5 → 10/10 | 0/5 → 0/10 | 0/5 → 0/10 | 0/5 → 0/10 |
| machines | 10 | **10** | 5/5 → 10/10 | 5/5 → 10/10 | 0/5 → 0/10 | 0/5 → 0/10 | 0/5 → 0/10 |
| unit_rate | 10 | **10** | 5/5 → 10/10 | 5/5 → 10/10 | 0/5 → 0/10 | 0/5 → 0/10 | 0/5 → 0/10 |
| combined_rate | 10 | **10** | 5/5 → 10/10 | 5/5 → 10/10 | 0/5 → 0/10 | 0/5 → 0/10 | 0/5 → 0/10 |
| profit_loss | 12 | **10** | 5/5 → 10/10 | 5/5 → 10/10 | 0/5 → 0/10 | 0/5 → 0/10 | 0/5 → 0/10 |
| ratios | 10 | **5** | 5/5 → 10/10 | 2/5 → 7/10 | 0/5 → 0/10 | 0/5 → 0/10 | 0/5 → 0/10 |
| direct_proportion | 10 | **5** | 5/5 → 10/10 | 3/5 → 6/10 | 0/5 → 0/10 | 0/5 → 0/10 | 0/5 → 0/10 |
| relational | 10 | **5** | 5/5 → 10/10 | 0/5 → 0/10 | 0/5 → 0/10 | 0/5 → 0/10 | 0/5 → 0/10 |
| calendar | 7 | **5** | 5/5 → 10/10 | 0/5 → 0/10 | 0/5 → 0/10 | 0/5 → 0/10 | 0/5 → 0/10 |
| fractions | 1 | **0** | 0/5 → 0/10 | 0/5 → 0/10 | 0/5 → 0/10 | 0/5 → 0/10 | 0/5 → 0/10 |
| odd_one_out | 1 | **0** | 0/5 → 0/10 | 0/5 → 0/10 | 0/5 → 0/10 | 0/5 → 0/10 | 0/5 → 0/10 |

(The BEFORE column is five attempts per cell, the AFTER ten; the BEFORE run is
`/tmp` scratch from the reproduction step and its shape, not its precision, is
the point.)

| | before | after |
|---|---|---|
| cells measured | 164 | 164 |
| cells the UI offered | 94 | 79 |
| **cells offered that then failed** | **10** | **0** |

The ten that used to fail:

| selection | count | cap it was offered at | delivered |
|---|---|---|---|
| ratios | 10 | 10 | 2/5 |
| direct_proportion | 10 | 10 | 3/5 |
| relational | 10 | 10 | 0/5 |
| relational+direct_proportion | 20 | 20 | 0/5 |
| direct_proportion+ages | 30 | 30 | 0/5 |
| fractions+sequences | 30 | 34 | 0/5 |
| odd_one_out+speed | 20 | 25 | 3/5 |
| relational+averages | 20 | 25 | 4/5 |
| odd_one_out+relational+speed | 30 | 35 | 0/5 |
| ages+fractions+work_time | 30 | 30 | 3/5 |

### Why some cells the UI declines still show deliveries

`ages` alone is offered nothing, yet the matrix shows it serving 10/10 at five.
That is not the capacity being over-conservative — it is ten seeds being lucky.
`tools/audit/rc296-selection-reliability.mjs` ran 120 independent seeds per cell:

| selection | count | delivered | rate | UI offers it |
|---|---|---|---|---|
| ages | 5 | 118/120 | 0.983 | no (cap 0) |
| ages | 10 | 98/120 | 0.817 | no (cap 0) |
| ratios | 10 | 99/120 | 0.825 | no (cap 5) |
| ratios | 5 | 120/120 | 1.000 | yes (cap 5) |
| direct_proportion | 10 | 53/120 | 0.442 | no (cap 5) |
| direct_proportion | 5 | 120/120 | 1.000 | yes (cap 5) |
| relational | 5 | 120/120 | 1.000 | yes (cap 5) |
| calendar | 5 | 120/120 | 1.000 | yes (cap 5) |
| sequences | 14 | 120/120 | 1.000 | yes (cap 14) |
| fractions | 5 | 0/120 | 0.000 | no (cap 0) |
| odd_one_out | 5 | 0/120 | 0.000 | no (cap 0) |

Every cell the product offers is at **1.000**. Every cell it declines is below
it. `ages` alone at five delivers 118 of 120 — 98.3% — and a session that fails
one time in sixty is a dead end a learner will meet, so it is not offered.
Three families cannot serve the smallest sitting alone: **fractions**,
**odd_one_out** and **ages**.

---

## 2. Pairs and triples

`tools/audit/rc296-family-matrix.mjs 10` — 28 combinations of two and three
families at counts 10, 20 and 30, ten attempts each.

| selection | cap | 10 | 20 | 30 |
|---|---|---|---|---|
| fractions+odd_one_out | 0 | 0/10 (not offered) | 0/10 (not offered) | 0/10 (not offered) |
| odd_one_out+calendar | 10 | 10/10 | 0/10 (not offered) | 0/10 (not offered) |
| calendar+relational | 14 | 10/10 | 0/10 (not offered) | 0/10 (not offered) |
| relational+direct_proportion | 14 | 10/10 | 0/10 (not offered) | 0/10 (not offered) |
| direct_proportion+ages | 20 | 10/10 | 10/10 | 0/10 (not offered) |
| ages+ratios | 20 | 10/10 | 10/10 | 0/10 (not offered) |
| ratios+fractions | 14 | 10/10 | 9/10 (not offered) | 0/10 (not offered) |
| fractions+sequences | 20 | 10/10 | 10/10 | 0/10 (not offered) |
| odd_one_out+speed | 14 | 10/10 | 6/10 (not offered) | 0/10 (not offered) |
| calendar+percentages | 20 | 10/10 | 10/10 | 0/10 (not offered) |
| relational+averages | 14 | 10/10 | 8/10 (not offered) | 0/10 (not offered) |
| direct_proportion+machines | 20 | 10/10 | 10/10 | 0/10 (not offered) |
| ages+work_time | 20 | 10/10 | 10/10 | 0/10 (not offered) |
| ratios+unit_rate | 14 | 10/10 | 10/10 (not offered) | 0/10 (not offered) |
| sequences+averages | 30 | 10/10 | 10/10 | 10/10 |
| speed+machines | 20 | 10/10 | 10/10 | 0/10 (not offered) |
| percentages+work_time | 20 | 10/10 | 10/10 | 0/10 (not offered) |
| averages+unit_rate | 20 | 10/10 | 10/10 | 0/10 (not offered) |
| fractions+calendar+sequences | 30 | 10/10 | 10/10 | 10/10 |
| odd_one_out+relational+speed | 20 | 10/10 | 10/10 | 0/10 (not offered) |
| calendar+direct_proportion+percentages | 30 | 10/10 | 10/10 | 10/10 |
| relational+ages+averages | 20 | 10/10 | 10/10 | 10/10 (not offered) |
| direct_proportion+ratios+machines | 30 | 10/10 | 10/10 | 10/10 |
| ages+fractions+work_time | 20 | 10/10 | 10/10 | 7/10 (not offered) |
| sequences+speed+percentages | 30 | 10/10 | 10/10 | 10/10 |
| speed+percentages+averages | 30 | 10/10 | 10/10 | 10/10 |
| percentages+averages+machines | 30 | 10/10 | 10/10 | 10/10 |
| averages+machines+work_time | 30 | 10/10 | 10/10 | 10/10 |

0 of these cells was offered and then failed. The two-family sets that used to
fail — relational+direct_proportion at 20, direct_proportion+ages at 30,
fractions+sequences at 30, odd_one_out+speed at 20 — are now offered a count
they serve. fractions+odd_one_out is offered nothing at all, correctly: neither
family can serve a sitting and together they still cannot.

---

## 3. The floor chosen in §2.3, and why

**Option (b): any single family is allowed, and the size cap enforces the limit.**

| | (a) minimum two families | (b) any single family + cap |
|---|---|---|
| closes fractions alone | yes | yes — cap 0, refused at selection |
| closes odd_one_out alone | yes | yes — cap 0, refused at selection |
| closes ages alone | yes | yes — cap 0, refused at selection |
| keeps sequences alone (serves 14) | **no** | yes |
| keeps the other 12 single families | **no** | yes |

(a) bans thirteen working single-family selections to close three. The three it
needs to close are already closed by §2.2's own third rule — a selection that
cannot reach the smallest sitting is refused at SELECTION time, with the family
named and a request to add another — so (a) buys nothing and costs the twelve.

The minimum lives in the engine as `MINIMUM_SITTING` and is reported by
`sessionCapacity` as `servesAMinimumSitting`. The product reads it; it does not
repeat it. The three refused selections read, in Arabic:

> الكسور وحدها لا تكفي لجلسة كاملة. أضِف عائلة أخرى معها.

---

## 4. The weakness-targeted mode, widened rather than refused

`familySelectionMode === 'weak'` builds its set from the performance report and
produces the narrowest selections in the product. It now goes through the same
capacity check as any other selection, and when the weak set falls short
`engine.familiesFor({count, families})` widens it — keeping every family the
learner got wrong, because that is the point of the sitting.

| weak set | wanted | widened to | added | serves |
|---|---|---|---|---|
| fractions | 10 | fractions+sequences | sequences | yes |
| fractions | 20 | fractions+sequences | sequences | yes |
| odd_one_out | 10 | odd_one_out+sequences | sequences | yes |
| ages | 10 | ages+sequences | sequences | yes |
| calendar+relational | 20 | calendar+relational+sequences | sequences | yes |

The profile the brief names — a learner whose only weakness is fractions — is
the first row. fractions alone serves nothing; fractions+sequences serves ten,
and `tests/rc296-capacity.test.mjs` delivers it five times out of five through
the product path. The learner still gets fractions questions; they get a
sitting as well.

The engine chooses what to add, so the product carries no table of "related"
families that would drift from what the engine can actually do.

The Arabic the learner reads when this happens:

> تم اختيار عائلة واحدة بناءً على أدلة الجلسات السابقة (4 أسئلة على الأقل لكل عائلة).
> وأُضيفت المتتاليات لتكتمل الجلسة؛ أسئلة نقاط ضعفك تبقى ضمنها.

---

## 5. Decimal answers, BEFORE and AFTER, per family

`tools/audit/rc296-decimals.mjs 120` — 1,840 draws across all sixteen families
and three bands. The KEY is read from the options table, not parsed back out of
the rendered Arabic.

| measurement | before | after | gate |
|---|---|---|---|
| non-integer answers | 17 (0.92%) | 12 (0.65%) | ≤ 2% |
| outside .5 / .25 / .75 | 5 | **0** | 0 |
| in a family where they are not allowed | 5 | **0** | 0 |
| numbers with 3+ decimal places anywhere | 5 | **0** | 0 |

Per family:

| family | sampled | non-integer before | after | awkward before | after |
|---|---|---|---|---|---|
| speed | 120 | 9 | 9 | 4 | **0** |
| unit_rate | 120 | 3 | 3 | 0 | **0** |
| percentages | 120 | 3 | 0 | 0 | **0** |
| direct_proportion | 120 | 1 | 0 | 1 | **0** |
| profit_loss | 120 | 1 | 0 | 0 | **0** |

Four templates were drawing them. Each was fixed by constraining the PARAMETER
DRAW — never by rounding, because a rounded key stops being the key the oracle
checks (trap 3):

| template | what it drew | the constraint |
|---|---|---|
| `SPD_H_MEET_DELAY` | 1.3, 1.7, 2.3, 2.4 hours | a whole hour, a half or a quarter |
| `PCT_M_SUCCESSIVE` | −17.5%, 12.5% net change | a whole net percent; 6 of the 9 pairs survive |
| `PCT_H_REVERSE_CHAIN` | a printed factor of 1.125 | a printed factor of at most two decimal places |
| `PROP_M_FRAC_UNIT` | 9.6 kg | the target count is drawn FROM the counts that land whole |

And a publication gate, `validateDecimalShape` in `src/qa/pipeline.js`, so the
constraint cannot be lost again without the suite saying so. It refuses three
things: a key that is fractional outside a half or a quarter; a fractional key
in any family but speed, unit_rate, combined_rate and averages; and three
decimal places anywhere a learner reads.

**«1.5 ساعة» as a GIVEN is untouched**, which is the point — the rule is about
precision, not about decimals. 26 of 300 sampled speed stems still carry one,
and `tests/rc296-polish.test.mjs` asserts the gate accepts them.

---

## 6. The full neutral reason set, with family spans

`tools/audit/rc295-rationale-audit.mjs` — 800 questions, 4,000 wrong options.

| measurement | RC2.9.5 | RC2.9.6 | ceiling |
|---|---|---|---|
| sentences spanning ≥ 4 families | 13 | **12** | 12 |
| of those, naming an operation | 0 | 0 | 0 |
| of those, outside the declared set | 0 | 0 | 0 |
| naming an operation the SOLUTION does not use | 0 | 0 | 0 |
| contradicting their own derivation | 0 | 0 | 0 |
| factual fallback shown | 116 (2.9%) | 116 (2.9%) | ≤ 5% |

The declared set, with the number of families each sentence appears in:

| # | families | uses | sentence |
|---|---|---|---|
| 1 | ['ages', 'averages', 'calendar', 'combined_rate', 'direct_proportion', 'fractions', 'machines', 'percentages', 'profit_loss', 'ratios', 'relational', 'sequences', 'speed', 'unit_rate', 'work_time'] | 279 | أعدت قيمة معطاة في السؤال بدل القيمة المطلوبة. |
| 2 | ['ages', 'averages', 'calendar', 'combined_rate', 'direct_proportion', 'fractions', 'machines', 'percentages', 'profit_loss', 'ratios', 'sequences', 'speed', 'unit_rate', 'work_time'] | 179 | توقفت عند قيمة وسيطة ولم تكمل الخطوة الأخيرة. |
| 3 | ['ages', 'averages', 'combined_rate', 'direct_proportion', 'fractions', 'machines', 'percentages', 'profit_loss', 'ratios', 'relational', 'speed', 'unit_rate', 'work_time'] | 230 | طبّقت الخطوة نفسها مرتين بدل مرة واحدة. |
| 4 | ['ages', 'averages', 'calendar', 'combined_rate', 'direct_proportion', 'fractions', 'machines', 'ratios', 'relational', 'sequences', 'speed', 'unit_rate', 'work_time'] | 248 | زدت أو نقصت خطوة واحدة عن العدد الصحيح من الخطوات. |
| 5 | ['ages', 'averages', 'combined_rate', 'direct_proportion', 'fractions', 'machines', 'percentages', 'profit_loss', 'ratios', 'sequences', 'speed', 'unit_rate', 'work_time'] | 98 | أسقطت إحدى المراحل من الحساب. |
| 6 | ['ages', 'averages', 'direct_proportion', 'fractions', 'machines', 'percentages', 'profit_loss', 'ratios', 'speed', 'unit_rate', 'work_time'] | 99 | أعطيت مقدار الفرق بين القيمتين بدل القيمة المطلوبة نفسها. |
| 7 | ['ages', 'direct_proportion', 'fractions', 'percentages', 'profit_loss', 'relational', 'sequences', 'speed', 'unit_rate'] | 75 | طبّقت العملية في الاتجاه المعاكس. |
| 8 | ['calendar', 'direct_proportion', 'fractions', 'machines', 'percentages', 'profit_loss', 'sequences', 'unit_rate'] | 49 | توقفت بعد المرحلة الأولى ولم تكمل بقية المراحل المطلوبة. |
| 9 | ['ages', 'averages', 'direct_proportion', 'fractions', 'percentages', 'profit_loss', 'ratios', 'speed', 'unit_rate', 'work_time'] | 50 | قرأت مقدار الخطوة خطأً بوحدة واحدة. |
| 10 | ['ages', 'averages', 'combined_rate', 'direct_proportion', 'machines', 'percentages', 'profit_loss', 'speed', 'unit_rate'] | 101 | استخدمت إحدى الحالتين وأهملت الأخرى، والحالتان معًا هما ما يحدد القيمة. |
| 11 | ['combined_rate', 'direct_proportion', 'machines', 'percentages', 'ratios', 'speed', 'unit_rate', 'work_time'] | 71 | توقفت عند قيمة الوحدة الواحدة ولم تكمل إلى الكمية المطلوبة. |
| 12 | ['combined_rate', 'direct_proportion', 'fractions', 'machines', 'profit_loss', 'ratios', 'sequences', 'speed', 'unit_rate', 'work_time'] | 78 | طبّقت المعدل على عدد وحدات غير الذي يخصه. |

### The thirteenth, and what was done with it

It was the factual fallback — one sentence, 116 uses, **14 families**, and the
closest thing in the bank to saying nothing:

> هذه العملية ليست التي تقتضيها العلاقة بين المعطيات والمطلوب في هذه الخطوة.

The brief said make it specific or drop it. It is now rendered per family from
the same subject table the site sentences use, so each of the sixteen families
has its own and none spans four:

| family | the fallback it shows |
|---|---|
| ages | هذه العملية ليست التي تقتضيها العلاقة بين الأعمار في هذه الخطوة. |
| averages | هذه العملية ليست التي تقتضيها العلاقة بين القيم ومتوسطها في هذه الخطوة. |
| calendar | هذه العملية ليست التي تقتضيها العلاقة بين الأيام والدورات في هذه الخطوة. |
| combined_rate | هذه العملية ليست التي تقتضيها العلاقة بين المعدلات المجتمعة في هذه الخطوة. |
| direct_proportion | هذه العملية ليست التي تقتضيها العلاقة بين الكميتين المتناسبتين في هذه الخطوة. |
| fractions | هذه العملية ليست التي تقتضيها العلاقة بين أجزاء الكل في هذه الخطوة. |
| machines | هذه العملية ليست التي تقتضيها العلاقة بين الآلات وإنتاجها في هذه الخطوة. |
| odd_one_out | هذه العملية ليست التي تقتضيها العلاقة بين خصائص العناصر في هذه الخطوة. |
| percentages | هذه العملية ليست التي تقتضيها العلاقة بين النسبة وأساسها في هذه الخطوة. |
| profit_loss | هذه العملية ليست التي تقتضيها العلاقة بين سعري الشراء والبيع في هذه الخطوة. |
| ratios | هذه العملية ليست التي تقتضيها العلاقة بين أجزاء النسبة في هذه الخطوة. |
| relational | هذه العملية ليست التي تقتضيها العلاقة بين مواقع الترتيب في هذه الخطوة. |
| sequences | هذه العملية ليست التي تقتضيها العلاقة بين حدود المتتالية في هذه الخطوة. |
| speed | هذه العملية ليست التي تقتضيها العلاقة بين المسافة والزمن في هذه الخطوة. |
| unit_rate | هذه العملية ليست التي تقتضيها العلاقة بين قيمة الوحدة والكمية في هذه الخطوة. |
| work_time | هذه العملية ليست التي تقتضيها العلاقة بين العمل والزمن في هذه الخطوة. |

That adds a DOMAIN, not a claim. It is the fallback precisely because it
asserts nothing about what the learner did — which is why making it specific is
the right move and merging it into something vaguer (trap 4) is not. The twelve
declared neutral sentences are untouched.

---

## 7. Decimal operands in explanations, BEFORE and AFTER, per template

`tools/audit/rc296-decimal-operands.mjs 150` — how often an explanation puts a
decimal on one side of × or ÷.

| | measured | target |
|---|---|---|
| explanations with a decimal × or ÷ operand | 227 of 2300 (9.9%) | < 4% |

**This target was not met, and the attempt that met it was reverted.** §13 has
the full reason; the short form is that a step is not narration — `operation_kinds`
is derived from the printed steps, and six signatures plus the complexity score
are derived from that.

The templates, as they stand:

| template | family | drawn | with a decimal operand | rate |
|---|---|---|---|---|
| `PCT_H_TWO_GROUP_CHANGE` | percentages | 50 | 50 | 1 |
| `PROP_H_COMPOUND` | direct_proportion | 17 | 17 | 1 |
| `PCT_H_REVERSE_CHAIN` | percentages | 13 | 13 | 1 |
| `PCT_H_MIXTURE` | percentages | 13 | 13 | 1 |
| `RATE_H_TARGET` | unit_rate | 13 | 13 | 1 |
| `MACH_M_NEW_FAST` | machines | 11 | 11 | 1 |
| `PCT_E_OF` | percentages | 9 | 9 | 1 |
| `SPD_E_UNIT_MINUTES` | speed | 9 | 9 | 1 |
| `RATE_H_TWO_PHASE` | unit_rate | 9 | 9 | 1 |
| `PCT_E_SHARE_PERCENT` | percentages | 8 | 8 | 1 |
| `PCT_E_REVERSE_ONE` | percentages | 8 | 8 | 1 |
| `SPD_H_CATCH` | speed | 11 | 8 | 0.727 |
| `WORK_H_WORKERS_EFF` | work_time | 8 | 8 | 1 |
| `PCT_M_UNIT_PRICE` | percentages | 7 | 7 | 1 |
| `PCT_M_SUCCESSIVE` | percentages | 6 | 6 | 1 |
| `WORK_M_EFF` | work_time | 9 | 6 | 0.667 |
| `SPD_E_DISTANCE` | speed | 8 | 5 | 0.625 |
| `SPD_M_AVG` | speed | 14 | 4 | 0.286 |
| `PROP_M_SCALE_ACROSS_HOURS` | direct_proportion | 9 | 4 | 0.444 |
| `MACH_M_SUBSET_UP` | machines | 3 | 3 | 1 |
| `MACH_H_STAGE_UP` | machines | 3 | 3 | 1 |
| `PROP_M_FRAC_UNIT` | direct_proportion | 6 | 3 | 0.5 |
| `PL_H_MARKUP_DISCOUNT` | profit_loss | 3 | 3 | 1 |
| `SPD_M_TWO_TIME` | speed | 4 | 2 | 0.5 |
| `PROP_H_COST_PLUS` | direct_proportion | 7 | 2 | 0.286 |
| `RATE_M_PERCENT` | unit_rate | 2 | 2 | 1 |
| `SPD_H_MEET_DELAY` | speed | 4 | 1 | 0.25 |

For the record, the reverted rewrite reached **2.0%** — comfortably inside the
target — and the 2.0% that remained was the half-hour: «× 1.5» for 1.5 hours and
«× 0.5» for thirty minutes, in speed and proportion items where the decimal is a
GIVEN and the brief asks for it to be left alone. The work is recoverable; what
it needs first is for the operation profile to be derived from the oracle
relation rather than from the printed steps.

---

## 8. In-sitting repeat rate over ≥ 400 sittings

`tools/audit/rc296-in-sitting.mjs 400` — journeys of four sittings, because the
second sitting is where the cooldown pressure is and a fresh sitting every time
would measure an easier thing than the product does.

| count | sittings | with a repeat, before | after | rate before | after | gate | refusals |
|---|---|---|---|---|---|---|---|
| 10 | 400 | 2 | **0** | 0.50% | **0.00%** | no signature twice | 0 |
| 20 | 400 | 3 | **0** | 0.75% | **0.00%** | at most twice | 0 |
| 30 | 400 | 16 | **0** | 4.00% | **0.00%** | at most twice | 0 |

**It was not an edge case at small counts.** The rate RISES with the count —
0.50% at ten, 0.75% at twenty, 4.00% at thirty — which is the opposite shape.
And it was never more than twice in a sitting, so only the ten-question gate was
actually broken; twenty and thirty were inside the RC2.9.5 allowance.

**The cause is not the planner.** Almost every case was a NAMED ARCHETYPE:

```
task:FORWARD_COMPUTE|arch:FOURTH_PROPORTION|entry:forward      ×2 in one sitting
task:SHARE_PROPORTIONALLY|arch:FOURTH_PROPORTION|entry:forward ×2 in one sitting
```

`user_perceptual_signature` drops the quantity and the information structure for
an archetype item, so two genuinely different questions — a ratio share and a
unit-rate scaling, both fourth-proportion, both asked forward — collapse onto one
key at RENDER time, after the plan has already placed two distinct blueprints.

The classifier is not reopened; this release may not. The remedy is where the
collapse becomes visible: a slot declines a candidate whose signature this
sitting already carries, while it still has retries to spend. Staged exactly
like the sub-idea and streak rules beside it, so a sitting with nothing else
left still delivers rather than being refused — **0 refusals across 1,200
sittings**.

---

## 9. Mixed acceptance, RC2.9.5 and RC2.9.6 side by side

`tools/audit/rc295-rolling.mjs mixed 10,20,30 4 8` — the same 8 product-path
journeys, windows advancing in steps of 10.

Gates: PV+ND ≤ 8 · ND ≤ 5 · cluster ≤ 3 · streak ≤ 2 · duplicate stems 0.

| count | | PV+ND | ND | cluster | streak | dup | in-sitting repeats | verdict |
|---|---|---|---|---|---|---|---|---|
| 10 | RC2.9.5 | 0 | 0 | 0 | 0 | 0 | 0/32 | PASS |
| 10 | RC2.9.6 | 0 | 0 | 0 | 0 | 0 | 0/32 | PASS |
| 20 | RC2.9.5 | 0 | 0 | 0 | 0 | 0 | 2/32 | PASS |
| 20 | RC2.9.6 | 0 | 0 | 0 | 0 | 0 | 0/32 | PASS |
| 30 | RC2.9.5 | 1 | 1 | 2 | 1 | 0 | 2/32 | PASS |
| 30 | RC2.9.6 | 0 | 0 | 1 | 1 | 0 | 0/32 | PASS |

Not merely unregressed — better on every axis that moved:

| | RC2.9.5 | RC2.9.6 |
|---|---|---|
| worst PV+ND across all counts | 1 | **0** |
| worst cluster | 2 | **1** |
| sittings carrying an in-sitting repeat | 4/96 | **0/96** |

The band split is 50 / 40 / 10 at every count, unchanged.

---

## 10. The frozen surface — per-seed diff against RC2.9.5

`tools/audit/rc294-zero-diff.mjs` hashes stem, displayed expression, options,
key, template, band, parameters, all six signatures, steps and every option
derivation, over the same 10,000 reference draws. The RC2.9.5 side is built from
the extracted `RC2_9_5_GENERATOR_READY.zip`, not from a reconstruction.
`tools/audit/rc296-frozen-surface.mjs` attributes every difference.

| outcome | seeds | what it means |
|---|---|---|
| identical | 9,914 | byte-identical to RC2.9.5 |
| rendering moved, same template | 47 | the change; every one must be an intended template |
| pool displacement, different template | 39 | no template changed; a constrained draw earlier in the stream now resamples, so the seed lands elsewhere |
| **templates whose rendering moved outside the intended list** | **0** | must be 0 |

| template | seeds | why it was allowed to move |
|---|---|---|
| `PCT_M_SUCCESSIVE` | 21 | 3.1 net change constrained to a whole percent |
| `PROP_M_FRAC_UNIT` | 11 | 3.1 target count drawn from the counts that land on a whole answer |
| `PCT_H_REVERSE_CHAIN` | 8 | 3.1 printed net factor constrained to two decimal places |
| `SPD_H_MEET_DELAY` | 7 | 3.1 meeting time constrained to a whole hour, a half or a quarter |

All 47 are the four §3.1 templates. Nothing else in the bank renders
differently on any of the 10,000 seeds — no narration change survived, and the
in-sitting control of §3.4 is a session-level rule that does not touch what a
single seed renders.

Manifest digests, so the comparison can be reproduced: RC2.9.5
`c1da98c8410f8407d26c15bfdfc89e07…`, RC2.9.6 `fdedb3c6dd7dbb324c565daa19690385…`.

---

## 11. Correctness on a fresh corpus

`tools/audit/rc2-development-corpus.mjs 10000 rc296` — 10,000 questions on the
RC2.9 development seeds, 228 templates, 16 families.

| check | measured | required |
|---|---|---|
| wrong keys — oracle disagreement | 0 | 0 |
| wrong keys — post-shuffle key mismatch | 0 | 0 |
| wrong keys — correct value mismatch | 0 | 0 |
| zero correct options | 0 | 0 |
| duplicate options — multiple correct | 0 | 0 |
| ambiguous items published | 0 | 0 |
| undiscoverable items published | 0 | 0 |
| explanation arithmetic errors | 0 | 0 |
| Arabic constructions classified | 105,961 | — |
| …invalid (3-10 تمييز defects included) | 0 | 0 |
| …unclassified | 0 | 0 |
| answer-derived options with no attribution | 0 | 0 |
| retry exhaustions | 0 | 0 |
| validator | 100% | 100% |
| deterministic replay | passes | passes |

Deterministic replay is the §23 condition `REPRODUCIBLE` and is part of the
39 of 39 PASS recorded in the freeze.

---

## 12. Every new UI message, as rendered Arabic

Each is a limit, not a failure. The word «خطأ» appears in none of them, and
`tests/rc296-capacity.test.mjs` asserts it never will.

| when | message |
|---|---|
| checking a new selection | يجري التحقق من سعة هذا الاختيار… |
| one family, cap 14 | المتتاليات وحدها تكفي حتى 14 سؤالًا. اختر عدداً أقل أو أضِف عائلة أخرى. |
| several families, cap 20 | هذا الاختيار يكفي حتى 20 سؤالًا. اختر عدداً أقل أو أضِف عائلة أخرى. |
| all families | أقصى عدد للأسئلة في هذه الجلسة: 30. |
| a preset above the cap | 20 — غير متاح لهذا المستوى |
| fractions alone | الكسور وحدها لا تكفي لجلسة كاملة. أضِف عائلة أخرى معها. |
| two narrow families together | الكسور وخصائص العناصر معًا لا تكفيان لجلسة كاملة. أضِف عائلة أخرى معها. |
| a selection inside its cap | 3 عائلات محددة — تكفي حتى 30 سؤالًا. |
| the weak set was widened | …وأُضيفت المتتاليات لتكتمل الجلسة؛ أسئلة نقاط ضعفك تبقى ضمنها. |

One older string was corrected rather than added: the count hint said «الحد
الأقصى لعدد الأسئلة في هذا المستوى», which named a difficulty level that
RC2.9.5 removed. There are no levels; there is a selection and what it holds.

---

## 13. What was not achieved, with its number

### §3.3 — integer-path percentage narration. Target < 4%; measured 9.9%.

The rewrite was done, measured at **2.0%**, and then **reverted**, because §4.4
caught what §3.3 could not see.

`metadata.operation_kinds` is derived from the PRINTED STEPS —
`deriveOperationProfile(base.explanation.steps)` in `src/utils.js` — and six
things are computed from it: `operation_kinds`, `reasoning_target_pair`,
`user_construction_signature`, `sub_idea_signature`,
`structural_reasoning_signature` and `complexity_score`.

So a step is not narration. Measured on matched seeds against the RC2.9.5
package, before the revert:

| template | operation_kinds | complexity_score |
|---|---|---|
| `PCT_E_OF` | [divide, multiply] → [divide] | 6.6 → **2.8** |
| `RATE_M_PERCENT` | [divide, add, multiply] → [divide, add, ratio, multiply] | 13.8 → **15.6** |
| `PCT_E_SHARE_PERCENT` | divide>multiply>percent → multiply>divide>percent | 8.4 → **9.2** |

The complexity score is what the band adjudication reads, so this was a
difficulty recalibration arriving through the explanation text — which §0
forbids outright and trap 5 warns about in as many words. §3.3 is a TARGET;
§4.4 is a requirement; the requirement wins.

What is kept from the attempt is the finding, as a test —
`tests/rc296-polish.test.mjs`, "operation_kinds is DERIVED from the printed
steps, so narration is not free" — so the next attempt starts from the
constraint. The integer path is recoverable once the operation profile is
derived from the oracle relation rather than the printed steps, which is a
change to the engine's own model and belongs in a release scoped for it.

### Three families cannot serve the smallest sitting alone

| family | delivery rate at 5 questions, 120 seeds |
|---|---|
| fractions | 0/120 |
| odd_one_out | 0/120 |
| ages | 118/120 (98.3%) |

Not a regression — `fractions` and `odd_one_out` never worked, and `ages` worked
59 times in 60. What changed is that the product now says so at selection time
instead of failing at generate time. Closing it properly means new EASY
constructions in those three families, which is content work and out of scope
for a maintenance release.

### The capacity query costs two to thirteen seconds on a cold cache

A capacity answer is thirty-six dry sessions. Six cheap probes find the
neighbourhood of the ceiling and thirty confirm it, because six alone pass an
88%-count about half the time and that is exactly how the old dead end survived.
The UI therefore puts its note up first and computes on the next tick, and
answers are cached in `localStorage` under the engine version so a new engine
invalidates every stored number. Correctness over latency; the alternative was a
fast number that lies. A future release could precompute the table at build time
with a drift test against the engine, which would be fast AND honest.

---

## Re-verifying this release

```sh
unzip RC2_9_6_GENERATOR_READY.zip -d rc296 && cd rc296
node -e 'import("./tools/audit/rc2-freeze.mjs").then(m=>console.log(m.verifyFreeze()))'
npm test
node tools/audit/rc2-internal-gate.mjs
node tools/audit/rc296-family-matrix.mjs 10          # the invariant: offered => served
node tools/audit/rc296-selection-reliability.mjs 120 # every offered cell at 1.000
node tools/audit/rc296-in-sitting.mjs 400
node tools/audit/rc296-decimals.mjs 120
node tools/audit/rc295-rolling.mjs mixed 10,20,30 4 8
```

`rc2/baseline/` carries rc292, rc293, rc294 and rc295 — each release's
production files, recovered from git and checked against that release's own
per-file hashes — so the §10 comparison needs nothing but this zip.
