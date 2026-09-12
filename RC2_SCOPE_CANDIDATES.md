# RC2 SCOPE — FINAL NUMBERED INVENTORY

Status: **log only. Nothing here is implemented.** RC1 remains frozen at
`7b5d4617295c98a8ed0f87d204f4745dd5db05dd`; production code is untouched.

Manual blind review of the frozen 250-question sample is complete (250/250).
This inventory is self-contained: every confirmed RC2 issue appears here
explicitly, with its own classification, rather than by cross-reference to a
narrative section. Evidence for each is in `MANUAL_REVIEW_RC1.md` and
`SIGNOFF_RC1.md`.

## Amendment history

| Version | Items | Change |
|---|---|---|
| `rc2-scope-frozen-v1` | 21 | initial freeze after the 250/250 review reconciliation |
| **`rc2-scope-frozen-v2`** | **23** | **formal amendment: adds RC2-022 and RC2-023**, two fingerprint-canonicalisation defects found by post-reconciliation inspection of the same frozen sample. Items RC2-001 to RC2-021 are unchanged in id, wording and classification. |

The amendment is **not** an unfinished family review. The RC1 manual review is
complete at 250/250; these two findings are a refinement of inspection over the
already-reviewed sample.

Classifications used: `PRODUCTION_BLOCKER`, `QA_OBSERVABILITY_BLOCKER`,
`PEDAGOGICAL_BLOCKER`, `LANGUAGE_BLOCKER`, `ACCESSIBILITY_BLOCKER`,
`STATISTICAL_LEAKAGE_RISK`, `QA_METRIC_DEFECT`. An item may carry more than one.

Machine-readable authority: **`RC2_SCOPE_FROZEN.json`** — same 21 items, same ids.
This document is the human-readable authority. The two must agree exactly.

---

## STANDING CONSTRAINT — `OBSERVE_NEVER_TARGET`

Applies to **RC2-001**, **RC2-010** and **RC2-011**, and to any future item about
the distribution of a published answer property.

> **A published answer property may be OBSERVED, measured and analysed.
> It must NEVER become a runtime target.**

Prohibited as an RC2 fix:

- answer-frequency balancing at runtime;
- target-answer sampling;
- retry-until-answer-distribution-matches;
- regeneration based on the current answer-value frequency;
- including, excluding, replacing or reordering a pedagogically valid distractor
  because doing so moves the key toward a desired numeric rank.

Permitted:

- measuring and reporting the distribution;
- changing the parameter space a template may draw from, so that the natural
  distribution improves.

This is the same architectural principle already established for numeric rank.
The easiest route to a flat statistic is to re-invent the chooser under another
name; that route is closed.

---

## RC2-001 · `RANK_DRIVEN_DISTRACTOR_SELECTION`
**PRODUCTION_BLOCKER · STATISTICAL_LEAKAGE_RISK**
`pickBalancedDistractors` (`src/utils.js:152-203`) draws a target rank from
`RANK_DRAW_WEIGHTS` and slices the below-key and above-key pools to land the key
there, excluding valid provenance-carrying distractors to do so.
*Constraint on remediation:* rank may be observed and analysed; it must never be a
runtime target. Evidence: `SIGNOFF_RC1.md` §5.

## RC2-002 · `AR_DEFINITE_PLURAL_BARE_NUMERAL`
**LANGUAGE_BLOCKER**
`فما متوسط القيم 9؟` — a definite plural followed by a bare numeral. 6 of 7
`averages` templates; **548 / 10,000** corpus, **13 / 250** sample.
Evidence: `SIGNOFF_RC1.md` §8.

## RC2-003 · `INCOMPLETE_REJECTION_TELEMETRY`
**QA_OBSERVABILITY_BLOCKER**
The reason-code histogram omits every rejection below the pipeline boundary — 135
ambiguity rejections inside the odd-one-out sampler were invisible. `src/index.js:202`
does not call `analytics.record`. `DISTRACTOR_IMPOSSIBLE` and `RETRY_EXHAUSTED`
are emitted nowhere. Evidence: `SIGNOFF_RC1.md` §2.

## RC2-004 · `SEED_REPRODUCIBILITY_QUALIFICATION`
**QA_OBSERVABILITY_BLOCKER**
Same seed reproduces only on a fresh engine; the recent-fingerprint cache changes
the result inside a long-lived instance (`src/index.js:87,314,354-356`).
Evidence: `SIGNOFF_RC1.md` §7.

## RC2-005 · `DEGENERACY_MODEL_COVERAGE_GAP`
**QA_OBSERVABILITY_BLOCKER**
23 of 107 templates declare no `wrongMethodValue`, so the 0% degenerate rate
covers only 79.3% of published questions. Evidence: `SIGNOFF_RC1.md` §6-B.

## RC2-006 · `PDF_VISUAL_ORDER_TEXT_LAYER`
**ACCESSIBILITY_BLOCKER**
The session PDFs store Arabic as presentation forms in visual order (~77.5% of
extracted Arabic characters); a literal search for a stem phrase returns **0 hits
in all five reports**. The v1.2.0 Latin-glyph corruption is absent and there are
no unmapped characters. Affects text search, copy-paste and screen readers, not
only auditing. Evidence: `audit-rc1/DELIVERY-MANIFEST.md`.

---

## RC2-007 · `AMBIGUITY_LONE_SIMPLE_RULE_NEVER_COMPETES`
**PRODUCTION_BLOCKER · PEDAGOGICAL_BLOCKER**
`checkOddOneOutAmbiguity` (`src/qa/ambiguity.js:103-113`) needs a *pair* of
complexity-≤3 rules with different outliers. When exactly one simple rule survives
the filter and it disagrees with the key, no pair forms and the verdict is
`ambiguous: false`. `supportsIntended` is then satisfied from the **unfiltered**
list, so a rule the checker itself calls too hard to see still certifies the item.
**S1/27** publishes key 75 and **S5/08** publishes key 30 while the only rule the
checker calls simple (`mult3`, complexity 1) points at **35** in both.

## RC2-008 · `AMBIGUITY_INVERSE_FRAMING_AND_MAGNITUDE_BLIND_SPOT`
**PRODUCTION_BLOCKER**
`findSingleOutlierRules` (`src/qa/ambiguity.js:84-92`) tests only
`failing.length === 1`. It never tests "exactly one **satisfies** P", and the rule
grammar contains no digit-magnitude class. 7 sample questions carry a coherent
competing class it cannot see (S3/27, S1/08, S4/21, S4/10, S2/07, S2/39, S3/13).

## RC2-009 · `UNDISCOVERABLE_INTENDED_RULE`
**PEDAGOGICAL_BLOCKER**
A template may publish a rule above the engine's own simplicity ceiling. On
**S5/46** the production checker reports *no* rule of complexity ≤ 3 fits the set;
primality, the natural reading, singles out two numbers, neither the key.
`ODD_H_PRIME_OFFSET`, `ODD_H_SQ_MINUS`.
*RC2 must eliminate AMBIGUOUS and UNDISCOVERABLE publication.*

## RC2-010 · `CONSTANT_ANSWER_TEMPLATE`
**PRODUCTION_BLOCKER · STATISTICAL_LEAKAGE_RISK**
`REL_H_POSITION_UNCERTAIN` answers `لا يمكن تحديده` in **91 / 91** corpus
instances and 5/5 in the sample. Entropy 0.00; +83.3 points over the 1/6
baseline. Unequivocal blocker. The keys are individually correct — the template
simply can never generate a determinate case.

## RC2-011 · `NARROW_ANSWER_VALUE_SPACE`
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

## RC2-012 · `GENERIC_KEY_NEIGHBOR_DISTRACTOR`
**PEDAGOGICAL_BLOCKER · STATISTICAL_LEAKAGE_RISK**
**193 of 1,250 wrong options (15.4%)** across the 250 are literally `key ± n`
carrying a registered `misconceptionId`. `OFF_BY_ONE_STEP` is used 272 times; 79
are genuinely justified, 193 are not. **S5/32** has four of five, giving options
{7, 7.2, 8, 9, 10, 11} with the key at the centre. One derivation is written
`8 ± 5`. The near-miss fallback the development round reported as deleted survived
under a label.

## RC2-013 · `MISATTRIBUTED_MISCONCEPTION_FEEDBACK`
**PRODUCTION_BLOCKER · PEDAGOGICAL_BLOCKER**
`USED_SUM_OF_SPEEDS_IN_CHASE` is applied **154 of 195** times to stems containing
no chase (`SPD_M_EQUAL_DIST`, `SPD_H_TIME_DIFF`). The candidate is told they made
an error the question cannot elicit; on S5/24 the same sentence is attached to a
harmonic-mean derivation.

## RC2-014 · `FEEDBACK_SPECIFICITY_METRIC_INVALID`
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

## RC2-015 · `DIFFICULTY_BAND_MISCALIBRATION`
**QA_METRIC_DEFECT**
118 / 250 (47.2%) declared-vs-computed mismatch, one-directional:
`Medium→Easy` = 0 and `Hard→Easy` = 0; declared Easy mismatches at 88.5%.
Manual assessment: **110 JUSTIFIED_MISMATCH · 3 UNCERTAIN · 5
MISCLASSIFIED_DIFFICULTY = 118.** `bandFor` (`src/qa/complexity.js:36`) uses
`≤4.5 → easy`, `≤9.5 → medium`. `complexity_band` currently carries no
information about the declared label and is blind to items 9 and 10.

## RC2-016 · `AR_DUAL_WRONG_CASE`
**LANGUAGE_BLOCKER**
Dual in the nominative where the genitive is required, plus verb non-agreement:
`إنجاز مهمتان` → `إنجاز مهمتين` (`WORK_E_VOLUME`, 37 / 10,000) and
`كل سنتيمتران تمثل` → `كل سنتيمترين يمثلان` (`PROP_M_MAP`, 23 / 10,000).
Sample: S2/24, S2/19.

## RC2-017 · `AR_DEFINITENESS_RENDERING`
**LANGUAGE_BLOCKER**
A definite adjective modifying an indefinite إضافة: `سعر سلعة المعلن 200 درهمًا`
→ `سعر السلعة المعلن`. `PL_M_DISC_MARK`, **134 / 10,000 (1.34%)** — every instance
of that template. Sample: **S3/37**. Recorded separately from item 16, not merged.

*Items 2, 16 and 17 share a root cause worth stating once:*
`checkArabicNumberUnits` matches only *numeral → lexicon-unit* pairs across 21
words. It examines no case (إعراب), no definiteness and no verb agreement.

## RC2-018 · `HIDDEN_FRACTION_SEMANTIC_REVERSAL`
**PEDAGOGICAL_BLOCKER**
The reminder on all 197 `hiddenFraction` instances reads
`الكسر المجهول هو نسبة الناتج قبله إلى الناتج بعده` — *previous ÷ next*, which
yields the **denominator**. The fraction itself is *next ÷ previous*. The worked
steps reach the right answer by computing 2 and then naming ½, but the rule the
learner is told to remember is reversed. Published keys are correct; the
generalisation taught alongside them is not.

## RC2-019 · `QUICK_METHOD_NOT_GENERAL`
**PEDAGOGICAL_BLOCKER**
For the same direction, `fast_method` holds an instance computation rather than a
method — `"30 ÷ 15 = 2."`, `"144 ÷ 24 = 6."` — 67 distinct such strings in the
corpus. Every other family states a general rule in that field.

## RC2-020 · `RATIO_INVARIANT_ENFORCEMENT_ESCAPE`
**PRODUCTION_BLOCKER**
The `requireReduced` / `requireDistinctSides` invariants exist in
`src/qa/pedagogy.js` but are not declared on the second ratio of the chained
`ratios` templates. Verified independently over the corpus: **93 reducible**
parameter pairs and **85 equal-sided** pairs reach publication across 625 `ratios`
questions — e.g. `النسبة ب : ج = 6 : 2` (`RAT_M_COMMON_SUM`) and
`النسبة أ : ب = 2 : 4` (`RAT_M_COMMON_DIFF`). Distinct from ordinary ratio
correctness: every key is right, the printed ratio is simply not in lowest terms.

## RC2-021 · `VERSION_TRACEABILITY_MISMATCH`
**QA_OBSERVABILITY_BLOCKER**
`ENGINE_VERSION = '1.3.0'` (`src/index.js:25`), but the rendered report footer
prints `v1.2.0` (`report.js:34`) and the UI version pill shows `v1.2.0`
(`index.html:23`). Two hard-coded literals. The displayed version must eventually
derive from one authoritative source.
## RC2-022 · `COMMUTATIVE_FINGERPRINT_CANONICALISATION_ESCAPE`
**PRODUCTION_BLOCKER · STATISTICAL_LEAKAGE_RISK**

A fingerprint carries a canonical `commutative.*` component *and* an
order-sensitive copy of the same information under `named.*`. The order-sensitive
copy defeats the canonicalisation, so two presentations of the same mathematical
instance hash differently and the session duplicate check does not fire.

**Frozen RC1 evidence — S2/07 and S2/39, both `ODD_M_PRIME2`, both in session S2:**

```
S2/07  commutative:{numberSet:[6,10,12,14,22,26]}   named:{numbers:[14,12,26,6,10,22], …}
S2/39  commutative:{numberSet:[6,10,12,14,22,26]}   named:{numbers:[12,10,26,22,14,6], …}
```

Same set `{6,10,12,14,22,26}`, same templateId, same intended rule, same outlier
`12`, same reasoning task. The canonical component is byte-identical; the full
fingerprints differ; the pair was published in one 50-question session.

**Measured scope.** 10 templates declare a non-empty `commutative` component —
7 in `odd_one_out`, 3 in `fractions`. Across the 10,000-question corpus there are
**326** semantic groups (template + canonical component + direction); **259 of
them (79.4%)** carry more than one distinct full fingerprint for the *same*
canonical value, producing **875 surplus fingerprints created by display order
alone**. `fractions` is affected identically:
`commutative:{denominators:[2,3,4]}` alongside `named:{denominators:[3,4,2]}` on
`FRAC_M_3`, where the fraction chain genuinely is commutative.

**Required remediation.** For structures declared mathematically commutative, a
second order-sensitive copy of the same semantic information must not change the
semantic fingerprint. Canonicalise family-specific commutative structures before
hashing: for odd-one-out the sorted number multiset; for fractions the
denominator multiset **only where the chain operation is genuinely commutative
for that template**.

**Do not globally sort every array.** Order must be preserved wherever it carries
mathematical or pedagogical meaning — `sequences.shownTerms`, `relational.edges`
and the staged-rate families depend on it. Audit every existing `commutative.*`
component and verify that no order-sensitive duplicate under `named.*` can defeat
it.

**Required tests.**
- MUST_REJECT as the same semantic instance within one session for
  `ODD_M_PRIME2`: `[14,12,26,6,10,22]` and `[12,10,26,22,14,6]`.
- MUST_ACCEPT as a different instance: the same rule class with a genuinely
  different number set.
- Permutation-invariance property test: for every permutation `P` of a
  commutative number set, `semanticFingerprint(P(set)) === semanticFingerprint(set)`.
  Display order in the rendered question may still differ.

## RC2-023 · `STRUCTURAL_SEQUENCE_REASONING_SIGNATURE_GAP`
**PRODUCTION_BLOCKER · STATISTICAL_LEAKAGE_RISK**

The instance fingerprint cannot detect a repeated *reasoning pattern*, because it
includes incidental values that do not alter the reasoning.

**Frozen RC1 evidence — S2/05 and S2/41, both `SEQ_M_ALT_OPS`, both in session S2:**

```
S2/05   7 → 11 → 22 → 27 → 81 → 87 → 348 → ?      firstTerm 7
S2/41   4 →  8 → 16 → 21 → 63 → 69 → 276 → ?      firstTerm 4

both:   ADD(4) MUL(2) ADD(5) MUL(3) ADD(6) MUL(4) ADD(7)
        addends [4,5,6,7]   multipliers [2,3,4]   askedUnknown nextTerm
```

The starting value changes; the reasoning experience does not. The fingerprints
differ only through `firstTerm` and the `shownTerms` that follow from it, so both
were published in one 50-question session.

**Measured scope.** Across the corpus `SEQ_M_ALT_OPS` produces **exactly 6
distinct operation patterns over all 70 questions** — three addend sets
(`[2,3,4,5]`, `[3,4,5,6]`, `[4,5,6,7]`) crossed with two multiplier sets
(`[2,3,4]`, `[3,4,5]`). Every one of the 70 shares its pattern with at least one
other question; the only further variation is `firstTerm`, which takes 5 or 6
values per pattern and changes no step of the reasoning.

**Required remediation.** Do **not** replace the instance fingerprint with an
abstract one. Maintain two distinct concepts:

1. **semantic / content fingerprint** — identifies the generated mathematical
   instance (what RC2-022 repairs);
2. **structural / reasoning signature** — identifies the reasoning pattern
   independently of incidental starting values.

For `SEQ_M_ALT_OPS` the structural signature must encode the operation chain —
conceptually `ADD(4) MUL(2) ADD(5) MUL(3) ADD(6) MUL(4) ADD(7)` — together with
family, templateId, askedUnknown and reasoning direction, and must exclude
`firstTerm` and the resulting `shownTerms` where they do not alter the operation
structure.

**Required session behaviour.** S2/05 and S2/41 must be recognised as
`SAME_REASONING_PATTERN` even though they are not the same numerical instance.
The reasoning pattern is **not** banned corpus-wide; the requirement is that the
same reasoning experience must not appear twice inside one practice or test
session merely because the starting number changed.

**Required tests.**
- MUST_REJECT within one session: same template, same askedUnknown, same exact
  operation pattern, differing only in the start term.
- MUST_ACCEPT: the same template with a genuinely different operation pattern.
- Different meaningful sequence rules must never be collapsed merely because
  their final numerical values happen to coincide.


---

## Scope status

The RC2 scope is **frozen at 23 items** (`rc2-scope-frozen-v2`): 250/250 manual
review is complete and no further discovery round is outstanding. RC2-022 and
RC2-023 were added by formal amendment, not silently appended — the version
marker, the amendment history above and the reconciliation checker all record the
change from 21 to 23. Nothing above has been implemented.
