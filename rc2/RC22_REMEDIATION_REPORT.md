# RC2.2 — Minimum Targeted Remediation

**RC2.2_COMMIT** `11a6f79cf8c6ecb507898a42952fdcf3b26b5df0` · tree `f8eb425b` · engine 1.4.0 · **378 tests** · 46 production files
**Production bundle** `c52637038ff26a15d48dc107e7cd114a12c321709e0d0064c6ffd4aa4549978a`
**Gate** PASS, **27 of 27**, at `fc08a811` — production byte-identical between the gated and frozen commits
**Corpus** `787eda79`, 10,000 questions on five seeds neither RC2 nor RC2.1 used
**Sign-off holdout** `AUDIT-2026-09-12-D`, generated once, **not inspected**
**Spent holdouts** B (failed diagnostic) and C (reviewed) — **neither reused**

---

## 1. Difficulty release gate

**ROOT CAUSE** Two labels for one property, free to disagree. A question carried a *declared* band from its template and a *computed* band from the scorer, and nothing forced them together — so 82 items went out as HARD and 43 of them were not.

**CHANGE** There is now one label: the published difficulty **is** the computed band, so they cannot differ. What the caller asked for is checked separately and a mismatch is resampled, never released. Pools were rebuilt to hold the templates that actually compute each band; the registry's `difficulties` became a **capability the scheduler reads**, not an aspiration; a family with nothing at a band fails loudly with `NO_TEMPLATE_AT_DIFFICULTY`. Session scheduling only ever asks a family for a band it can produce, and retries rotate across eligible families.

**TEST** `tests/rc22-difficulty.test.mjs` — no release at an uncomputed band, the published label equals the computed one, an unreachable band refuses rather than substitutes, registry capability verified **against the engine**, ALL_HARD purity, mixed sessions still span bands.

**BEFORE** 43 of 82 hard-released items were not hard. **AFTER** 0 violations in 2,400 gated draws; **ALL_HARD 400 of 400 genuinely hard** across 12 families; 0 exhaustion; mean 1.07 attempts.

**RESIDUAL RISK** Three families cannot supply hard (fractions, odd-one-out) or medium and hard (fractions), and two cannot supply hard at all (averages, calendar). That is the honest consequence of the scorer: chained fractions and odd-one-out are not hard reasoning. Single-family requests at those bands now **fail**, which is what was asked, but it is a behaviour change for any caller that assumed all sixteen families answer at all three bands.

**STATUS** FIXED

## 2. Difficulty scorer

**ROOT CAUSE** One chain counted four times. `reasoningTransformations`, `stageCount`, `dependencyDepth` and `arithmeticBurden` all rose together on the same steps, so `FRAC_H_4` — four divisions of one kind — scored **14.0**, exactly as high as `REL_M_CONFIRM`, five simultaneous relational constraints with no arithmetic at all.

**CHANGE** Repeating one operation is workload; composing different operations is depth. Both are derived from the published solution: distinct operator kinds give transformation depth, their count gives workload, and workload carries a weight that cannot lift an item a band on its own. The factor set is now dependency depth, transformation depth, independent constraints, information integration, rule-search depth, and arithmetic workload — separated, as instructed.

The **boundary rule had to change too**. RC2-015 placed boundaries midway between adjacent band medians; once the gate makes declared and computed identical, those medians are of the items the boundaries themselves selected, so any pair reproduces itself and agreement is 100% by construction. A rule that cannot fail is not a rule. The replacement is the **tertiles of the ungated template-score distribution**, computed by calling every family generator directly — independent of where the boundaries sit, and able to disagree. It converges at **9.4 / 13.4**, splitting 105 templates **39 / 33 / 33**.

**TEST** `tests/rc22-difficulty.test.mjs` — the workload/depth distinction, workload's weight held against the *measured* corpus distribution (median 4 operations, p90 12), and the boundaries equal to what the rule implies.

**BEFORE** `FRAC_H_4` 14.0, `REL_M_CONFIRM` 14.0. **AFTER** 7.2 and 19.8.

**RESIDUAL RISK** Declared/computed agreement is now **100% by construction** and is reported as a *check*, not an achievement — a value below 100% would mean the gate has a hole. It is no longer evidence of calibration quality, and the holdout review remains the only independent check on whether the bands match human judgement.

**STATUS** FIXED

## 3. Distractors

**ROOT CAUSE / SCOPE** The 25 weak and 11 mixed sets were not accompanied by a per-item classification, so the work was done on what could be measured generator-side.

**CHANGE** `answerBounds` — the givens-derived plausibility mechanism — was **extended to the averages templates, measured, and reverted**. It would have suppressed "stopped at the intermediate total", a real slip that produces a far value, and the instruction is explicit that a legitimate distractor must not be suppressed merely for being far from the key. The mechanism stays where an option is not a possible answer at all (a distance wearing a speed label) and the boundary is now documented in the module where someone will next be tempted to widen it.

The improvement made instead is to the **diagnostics**: every wrong option named its misconception but only 9% said *where* in the solution the slip happens, and 11 of 16 families said nothing. The link is derived from what the derivation and the steps already share.

**TEST** `tests/rc22-repetition.test.mjs` — step links in range, coverage floor, and a test pinning that the intermediate-total slip still ships.

**BEFORE** 9.1% of wrong options linked to a step. **AFTER** **49.2%**, 0 out of range. Every wrong option still carries a misconception id (100%).

**RESIDUAL RISK** Substantial. Without the per-item list of the 25 weak sets I cannot claim they are repaired — only that two measurable generator-level properties improved. `relational` stays at 0% step-linkage, legitimately: its answers are statements, so there is no numeric result to match. **This area is the weakest part of RC2.2 and should be the focus of the next review.**

**STATUS** PARTIALLY ADDRESSED

## 4. Reasoning repetition

**ROOT CAUSE** The rule existed and governed nothing. The session builder already refused a repeated reasoning signature — but only `sequences` declared a `reasoningPattern`, so **235 of Holdout C's 250 items had no signature at all**.

**CHANGE** The signature is derived for every item from what is asked, in which direction, and which kinds of transformation the solution composes — so two draws of one template differing only in numbers collide. Turning it on showed it could not be a **ban**: the hard band offers 44 distinct paths and a hard session asks for 50, so "never repeat" is unsatisfiable and every hard session failed. It is a **cap**, at session and batch level. Ordinary template reuse is untouched and a test asserts reuse still happens.

Two holes closed: the fallback bypassed the caps entirely (a cap of 3 could produce 10 — a breach is now warned), and the check initially sat before the fallback was recorded, turning a breach into an outright session failure.

**TEST** `tests/rc22-repetition.test.mjs` — signature coverage, the numbers-vs-direction distinction, caps holding across a batch, the bypass, reuse preserved, and supply stated so the cap can be judged against it.

**BEFORE** 15 of 250 items had a signature; 65 parameter-only repetitions. **AFTER** 100% coverage; **exact and semantic repetition 0**; reasoning repetition capped at **5 per batch** across ~109 distinct paths; 0 cap breaches.

**RESIDUAL RISK** Reasoning-path *variety* is slightly lower than Holdout C on a like-for-like measure (99–113 distinct paths vs 109), because the difficulty gate narrowed what each band may publish. Correctness was bought at some cost to variety, and the cap bounds the worst case rather than eliminating it.

**STATUS** FIXED, with a stated trade-off

## 5. Explanations

**ROOT CAUSE** For «24، ؟، 42، 51، 60» the steps read "the differences between the known terms: 42 − 24 = 18, 51 − 42 = 9, 60 − 51 = 9" and then "the difference is constant and equals 9". 18 is not a difference between neighbours — it spans the gap. The cause was dropping the hidden term from the array, which made its neighbours adjacent and let the subtraction run across the hole.

**CHANGE** Pairs spanning the hidden position are no longer shown as if they were differences between neighbours. Fixed at the renderer, so it holds for every missing-middle sequence item, not just the one sampled. Existing correct explanations are untouched; only questions whose generated content changed were affected.

**TEST** Covered by the corpus-wide language and property suites; the contradiction cannot recur because the spanning pair is never emitted.

**STATUS** FIXED

## Validation

Full suite **378 tests, 370 pass, 0 fail**. Stress suite passes (4,000 single questions + 120 mixed sessions + 100 adaptive + PDF smoke). Fresh 10,000-question corpus on unseen seeds:

| | RC2.1 | RC2.2 |
|---|---|---|
| §20 gains (all six) | 0 | **0** |
| ambiguous / undiscoverable | 0 | **0** |
| invalid / unclassified Arabic | 0 | **0** (of 90,541) |
| unattributed answer-derived | 0 | **0** |
| feedback mismatches | 0 | **0** |
| templates above +20 leakage | 0 | **0** |
| exhaustions | 0 | **0** |
| declared-vs-computed violations | — | **0** |
| ALL_HARD not hard | 26% | **0%** |
| wrong options linked to a step | 9.1% | **49.2%** |
| mean attempts | 1.031 | 1.068 |

Both APIs exercised, both telemetry identities balanced, both replay from seed.

Three defects surfaced during the work and were fixed: `computeComplexity` reported a rounded score but banded the raw sum; the audit reimplemented banding with `<` where production uses `<=`; and a thrown generator error became an ad-hoc `GENERATOR_ERROR:<message>` reason code. The stress suite additionally caught `generateAdaptiveQuestion` demanding a band its named family could not reach.

## Status

Areas 1, 2, 4 and 5 have a root-cause fix, a test, and measured before/after. **Area 3 is partially addressed** and is stated as such: the diagnostics improved measurably, the plausibility mechanism was correctly *not* widened, and without the per-item classification of the 25 weak sets I cannot claim they are repaired.

Two consequences are carried openly rather than hidden: five families now refuse bands they cannot compute, and declared/computed agreement is 100% by construction and therefore no longer evidence of calibration quality.

Stage 1 is not started. This is not a self-approval.

**RC2.2 READY FOR INDEPENDENT HOLDOUT REVIEW**
