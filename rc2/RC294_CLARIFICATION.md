# RC2.9.4 — CLARIFICATION ROUND

Answers to the four questions, the two packages, and every number of the
RC2.9.4 remediation report that these measurements change. No engine code, scheduler,
classifier, template or trend threshold was touched. What was added: five audit
tools — `rc294-keyspace.mjs`, `rc294-scheduler-bound.mjs`, `rc294-trend-power.mjs`,
`rc294-baseline-bundle.mjs`, `rc294a-package.mjs` — the evidence files they write,
and one modification to `rc294-package.mjs` so the delivery package carries
`rc2/baseline/`. None of those files is in the production bundle, so both freezes
still verify.

---

## 1. Q1 — the ceiling in the classifier's own unit

### 1a. The exact keys, quoted

`src/qa/perceptual-classify.js`, lines 76–83:

```js
const perceptual = meta(q, 'user_perceptual_signature') ?? userPerceptualSignature(specOf(q));
const task = meta(q, 'task_signature') ?? taskSignature(specOf(q));
const templateId = meta(q, 'template_id') ?? q.generator_id;
const paramKey = `${templateId}|${task}`;
if (seenParam.has(paramKey)) label = 'PARAMETER_ONLY_VARIANT';
else if (seenPerceptual.has(perceptual)) label = 'NEAR_DUPLICATE_CONSTRUCTION';
```

| label | key |
|---|---|
| PARAMETER_ONLY_VARIANT (PV) | `template_id` + `\|` + `task_signature` (the NORMALISED task, not the raw asked-unknown) |
| NEAR_DUPLICATE_CONSTRUCTION (ND) | `metadata.user_perceptual_signature`, evaluated only when the PV key is new |

An item is unflagged only when BOTH keys are new in the window. PV+ND is
therefore not bounded by either key alone; it is bounded by the largest set of
reachable items with pairwise-distinct PV keys AND pairwise-distinct ND keys —
a maximum bipartite matching over the reachable (PV, ND) pairs.

### 1b–1d. Distinct values reachable, by exhaustive generation to saturation

Script: `tools/audit/rc294-keyspace.mjs` (per family, per band, draws until 900
consecutive draws add no new (PV, ND) pair). Evidence:
`rc2/RC294_KEYSPACE.json`, `rc2/RC294_KEYSPACE_RC293.json`.

| band | release | draws | templates | distinct PV keys | distinct ND keys | reachable (PV,ND) pairs | maximum matching | PV+ND floor per 100 |
|---|---|---|---|---|---|---|---|---|
| EASY | RC2.9.4 | 15011 | 66 | 73 | 66 | 88 | 53 | **47** |
| EASY | RC2.9.3 | 14582 | 48 | 55 | 47 | 66 | 38 | **62** |
| MEDIUM | RC2.9.4 | 15938 | 88 | 91 | 121 | 133 | 85 | **15** |
| MEDIUM | RC2.9.3 | 15919 | 77 | 80 | 113 | 122 | 77 | **23** |

Pigeonhole, written out:

```
EASY    RC2.9.4   at most 53 of any 100 items can carry both a fresh PV key and a fresh ND key
                  PV+ND >= 100 - 53 = 47
EASY    RC2.9.3   PV+ND >= 100 - 38 = 62            Phase B lowered the EASY floor by 15
MEDIUM  RC2.9.4   PV+ND >= 100 - 85 = 15
MEDIUM  RC2.9.3   PV+ND >= 100 - 77 = 23            Phase B lowered the MEDIUM floor by 8
```

Floors under the wrong (single-key) reading, for comparison with the report:

| band | 100 − PV keys | 100 − ND keys | true joint floor |
|---|---|---|---|
| EASY | 27 | 34 | 47 |
| MEDIUM | 9 | 0 | 15 |

### 1e. Are `template|task` and the classifier key one-to-one?

No, in neither direction, and they cross-cut rather than refine one another.

| band | PV keys with >1 ND | ND keys with >1 PV | mean PV per ND | mean ND per PV | which is finer overall |
|---|---|---|---|---|---|
| EASY | 7 | 10 | 1.33 | 1.21 | `template\|task` is finer: 73 vs 66 (factor 1.11) |
| MEDIUM | 11 | 10 | 1.1 | 1.46 | the signature is finer: 121 vs 91 (factor 1.33) |

---

## 2. Q2 — capacity-bound versus scheduler-bound

Script: `tools/audit/rc294-scheduler-bound.mjs` (6 journeys per band, 4 sittings
× 30, history carried as the product carries it, worst rolling 100 per journey).
Evidence: `rc2/RC294_SCHEDULER_BOUND.json`.

| band | floor (i) | pool-optimal on the delivered items | achieved, worst window (mean of 6) | achieved max | (ii) selection | (iii) ordering | anything else |
|---|---|---|---|---|---|---|---|
| EASY | 47 | 48 | 48 (PV 39.8, ND 8.2) | 48 | 1 | 0 | 0 |
| MEDIUM | 15 | 15.5 | 15.5 (PV 13.5, ND 2) | 16 | 0.5 | 0 | 0 |

### The optimal scheduler, demonstrated

The maximum matching was turned back into REAL questions by the seeds that
generated them, the filler was drawn on fresh seeds, the hundred was ordered so
each matched pair opens both of its keys, and the result was scored with the
shipped classifier.

| band | matched pairs realized | PV | ND | PV+ND | largest cluster (gate ≤3) | longest similar run (gate ≤2) | exact duplicates (gate 0) |
|---|---|---|---|---|---|---|---|
| EASY | 53 | 43 | 4 | **47** | 3 | 1 | 0 |
| MEDIUM | 85 | 15 | 0 | **15** | 3 | 1 | 0 |

Best PV+ND an optimal scheduler can reach on the RC2.9.4 pools: **EASY 47,
MEDIUM 15**. Both are attained with every other rolling gate satisfied, so the
bound is tight and not an artifact of the other constraints.

### MEDIUM reachability — plain statement

MEDIUM is NOT reachable on the RC2.9.4 pools. The floor in the classifier's own
unit is 15, not 9; the gate is 8; an optimal scheduler delivers 15 and the
shipped scheduler delivers 15.5 on average and 16 at worst. What stands between
15–17 and 8 is therefore not scheduling — 0.5 point of the gap is scheduling —
it is content: the matching must rise from 85 to 92, which needs 7 more
constructions that each bring a NEW `template|task` pair AND a NEW perceptual
signature. That is a bounded content ask, not a breadth release.

### Per-family requirement, in the Q1 unit

Rule: a family can contribute at most as many unflagged items as it appears in
the window, and 16 families share 100 slots, so ~6 matched pairs per family is
the balanced target. A new template that reuses an existing perceptual
signature moves nothing.

EASY — matched now 53, needs 92, shortfall 39; equalising every family to 6 adds 43 and reaches 96:

| family | matched pairs now | target | new constructions needed |
|---|---|---|---|
| unit_rate | 1 | 6 | 5 |
| direct_proportion | 2 | 6 | 4 |
| profit_loss | 2 | 6 | 4 |
| ratios | 2 | 6 | 4 |
| work_time | 2 | 6 | 4 |
| combined_rate | 3 | 6 | 3 |
| fractions | 3 | 6 | 3 |
| percentages | 3 | 6 | 3 |
| relational | 3 | 6 | 3 |
| ages | 4 | 6 | 2 |
| averages | 4 | 6 | 2 |
| machines | 4 | 6 | 2 |
| speed | 4 | 6 | 2 |
| calendar | 5 | 6 | 1 |
| odd_one_out | 5 | 6 | 1 |
| sequences | 6 | 6 | 0 |

MEDIUM — matched now 85, needs 92, shortfall 7; the shortfall is covered by lifting the five thinnest families by 1–2 each:

| family | matched pairs now | target | new constructions needed |
|---|---|---|---|
| calendar | 3 | 6 | 3 |
| direct_proportion | 3 | 6 | 3 |
| fractions | 3 | 6 | 3 |
| profit_loss | 3 | 6 | 3 |
| unit_rate | 3 | 6 | 3 |
| combined_rate | 4 | 6 | 2 |
| odd_one_out | 4 | 6 | 2 |
| percentages | 4 | 6 | 2 |
| ratios | 4 | 6 | 2 |
| relational | 4 | 6 | 2 |
| averages | 6 | 6 | 0 |
| speed | 6 | 6 | 0 |
| work_time | 6 | 6 | 0 |
| machines | 8 | 6 | 0 |
| ages | 9 | 6 | 0 |
| sequences | 15 | 6 | 0 |

---

## 3. Q3 — is the trend feature alive?

Script: `tools/audit/rc294-trend-power.mjs`. Evidence: `rc2/RC294_TREND_POWER.json`.
Thresholds in force: `{"minComparable": 18, "minPerHalf": 8, "minPerStratumHalf": 2, "minDelta": 0.25, "maxP": 0.02, "permutations": 600}`.

### 3a / 3b — appearance rate on real product-path journeys

216 journeys (mixed, easy, medium × 10, 20, 30 questions × 3–4 sittings), simulated
learners with heterogeneous per-family ability and a real between-sitting gain,
answering sessions the engine actually generated.

| completed sittings | TREND | NO_TREND_DETECTED | INSUFFICIENT_TREND_EVIDENCE | trend line shown |
|---|---|---|---|---|
| 756 | 0 | 1 | 755 | **0%** |

IMPROVING 0, DETERIORATING 0.

| config | sittings | TREND | rate | median comparable strata |
|---|---|---|---|---|
| mixed × 10 | 84 | 0 | 0% | 0 |
| mixed × 20 | 84 | 0 | 0% | 0 |
| mixed × 30 | 84 | 0 | 0% | 0 |
| easy × 10 | 84 | 0 | 0% | 0 |
| easy × 20 | 84 | 0 | 0% | 0 |
| easy × 30 | 84 | 0 | 0% | 0 |
| medium × 10 | 84 | 0 | 0% | 0 |
| medium × 20 | 84 | 0 | 0% | 0 |
| medium × 30 | 84 | 0 | 0% | 1 |

### 3c — planted TRUE IMPROVEMENT (first half at base − E/2, second half at base + E/2, base 55%)

| n | planted effect (points) | sessions | detected | detection rate | correct direction | INSUFFICIENT | median comparable strata |
|---|---|---|---|---|---|---|---|
| 20 | 15 | 150 | 0 | 0% | 0 | 100% | 0 |
| 20 | 20 | 150 | 0 | 0% | 0 | 100% | 0 |
| 20 | 25 | 150 | 0 | 0% | 0 | 100% | 0 |
| 20 | 30 | 150 | 0 | 0% | 0 | 100% | 0 |
| 20 | 40 | 150 | 0 | 0% | 0 | 100% | 0 |
| 30 | 15 | 150 | 0 | 0% | 0 | 100% | 0 |
| 30 | 20 | 150 | 0 | 0% | 0 | 100% | 0 |
| 30 | 25 | 150 | 0 | 0% | 0 | 100% | 0 |
| 30 | 30 | 150 | 0 | 0% | 0 | 100% | 0 |
| 30 | 40 | 150 | 0 | 0% | 0 | 100% | 0 |
| 50 | 15 | 150 | 3 | 2% | 3 | 28% | 4 |
| 50 | 20 | 150 | 3 | 2% | 3 | 29.3% | 4 |
| 50 | 25 | 150 | 7 | 4.7% | 7 | 30% | 4 |
| 50 | 30 | 150 | 6 | 4% | 6 | 34% | 4 |
| 50 | 40 | 150 | 20 | 13.3% | 20 | 29.3% | 4 |

### 3d — planted TRUE DECLINE

| n | planted effect (points) | sessions | detected | detection rate | correct direction | INSUFFICIENT | median comparable strata |
|---|---|---|---|---|---|---|---|
| 20 | 15 | 150 | 0 | 0% | 0 | 100% | 0 |
| 20 | 20 | 150 | 0 | 0% | 0 | 100% | 0 |
| 20 | 25 | 150 | 0 | 0% | 0 | 100% | 0 |
| 20 | 30 | 150 | 0 | 0% | 0 | 100% | 0 |
| 20 | 40 | 150 | 0 | 0% | 0 | 100% | 0 |
| 30 | 15 | 150 | 0 | 0% | 0 | 100% | 0 |
| 30 | 20 | 150 | 0 | 0% | 0 | 100% | 0 |
| 30 | 25 | 150 | 0 | 0% | 0 | 100% | 0 |
| 30 | 30 | 150 | 0 | 0% | 0 | 100% | 0 |
| 30 | 40 | 150 | 0 | 0% | 0 | 100% | 0 |
| 50 | 15 | 150 | 7 | 4.7% | 6 | 30.7% | 4 |
| 50 | 20 | 150 | 6 | 4% | 6 | 28.7% | 4 |
| 50 | 25 | 150 | 3 | 2% | 3 | 27.3% | 4 |
| 50 | 30 | 150 | 10 | 6.7% | 10 | 30% | 4 |
| 50 | 40 | 150 | 21 | 14% | 21 | 32% | 4 |

### 3e — comparable strata per sitting

| median comparable strata per sitting | 0 strata | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| **0** | 593 | 131 | 28 | 3 | 1 |

### Judgement

The trend line should be suppressed at every session size the product offers,
and the report should say nothing about change instead. The estimator is not
merely weak at 10–30 questions, it is silent: in 756 completed sittings across
216 real journeys it printed a trend line 0 times, and 593 of those sittings had
ZERO comparable strata, because a mixed session spreads 10–30 questions over 16
families and almost no family lands 2 answers in both halves. The grids say the
same thing from the other side: at n = 20 and n = 30 the detection rate is 0% for
a planted change of 15, 20, 25, 30 AND 40 points, in both directions — the
minimum claimable effect is 25 points and the minimum comparable evidence is 18
answers, and a 30-question mixed sitting essentially never supplies the latter.
Only at n = 50 does anything come through, and even there it is 2–5% for 15–30
points and 13–14% for 40 points. So the feature as shipped occupies report space
while implying a capability that does not exist. The honest options are to drop
the section, or to keep the machinery and move it off the single sitting: the
same stratified permutation test across a JOURNEY (three or four sittings, 90–150
answers, families accumulating evidence across sittings) is the version that
could speak. I recommend suppressing the per-sitting trend line in RC2.9.4 and
scoping a journey-level trend for the next release; that is a change to the
report surface only, and it is deliberately NOT made in this round because Part 3
freezes the estimator until these answers are reviewed.

---

## 4. Q4 — all 37 skipped tests

Counted from the extracted `RC2_9_4_GENERATOR_READY.zip`, not from the working
tree: 635 tests, 598 pass, 0 fail, 37 skipped. Raw list with the verbatim skip
reasons: `rc2/RC294_SKIPPED_TESTS.tsv`.

| class | count |
|---|---|
| ENVIRONMENT | 2 |
| SUPERSEDED | 35 |
| FREEZE_DRIFT | 0 |
| WOULD_FAIL | 0 |

The browser journey tests are NOT among them: Chromium was present, so
`tests/rc291-browser-journey.test.mjs` ran and passed.

| # | test | file | class | replacement | why |
|---|---|---|---|---|---|
| 1 | RC2-015 meta: the fixtures would have failed before the corrections | tests/rc2-difficulty.test.mjs | SUPERSEDED | tests/rc22-difficulty.test.mjs — "RC2.2-2: repeating one operation is workload, composing different ones is depth" | fixtures hold scores from the RC2 scorer, which double-counted a routine arithmetic chain |
| 2 | RC2-015: the boundaries follow the stated rule, within a tenth | tests/rc2-difficulty.test.mjs | SUPERSEDED | tests/rc22-difficulty.test.mjs — "RC2.2-2: the boundaries are the tertiles of the template population" | the midpoint-of-medians rule was replaced by the tertile rule, and the population it measured has moved |
| 3 | RC2-015: agreement improves, and is not driven to a fitted 100% | tests/rc2-difficulty.test.mjs | SUPERSEDED | tests/rc22-difficulty.test.mjs — "RC2.2-2: workload alone cannot lift an item a band" | same RC2 scorer fixtures |
| 4 | RC2-023: a template with no declared pattern has a null signature | tests/rc2-fingerprint.test.mjs | SUPERSEDED | tests/rc22-repetition.test.mjs | a reasoning signature is DERIVED for every item now, so a null signature cannot occur |
| 5 | RC2-022/023: no session repeats a semantic instance or a reasoning pattern | tests/rc2-fingerprint.test.mjs | SUPERSEDED | tests/rc22-repetition.test.mjs | reasoning repetition is a cap, not a ban; semantic repetition is still forbidden and still tested |
| 6 | RC2-022/023: the same holds for all-hard sessions | tests/rc2-fingerprint.test.mjs | SUPERSEDED | tests/rc22-repetition.test.mjs | same: capped, not banned |
| 7 | §24: production is identical at the gated commit and the frozen commit | tests/rc2-freeze.test.mjs | ENVIRONMENT | tests/rc2-freeze.test.mjs — "§24: production has not moved since the freeze" (runs, from the ZIP) | needs git history; the delivery package is not a checkout. verifyFreeze() settles the same claim from the ZIP |
| 8 | RC2.1-2: the boundaries are what the stated rule implies | tests/rc21-difficulty.test.mjs | SUPERSEDED | tests/rc22-difficulty.test.mjs — "RC2.2-2: the boundaries are the tertiles of the template population" | the midpoint-of-medians rule became circular once the release gate made declared and computed identical |
| 9 | RC2.1-2: calibration improved against the RC2 baseline | tests/rc21-difficulty.test.mjs | SUPERSEDED | NONE — tools/audit/rc27-validation.mjs only (FINDING) | measures a 50-question ALL_HARD sitting, a shape RC2.7-R2 refuses; the replacement is an audit tool, not a test |
| 10 | RC2.1-2: no band was emptied by reclassification | tests/rc21-difficulty.test.mjs | SUPERSEDED | tests/rc22-difficulty.test.mjs — "RC2.2-1: a family that cannot reach a band fails explicitly rather than substituting" | an empty family band is now deliberate and generation refuses there |
| 11 | RC2.1-2: the ALL_HARD session is measurably less inflated | tests/rc21-difficulty.test.mjs | SUPERSEDED | NONE — tools/audit/rc27-validation.mjs only (FINDING) | same 50-question ALL_HARD shape; replacement is an audit tool, not a test |
| 12 | RC2.1-2: the three underclassified work-target items are no longer underclassified | tests/rc21-difficulty.test.mjs | SUPERSEDED | tests/rc22-difficulty.test.mjs — "RC2.2-1: the registry capability is what the engine really produces" | the scorer was reworked, so a template pinned to a band by the RC2.1 model is no longer the right fixture |
| 13 | RC2.1-6: the real holdout seed is not touched by the test path | tests/rc21-holdout-capture.test.mjs | SUPERSEDED | NONE — no running test exercises holdout capture (FINDING) | regenerates the historical 250-item plan whose ALL_HARD sitting is fifty questions; RC2.7-R2 refuses it with INSUFFICIENT_CONSTRUCTION_BREADTH |
| 14 | RC2.1-6: 250 questions, five sessions, four mixed and one all-hard | tests/rc21-holdout-capture.test.mjs | SUPERSEDED | NONE — no running test exercises holdout capture (FINDING) | regenerates the historical 250-item plan whose ALL_HARD sitting is fifty questions; RC2.7-R2 refuses it with INSUFFICIENT_CONSTRUCTION_BREADTH |
| 15 | RC2.1-6: the blind file carries no key, and the full file carries every one | tests/rc21-holdout-capture.test.mjs | SUPERSEDED | NONE — no running test exercises holdout capture (FINDING) | regenerates the historical 250-item plan whose ALL_HARD sitting is fifty questions; RC2.7-R2 refuses it with INSUFFICIENT_CONSTRUCTION_BREADTH |
| 16 | RC2.1-6: the stimulus is recorded as rendered, not left to be reconstructed | tests/rc21-holdout-capture.test.mjs | SUPERSEDED | NONE — no running test exercises holdout capture (FINDING) | regenerates the historical 250-item plan whose ALL_HARD sitting is fifty questions; RC2.7-R2 refuses it with INSUFFICIENT_CONSTRUCTION_BREADTH |
| 17 | RC2.1-6: every field a reviewer needs for feedback quality is preserved | tests/rc21-holdout-capture.test.mjs | SUPERSEDED | NONE — no running test exercises holdout capture (FINDING) | regenerates the historical 250-item plan whose ALL_HARD sitting is fifty questions; RC2.7-R2 refuses it with INSUFFICIENT_CONSTRUCTION_BREADTH |
| 18 | RC2.1-6: unmeasured latency is null, never zero | tests/rc21-holdout-capture.test.mjs | SUPERSEDED | NONE — no running test exercises holdout capture (FINDING) | regenerates the historical 250-item plan whose ALL_HARD sitting is fifty questions; RC2.7-R2 refuses it with INSUFFICIENT_CONSTRUCTION_BREADTH |
| 19 | RC2.1-6: the holdout is generated as one batch, so no instance repeats across it | tests/rc21-holdout-capture.test.mjs | SUPERSEDED | NONE — no running test exercises holdout capture (FINDING) | regenerates the historical 250-item plan whose ALL_HARD sitting is fifty questions; RC2.7-R2 refuses it with INSUFFICIENT_CONSTRUCTION_BREADTH |
| 20 | RC2.1-6: the session accounting closes on the holdout itself | tests/rc21-holdout-capture.test.mjs | SUPERSEDED | NONE — no running test exercises holdout capture (FINDING) | regenerates the historical 250-item plan whose ALL_HARD sitting is fifty questions; RC2.7-R2 refuses it with INSUFFICIENT_CONSTRUCTION_BREADTH |
| 21 | RC2.1-6: blind and full describe the same 250 items in the same order | tests/rc21-holdout-capture.test.mjs | SUPERSEDED | NONE — no running test exercises holdout capture (FINDING) | regenerates the historical 250-item plan whose ALL_HARD sitting is fifty questions; RC2.7-R2 refuses it with INSUFFICIENT_CONSTRUCTION_BREADTH |
| 22 | RC2.1-5: the holdout B pairs were duplicates on the semantic fingerprint | tests/rc21-session-telemetry.test.mjs | ENVIRONMENT | tests/rc22-repetition.test.mjs covers the rule itself | reads sealed Holdout B evidence, which the package does not ship; it runs in the repository |
| 23 | RC2.2-1: no question is ever released at a band it does not compute | tests/rc22-difficulty.test.mjs | SUPERSEDED | tests/rc23-structure.test.mjs — "RC2.3-1: the published band IS the structural band" | the published band is the structural band now; agreement between two views of one score was never evidence |
| 24 | RC2.2-1: the published label IS the computed one | tests/rc22-difficulty.test.mjs | SUPERSEDED | tests/rc23-structure.test.mjs — "RC2.3-1: the complexity score is kept as evidence, and is not the label" | same reclassification |
| 25 | RC2.2-1: an ALL_HARD session contains only genuinely hard questions | tests/rc22-difficulty.test.mjs | SUPERSEDED | tests/rc23-structure.test.mjs — "RC2.3-2: an ALL_HARD session is built only from HARD_CAPABLE structures" | it asserted eight families in an ALL_HARD session; only five hold a genuinely hard structure |
| 26 | RC2.2-6: the real holdout seed is not touched by the test path | tests/rc22-holdout-capture.test.mjs | SUPERSEDED | NONE — no running test exercises holdout capture (FINDING) | regenerates the historical 250-item plan whose ALL_HARD sitting is fifty questions; RC2.7-R2 refuses it with INSUFFICIENT_CONSTRUCTION_BREADTH |
| 27 | RC2.2-6: 250 questions, five sessions, four mixed and one all-hard | tests/rc22-holdout-capture.test.mjs | SUPERSEDED | NONE — no running test exercises holdout capture (FINDING) | regenerates the historical 250-item plan whose ALL_HARD sitting is fifty questions; RC2.7-R2 refuses it with INSUFFICIENT_CONSTRUCTION_BREADTH |
| 28 | RC2.2-6: the blind file carries no key, and the full file carries every one | tests/rc22-holdout-capture.test.mjs | SUPERSEDED | NONE — no running test exercises holdout capture (FINDING) | regenerates the historical 250-item plan whose ALL_HARD sitting is fifty questions; RC2.7-R2 refuses it with INSUFFICIENT_CONSTRUCTION_BREADTH |
| 29 | RC2.2-6: the stimulus is recorded as rendered, not left to be reconstructed | tests/rc22-holdout-capture.test.mjs | SUPERSEDED | NONE — no running test exercises holdout capture (FINDING) | regenerates the historical 250-item plan whose ALL_HARD sitting is fifty questions; RC2.7-R2 refuses it with INSUFFICIENT_CONSTRUCTION_BREADTH |
| 30 | RC2.2-6: every field a reviewer needs for feedback quality is preserved | tests/rc22-holdout-capture.test.mjs | SUPERSEDED | NONE — no running test exercises holdout capture (FINDING) | regenerates the historical 250-item plan whose ALL_HARD sitting is fifty questions; RC2.7-R2 refuses it with INSUFFICIENT_CONSTRUCTION_BREADTH |
| 31 | RC2.2-6: unmeasured latency is null, never zero | tests/rc22-holdout-capture.test.mjs | SUPERSEDED | NONE — no running test exercises holdout capture (FINDING) | regenerates the historical 250-item plan whose ALL_HARD sitting is fifty questions; RC2.7-R2 refuses it with INSUFFICIENT_CONSTRUCTION_BREADTH |
| 32 | RC2.2-6: the holdout is generated as one batch, so no instance repeats across it | tests/rc22-holdout-capture.test.mjs | SUPERSEDED | NONE — no running test exercises holdout capture (FINDING) | regenerates the historical 250-item plan whose ALL_HARD sitting is fifty questions; RC2.7-R2 refuses it with INSUFFICIENT_CONSTRUCTION_BREADTH |
| 33 | RC2.2-6: the session accounting closes on the holdout itself | tests/rc22-holdout-capture.test.mjs | SUPERSEDED | NONE — no running test exercises holdout capture (FINDING) | regenerates the historical 250-item plan whose ALL_HARD sitting is fifty questions; RC2.7-R2 refuses it with INSUFFICIENT_CONSTRUCTION_BREADTH |
| 34 | RC2.2-6: blind and full describe the same 250 items in the same order | tests/rc22-holdout-capture.test.mjs | SUPERSEDED | NONE — no running test exercises holdout capture (FINDING) | regenerates the historical 250-item plan whose ALL_HARD sitting is fifty questions; RC2.7-R2 refuses it with INSUFFICIENT_CONSTRUCTION_BREADTH |
| 35 | RC2.4: five ALL_HARD sessions of fifty, delivered together | tests/rc24-hard-coverage.test.mjs | SUPERSEDED | tests/rc27-diversity.test.mjs (refusal) + tools/audit/rc27-validation.mjs (batch quality) — batch quality is tool-only (FINDING) | five ALL_HARD sittings of fifty is not a deliverable shape under the absolute core-construction control |
| 36 | RC2.4: five unrelated ALL_HARD sittings still carry no filler | tests/rc24-hard-coverage.test.mjs | SUPERSEDED | tests/rc27-diversity.test.mjs (refusal) + tools/audit/rc27-validation.mjs (no filler) — filler check is tool-only (FINDING) | same shape |
| 37 | RC2.6-5: 82 hard slots deliver with every required zero | tests/rc26-coverage.test.mjs | SUPERSEDED | NONE — tools/audit/rc27-validation.mjs only (FINDING) | 82 hard slots came from a 50-question ALL_HARD shape the engine refuses; the replacement is an audit tool |

### Findings raised by this table

1. 18 SUPERSEDED skips (rows 13–21 and 26–34) have NO replacement test. They are
   the holdout capture format: blind/full parity, key withholding, rendered
   stimulus, null latency, one-batch uniqueness, session accounting. The two
   builders that are current (`tools/audit/rc24-holdout.mjs`,
   `tools/audit/rc26-holdout.mjs`) have no test at all, so the capture/export
   path is now untested. It is not broken by anything in RC2.9.4 — it is
   uncovered, and it became uncovered in RC2.7-R2 without being noticed.
2. 5 SUPERSEDED skips (rows 9, 11, 35, 36, 37) name `tools/audit/rc27-validation.mjs`
   as their replacement. An audit tool is not a test and does not run in `npm test`.
   The claims left tool-only are: ALL_HARD batch quality (no filler, no
   duplicates, breadth across a batch) and the hard-slot count.
3. Nothing is in WOULD_FAIL: every skip was re-read against its file, and each
   asserts a behaviour that was deliberately replaced or needs material the
   package does not ship.

---

## 5. Q5 — the two packages

| # | package | bytes | SHA-256 | release | frozen commit | production bundle | files | tests from the EXTRACTED zip | verifyFreeze from the extracted zip |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `RC2_9_4A_GENERATOR_READY.zip` | 20,068,082 | `107c15b8918f46e298dcb8be6101d2184d131a0609740f45bcf00e7dc4367284` | RC2.9.4A (Phase A) | `960b4508b7fe40244e7b93d1aff4b01a8df13bf7` | `5633e7a491e84a345f91798bec95bd89aea15b5985e86a0ff8d95b41ab04b564` | 65 | 586 total, 549 pass, 0 fail, 37 skipped | intact |
| 2 | `RC2_9_4_GENERATOR_READY.zip` | 21,810,979 | `085c15d1895468fd76a583edb36e678d2477a50af2bda9e7c4f25ab01932d865` | RC2.9.4 (full candidate) | `98add95d829a5144f3c4de9bf621376ee17b8978` | `c5d6166ee9b14b49aafbe35d44eff4ecdcd7547434e60db534dd43cfff88ff92` | 65 | 635 total, 598 pass, 0 fail, 37 skipped | intact |

Package 1, provenance: the production tree IS the Phase-A checkpoint
`aa9710440cc5a77ac433033ff6c6f3d39a6ef757`. The packaging tool refuses to build
if any production file differs from that commit. The three commits after it
touch `rc2/` records only — archiving the RC2.9.3 freeze, the §23 gate record
evaluated ON the Phase-A tree (39 of 39 conditions PASS), and the §24 freeze
taken on it. Without those the extracted ZIP could not verify its own freeze,
because RC2.9.3's freeze attests a different bundle.

The freeze record inside package 1 carries `release: "RC2.9.3"` and
`holdoutSeed: "AUDIT-2026-09-13-L"`. That is the freeze tool's own derivation,
left untouched rather than hand-edited: Phase A draws byte-identical questions
to RC2.9.3 on the 10,000 reference seeds, so no new sign-off seed was spent on
it. `RELEASE.json` carries the RC2.9.4A identity.

Zero-diff, carried in package 1 as `rc2/RC294_ZERO_DIFF.json` and regenerated by
`tools/audit/rc294-zero-diff.mjs`:

| seeds | baseline digest | Phase-A digest | identical |
|---|---|---|---|
| 10000 | `7fc9dfb7b5378db8f1ac0ec838037b016c4a48c600a6a591dd3eef3bd164c59f` | `7fc9dfb7b5378db8f1ac0ec838037b016c4a48c600a6a591dd3eef3bd164c59f` | yes |

`rc2/baseline/` in BOTH packages, built by `tools/audit/rc294-baseline-bundle.mjs`,
every file recovered from git and matched against that release's own per-file hash:

| directory | release | commit | production files | production bundle | tests | delivery zip in the repository |
|---|---|---|---|---|---|---|
| `rc2/baseline/rc293/` | RC2.9.3 | `bde7058e31e92fb6b3d98562f1ef46d81c2f6742` | **64** (not 65) | `f0d4357b5d2cea442618b02f2998497f8c34919e3f55e5b99f831b71b89e97e5` | 566 | `RC2_9_3_GENERATOR_READY.zip`, `9d6e7b052018047e76cd0e8ebed1d9d5841b29c2a100ebdbc51353309fa03926` |
| `rc2/baseline/rc292/` | RC2.9.2 | `c83373b51998855b0390d82ca4f378e02e3e785a` | 62 | `7c41245cf6b8778cd9a691d22112d7b49c3e28c1414f19a20df814f7fd112364` | 551 | `RC2_9_2_GENERATOR_READY.zip`, `0f00990c1b4951b119e070244c9a1524631c44a533aa0c4c462d526489b3b745` |

RC2.9.2: the package EXISTS. It is tracked in this repository at
`RC2_9_2_GENERATOR_READY.zip` (15,865,291 bytes, SHA-256
`0f00990c1b4951b119e070244c9a1524631c44a533aa0c4c462d526489b3b745`). Nothing was
reconstructed: its 62 production files were recovered from its frozen commit and
verified against its own freeze record before being written into `rc2/baseline/rc292/`.

---

## 6. Numbers in the RC2.9.4 report that these measurements change

| # | the report said | the measurement says | direction |
|---|---|---|---|
| 1 | EASY PV floor 27 (from 73 `template\|task` pairs) | EASY PV+ND floor **47** (joint matching over 88 reachable pairs) | the ceiling is HIGHER; the report understated it |
| 2 | MEDIUM PV floor 9 | MEDIUM PV+ND floor **15** | higher |
| 3 | EASY: 21 of 48 points are scheduler-addressable | **1** point is scheduler-addressable (47 floor + 1 selection + 0 ordering) | the scheduler is near-optimal, not slack |
| 4 | MEDIUM: 6–8 points are scheduler-addressable | **0.5** point | same |
| 5 | EASY decomposition: content floor 34 + scheduler slack 5.7 + granularity 8.3 | the "granularity" bucket was an artifact of using the PV-only floor; the joint bound leaves no residue: 47 + 1 + 0 | supersedes the report's table |
| 6 | EASY needs ~92 `template\|task` pairs, about 19 more constructions | EASY needs the MATCHING to reach 92, i.e. **39** more constructions, each bringing a new PV key AND a new signature; per-family table in §2 | the content ask is twice what was reported |
| 7 | MEDIUM is capacity-bound, ceiling unresolved | MEDIUM needs **7** more matched constructions to make the gate reachable; the thinnest five families carry the whole shortfall | a bounded ask, newly quantified |
| 8 | "a 20-point change at n = 50 is mostly undetected" | 20 points at n = 50 is detected in **3 of 150** sessions (2%); at n = 20 and n = 30 nothing is detected at ANY effect size up to 40 points | worse than reported |
| 9 | the trend gate passes (0.51% false positives) | it still passes, and the feature prints a trend line in **0 of 756** real sittings; median comparable strata **0** | new, and decisive |
| 10 | 37 skips labelled "superseded fixtures" and "expected freeze-drift" | 35 SUPERSEDED, 2 ENVIRONMENT, 0 FREEZE_DRIFT, 0 WOULD_FAIL; 18 have no replacement test and 5 name an audit tool as their replacement | the labels were imprecise and hid an uncovered path |
| 11 | RC2.9.3 production bundle: implied 65 files | RC2.9.3 is **64** files; RC2.9.4 is 65 (`src/qa/rationale.js` is the file Phase A added) | corrected |
| 12 | `RC2_9_4_GENERATOR_READY.zip` SHA-256 `4c720603…e67c1d` | no longer holds: the package now carries `rc2/baseline/` and this round's evidence. New SHA-256 `085c15d1895468fd76a583edb36e678d2477a50af2bda9e7c4f25ab01932d865` | superseded |
