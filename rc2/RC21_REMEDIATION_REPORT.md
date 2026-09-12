# RC2.1 — Targeted Remediation Report

**Branch** `claude/rc2-implementation`
**RC2.1_COMMIT** `489a2570a56de32b39ee6c50061dc6a203c3113f`
**Tree** `6656abc3fb98356735a09336a61a028e96a1b40b` · **Engine** 1.4.0 · **348 tests** · **46 production files**
**Production bundle** `fd0db212b5ef871561e66ac55f92381be3bc59cb7fd8dad67eef1743458f092a`
**Gate** PASS, 22 of 22, at `4687fc84` — production byte-identical between the gated commit and the frozen one
**Development corpus** `73cad0c7…`, 10,000 questions on five seeds RC2 never used
**Sign-off holdout** `AUDIT-2026-09-12-C`, generated once, not inspected
**Previous holdout** `AUDIT-2026-09-12-B` — failed diagnostic, preserved, **not reused**

---

## 1. Session telemetry

**ROOT CAUSE** `generatePractice` retries until a question satisfies its repetition preferences. Two rejection branches recorded a disposition; three discarded an already-published candidate with a bare `continue` (`src/index.js:381`, `:402`, `:403`). That is how 104 of 359 candidates left no trace on holdout B.

**CHANGE** Every branch now records a named disposition — recent-session memory, per-session template cap, sliding-window cap, duplicate fingerprint, repeated reasoning pattern, batch duplicate. The identity is checked against a candidate counter incremented where the session builder *receives* a candidate, so it is an independent witness and can actually fail. A candidate rejected by a cap can still be delivered as the relaxed fallback, so its discard is withdrawn when that happens. Engine cost and session cost are reported separately, and per session.

**TEST** `tests/rc21-session-telemetry.test.mjs` — reconciliation, no anonymous discard, the relaxed-fallback path, the two costs kept distinct, per-session cost.

**BEFORE** 359 published → 250 delivered, 109 discarded, **104 with no disposition**.
**AFTER** On the holdout itself: 411 published → 250 delivered, 161 discarded, **0 with no disposition**. Across 20 batches: 7,330 = 5,000 + 2,330, difference 0.

**RESIDUAL RISK** The dominant discard reason is `SESSION_WINDOW_CAP`. It is now visible and costed; whether that cost is acceptable is a product decision this report does not make.

**STATUS** FIXED

## 2. Difficulty

**ROOT CAUSE** Not the boundaries. `dependencyDepth` is a real factor in the complexity model and only **22 of 107** templates declared it. Templates whose author filled it in scored higher than equally chained templates whose author left it at zero, which misclassified in *both* directions — `PL_H_CHAIN` and `PCT_H_CHAIN_VALUE` are chains that declared 0 and computed medium while declared hard.

**CHANGE** `dependencyDepth` is derived uniformly from the solution each template publishes: a step depends on an earlier one when it consumes that step's result; the depth is the longest such chain. Where nothing parses, the declared value stands. RC2-015's rule — *a boundary sits midway between the medians of the two bands it separates* — was then reapplied, and iterated to its fixed point at **8.9 / 12.0**, because reclassifying moves the medians. Eleven templates were reclassified, constrained so no family band drops below two templates (the dispatchers draw from fixed per-band lists; emptying one makes that band ungenerateable).

**TEST** `tests/rc21-difficulty.test.mjs` — the derivation, its reach across templates, boundaries equal what the rule implies, calibration floors measured across four seeds, no band emptied, ALL_HARD inflation, and `WORK_M_TARGET`.

**BEFORE** Agreement 65.4% (easy 82.8%, medium 52.0%, hard 61.4%). ALL_HARD 38% below the hard band. 3 `WORK_M_TARGET` items underclassified.
**AFTER** Agreement **72.8%** (easy **93.9%**, medium 57.4%, hard **73.4%**). ALL_HARD **26%**. `WORK_M_TARGET` reached a hard median on its own and was reclassified with the rest — nothing was hard-coded for it, and no holdout id appears in production.

**RESIDUAL RISK** Two, both real. **Medium remains the weakest band at 57.4%.** And four families — `calendar`, `odd_one_out`, `profit_loss`, `averages` — hold no template that reaches the hard band, `calendar` and `odd_one_out` at 0%, so a hard session drawing from every family necessarily includes them. Their complexity factors are declared constants, so widening parameter ranges cannot raise them; closing this means authoring new hard templates, which is a redesign and outside RC2.1.

**STATUS** IMPROVED, RESIDUAL NAMED

## 3. Distractors

**ROOT CAUSE** All three shapes the review named are one failure: a wrong option that is not a possible *answer* to the question asked.

**CHANGE — and what was deliberately not built.** The obvious guard is a scale test against the key. It is **not** implemented. Choosing which options appear by their ratio to the key means selecting distractors using a property of the published answer, which OBSERVE_NEVER_TARGET forbids in as many words, and compressing an option set toward the key would move the key's numeric rank — the statistic RC2-001 exists to leave alone. `scaleRatio` exists for measurement only, and a test asserts no file under `src/` calls it.

What is built is answer-independent: a template may declare the interval its answer must lie in, derived from its **givens**. Candidates outside are marked, never dropped, and drawn last — so a template with five plausible candidates stops offering the others, and one with fewer still fills its six options rather than being starved into resampling. Suppression alone was not enough: `SPD_M_AVG` had only four in-bracket candidates for five slots. Two near-misses were added that lie inside the bracket and are mistakes learners actually make — swapping the two weights, and weighting by distance instead of time.

**TEST** `tests/rc21-distractors.test.mjs` — bounds judged from givens, the split function structurally unable to receive a key, odd-one-out exempt, no bounded template ever violating its bounds, the new near-misses reaching learners, and the residual pinned.

**BEFORE** `SPD_M_AVG` shipped an option outside its own bracket in **100%** of items (a total distance wearing a km/h label).
**AFTER** **0%**. Engine-wide, 0 violations of any declared bound across 9,000 questions.

**RESIDUAL RISK** **6.45%** of wrong options sit more than eight times from the key, concentrated in chained-fraction and percentage templates where the extreme value is genuinely what the inverse-operation mistake produces. Those templates have no givens-derived bound to declare, and the only lever that would close them is the forbidden one. The share is pinned by a test so a regression is visible; it is **not** claimed to be zero.

**STATUS** PARTIALLY FIXED — bounded class closed, unbounded class measured and blocked by OBSERVE_NEVER_TARGET

## 4. Language

**ROOT CAUSE** Renderers writing Arabic that the unit table already owned.

**CHANGE**
- **علبة/صندوق** — the stem hardcoded a second noun for an object the formatter rendered as صندوق. Prose now takes the noun from the table in the right grammatical form (`كل صندوق`, `فكم صندوقًا`, `الصندوق الواحد`).
- **يومين إضافية** — a fixed feminine-singular adjective beside a noun whose form varies with the count. Agreement is derived, gender read off the table's own `one` form. **Four sites**, not the one that was sampled.
- **بنسبة 150%** — ambiguous only at 100% and above, where both readings stay increases, so the rule is on the number, not on a template name.
- **Nested calendar** — stated as the sequence of moves it is. `بعد غدٍ بـX` was deliberately avoided: `بعد غد` is itself an idiom for today+2 and would have changed the question.

**TEST** `tests/rc21-language.test.mjs` — a 6,000-question corpus scan for dual/adjective disagreement across ten dual forms, the synonym, the phrase rule, calendar wording, and the arithmetic still closing after the rewording.

**BEFORE** 3 definite defects + 3 clarity concerns.
**AFTER** 0 across the corpus scan; 0 invalid and 0 unclassified constructions across 90,761 in the fresh 10k corpus.

**RESIDUAL RISK** The scan covers the defect *shapes* found in B. A defect of a shape nobody has seen would not be caught.

**STATUS** FIXED

> One thing worth flagging: the first attempt at the 150% fix appended a computed `(أي صارت 250%…)`. The text-params guard correctly rejected every `pct >= 100` draw, **silently deleting 38% of that template's parameter space**. Naming the base instead adds no numeral, and a test now covers the parameter space itself.

## 5. Duplication

**ROOT CAUSE** Each session deduplicated only against itself.

**CHANGE** `generateMockBatch` generates several sessions against one shared semantic-fingerprint set. Ordinary template reuse is untouched, and a test asserts reuse still happens — banning repetition outright would also pass a no-duplicates test and would be the wrong fix.

**TEST** `tests/rc21-session-telemetry.test.mjs` — the three B pairs read out of the preserved corpus (establishing they *were* duplicates on the semantic fingerprint), no repeat across three batch seeds, reuse still occurring, batch reproducibility, and a lone session unchanged.

**BEFORE** 3 cross-session pairs in 250.
**AFTER** 0, across 3 test batches, 2 gate batches, 20 stress batches (5,000 questions), and Holdout C itself.

**RESIDUAL RISK** Deduplication applies to a batch. Sessions generated by separate `generatePractice` calls without a shared set behave as before — by design, since a lone session must stay a pure function of its seed.

**STATUS** FIXED

## 6. Evidence

**CHANGE** Unmeasured latency is `null`, never 0. Holdout C captures at first generation, into **separate** blind and full files, so a blind package is built by shipping one file rather than trusting a filter not to leak a key. The stimulus is recorded **as rendered** — the gap that left B's sequences items unanswerable.

**TEST** `tests/rc21-holdout-capture.test.mjs`, exercised on a throwaway seed; the real seed is never touched by a test.

**STATUS** FIXED

## Validation

Full suite **348/348**, 0 skipped. Unit check, stress suite, and multi-session stress all pass. Fresh 10,000-question corpus on unseen seeds:

| | RC2 | RC2.1 |
|---|---|---|
| §20 gains (all six) | 0 | **0** |
| ambiguous / undiscoverable | 0 | **0** |
| invalid / unclassified Arabic | 0 | **0** (of 90,761) |
| answer-derived share | 2.022% | **1.668%** |
| unattributed answer-derived | 0 | **0** |
| feedback mismatches | 0 | **0** |
| difficulty agreement | 64.95% | **72.88%** |
| templates above +20 leakage | 0 | **0** |
| exhaustions | 0 | **0** |
| mean attempts / p95 latency | 1.0296 / 1.09 ms | 1.0306 / 1.17 ms |

Both APIs exercised, both identities balanced, both replay from seed.

## Status

Every area has a root-cause fix, a test, and measured before/after. Two residuals are carried openly rather than closed: **medium-band difficulty at 57.4%**, and **6.45% of wrong options beyond eight times the key** in templates with no givens-derived bound — where the only remaining lever is one OBSERVE_NEVER_TARGET forbids.

Neither is a regression, both are measured and pinned by tests, and neither can be settled by me: the first needs new hard templates, the second needs a ruling on whether a scale guard that reads the key is ever permissible. Those are judgements for the independent review.

Stage 1 is not started. This is not a self-approval.

**RC2.1 READY FOR INDEPENDENT HOLDOUT REVIEW**
