# RC2 SCOPE — FINAL NUMBERED INVENTORY

Status: **log only. Nothing here is implemented.** RC1 remains frozen at
`7b5d4617295c98a8ed0f87d204f4745dd5db05dd`; production code is untouched.

Manual blind review of the frozen 250-question sample is complete (250/250).
This inventory is self-contained: every confirmed RC2 issue appears here
explicitly, with its own classification, rather than by cross-reference to a
narrative section. Evidence for each is in `MANUAL_REVIEW_RC1.md` and
`SIGNOFF_RC1.md`.

Classifications used: `PRODUCTION_BLOCKER`, `QA_OBSERVABILITY_BLOCKER`,
`PEDAGOGICAL_BLOCKER`, `LANGUAGE_BLOCKER`, `ACCESSIBILITY_BLOCKER`,
`STATISTICAL_LEAKAGE_RISK`, `QA_METRIC_DEFECT`. An item may carry more than one.

---

## 1. `RANK_DRIVEN_DISTRACTOR_SELECTION`
**PRODUCTION_BLOCKER · STATISTICAL_LEAKAGE_RISK**
`pickBalancedDistractors` (`src/utils.js:152-203`) draws a target rank from
`RANK_DRAW_WEIGHTS` and slices the below-key and above-key pools to land the key
there, excluding valid provenance-carrying distractors to do so.
*Constraint on remediation:* rank may be observed and analysed; it must never be a
runtime target. Evidence: `SIGNOFF_RC1.md` §5.

## 2. `AR_DEFINITE_PLURAL_BARE_NUMERAL`
**LANGUAGE_BLOCKER**
`فما متوسط القيم 9؟` — a definite plural followed by a bare numeral. 6 of 7
`averages` templates; **548 / 10,000** corpus, **13 / 250** sample.
Evidence: `SIGNOFF_RC1.md` §8.

## 3. `INCOMPLETE_REJECTION_TELEMETRY`
**QA_OBSERVABILITY_BLOCKER**
The reason-code histogram omits every rejection below the pipeline boundary — 135
ambiguity rejections inside the odd-one-out sampler were invisible. `src/index.js:202`
does not call `analytics.record`. `DISTRACTOR_IMPOSSIBLE` and `RETRY_EXHAUSTED`
are emitted nowhere. Evidence: `SIGNOFF_RC1.md` §2.

## 4. `SEED_REPRODUCIBILITY_QUALIFICATION`
**QA_OBSERVABILITY_BLOCKER**
Same seed reproduces only on a fresh engine; the recent-fingerprint cache changes
the result inside a long-lived instance (`src/index.js:87,314,354-356`).
Evidence: `SIGNOFF_RC1.md` §7.

## 5. `DEGENERACY_MODEL_COVERAGE_GAP`
**QA_OBSERVABILITY_BLOCKER**
23 of 107 templates declare no `wrongMethodValue`, so the 0% degenerate rate
covers only 79.3% of published questions. Evidence: `SIGNOFF_RC1.md` §6-B.

## 6. `PDF_VISUAL_ORDER_TEXT_LAYER`
**ACCESSIBILITY_BLOCKER**
The session PDFs store Arabic as presentation forms in visual order (~77.5% of
extracted Arabic characters); a literal search for a stem phrase returns **0 hits
in all five reports**. The v1.2.0 Latin-glyph corruption is absent and there are
no unmapped characters. Affects text search, copy-paste and screen readers, not
only auditing. Evidence: `audit-rc1/DELIVERY-MANIFEST.md`.

---

## 7. `AMBIGUITY_LONE_SIMPLE_RULE_NEVER_COMPETES`
**PRODUCTION_BLOCKER · PEDAGOGICAL_BLOCKER**
`checkOddOneOutAmbiguity` (`src/qa/ambiguity.js:103-113`) needs a *pair* of
complexity-≤3 rules with different outliers. When exactly one simple rule survives
the filter and it disagrees with the key, no pair forms and the verdict is
`ambiguous: false`. `supportsIntended` is then satisfied from the **unfiltered**
list, so a rule the checker itself calls too hard to see still certifies the item.
**S1/27** publishes key 75 and **S5/08** publishes key 30 while the only rule the
checker calls simple (`mult3`, complexity 1) points at **35** in both.

## 8. `AMBIGUITY_INVERSE_FRAMING_AND_MAGNITUDE_BLIND_SPOT`
**PRODUCTION_BLOCKER**
`findSingleOutlierRules` (`src/qa/ambiguity.js:84-92`) tests only
`failing.length === 1`. It never tests "exactly one **satisfies** P", and the rule
grammar contains no digit-magnitude class. 7 sample questions carry a coherent
competing class it cannot see (S3/27, S1/08, S4/21, S4/10, S2/07, S2/39, S3/13).

## 9. `UNDISCOVERABLE_INTENDED_RULE`
**PEDAGOGICAL_BLOCKER**
A template may publish a rule above the engine's own simplicity ceiling. On
**S5/46** the production checker reports *no* rule of complexity ≤ 3 fits the set;
primality, the natural reading, singles out two numbers, neither the key.
`ODD_H_PRIME_OFFSET`, `ODD_H_SQ_MINUS`.
*RC2 must eliminate AMBIGUOUS and UNDISCOVERABLE publication.*

## 10. `CONSTANT_ANSWER_TEMPLATE`
**PRODUCTION_BLOCKER · STATISTICAL_LEAKAGE_RISK**
`REL_H_POSITION_UNCERTAIN` answers `لا يمكن تحديده` in **91 / 91** corpus
instances and 5/5 in the sample. Entropy 0.00; +83.3 points over the 1/6
baseline. Unequivocal blocker. The keys are individually correct — the template
simply can never generate a determinate case.

## 11. `NARROW_ANSWER_VALUE_SPACE`
**STATISTICAL_LEAKAGE_RISK**
16 further templates concentrate their answers; the worst are `SPD_M_EQUAL_DIST`
(+27.8 pts over chance), `PL_M_TOTAL_COST` (+27.2), `PL_E_LOSS` (+23.7),
`SPD_H_TIME_DIFF` (+20.3, Hard), `COMB_H_STAGED` (+19.3, Hard).
**No "≤4 distinct answers is invalid" rule is proposed.** Answer-space size alone
is not a defect — `REL_M_COUNT` has the largest space in the table and still leaks
+19.2 points. Remediate where materially exploitable, judged by modal frequency
and entropy, not by space size.
*Constraint on remediation, as for rank:* the answer value may be observed and
analysed; it must never become a runtime target. No runtime answer-frequency
balancing and no selecting parameters because they produce a desired answer — the
fix belongs in each template's parameter space.

## 12. `GENERIC_KEY_NEIGHBOR_DISTRACTOR`
**PEDAGOGICAL_BLOCKER · STATISTICAL_LEAKAGE_RISK**
**193 of 1,250 wrong options (15.4%)** across the 250 are literally `key ± n`
carrying a registered `misconceptionId`. `OFF_BY_ONE_STEP` is used 272 times; 79
are genuinely justified, 193 are not. **S5/32** has four of five, giving options
{7, 7.2, 8, 9, 10, 11} with the key at the centre. One derivation is written
`8 ± 5`. The near-miss fallback the development round reported as deleted survived
under a label.

## 13. `MISATTRIBUTED_MISCONCEPTION_FEEDBACK`
**PRODUCTION_BLOCKER · PEDAGOGICAL_BLOCKER**
`USED_SUM_OF_SPEEDS_IN_CHASE` is applied **154 of 195** times to stems containing
no chase (`SPD_M_EQUAL_DIST`, `SPD_H_TIME_DIFF`). The candidate is told they made
an error the question cannot elicit; on S5/24 the same sentence is attached to a
harmonic-mean derivation.

## 14. `FEEDBACK_SPECIFICITY_METRIC_INVALID`
**QA_METRIC_DEFECT**
The "option-specific feedback 0% → 100%" figure counted the mechanical
`اخترت X، وهي ناتج Y` prefix, which differs trivially. Measured properly, 22.6% of
wrong options share an explanatory sentence (61.2% of questions).
**This is a metric defect, not automatically a content defect.** Two options may
legitimately share an explanation when the same real misconception produces both.
The RC2 requirement is *not* uniqueness of wording. It is:
- the feedback must correctly describe **that option's** derivation;
- the misconception must be applicable to **that stem**;
- generic or vacuous feedback is not sufficient;
- misattributed feedback is a defect;
- **identical wording alone is not a defect.**
Where duplication coincides with a real failure it is counted under item 12
(vacuous) or item 13 (misattributed).

## 15. `DIFFICULTY_BAND_MISCALIBRATION`
**QA_METRIC_DEFECT**
118 / 250 (47.2%) declared-vs-computed mismatch, one-directional:
`Medium→Easy` = 0 and `Hard→Easy` = 0; declared Easy mismatches at 88.5%.
Manual assessment: **110 JUSTIFIED_MISMATCH · 3 UNCERTAIN · 5
MISCLASSIFIED_DIFFICULTY = 118.** `bandFor` (`src/qa/complexity.js:36`) uses
`≤4.5 → easy`, `≤9.5 → medium`. `complexity_band` currently carries no
information about the declared label and is blind to items 9 and 10.

## 16. `AR_DUAL_WRONG_CASE`
**LANGUAGE_BLOCKER**
Dual in the nominative where the genitive is required, plus verb non-agreement:
`إنجاز مهمتان` → `إنجاز مهمتين` (`WORK_E_VOLUME`, 37 / 10,000) and
`كل سنتيمتران تمثل` → `كل سنتيمترين يمثلان` (`PROP_M_MAP`, 23 / 10,000).
Sample: S2/24, S2/19.

## 17. `AR_DEFINITENESS_RENDERING`
**LANGUAGE_BLOCKER**
A definite adjective modifying an indefinite إضافة: `سعر سلعة المعلن 200 درهمًا`
→ `سعر السلعة المعلن`. `PL_M_DISC_MARK`, **134 / 10,000 (1.34%)** — every instance
of that template. Sample: **S3/37**. Recorded separately from item 16, not merged.

*Items 2, 16 and 17 share a root cause worth stating once:*
`checkArabicNumberUnits` matches only *numeral → lexicon-unit* pairs across 21
words. It examines no case (إعراب), no definiteness and no verb agreement.

## 18. `HIDDEN_FRACTION_SEMANTIC_REVERSAL`
**PEDAGOGICAL_BLOCKER**
The reminder on all 197 `hiddenFraction` instances reads
`الكسر المجهول هو نسبة الناتج قبله إلى الناتج بعده` — *previous ÷ next*, which
yields the **denominator**. The fraction itself is *next ÷ previous*. The worked
steps reach the right answer by computing 2 and then naming ½, but the rule the
learner is told to remember is reversed. Published keys are correct; the
generalisation taught alongside them is not.

## 19. `QUICK_METHOD_NOT_GENERAL`
**PEDAGOGICAL_BLOCKER**
For the same direction, `fast_method` holds an instance computation rather than a
method — `"30 ÷ 15 = 2."`, `"144 ÷ 24 = 6."` — 67 distinct such strings in the
corpus. Every other family states a general rule in that field.

## 20. `RATIO_INVARIANT_ENFORCEMENT_ESCAPE`
**PRODUCTION_BLOCKER**
The `requireReduced` / `requireDistinctSides` invariants exist in
`src/qa/pedagogy.js` but are not declared on the second ratio of the chained
`ratios` templates. Verified independently over the corpus: **93 reducible**
parameter pairs and **85 equal-sided** pairs reach publication across 625 `ratios`
questions — e.g. `النسبة ب : ج = 6 : 2` (`RAT_M_COMMON_SUM`) and
`النسبة أ : ب = 2 : 4` (`RAT_M_COMMON_DIFF`). Distinct from ordinary ratio
correctness: every key is right, the printed ratio is simply not in lowest terms.

## 21. `VERSION_TRACEABILITY_MISMATCH`
**QA_OBSERVABILITY_BLOCKER**
`ENGINE_VERSION = '1.3.0'` (`src/index.js:25`), but the rendered report footer
prints `v1.2.0` (`report.js:34`) and the UI version pill shows `v1.2.0`
(`index.html:23`). Two hard-coded literals. The displayed version must eventually
derive from one authoritative source.

---

## Scope status

The RC2 scope is **ready to freeze**: 250/250 manual review is complete and no
further discovery round is outstanding. Nothing above has been implemented.
