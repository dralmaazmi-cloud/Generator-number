# RC2 Implementation Report (§28)

**Branch** `claude/rc2-implementation`
**RC2_COMMIT** `56565ec4e1be4ace34dff60a0b5b6368e6177cf0`
**Tree hash** `43515585d1901495df4607472cf637d0349f9295`
**Engine version** 1.4.0
**Frozen RC1 production baseline** `7b5d4617295c98a8ed0f87d204f4745dd5db05dd`
**Frozen scope commit** `af61d28d6fd6797288ad767832f354dd91a0d400` (`rc2-scope-frozen-v2`)

---

## 1. Scope: 23 of 23 at a terminal status

| Status | Count | Items |
|---|---|---|
| `FIXED` | 19 | RC2-001…005, 007…010, 012, 013, 016…023 |
| `RISK_REMEDIATED_AND_MEASURED` | 2 | RC2-006, RC2-011 |
| `MEASUREMENT_CORRECTED` | 2 | RC2-014, RC2-015 |

No item ended as `IGNORED`, `OUT_OF_SCOPE`, `DEFERRED_TO_STAGE_1`, `UNTESTED` or
`ASSUMED_FIXED`. No item was merged into another in a way that dropped an
acceptance requirement, and no blocker was reinterpreted as documentation.
`rc2/COVERAGE_MATRIX.json` carries the per-item evidence, and the §23 gate's
`EVERY_ITEM_PROVED` condition checks that each item is proved by tests that
actually exist in the suite rather than by prose.

## 2. OBSERVE_NEVER_TARGET (§2)

No generation path consults a statistical property of an answer. The remedy used
throughout was design-time parameter-pool width, never runtime answer
inspection. The §23 `NO_ANSWER_TARGETING` condition scans every family module
for the vocabulary a chooser would need — rank, frequency, histogram, modal,
distribution — and for chooser names, because the easiest way to flatten a
statistic is to recreate the chooser under another name.

Two shapes are reported separately rather than convicted: validity guards, and
backward construction from a chosen parameter. Neither reads an answer
distribution. An earlier version of this scan convicted 19 of them and was wrong
to; the scan was narrowed rather than the guards removed.

## 3. §20 — the RC1 gains, preserved

Zero on the 10,000-question development corpus and zero again on the 250
question holdout the engine had never seen:

`ORACLE_DISAGREEMENT`, `postShuffleKeyMismatch`, `zeroCorrectOption`,
`multipleCorrectOptions`, `correctValueMismatch`, `metaKeyMismatch`.

The 208 development-corpus cases where the oracle's `claimed` and `oracle`
differ are label-mapped templates — «الربع» against «4» — and are reported under
their own name, `oracleComparedThroughALabelMap`, rather than being counted as
disagreements or quietly dropped.

## 4. §22 — development corpus

10,000 questions on five development seeds, 16 families, 107 templates, 0
exhaustions. The final holdout seed was not used and the corpus builder throws
if it is passed. Headline figures:

- answer-derived distractors **2.022%** of wrong options (RC1: 24.9%), **0** unattributed
- feedback derivation mismatches **0**; inapplicable misconceptions **0**; duplicate derivations **0**
- Arabic: 90,271 constructions classified, **0** invalid, **0** unclassified
- ambiguity: **0** published ambiguous, **0** undiscoverable
- statistical leakage: **0** templates above +20 points over chance
- difficulty agreement **64.98%** (RC1: 52.8%)
- telemetry reconciles exactly; mean 1.0296 attempts per published question, p95 latency 1.09 ms

## 5. §23 → §24 — gate, then freeze

The first freeze attempt was **not valid** and is recorded as such rather than
erased. It was taken before the freeze tooling had stopped moving: registering
the freeze's own tests changed `package.json`, and `package.json` is inside the
production bundle. `verifyFreeze()` caught it — the enforcement working, not
failing. `rc2/SUPERSEDED_FREEZES.json` keeps that record with the reason it did
not hold.

The re-sequenced run:

1. freeze and gate tooling finished and committed — `fa6cc61`
2. full automated suite on that commit: **304 tests, 304 pass, 0 fail**, unit check pass, stress pass
3. §23 internal gate against `fa6cc61`: **PASS, 15 of 15 conditions**, clean tree
4. gate result committed — `56565ec`
5. §24 freeze taken at `56565ec`, production **byte-identical** to the gated commit (the only difference between them is the gate's own result file)

The freeze records `internalGate.headCommit`, so the claim "this engine passed
that gate" is checkable with git instead of trusted. A test enforces it: no
production file may differ between the gated commit and `RC2_COMMIT`.

**Frozen state** — 45 production files, bundle
`69e39e737a0347ae5edd890011b6cb1161fcc1edc5482fdf98b9669fcf0e3c53`, 304 tests,
development corpus `1b75313247a21444e1805840a938c51adc0b6039434c237f89e44ec09ab01a57`.
`verifyFreeze()` reports **intact** at every commit since.

## 6. §25 — the holdout

Generated **once**, on `AUDIT-2026-09-12-B`, from the frozen engine: four Mixed
sessions and one All-Hard, 50 each, 250 delivered of 250 requested, 16 families,
100 templates, 0 exhaustions, 0 diversity warnings. Session seeds follow a
stated rule so an independent auditor can replay exactly these questions. The
tool refuses to run again while the holdout exists.

Every §20 gain held. Also zero on unseen questions: ambiguous and undiscoverable
items, invalid and unclassified Arabic across 2,325 constructions, feedback
derivation mismatches, inapplicable misconceptions, duplicate derivations, and
unattributed answer-derived distractors. Answer-derived share 2.4% against 2.022%
on development. Difficulty agreement 60.0% against 64.98%.

Before the holdout seed was touched, the holdout instrument was calibrated
against the development seeds and reproduced all 27 compared §22 figures
exactly. The §22 evidence was not regenerated or rewritten to achieve that;
calibration writes no files.

### What the holdout exposed

It exposed a real problem, recorded in `rc2/HOLDOUT_FINDINGS.json` and preserved
rather than fixed.

**HOLDOUT-F1 — the session path discards published questions without a
telemetry disposition.** `generatePractice` retries until a question satisfies
its repetition preferences. Two rejection branches record a disposition
(`src/index.js:379`, `src/index.js:389`); three discard an already-published
question with a bare `continue` (`src/index.js:381`, `:402`, `:403`). On the
holdout that is **104 of 359 published questions, 29%**, against 5 recorded
diversity rejections. Reproduced independently on a development seed as **74 of
328, 22.6%**, so the finding does not rest on the holdout and the holdout did
not need a second generation to confirm it.

The engine-level identity still balances exactly — 373 proposals = 359 published
+ 0 sampler + 13 finalization + 1 pipeline, difference 0 — so RC2-003's gated
claim is not false. But it was only ever measured on `generateQuestion`. The
§22 corpus and the §23 `TELEMETRY_RECONCILES` condition both drive that path;
neither exercised `generatePractice`, which is the path every exam and every
training session actually uses. On that path roughly a quarter to a third of
everything the engine builds is discarded with no recorded reason. That is
internal rejection cost invisible to telemetry, which is the specific thing
RC2-003 exists to prevent — and the pre-gate instruction was explicit that
internal rejection cost must not be hidden merely because telemetry reconciles.

It is **not fixed**, correctly: a fix edits `src/index.js`, inside the frozen
production bundle, and §24 forbids that after the freeze. §25 requires a problem
the holdout exposes to be preserved.

**HOLDOUT-F2 — an evidence defect in this report's own tooling.** `HOLDOUT.json`
records per-question latency percentiles as `0`. They are not 0; they are
unmeasured — questions are generated inside `generatePractice` and cannot be
timed individually without editing frozen production code. The file is preserved
as generated; the tool now reports `null` with `perQuestionLatencyMeasured:false`.
The per-session figures in the file are real: 1.076–2.624 ms per question,
slowest on All-Hard.

**HOLDOUT-F3 — observation, not a defect.** 250 questions carry 247 distinct
exact fingerprints. All three collisions are between different sessions; no
session repeats a reasoning instance within itself, which is the guarantee the
engine makes. Sessions are independent seeds and are not deduplicated against
one another in `DETERMINISTIC_SINGLE_GENERATION` mode, by design.

## 7. What was not done, and why

- **HOLDOUT-F1 is not fixed.** Frozen production. It goes to the independent audit as a finding.
- **The split between the two cap predicates at `src/index.js:402` and `:403` was not measured.** Separating them requires instrumenting frozen production code.
- **No test was added after the freeze.** The test script lives in `package.json`, which is in the production bundle; adding one would have broken the freeze. The holdout instrument is therefore built from frozen, already-gated production validators, and its bookkeeping is evidenced by the calibration run instead of by a new test.
- **The RC1 audit artifacts were not touched.** No frozen question, option, published key, verdict or PDF was modified or regenerated.

## 8. Status

One frozen scope item, **RC2-003**, is shown by the holdout to have been
measured only on a path that is not the one the product uses, and the unmeasured
path hides a quarter to a third of the engine's internal rejection work. That is
a scope item lacking adequate evidence.

Per §29, and per §27 — this is not a self-acceptance and does not authorise
Stage 1:

**RC2 HAS SIGN-OFF BLOCKERS**
