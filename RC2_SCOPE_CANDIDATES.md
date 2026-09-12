# RC2 SCOPE — CANDIDATE LOG

Status: **log only. Nothing here is implemented.** RC1 remains frozen at
`7b5d4617295c98a8ed0f87d204f4745dd5db05dd`; production code is untouched.

This file exists so that one consolidated RC2 patch can be assembled once the
independent blind audit of the frozen 250-question sample returns. Items are
added as they are found and are not worked on until RC2 is authorised.

## Known from the RC1 sign-off round

| # | Item | Source | Evidence |
|---|---|---|---|
| 1 | Rank-driven distractor selection — `pickBalancedDistractors` includes/excludes valid, provenance-carrying distractors to place the key at a drawn rank | `SIGNOFF_RC1.md` §5 | `src/utils.js:152-203`, `src/qa/rank-calibration.js` |
| 2 | Arabic number/agreement coverage defect — definite plural followed by a bare numeral (`فما متوسط القيم 9؟`); 548 / 10,000 corpus questions, 6 of 7 `averages` templates; the validator covers only numeral→noun for 21 lexicon units | `SIGNOFF_RC1.md` §8 | `src/families/averages.js:38,90,192,241,296,345`; `src/arabic/units.js` |
| 3 | Incomplete rejection telemetry — the histogram omits every rejection below the pipeline boundary (135 ambiguity rejections inside the odd-one-out sampler were invisible); `DISTRACTOR_IMPOSSIBLE` and `RETRY_EXHAUSTED` are emitted nowhere | `SIGNOFF_RC1.md` §2 | `src/index.js:202` (no `analytics.record`), `src/qa/reasons.js` |
| 4 | Seeded reproducibility qualification — same seed reproduces only on a fresh engine; the recent-fingerprint cache changes the result inside a long-lived instance | `SIGNOFF_RC1.md` §7 | `src/index.js:87,314,354-356` |
| 5 | Incomplete degeneracy-model coverage — 23 of 107 templates declare no `wrongMethodValue`, so the 0% degenerate rate covers 79.3% of published questions | `SIGNOFF_RC1.md` §6-B | `src/families/{calendar,relational,odd_one_out}.js` |

## Found during blind-audit delivery

| # | Item | Detail |
|---|---|---|
| 6 | **PDF text layer stores Arabic as presentation forms in visual order** | The exported session reports embed 8 Type0 / Identity-H subset fonts with valid ToUnicode CMaps — extraction yields 0 unmapped characters and no Latin-glyph substitution, so the v1.2.0 corruption is absent. But ~77.5% of extracted Arabic characters are presentation forms (U+FB50–U+FEFF) in visual (reversed) order rather than base letters in logical order. A literal search for `متوسط القيم` returns **0 hits in all five PDFs**. **Impact is not limited to auditing: text search, copy-paste out of the PDF, and screen-reader output are all affected.** Measured by `tools/audit/pdf-text-probe.py`; per-report figures in `audit-rc1/DELIVERY-MANIFEST.md`. Not fixed; no production change made. |

## Found by the manual blind review of the frozen 250-question sample

Full evidence in `MANUAL_REVIEW_RC1.md`. Logged only; nothing implemented.

| # | Item | Scope | Detail |
|---|---|---|---|
| 7 | `AMBIGUITY_LONE_SIMPLE_RULE_NEVER_COMPETES` — the ambiguity check needs a *pair* of simple rules with different outliers, so a single simple rule disagreeing with the key cannot reject the item; `supportsIntended` is then satisfied from the unfiltered list | 2 of 3 `ODD_H_SQ_MINUS` in the sample | `src/qa/ambiguity.js:103-113` — S1/27 and S5/08 publish keys 75 and 30 while the only rule the checker calls simple points at 35 |
| 8 | `AMBIGUITY_INVERSE_FRAMING_AND_MAGNITUDE_BLIND_SPOT` — only "all but one fails" is tested, never "only one satisfies"; no digit-magnitude class in the grammar | 7 sample questions | `src/qa/ambiguity.js:84-92` |
| 9 | `UNDISCOVERABLE_INTENDED_RULE` — a template may publish a rule above the engine's own simplicity ceiling | `ODD_H_PRIME_OFFSET`, `ODD_H_SQ_MINUS` | S5/46: the production checker reports *no* simple rule exists for that set |
| 10 | `CONSTANT_ANSWER_TEMPLATE` — every instance answers `لا يمكن تحديده` | `REL_H_POSITION_UNCERTAIN`, **91/91** corpus, 5/5 sample | the most exploitable leak found; Hard band |
| 11 | `NARROW_ANSWER_VALUE_SPACE` — ≤4 distinct answers over ~100 instances | 8 templates incl. Hard (`COMB_H_STAGED` 3 values, `SPD_H_TIME_DIFF` 4) | picking the modal value beats chance by up to 27 points |
| 12 | `GENERIC_KEY_NEIGHBOR_DISTRACTOR` — `key ± n` accepted because it carries a registered misconception id | **193 / 1,250 wrong options (15.4%)**; 193 of 272 `OFF_BY_ONE_STEP` uses | S5/32 has 4 of 5; the near-miss fallback survived under a label |
| 13 | `MISATTRIBUTED_MISCONCEPTION_FEEDBACK` — feedback describes an error the stem cannot elicit | `USED_SUM_OF_SPEEDS_IN_CHASE` on **154/195** non-chase stems | `SPD_M_EQUAL_DIST`, `SPD_H_TIME_DIFF` |
| 14 | `FEEDBACK_SPECIFICITY_OVERSTATED` — the reported 100% counted the derivation prefix | **22.6%** of wrong options share an explanatory sentence; 61.2% of questions affected | measurement + `src/qa/misconceptions.js` |
| 15 | `DIFFICULTY_BAND_MISCALIBRATION` — 47.2% declared-vs-computed mismatch, one-directional (`Medium→Easy` = 0, `Hard→Easy` = 0); declared Easy mismatches 88.5% | all 250 | `src/qa/complexity.js:36` — `complexity_band` unusable as a QA signal |
| 16 | `AR_DUAL_WRONG_CASE` — dual in the nominative where the genitive is required, plus verb non-agreement | `إنجاز مهمتان` 37/10k (`WORK_E_VOLUME`), `كل سنتيمتران تمثل` 23/10k (`PROP_M_MAP`) | the validator checks no case at all, only numeral→unit over 21 words |

## Pending

The RC2 scope is now frozen pending your decision. 250/250 manual review is
complete; no further discovery round is outstanding.
