# RC1 SIGN-OFF VALIDATION PACKAGE

Engine: Numerical Question Generator Engine v1.3.0
Branch: `claude/numerical-generator-upgrade-b3fc8s`
Baseline: `b8f7a60` — the upload `numerical_generator_engine_v1_2_1_vercel_ready.zip`

**Scope of this round.** Nothing under `src/`, `app.js`, `report.js`, `index.html`,
`styles.css`, `question.schema.json`, `generator_manifest.json` or `vercel.json` was
changed. The only additions are the two test files item 3 and item 5 explicitly
authorise, the audit tooling that produced the evidence, the evidence itself, and
the two `package.json` script lines that wire the new tests into CI. Every defect
found below is reported, not fixed.

---

## 1. Frozen commit and the 250-question audit sample

**Frozen commit: `7b5d4617295c98a8ed0f87d204f4745dd5db05dd`** (short `7b5d461`).

At the moment of freezing the working tree was clean. Production code is still
byte-identical to that commit; `git diff 7b5d461 -- src app.js report.js index.html
styles.css question.schema.json generator_manifest.json vercel.json` is empty.

250 questions were generated from seed `AUDIT-2026-09-12-A` as five independent
50-question sessions through the unmodified RC1 pipeline — no filtering, no
regeneration, no selection.

| Session | Kind | Seed | Valid | Errors | Warnings | Diversity warnings | Distinct templateIds |
|---|---|---|---|---|---|---|---|
| S1 | Mixed | `AUDIT-2026-09-12-A\|S1` | yes | 0 | 0 | 0 | 45 |
| S2 | Mixed | `AUDIT-2026-09-12-A\|S2` | yes | 0 | 0 | 0 | 41 |
| S3 | Mixed | `AUDIT-2026-09-12-A\|S3` | yes | 0 | 0 | 0 | 42 |
| S4 | Mixed | `AUDIT-2026-09-12-A\|S4` | yes | 0 | 0 | 0 | 45 |
| S5 | All-Hard | `AUDIT-2026-09-12-A\|S5` | yes | 0 | 0 | 0 | 31 |

Deliverables in `audit-rc1/`:

| File | Contents |
|---|---|
| `session-S1..S5-*.pdf` | The five session reports, rendered through the **unmodified `report.js`** — the same `buildPrintReportHtml` the app's v1.2.x PDF export calls. The session object is built exactly as `app.js finishSession()` builds it, with no answers recorded. |
| `session-S1..S5-*.html` | The HTML the PDFs were printed from, so the rendering can be re-checked. |
| `audit-sample.jsonl` | 250 records: full question object, six options, published key, family, templateId, difficulty, explanation, and `metadata.options_meta` (per-option `misconceptionId` + `derivation`) plus `explanation.distractor_analysis` (per-option feedback). |
| `audit-index.json` | Per-session validation output and the engine analytics for the run. |

The sample was used for measurement only. It was not fed back into calibration,
sampling, or any threshold.

---

## 2. Reason-code histogram, and why the reject rate is 0.19%

Raw histogram from `qa-artifacts/run.json` (the frozen 10,000-question corpus plus
100 all-hard sessions of 50 — 19,385 candidates in total):

| Reason code | Count |
|---|---|
| `DISTRACTOR_NO_MISCONCEPTION` | 36 |
| *every other code* | **0** |

candidates 19,385 · accepted 19,349 · rejected 36 · reject rate 0.1857% ·
average attempts per published 1.0019 · p95 attempts 1 · retry exhaustion 0.

You were right to treat that as needing explanation rather than celebration. Three
separate things are going on, and only the first is good news.

### 2-A. The analytics boundary hides most of the rejection work

`this.analytics.record(...)` is called in exactly two places in `src/index.js`: after
`finalizeQuestion` throws (line 211) and after `validateCandidate` returns (line 217).
It is **not** called in the `catch` around the family generator itself (line 202),
and it cannot see anything a sampler rejects internally before it ever returns a
candidate. So the histogram counts rejections at the *pipeline* boundary only.

To measure what sits below it I rebuilt the frozen commit into an instrumented copy
(`git archive HEAD`, four counters added, nothing else), replayed the identical
corpus seeds, and confirmed the replay reproduces the frozen corpus **byte for byte
except the wall-clock `generation_ms` field** — so the counts below are valid for the
frozen build. Evidence: `audit-rc1/instrumented-replay.json`.

| Measured on the instrumented replay | Value |
|---|---|
| `verdict()` calls across the run | 135,443 |
| `verdict()` calls that carried **any** reason code | **0** |
| `runOracle` invocations | 19,349 |
| `runOracle` invocations where the oracle did **not** run | **0** |
| Generator-level throws (invisible to the histogram) | 0 |
| `finalizeQuestion` throws | 36 (`DISTRACTOR_NO_MISCONCEPTION`) |
| odd-one-out sampler draws | 1,256 |
| odd-one-out draws **resampled by the ambiguity sweep** | **135 (10.7%)** |

So the true rejection picture is: 36 rejections visible to the histogram, plus 135
ambiguity rejections that happen inside `odd_one_out.js attempt()` and never reach
the analytics at all. The reported 0.19% is arithmetically correct for what it
measures and **understates total rejection work**. That is a reporting defect, not a
correctness one, but it is a defect: a reader of `run.json` cannot see that the
ambiguity validator is the single busiest check in the system.

### 2-B. Per-validator classification

Every code that fired zero times, classified as you asked. "Prevented by
construction" means the emitting branch is unreachable given how the producing code
builds its input; "test-only" means the underlying check is exercised by the suite
but never by production data; "dead" means no code path emits it at all.

| Reason code | Production firings | Classification | Evidence |
|---|---|---|---|
| `DISTRACTOR_NO_MISCONCEPTION` | 36 | **fires in production** | `src/utils.js:103`; also asserted in `fault-injection.test.mjs` |
| `AMBIGUOUS_ODD_ONE_OUT` | 0 in histogram, **135 below it** | **fires in production, below the analytics boundary** | `odd_one_out.js:108` + instrumented count; MUST_REJECT/MUST_ACCEPT pair in `regression.test.mjs:241-266` |
| `ORACLE_DISAGREEMENT` | 0 | test-only | 16 family cases in `fault-injection.test.mjs` + 20 in `parameter-mapping-injection.test.mjs` (item 3) |
| `ORACLE_NO_SOLUTION` | 0 | test-only | same suites |
| `ORACLE_NON_UNIQUE` | 0 | **possibly unreachable in practice** — needs a declared domain holding two distinct satisfying values. No test drives it; no corpus item reached it. `pipeline.js:122` |
| `TEXT_PARAM_MISMATCH` | 0 | test-only | `regression.test.mjs:288` MUST_REJECT + 297 MUST_ACCEPT |
| `DEGENERATE_WRONG_METHOD_EQUALS_KEY` | 0 | test-only | `regression.test.mjs:158/179/199` with MUST_ACCEPT counterparts |
| `DEGENERATE_PARAMETERS` | 0 | test-only | `regression.test.mjs:199/210` |
| `REDUCIBLE_RATIO`, `EQUAL_RATIO_SIDES` | 0 | test-only | `regression.test.mjs:142-156` |
| `UNREALISTIC_AGE` | 0 | test-only | `regression.test.mjs:221-239` |
| `EXPLANATION_EQUATION_FAILURE` | 0 | test-only | `regression.test.mjs:95` + fault injection |
| `EXPLANATION_UNSOURCED_VALUE` | 0 | test-only | `regression.test.mjs:102/128` |
| `INTERMEDIATE_ROUNDING` | 0 | test-only | `regression.test.mjs:89` |
| `NO_CORRECT_OPTION`, `MULTIPLE_CORRECT_OPTIONS` | 0 | prevented by construction **and** independently re-verified — see item 10 | `makeOptionSet` rejects any distractor whose formatted string equals the key's, so a duplicate key cannot be built |
| `INVALID_ARABIC_NUMBER_UNIT` | 0 | prevented by construction; the check itself is tested | `tools/check-manual-units.mjs` is a build gate that forbids hand-joining a numeral to a lexicon unit anywhere in `src/families/`, so every count reaches its noun through `formatNumberWithUnit`. MUST_REJECT/MUST_ACCEPT pair at `regression.test.mjs:307-320`. **See item 8 for how narrow this validator's scope actually is.** |
| `DUPLICATE_FINGERPRINT`, `TEMPLATE_OVERUSE` | 0 | **structurally cannot appear in this histogram** — they are emitted by `validateBatch` / `generatePractice` (`index.js:342/417/428`), not by `validateCandidate`. Session-level measurement: 0 duplicates and 0 `TEMPLATE_OVERUSE` warnings across the 100 hard sessions and the 5 audit sessions |
| 8 structural codes (`OPTIONS_MUST_HAVE_A_TO_F`, `OPTIONS_MUST_BE_UNIQUE`, `INVALID_CORRECT_OPTION`, `CORRECT_VALUE_MISMATCH`, `MISSING_QUESTION`, `MISSING_HOW_TO_START`, `MISSING_STEPS`, `MISSING_REMEMBER`, `INVALID_DIFFICULTY`) | 0 | prevented by construction, **and not referenced by any test** | `utils.js:338-352`. `makeOptionSet` always emits A–F with unique formatted values and `finalizeQuestion` always sets a difficulty from the allowed set, so these cannot fire unless that construction breaks — and if it did break, no test would catch it first |
| `DISTRACTOR_IMPOSSIBLE` | 0 | **dead code** — declared in `reasons.js`, emitted nowhere | grep over `src/`: zero emission sites |
| `RETRY_EXHAUSTED` | 0 | **dead code** — exhaustion throws `code: 'QUESTION_GENERATION_EXHAUSTED'` instead, never this reason | grep over `src/`: zero emission sites |

### 2-C. What this means

The low reject rate is genuine for the checks the pipeline runs, and it is the
expected consequence of the design decision taken in the development round: when a
validator kept firing, the *sampler* was fixed rather than the validator relaxed. A
sampler that no longer proposes invalid candidates is why nothing is rejected.

But a reject rate of 0.19% also means **17 of the 30 reason codes have no production
evidence whatsoever**, 13 of them have no test evidence either, and 2 are dead. The
fault-injection suites are, for most of the pipeline, the *only* thing standing
between a future regression and a silently published defect.

---

## 3. ORACLE_DISAGREEMENT count, and what the new injection tests mutate

**Exact count over the frozen 10,000-question corpus: 0.**
**Over the 250-question audit sample: 0.**

That figure is not taken from the engine's own analytics. It is recomputed from
outside by `tools/audit/verify-corpus.mjs`, which for each published question
rebuilds the pre-shuffle candidate from its recorded seed, re-runs `runOracle` over
the statement, and compares. Coverage is total: the oracle ran on **10,000 of 10,000**
corpus items and **250 of 250** audit items — no template silently skips it. Raw
output: `audit-rc1/verification.json`.

You are right that zero proves nothing on its own. New test file
`tests/parameter-mapping-injection.test.mjs` (20 tests, test-only, no production
change) corrupts the parameter-to-solver mapping rather than the published key.

### The four structurally distinct families

Every case leaves the rendered stem, the oracle specification and the parameter
*values* exactly as generated, and changes only which parameter the **solver**
consumes for which role. The key that results is whatever that mis-wiring genuinely
computes — never a hand-picked number.

| # | Family (structure) | Exactly what was mutated | Caught by |
|---|---|---|---|
| 1 | `direct_proportion` (arithmetic / proportion) | The exported symbolic `solve(params, askedUnknown)` is called with `baseCount` and `targetCount` transposed. On `PROP_M_RECIPE` with `askedUnknown=scaledOutput`, `solve({baseCount:16, targetCount:8})` instead of `{baseCount:8, targetCount:16}` turned key **10 into 2.5** | `ORACLE_DISAGREEMENT`, `ORACLE_NO_SOLUTION` |
| 2 | `calendar` (temporal) | `CAL_H_NESTED` computes `netOffset = 1 + N − M`. The solver is handed N and M from each other's slots: `1 + 2 − 4 = −1` instead of `1 + 4 − 2 = 3`. The arithmetic is correct; only the wiring is wrong. Key **الجمعة became الثلاثاء** | `ORACLE_DISAGREEMENT` (the exhaustive 7-day sweep) |
| 3 | `relational` (relational) | The statements are printed as generated, but the solver binds two participants to each other's graph nodes when building the ordering — so it derives a perfectly consistent total order over the wrong people. On `REL_E_BETWEEN`, position 4 key **راشد became ماجد** | `ORACLE_DISAGREEMENT` (linear-extension enumeration) |
| 4 | `odd_one_out` (rule-based) | The intruder index is read off by one over the generated set `[216, 95, 343, 27, 125, 64]`, so the key names a member that satisfies the rule. Key **95 became 216** | `ORACLE_DISAGREEMENT` (approved-rule sweep) |

### The same mis-wiring swept across all 16 families

A second instance of the *same template* is generated and its solved key is handed to
this instance — exactly what a solver caching or indexing bug does. All 16 families
are covered; every case is caught. Representative rows:

| Family / template | Mutation | Key before → after | Caught by |
|---|---|---|---|
| `sequences/SEQ_M_ALT_OPS` | sibling parameters `{firstTerm:5, firstAddend:2, …}` for `{firstTerm:4, firstAddend:4, …}` | 283 → 225 | `ORACLE_DISAGREEMENT`, `ORACLE_NO_SOLUTION` |
| `averages/AVG_M_ADD_PAIR` | `{count:7, average:19, pairAverage:28}` for `{count:7, average:22, pairAverage:31}` | 24 → 21 | `ORACLE_DISAGREEMENT`, `ORACLE_NO_SOLUTION` |
| `percentages/PCT_M_REMAIN` | `{firstPercent:40, secondPercent:25}` for `{25, 20}` | 60 → 45 | `ORACLE_DISAGREEMENT`, `ORACLE_NO_SOLUTION` |
| `work_time/WORK_M_EFF` | `{days:15, efficiencyPercent:25}` for `{days:12, efficiencyPercent:50}` | 8 → 12 | `ORACLE_DISAGREEMENT`, `ORACLE_NO_SOLUTION` |
| `fractions/FRAC_M_3` | a `startNumber` instance's parameters fed to a `hiddenFraction` instance | 360 → السُدس | `ORACLE_DISAGREEMENT`, `ORACLE_NO_SOLUTION` |
| `profit_loss/PL_M_DISC_MARK` | `{listPrice:400, discountPercent:25}` for `{240, 20}` | 240 → 375 | `ORACLE_DISAGREEMENT` |

Every test also asserts MUST_ACCEPT — the untouched item passes the whole pipeline —
so none of them is passed by an implementation that rejects everything.

Full suite after the additions: **112 tests, 112 pass, 0 fail.**

---

## 4. Per-template key accuracy against the independent oracle

All 107 templateIds, measured over the frozen 10,000-question corpus by
`tools/audit/verify-corpus.mjs`. "Correct" means: rebuild the candidate from its
seed, run the independent oracle over the statement, locate the oracle's answer among
the six published letters, and find exactly one carrier which is the published key.

Summary: **107 templates, 10,000 questions, 10,000 agreements, 0 disagreements,
0 templates with zero or multiple correct options, 0 flagged.**
Smallest exposure **N = 48** (`REL_H_POSITION_UNCERTAIN`), largest **N = 249**
(`ODD_E_MULT`); **no template is below 30**, so no cell here is a small-sample 100%.

| Family | TemplateId | N generated | Correct vs oracle | Accuracy | Flags |
|---|---|---|---|---|---|
| ages | AGE_E_MULT_DIFF | 109 | 109 | 100.00% | — |
| ages | AGE_E_SUM_DIFF | 97 | 97 | 100.00% | — |
| ages | AGE_H_PAST_FUT | 99 | 99 | 100.00% | — |
| ages | AGE_H_TWO_TIME | 75 | 75 | 100.00% | — |
| ages | AGE_M_FUT_RATIO | 74 | 74 | 100.00% | — |
| ages | AGE_M_FUT_SUM_DIFF | 84 | 84 | 100.00% | — |
| ages | AGE_M_RATIO_FUT_SUM | 87 | 87 | 100.00% | — |
| averages | AVG_E_ADD | 110 | 110 | 100.00% | — |
| averages | AVG_E_REMOVE | 84 | 84 | 100.00% | — |
| averages | AVG_H_COMB_ADD | 81 | 81 | 100.00% | — |
| averages | AVG_H_TARGET | 101 | 101 | 100.00% | — |
| averages | AVG_M_ADD_PAIR | 87 | 87 | 100.00% | — |
| averages | AVG_M_COMBINE | 85 | 85 | 100.00% | — |
| averages | AVG_M_REPLACE | 77 | 77 | 100.00% | — |
| calendar | CAL_E_AFTER | 111 | 111 | 100.00% | — |
| calendar | CAL_E_TOM | 89 | 89 | 100.00% | — |
| calendar | CAL_H_LONG | 97 | 97 | 100.00% | — |
| calendar | CAL_H_NESTED | 84 | 84 | 100.00% | — |
| calendar | CAL_M_COMPOUND | 110 | 110 | 100.00% | — |
| calendar | CAL_M_TWO_SHIFT | 134 | 134 | 100.00% | — |
| combined_rate | COMB_E_OUTPUT | 106 | 106 | 100.00% | — |
| combined_rate | COMB_E_TIME | 86 | 86 | 100.00% | — |
| combined_rate | COMB_H_STAGED | 89 | 89 | 100.00% | — |
| combined_rate | COMB_H_THREE | 93 | 93 | 100.00% | — |
| combined_rate | COMB_M_SOLO_THEN | 122 | 122 | 100.00% | — |
| combined_rate | COMB_M_TOGETHER_SOLO | 129 | 129 | 100.00% | — |
| direct_proportion | PROP_E_COST | 105 | 105 | 100.00% | — |
| direct_proportion | PROP_E_ITEMS | 80 | 80 | 100.00% | — |
| direct_proportion | PROP_H_COMPOUND | 104 | 104 | 100.00% | — |
| direct_proportion | PROP_H_COST_PLUS | 84 | 84 | 100.00% | — |
| direct_proportion | PROP_M_FRAC_UNIT | 86 | 86 | 100.00% | — |
| direct_proportion | PROP_M_MAP | 83 | 83 | 100.00% | — |
| direct_proportion | PROP_M_RECIPE | 83 | 83 | 100.00% | — |
| fractions | FRAC_E_2 | 196 | 196 | 100.00% | — |
| fractions | FRAC_H_4 | 180 | 180 | 100.00% | — |
| fractions | FRAC_M_3 | 249 | 249 | 100.00% | — |
| machines | MACH_E_HOURS | 79 | 79 | 100.00% | — |
| machines | MACH_E_REQUIRED | 113 | 113 | 100.00% | — |
| machines | MACH_H_STAGE_UP | 93 | 93 | 100.00% | — |
| machines | MACH_H_TWO_TYPES | 93 | 93 | 100.00% | — |
| machines | MACH_M_NEW_FAST | 87 | 87 | 100.00% | — |
| machines | MACH_M_STOP | 75 | 75 | 100.00% | — |
| machines | MACH_M_SUBSET_UP | 85 | 85 | 100.00% | — |
| odd_one_out | ODD_E_MULT | 83 | 83 | 100.00% | — |
| odd_one_out | ODD_E_SQUARES | 107 | 107 | 100.00% | — |
| odd_one_out | ODD_H_PRIME_OFFSET | 76 | 76 | 100.00% | — |
| odd_one_out | ODD_H_SQ_MINUS | 103 | 103 | 100.00% | — |
| odd_one_out | ODD_M_CUBES | 75 | 75 | 100.00% | — |
| odd_one_out | ODD_M_PRIME2 | 90 | 90 | 100.00% | — |
| odd_one_out | ODD_M_PRONIC | 91 | 91 | 100.00% | — |
| percentages | PCT_E_OF | 86 | 86 | 100.00% | — |
| percentages | PCT_E_REVERSE_ONE | 108 | 108 | 100.00% | — |
| percentages | PCT_H_CHAIN_VALUE | 99 | 99 | 100.00% | — |
| percentages | PCT_H_REVERSE_CHAIN | 91 | 91 | 100.00% | — |
| percentages | PCT_M_REMAIN | 85 | 85 | 100.00% | — |
| percentages | PCT_M_SUCCESSIVE | 70 | 70 | 100.00% | — |
| percentages | PCT_M_UNIT_PRICE | 86 | 86 | 100.00% | — |
| profit_loss | PL_E_LOSS | 104 | 104 | 100.00% | — |
| profit_loss | PL_E_PROFIT | 92 | 92 | 100.00% | — |
| profit_loss | PL_H_CHAIN | 94 | 94 | 100.00% | — |
| profit_loss | PL_H_REVERSE | 87 | 87 | 100.00% | — |
| profit_loss | PL_M_DISC_MARK | 134 | 134 | 100.00% | — |
| profit_loss | PL_M_TOTAL_COST | 114 | 114 | 100.00% | — |
| ratios | RAT_E_KNOWN | 114 | 114 | 100.00% | — |
| ratios | RAT_E_SPLIT | 84 | 84 | 100.00% | — |
| ratios | RAT_H_TRANSFER | 111 | 111 | 100.00% | — |
| ratios | RAT_H_TWO_COMB | 74 | 74 | 100.00% | — |
| ratios | RAT_M_ADD_SIDE | 85 | 85 | 100.00% | — |
| ratios | RAT_M_COMMON_DIFF | 75 | 75 | 100.00% | — |
| ratios | RAT_M_COMMON_SUM | 82 | 82 | 100.00% | — |
| relational | REL_E_BETWEEN | 94 | 94 | 100.00% | — |
| relational | REL_E_CHAIN | 99 | 99 | 100.00% | — |
| relational | REL_H_GUARANTEE | 89 | 89 | 100.00% | — |
| relational | REL_H_POSITION_UNCERTAIN | 91 | 91 | 100.00% | — |
| relational | REL_M_BRANCH_UNRES | 95 | 95 | 100.00% | — |
| relational | REL_M_CONFIRM | 79 | 79 | 100.00% | — |
| relational | REL_M_COUNT | 78 | 78 | 100.00% | — |
| sequences | SEQ_E_ARITH | 79 | 79 | 100.00% | — |
| sequences | SEQ_E_GEO | 110 | 110 | 100.00% | — |
| sequences | SEQ_H_ALT_DIV | 57 | 57 | 100.00% | — |
| sequences | SEQ_H_POW_INDEX | 70 | 70 | 100.00% | — |
| sequences | SEQ_H_RECURRENCE | 53 | 53 | 100.00% | — |
| sequences | SEQ_M_ALT_OPS | 70 | 70 | 100.00% | — |
| sequences | SEQ_M_DOUBLE_DIFF | 59 | 59 | 100.00% | — |
| sequences | SEQ_M_INC_DIFF | 53 | 53 | 100.00% | — |
| sequences | SEQ_M_INTERLEAVED | 74 | 74 | 100.00% | — |
| speed | SPD_E_DISTANCE | 91 | 91 | 100.00% | — |
| speed | SPD_E_TIME | 97 | 97 | 100.00% | — |
| speed | SPD_H_CATCH | 57 | 57 | 100.00% | — |
| speed | SPD_H_MEET_DELAY | 48 | 48 | 100.00% | — |
| speed | SPD_H_TIME_DIFF | 73 | 73 | 100.00% | — |
| speed | SPD_M_AVG | 75 | 75 | 100.00% | — |
| speed | SPD_M_EQUAL_DIST | 81 | 81 | 100.00% | — |
| speed | SPD_M_TWO_TIME | 103 | 103 | 100.00% | — |
| unit_rate | RATE_E_DIRECT | 75 | 75 | 100.00% | — |
| unit_rate | RATE_E_TIME | 120 | 120 | 100.00% | — |
| unit_rate | RATE_H_TARGET | 95 | 95 | 100.00% | — |
| unit_rate | RATE_H_TWO_PHASE | 89 | 89 | 100.00% | — |
| unit_rate | RATE_M_PERCENT | 146 | 146 | 100.00% | — |
| unit_rate | RATE_M_SCALE | 100 | 100 | 100.00% | — |
| work_time | WORK_E_INVERSE | 102 | 102 | 100.00% | — |
| work_time | WORK_E_VOLUME | 97 | 97 | 100.00% | — |
| work_time | WORK_H_TWO_STAGE | 82 | 82 | 100.00% | — |
| work_time | WORK_H_WORKERS_EFF | 97 | 97 | 100.00% | — |
| work_time | WORK_M_CHANGE | 81 | 81 | 100.00% | — |
| work_time | WORK_M_EFF | 90 | 90 | 100.00% | — |
| work_time | WORK_M_TARGET | 76 | 76 | 100.00% | — |

No template shows oracle disagreement, zero or multiple correct options, or
insufficient exposure. The same recomputation over the 250-question audit sample
covers 99 of the 107 templates (the 8 absent ones simply did not come up in 250
draws) with the same result: 250/250.
---

## 5. Rank calibration — **SIGN-OFF BLOCKER**

> *"Does the production engine ever include, exclude, replace, or reorder a valid
> distractor because doing so moves the correct answer toward a desired numeric
> rank?"*

**Yes. It excludes and includes valid distractors on exactly that basis, at runtime,
on every question that has error paths on both sides of the key.** Per your
instruction, RC1 has not been modified; this is reported as a sign-off blocker.

### The mechanism, in full

`tools/calibrate-rank.mjs` probes every template for the range of key positions its
real error paths can reach, fits draw weights by iterative proportional fitting so
the *corpus-wide* distribution comes out flat, and writes them to
`src/qa/rank-calibration.js`:

```js
export const RANK_DRAW_WEIGHTS = [1.0702, 0.3862, 0.2171, 0.2769, 0.8765, 3.1731];
```

`--refine` then corrects those weights against corpora that were actually produced.
The committed weights were refined on 2026-09-12 against 34,168 published questions
from four seeds.

The runtime logic that consumes them is `pickBalancedDistractors` in `src/utils.js`
(lines 152-203), called by `makeOptionSet` on every question:

```js
const minBelow = Math.max(0, 5 - shuffledAbove.length);
const maxBelow = Math.min(5, shuffledBelow.length);
out.feasibleRankRange = [Math.min(minBelow, maxBelow) + 1, Math.max(minBelow, maxBelow) + 1];
const wantBelow = minBelow >= maxBelow ? minBelow : drawRankPosition(rng, minBelow, maxBelow);
const wantAbove = Math.min(shuffledAbove.length, 5 - wantBelow);
...
const picked = [...belowPool.slice(0, wantBelow), ...abovePool.slice(0, wantAbove)];
```

`drawRankPosition` is a weighted draw over `RANK_DRAW_WEIGHTS`, clamped to what this
instance can supply. `wantBelow` **is** the key's target rank minus one. The two
`slice` calls then decide **which** of the available distractors are shown and which
are dropped, in order to land the key at that rank.

### Why this is a blocker under your rule

The pool is always genuine: `makeOptionSet` has already discarded anything without a
`misconceptionId` in the registry, and throws `DISTRACTOR_NO_MISCONCEPTION` rather
than padding. Nothing is invented, nothing is fabricated, and any distractor in the
pool may be shown. The choice is made among interchangeable, pedagogically valid
candidates.

But your rule does not turn on whether the distractor is genuine. It turns on
*why* it is included or excluded — and here the reason is the desired numeric rank.
Concretely, on a template with 4 below-key and 4 above-key error paths, a draw of
`wantBelow = 1` **excludes three valid below-key distractors** solely so the key lands
at rank 2. That is the prohibited behaviour, stated plainly.

You permitted statistical balancing to influence *parameter sampling or candidate
generation*. This mechanism influences neither: it acts strictly at display
selection, after the candidates exist. It falls on the wrong side of the line you
drew.

### A second, separate selection mechanism, disclosed for completeness

Lines 186-203 of the same function re-shuffle the selection up to 12 times to avoid
`hasLoneRoundNumber` — a shape cue where exactly one of the six values is a multiple
of five. This also swaps which valid distractors are displayed, but it is not
rank-driven and is not what item 5 asks about. It is disclosed here because it is the
same kind of act (selection among valid distractors for a presentational reason) and
you should rule on it too.

### What this cost the engine, for context on the trade-off

Before this mechanism existed the key's numeric rank had χ² = 3,627 against uniform
and 8 of 10 guessing strategies beat chance by more than 2 SE. After it: χ² = 4.57
and 0 of 10. Removing the mechanism without replacing it would reopen a real,
measured guessability leak. Two directions that keep the statistic and respect your
rule — for your decision, not implemented now:

1. Move the balancing into **parameter sampling**: choose parameters whose error
   paths naturally place the key where the corpus needs it, and then show all five
   distractors the template produced. This is explicitly permitted by your wording.
2. Keep the rank-draw but make it **select nothing** — draw the rank, and if the
   instance cannot reach it with the distractors it has, resample the whole
   candidate rather than trimming the option set.

### CI guard for stale calibration (added, as item 5 permits)

`tests/rank-calibration-guard.test.mjs` + `tools/audit/rank-inventory.mjs` +
`qa-artifacts/rank-calibration-inventory.json`. The snapshot records the SHA-256 of
the template inventory the weights were fitted to — every `(family, difficulty,
templateId)` cell *and* the feasible rank range each one reaches (107 cells today).
Four tests:

- the snapshot's weights digest matches the committed `RANK_DRAW_WEIGHTS`;
- the live inventory digest matches the snapshot — on mismatch the failure names the
  templates added, removed, and whose feasible range moved, and prints the two
  commands that regenerate both files together;
- a dropped template changes the digest (the guard can fail);
- a shifted feasible range changes the digest (the guard can fail).

Wired into `npm test` and `npm run qa`; the snapshot regenerates with
`npm run qa:rank-snapshot`. This is test-and-tooling only — no production behaviour
changed.

---

## 6. The missing metrics

All recomputed from raw data by `tools/audit/signoff-metrics.mjs` and
`tools/audit/verify-corpus.mjs`; outputs in `audit-rc1/signoff-metrics.json` and
`audit-rc1/verification.json`.

### 6-A. Ambiguity rate

| Measure | Value |
|---|---|
| Published questions carrying a competing-rule ambiguity (10,000 corpus) | **0** |
| Published questions carrying one (250 audit sample) | **0** |
| odd-one-out sets **drawn** by the sampler | 1,256 |
| odd-one-out sets **rejected as ambiguous** before publication | **135 — 10.75% of draws** |

The published rate is zero because the sampler resamples; the pre-publication rate is
10.75%, which is the ambiguity validator doing real and continuous work. Only the
first figure was visible in the previous report — see 2-A.

### 6-B. Degenerate published-question rate

| Measure | Corpus (10,000) | Audit (250) |
|---|---|---|
| Published questions where the declared wrong method equals the key | **0** | **0** |
| Questions covered by a declared `wrongMethodValue` | 7,928 (79.3%) | 195 (78.0%) |
| Questions with **no** declared wrong method to check | 2,072 (20.7%) | 55 (22.0%) |
| Templates declaring no `wrongMethodValue` | 23 of 107 | — |
| `degenerateWhen` rules that fired on a published item | 0 | 0 |

The 0% is real, but it is 0% **of the 79.3% that is checkable**. The 23 uncovered
templates are concentrated in `calendar`, `relational` and `odd_one_out`, where the
answer is a label rather than a number and "the wrong method yields the same value"
has no numeric form. That is a coverage gap in the degeneracy check, stated rather
than rounded away.

### 6-C. askedUnknown distribution, and dominant direction

| Family | N | Directions | Dominant direction | Dominant share | Flag (>60%) |
|---|---|---|---|---|---|
| odd_one_out | 625 | 1 | outlier | **100%** | single-direction family |
| sequences | 625 | 4 | nextTerm | **55.7%** | — |
| direct_proportion | 625 | 5 | scaledOutput | **54.2%** | — |
| ages | 625 | 4 | olderAgeNow | **43.2%** | — |
| fractions | 625 | 3 | chainResult | **36.2%** | — |
| calendar | 625 | 5 | todayFromOffset | **32%** | — |
| combined_rate | 625 | 5 | jointOutput | **31.8%** | — |
| unit_rate | 625 | 5 | scaledOutput | **28%** | — |
| machines | 625 | 6 | totalAcrossStages | **26.9%** | — |
| profit_loss | 625 | 6 | sellPriceAfterDiscountAndMarkup | **21.4%** | — |
| ratios | 625 | 8 | sideB | **20.2%** | — |
| averages | 625 | 7 | newAverageAfterAdd | **17.6%** | — |
| percentages | 625 | 7 | originalFromFinal | **17.3%** | — |
| speed | 625 | 8 | totalTimeMinutes | **16.5%** | — |
| work_time | 625 | 7 | daysForNewCrew | **16.3%** | — |
| relational | 625 | 12 | undeterminedPair | **15.2%** | — |

**No multi-direction family exceeds 60%.** The two highest are `sequences` at 55.7%
(`nextTerm`, 4 directions) and `direct_proportion` at 54.2% (`scaledOutput`, 5
directions). `odd_one_out` is a single-direction family by design — every item asks
for the intruder — so it is not flagged; its diversity lives in the rule, not the
question asked.

### 6-D. Distinct templateIds per Mixed 50-question session

| Session | Distinct templateIds | Distinct reasoning directions `(templateId, askedUnknown)` | Distinct families |
|---|---|---|---|
| S1 Mixed | 45 | 46 | 16 |
| S2 Mixed | 41 | 43 | 16 |
| S3 Mixed | 42 | 44 | 16 |
| S4 Mixed | 45 | 46 | 16 |
| **Mixed mean** | **43.25 / 50** | **44.75 / 50** | 16 |
| S5 All-Hard | 31 | 35 | 16 |

### 6-E. Distinct reasoning directions per Hard session (100-session run)

| Measure | Min | Mean | Max |
|---|---|---|---|
| Distinct templateIds per 50 | 30 | 31.74 | 33 |
| Distinct reasoning directions per 50 | 32 | 34.75 | 37 |

100 of 100 sessions valid; 0 sessions raised a diversity warning; 0 duplicate
fingerprints within any session.

---

## 7. Cross-session / recent-session fingerprint cache

**IMPLEMENTED.**

| Property | Value |
|---|---|
| Where | `src/index.js` — `this._recentFingerprints` (line 87), consulted at line 314, appended at 354-356 |
| Storage | In-memory array on the engine instance. **Not persisted** — no `localStorage`, no disk, no server. It dies with the page. |
| Retention window | `recentFingerprintMemory: 150` fingerprints, FIFO, trimmed after every session. At 50 questions per session that is **the last three sessions**. |
| Fingerprint level stored | The full canonical `questionFingerprint` — family, templateId, askedUnknown, stageCount, canonicalised reasoning graph, and the **role-named parameter values**. It is name-blind (two relational graphs with different people collide) and value-sensitive (the same template with different numbers does not collide). |
| Effect | A candidate whose fingerprint is in the window is skipped and the diversity loop retries with a different seed suffix. |
| Opt-out | `generatePractice({useRecentSessionMemory: false})`. |

### Interaction with seed reproducibility — measured, not asserted

| Scenario | Same seed → same 50 questions? |
|---|---|
| Fresh engine each time (what `app.js` does on every page load) | **yes** |
| 500 independent seeds, fresh engine, generated twice each | **500 / 500 identical** |
| Same engine instance, after two other sessions have run | **no** |
| Same engine instance, with `useRecentSessionMemory: false` | yes |

So seed reproducibility holds **per engine instance**, not per seed. `app.js`
constructs one engine per page load, so a user who reloads and re-enters a seed gets
the same exam; a user who runs three sessions in one page load and then re-enters the
first seed does **not**. The 500/500 figure reported in the development round was
measured with fresh engines, which is the app's real path — but the claim
"seed → deterministic session" needs that qualifier attached to it, and it did not
have one. Reported, not implemented, not changed.

---

## 8. Arabic native-review sample — **one defect found, reported as a blocker**

`audit-rc1/arabic-review-50.txt`, plain UTF-8. 50 questions drawn from the frozen
250-question sample by a seeded Fisher-Yates shuffle (seed
`AUDIT-2026-09-12-A|arabic-review`, printed in the file so the draw can be repeated).
Each entry carries the family, the difficulty, the full Arabic stem, the display
expression where one exists, and all six choices exactly as displayed with their
units. **No explanations and no answer key**, so the reviewer judges the language
without being primed.

The same 50 questions also appear in rendered form in the five session PDFs.

### What the validator can and cannot see

Your reasoning for wanting an independent read is correct, and the scope of
`checkArabicNumberUnits` is narrower than the previous report made clear. It matches
a **numeral immediately followed by a noun**, and only for the **21 units in
`src/arabic/units.js`**. Everything else in the Arabic — word order, agreement of
non-unit nouns, the noun-then-numeral direction, definiteness, punctuation — is
completely unvalidated. Its 13,280 → 0 violation figure is true, and is a statement
about 21 words.

### Defect found while preparing the sample

Six of the seven `averages` templates render a definite plural noun followed by a
bare numeral:

> `فما متوسط القيم 9؟`  (AVG_M_ADD_PAIR)
> `فما متوسط القيم 10؟` (AVG_H_COMB_ADD)
> `فما متوسط القيم 6 الباقية؟` (AVG_E_REMOVE)

This is not standard Arabic. A definite plural takes an agreeing numeral adjective —
`متوسط القيم التسع` — or the count is dropped entirely (`فما المتوسط الجديد؟`). The
shape appears in `src/families/averages.js` at lines 38, 90, 192, 241, 296 and 345.

| Scope | Count |
|---|---|
| Frozen 10,000-question corpus | **548 questions — 5.48% of the corpus** |
| Share of the `averages` family | **87.7%** (548 of 625) |
| Templates affected | 6 of 7 (`AVG_E_ADD`, `AVG_E_REMOVE`, `AVG_M_COMBINE`, `AVG_M_ADD_PAIR`, `AVG_H_TARGET`, `AVG_H_COMB_ADD`) |
| 250-question audit sample | 13 |
| In the 50-question review sample | 2 |
| Explanation steps also affected | 57 |

Two independent reasons the validator could not catch it: `قيمة/قيم` is not in the
unit lexicon, and the defective shape is noun-then-numeral, a direction the regex
does not match. This is a language-quality defect (your priority 7), not a
mathematical one — every affected question is arithmetically correct and has a unique
key. It is reported as a blocker under your rule that any defect found in this round
is an RC1 blocker. **Not fixed.**

A native reviewer should be asked to confirm this reading and to look for the same
class of problem elsewhere, since the validator offers no protection against it.

---

## 9. Commit evidence — no Pull Request opened

**No Pull Request has been opened or merged.** The branch
`claude/numerical-generator-upgrade-b3fc8s` is pushed; nothing else.

**Frozen commit: `7b5d4617295c98a8ed0f87d204f4745dd5db05dd`.**

### Ordered phase commits

| # | Hash | Date | Subject | Phase |
|---|---|---|---|---|
| 1 | `fcb0af7` | 2026-09-11 | QA foundation: exact arithmetic, independent oracles, Arabic unit lexicon | Phase 0-1 |
| 2 | `e8e7fa1` | 2026-09-12 | Convert 8 families to the validated contract | Phase 2-3 |
| 3 | `fb0f98c` | 2026-09-12 | Convert the remaining 8 families and wire the engine to the pipeline | Phase 2-3 |
| 4 | `4cb9e7d` | 2026-09-12 | Tests, QA tooling, and the statistical calibration of the key's position | Phase 5 |
| 5 | `7b5d461` | 2026-09-12 | Close the remaining diversity and shape-cue gaps; ship the QA evidence | Phase 4-5 — **FROZEN RC1** |

**The phase commits have not been squashed.** Each is a distinct commit with a single
parent, in the order the work was done, on a linear chain from the baseline:

```
7b5d461 -> 4cb9e7d -> fb0f98c -> e8e7fa1 -> fcb0af7 -> b8f7a60 (baseline)
```

Merge commits in that range: **0**. No rebase, amend or force-push has touched them.

### `git diff --stat` against the baseline

One clarification you need before reading the numbers. The repository's baseline
commit `b8f7a60` tracks **one file only** — the upload
`numerical_generator_engine_v1_2_1_vercel_ready.zip` — not extracted sources. So a
plain `git diff --stat b8f7a60 7b5d461` reports `67 files changed, 14507
insertions(+)` with **zero deletions**, which is an artefact of the baseline being a
zip, not a claim that nothing was replaced. (The shipped baseline is v1.2.**1**, not
v1.2.0; that is what the repository contains.)

The meaningful diff is against the extracted baseline sources:

| Area | Files | Insertions | Deletions |
|---|---|---|---|
| `src/` | 34 | 8,419 | 1,080 |
| `tests/` | 4 | 872 | 0 |
| root (`package.json`, `ENGINE_README.md`, `QA_v1.3.0.md`, `.gitignore`) + `tools/` | 9 | 989 | 4 |
| **Total** | **47** | **10,280** | **1,084** |

`src/` breaks down as 16 rewritten family files, `index.js` and `utils.js` rewritten,
and 14 new files under `src/qa/` and `src/arabic/` that did not exist in the baseline.

### Additions made during this validation round

These are **after** the frozen commit and are test-and-tooling only:

| File | Item | Kind |
|---|---|---|
| `tests/parameter-mapping-injection.test.mjs` | 3 | test-only |
| `tests/rank-calibration-guard.test.mjs` | 5 | test-only |
| `tools/audit/*.mjs` (6 files) | 1, 3, 4, 5, 6, 8 | audit tooling, never called by the app |
| `qa-artifacts/rank-calibration-inventory.json` | 5 | guard snapshot |
| `audit-rc1/*` | 1, 8 | the evidence itself |
| `package.json` (2 script lines) | 3, 5 | wires the new tests into `npm test` |

`git diff 7b5d461 -- src app.js report.js index.html styles.css question.schema.json
generator_manifest.json vercel.json` is **empty**. Production code is untouched.

---

## 10. Post-shuffle key integrity

**`postShuffleKeyMismatch` = 0 on the 10,000-question corpus.**
**`postShuffleKeyMismatch` = 0 on the 250-question audit sample.**

This is verified from outside the generator, not read from its own metadata.
`tools/audit/verify-corpus.mjs` walks the full chain for every question:

1. rebuild the pre-shuffle candidate from its recorded seed
   (`SeededRNG(q.seed).fork('content')` → the family generator);
2. run the independent oracle over the statement to obtain the canonical answer;
3. take the six published options **as rendered, after shuffling and A–F assignment**;
4. locate which letters carry the oracle's answer — by raw `options_meta` value for
   numeric answers, by label for label-valued answers (weekdays, fraction names,
   person names, count words);
5. require exactly one carrier, and require that carrier to be the published key.

| Check | Corpus (10,000) | Audit (250) | Required |
|---|---|---|---|
| Candidate rebuilt from seed | 10,000 | 250 | all |
| Oracle actually ran | 10,000 | 250 | all |
| `ORACLE_DISAGREEMENT` | 0 | 0 | 0 |
| `ORACLE_NO_SOLUTION` | 0 | 0 | 0 |
| `ORACLE_NON_UNIQUE` | 0 | 0 | 0 |
| Zero letters carry the answer | 0 | 0 | 0 |
| More than one letter carries it | 0 | 0 | 0 |
| **`postShuffleKeyMismatch`** | **0** | **0** | **0** |
| `options[correct_option] !== correct_value` | 0 | 0 | 0 |
| `options_meta` correct-flag disagrees with the key | 0 | 0 | 0 |

---

## 11. What a templateId is

A `templateId` is a **string literal written by hand on a generator function** in
`src/families/*.js` — for example `'AVG_M_ADD_PAIR'` on the function that builds the
"average of n values, two more added" item. It is not derived from anything at
runtime. Measured over the 10,000-question corpus:

| Does this create a new templateId? | Answer | Evidence |
|---|---|---|
| Different numbers | **No** | All 107 templateIds carry many distinct parameter sets; every one of the 107 has more than one |
| Different person names | **No** | `REL_E_CHAIN` covers every name draw under one id; the fingerprint is deliberately name-blind |
| A different `askedUnknown` | **Sometimes — this is not consistent** | 17 of 107 templateIds carry 2-4 directions under one id (`SEQ_E_GEO` → nextTerm / previousTerm / missingMiddleTerm; `FRAC_M_3` → startNumber / hiddenFraction / chainResult; `REL_E_CHAIN` → position2..position5). The other 90 have one direction each, so for them the direction and the id coincide |
| A different reasoning graph | **No** | Only `relational` carries a `reasoning_graph`; 7 of its templateIds span more than one distinct canonical graph |

### So what does 107 represent?

107 is the number of **authored reasoning structures** — distinct hand-written
generator functions, each with its own stem shape, solution path, oracle
specification and misconception set. It is not surface variation: no two of the 107
differ only in numbers or names.

But it is also not the right number for reasoning diversity, in either direction. The
better measures, from the same corpus:

| Measure | Count |
|---|---|
| Distinct templateIds | 107 |
| Distinct `(templateId, askedUnknown)` reasoning directions | **134** |
| Distinct `(templateId, askedUnknown, canonical reasoning graph)` | **252** |

The engine's own session diversity logic already measures repetition on
`(templateId, askedUnknown)` rather than on templateId, which is why a hard session
reports 31.7 distinct templates but 34.8 distinct reasoning directions. The
inconsistency worth recording is that **the same concept is encoded two different
ways across the codebase**: some families split each direction into its own
templateId (`speed`: 8 templates, 8 directions), others fold several directions into
one (`fractions`: 3 templates, 9 directions). Both work, but a reader comparing
per-family template counts is not comparing like with like.

---

## 12. Per-family architecture

Column definitions, given explicitly rather than relying on the word "converted":

- **Legacy template** — does the family still build any question object directly,
  bypassing `buildBase(ctx, spec)` and its declared oracle/pedagogy/distractor
  contract? *No* means every template in the family goes through the contract.
- **Validators** — does every published item run the full `validateCandidate`
  pipeline (structural → text/params → oracle → unique answer → pedagogy → language →
  explanation → distractors)? This is engine-level and applies to all families
  identically.
- **Independent oracle** — does every template declare an `oracle` spec that
  `runOracle` executes, and is that oracle an *exhaustive search or constraint
  check*, never a second closed-form formula? The kind is named.
- **Misconception distractors** — does every distractor carry a registered
  `misconceptionId` and a `derivation`, with no random-near-miss fallback?
- **Symbolic `solve()`** — does the family export
  `solve(params, askedUnknown) → {answer, exactAnswer, steps, misconceptions,
  pathComplexity}`? This is the Phase 6 pilot; it is deliberately one family.
- **askedUnknown** — does the family vary which quantity is asked, and how many
  distinct directions does it actually produce?

| Family | Legacy template | Validators | Independent oracle | Misconception distractors | Symbolic `solve()` | askedUnknown |
|---|---|---|---|---|---|---|
| sequences | No (9/9 via contract) | Yes | Yes — `constraint` | Yes | **No** | Yes — 4 directions |
| ratios | No (7/7) | Yes | Yes — `constraint` | Yes | **No** | Yes — 8 |
| percentages | No (7/7) | Yes | Yes — `constraint` | Yes | **No** | Yes — 7 |
| averages | No (7/7) | Yes | Yes — `constraint` | Yes | **No** | Yes — 7 |
| ages | No (7/7) | Yes | Yes — `constraint` | Yes | **No** | Yes — 4 |
| speed | No (8/8) | Yes | Yes — `constraint` | Yes | **No** | Yes — 8 |
| work_time | No (7/7) | Yes | Yes — `constraint` | Yes | **No** | Yes — 7 |
| machines | No (7/7) | Yes | Yes — `constraint` | Yes | **No** | Yes — 6 |
| direct_proportion | No (10/10) | Yes | Yes — `constraint` | Yes | **Yes** — the pilot | Yes — 5 |
| fractions | No (3/3) | Yes | Yes — `constraint` + `search` | Yes | **No** | Yes — 3 |
| unit_rate | No (6/6) | Yes | Yes — `constraint` | Yes | **No** | Yes — 5 |
| combined_rate | No (6/6) | Yes | Yes — `constraint` | Yes | **No** | Yes — 5 |
| relational | No (7/7) | Yes | Yes — `order` (exhaustive linear-extension enumeration) | Yes | **No** | Yes — 12 |
| calendar | No (6/6) | Yes | Yes — `search` (exhaustive 7-day sweep) | Yes | **No** | Yes — 5 |
| odd_one_out | No (1 shared builder, 7 templates) | Yes | Yes — `ruleset` (approved-rule sweep) | Yes | **No** | **No** — single direction by design |
| profit_loss | No (6/6) | Yes | Yes — `constraint` | Yes | **No** | Yes — 6 |

Two columns need footnotes rather than a bare Yes:

- **Pedagogy / degeneracy is not uniform.** `relational` declares no `pedagogy` block
  at all, and `calendar` and `odd_one_out` declare one per family rather than per
  template. Those are the 23 templates with no `wrongMethodValue` behind the 79.3%
  coverage figure in 6-B. The pipeline still runs, and the degeneracy check simply
  has nothing to check.
- **`solve()` is 1 of 16.** The Phase 6 pilot was deliberately limited to
  `direct_proportion` and the migration has not started. Every other family computes
  its answer inside its template function and is checked by the independent oracle
  rather than by a symbolic path.

---

## 13. Hard-coded exception scan

Scope of the scan: every production file — all 36 files under `src/`, plus `app.js`
and `report.js`. `tests/`, `tools/` and `qa-artifacts/` were deliberately excluded,
then checked separately to confirm the historical cases live there and only there.

| Looked for | Found in production | Notes |
|---|---|---|
| Question IDs from the audited sample (`FAM_X_NAME--date`, `questionId`, `question_id`) | **None** | Zero matches |
| Branches keyed to a question id (`\.id ===`, `generator_id ===`, `template_id ===`) | **None** in `src/` | The only `.id ===` matches are in `app.js`, comparing a *family* id against the user's family selection in the UI, and one `q.id !== original.id` at `app.js:406` that asks "is this a different question?" when generating a sibling — neither references any specific value |
| The temporal regression values (N=2/M=1 Monday→Saturday, N=3/M=1 Sunday→Thursday, N=2/M=3) | **None** | The only day-name literals in production are the seven entries of `DAYS_AR` at `src/utils.js:391`. `CAL_H_NESTED` computes `netOffset = 1 + ahead − behind` unconditionally and rejects `netOffset % 7 === 0` for all values, with no branch for any particular pair |
| The odd-one-out set `{30,42,56,72,84,90}` | **None** | The set does not appear in production in any order. The only superficial hit is `chooseCleanDivisorPair`'s default product list `[24,30,36,…,120]` in `src/utils.js:63` — a 19-value sampling pool for clean divisor pairs, inherited from v1.2.1, not imported by `odd_one_out.js`, and not that set |
| Special handling keyed to 5/8 or 0.625 | **None** | The only occurrence of `0.625` in production is a comment in `src/qa/fraction.js:33` explaining what decimal literals mean. `Fraction` handles 5/8 by the same BigInt path as every other rational |
| Answer literals copied from QA files | **None** | No `KNOWN_`, `WHITELIST`, `BLACKLIST`, `EXCEPTION`, `SPECIAL_CASE`, `HACK`, `FIXME`, `workaround`, `regressionValue`/`regressionCase` identifiers anywhere in production. No string-equality test against a literal longer than 7 characters other than enum comparisons (`'adaptive'`, `'dayIndex'`, `'QUESTION_GENERATION_EXHAUSTED'`, `'missingMiddleTerm'`, `'previousTerm'`, `'findNumber'`) — all of which are the code's own control vocabulary, not defect cases |

Where the historical cases *do* live:

| Case | Location |
|---|---|
| `{30,42,56,72,84,90}` | `tests/regression.test.mjs:241` — `MUST_REJECT: {30,42,56,72,84,90} has two competing simple rules` |
| 5/8 = 0.625 | `tests/regression.test.mjs:77-88` — exact-arithmetic and equation-validator cases |
| N=2/M=1 Monday→Saturday, N=3/M=1 Sunday→Thursday, N=2/M=3 | `tests/regression.test.mjs:33-51`, plus a MUST_ACCEPT sweep over *every* allowed (N, M, target) at line 63 |

Each of these is a test asserting the *rule* behaves correctly on the historical
input, paired with a MUST_ACCEPT counterpart so a reject-everything implementation
cannot pass it. None of them is referenced by production code.

> **All historical defect cases exist only in tests/fixtures; production code contains
> no branches keyed to those cases.**

---

## Declaration

# RC1 HAS SIGN-OFF BLOCKERS

Three blockers. None has been fixed; production code is byte-identical to `7b5d461`.

### Blocker 1 — rank calibration selects among valid distractors (item 5)

`pickBalancedDistractors` in `src/utils.js:152-203` draws a target rank from
`RANK_DRAW_WEIGHTS` and then slices the below-key and above-key distractor pools to
land the key at that rank, excluding valid, provenance-carrying distractors to do so.
This is the behaviour item 5 prohibits. Nothing is invented and nothing is discarded
for lacking a nice shape — but the *selection among genuine candidates* is driven by
the desired numeric rank, which is the thing you asked about. Full mechanism, the
guessability statistics it was introduced to fix, and two compliant alternatives are
in section 5. **Your decision, not mine, whether to remove it and accept the
regression, or to move the balancing into parameter sampling.**

### Blocker 2 — systematic Arabic agreement defect in the `averages` family (item 8)

`فما متوسط القيم 9؟` — a definite plural followed by a bare numeral, which is not
standard Arabic. 6 of 7 `averages` templates, **548 of 10,000 corpus questions
(5.48%)**, 87.7% of the family, 13 of the 250 audit questions, plus 57 explanation
steps. The Arabic validator cannot catch it for two independent reasons: `قيم` is not
one of its 21 lexicon units, and it only matches the numeral→noun direction. Source
lines named in section 8. Mathematically these questions are correct and uniquely
keyed; this is a language-quality defect, and under your rule any defect found in
this round is a blocker.

### Blocker 3 — the reason-code histogram does not measure what it appears to measure (item 2)

`run.json`'s 0.19% reject rate omits every rejection below the pipeline boundary. The
ambiguity validator rejected **135 of 1,256** odd-one-out draws (10.75%) inside the
sampler, and none of that appears in the histogram, because `src/index.js` calls
`analytics.record` after `finalizeQuestion` and `validateCandidate` but not in the
`catch` around the family generator (line 202) and not at all for sampler-internal
resampling. Two reason codes — `DISTRACTOR_IMPOSSIBLE` and `RETRY_EXHAUSTED` — are
declared but emitted nowhere. This is a reporting defect, not a correctness one, but
it means the headline reliability figure in the development report understates the
system's actual rejection work and cannot be used as evidence that validators are
idle.

### Two findings recorded as qualifications rather than blockers

- **Seed reproducibility needs a qualifier** (item 7). 500/500 identical for a fresh
  engine, which is the app's real path; **not** reproducible within a long-lived
  engine instance, because the recent-fingerprint cache changes what the same seed
  produces. Measured both ways in section 7. The claim as previously stated was
  unqualified.
- **Degeneracy coverage is 79.3%, not 100%** (item 6-B). Zero degenerate published
  questions, out of the 79.3% that declare a checkable `wrongMethodValue`; 23
  templates in `calendar`, `relational` and `odd_one_out` declare none.

### What is clean

| Item | Result |
|---|---|
| 1 | 250 questions, 5 sessions, PDF + JSONL, all valid, 0 errors, 0 diversity warnings |
| 3 | `ORACLE_DISAGREEMENT` = 0 over 10,000 and over 250; oracle coverage 100%; 20 new parameter-mapping injection tests across 4 structurally distinct families and all 16 families, all caught |
| 4 | 107 / 107 templates at 100% key accuracy vs the independent oracle; minimum exposure N = 48; no template flagged |
| 6-C | No multi-direction family above 60%; highest is `sequences` 55.7% |
| 6-D/E | Mixed sessions 43.25 distinct templates / 44.75 distinct directions per 50; hard sessions 31.74 / 34.75; 0 duplicates, 0 diversity warnings across 100 hard sessions |
| 9 | 5 ordered phase commits, 0 merges, not squashed, linear from baseline; **no PR opened** |
| 10 | `postShuffleKeyMismatch` = 0 on both corpora, verified from outside the generator |
| 12 | 0 legacy templates; validators, independent oracle and misconception provenance on all 16 families |
| 13 | No hard-coded exceptions in production; the required statement is given verbatim in section 13 |
| Tests | 112 / 112 passing, including the 2 new suites |

### Not done, by your instruction

Adding genuinely distinct Hard templates to `fractions` and any other family with
template exhaustion remains scoped for later. No PR opened or merged.

