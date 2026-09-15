# RC2.9.4 — HYBRID FINAL REMEDIATION REPORT

Baseline: RC2.9.3, frozen commit `bde7058e31e92fb6b3d98562f1ef46d81c2f6742`, bundle `f0d4357b5d2cea442618b02f2998497f8c34919e3f55e5b99f831b71b89e97e5`, ZIP `9d6e7b052018047e76cd0e8ebed1d9d5841b29c2a100ebdbc51353309fa03926`.
Authoritative defect evidence: `RC293_INDEPENDENT_SIGNOFF.pdf` and `PHASE_A_SEALED.pdf` (supplied mid-session; every defect named there matches the defect list this remediation was built against, and the sign-off's four quoted rationale contradictions, the trend-permutation failure, the 50% cliff, the 3-of-10 headline, the thin cells and the WORK_E_INVERSE symmetry are each addressed below by name).

## Deliverable

| item | value |
|---|---|
| package | `RC2_9_4_GENERATOR_READY.zip` |
| ZIP SHA-256 | `4c720603d5acf40aa4c95681f7740c340c4a071a8d82fc1fdb554723a1e67c1d` |
| frozen commit | `98add95d829a5144f3c4de9bf621376ee17b8978` |
| tree | `05fac3af3fba4e809116290f1386aa1d11c3f94c` |
| production bundle SHA-256 | `c5d6166ee9b14b49aafbe35d44eff4ecdcd7547434e60db534dd43cfff88ff92` (65 files) |
| engine | 1.5.4, 184 templates, 16 families |
| test suite | 635 tests: 597 pass, 0 fail, 35 skipped (superseded fixtures, each with its reason) — freeze-drift tests pass on the frozen tree; 37 new tests in this release (8 A0 reproductions, 5 feedback corpus gates, 7 analytics, 17 EASY/MEDIUM template suites incl. B7) |
| Phase-A checkpoint commit | `aa97104` (zero-diff proof below) |
| sign-off holdout named, not generated | `AUDIT-2026-09-13-M` |

Production files changed — Phase A (feedback and analytics only): `performance-model.js`, `src/qa/pipeline.js`, `src/qa/rationale.js` (new), `src/qa/reasons.js`, `src/utils.js`, `package.json`.
Production files changed — Phase B: `app.js`, `index.html`, `generator_manifest.json`, `package.json`, `src/index.js`, `src/registry.js`, `src/compose/blueprint-scheduler.js`, `src/compose/blueprints.js`, `src/compose/diversity-history.js`, `src/qa/complexity.js`, `src/qa/perceptual-taxonomy.js`, `src/qa/rationale.js`, `src/qa/structure.js`, `src/families/_shared.js`, `src/families/{ages,averages,calendar,direct_proportion,fractions,machines,ratios,relational,sequences,speed,unit_rate,work_time}.js`.

Suites (every claim below names its suite): FEEDBACK/ANALYTICS = `tests/rc294-phase-a`, `rc294-feedback`, `rc294-analytics`, `rc293-performance-model`; EASY = `tests/rc294-easy` + `rc2/RC294_SINGLE_BAND_ACCEPTANCE.txt` (EASY section); MEDIUM = `tests/rc294-medium` + same file (MEDIUM section); MIXED REGRESSION = `rc2/RC294_ROLLING_ACCEPTANCE.txt` + `tests/rc292-rolling-journey`, `rc28-diversity`, `rc27-diversity`; CORRECTNESS = `rc2/RC294_BAND_CORPUS.md`, `rc2/RC294_DEVELOPMENT_CORPUS.json`, the §23 gate; PRODUCT JOURNEY = `rc2/RC294_SINGLE_BAND_ACCEPTANCE.txt`, `rc2/RC294_ROLLING_ACCEPTANCE.txt`, `tests/rc291-browser-journey`.

## 1. Defect-closure matrix (A0: each reproduced as a failing test first, all red on bde7058)

| # | defect (sign-off) | reproducing test (FEEDBACK/ANALYTICS suite) | fix | acceptance evidence |
|---|---|---|---|---|
| 1 | rationale says DIVIDED where the derivation MULTIPLIED (RAT_E_KNOWN B) | `A0-1`, `A0-1b` | one structured source per distractor; sentence chosen per misconception, template, family and derivation shape; `OPERATION_CONTRADICTION` rejected at publication (`RATIONALE_INCONSISTENT`) | corpus gate: 0 contradictions in 34,500 wrong options (`rc294-feedback`); 0 in 6,400 fresh EASY/MEDIUM wrong options (`RC294_BAND_CORPUS.md`) |
| 2 | averages sentence on a ratios item (RAT_E_SPLIT A) | `A0-2` | family/template variants; `CROSS_FAMILY_VOCABULARY` rejected | 0 contamination in the same corpora |
| 3 | sequence vocabulary on a mixture item (PCT_H_MIXTURE C) | `A0-3` | same | 0 |
| 4 | vacuous «اخترت 6، وهي ناتج 6» | `A0-4` | derivation shown only when an operation survives tidying; bare value omitted | 0 vacuous in 34,500 |
| 5 | reordered evidence flips IMPROVING/DETERIORATING (profile I) | `A0-5/6` | stratified permutation trend controlling for family mix | null matrix 62/12,060 = 0.51% false, 0 at n ≤ 16 |
| 6 | family-blocked history reports a trend (profile F) | `A0-5/6` | `INSUFFICIENT_TREND_EVIDENCE` when halves are not comparable | profiles I, I′ → INSUFFICIENT_TREND_EVIDENCE |
| 7 | 2/4 is a WEAKNESS, 3/4 disappears (50% cliff) | `A0-7` | Wilson-interval statuses STRENGTH / DEVELOPING(lean) / WEAKNESS / INSUFFICIENT; every family line published | 13 boundary lines below |
| 8 | 3 of 10 answered, all correct, shown as «30%» | `A0-8` | completion and accuracy separated; unanswered ≠ wrong unless exam mode | profiles L / L′ |

Also closed from the sign-off's minor list: WORK_E_INVERSE mirrored givens (`tests/rc294-easy` B7, 300 draws, answer never equals a given); the MACH_E_HOURS «450 + 375» rationale now reads «أضفت الكمية الأصلية إلى الناتج المطلوب…» (derivation-aware sentence).

## 2. Zero-diff proof (Phase A changed nothing a learner is asked)

`tools/audit/rc294-zero-diff.mjs`: 10,000 draws on `RC293_DEVELOPMENT_SEEDS` (band rotation as the corpus makes them), hashing template, family, difficulty, stem, display, options, key, parameters, seven signatures, steps, how-to-start, fast method, remember, and every option's value/misconception/derivation.

| tree | drawn | exhausted | digest |
|---|---|---|---|
| RC2.9.3 baseline (bde7058) | 10,000 | 0 | `7fc9dfb7b5378db8f1ac0ec838037b016c4a48c600a6a591dd3eef3bd164c59f` |
| Phase-A checkpoint (aa97104) | 10,000 | 0 | `7fc9dfb7b5378db8f1ac0ec838037b016c4a48c600a6a591dd3eef3bd164c59f` |

compare: same = true, 0 of 10,000 differ (`rc2/RC294_ZERO_DIFF.json`, manifests in `rc2/rc294-zero-diff-manifests.json.gz`).

## 3. Trend permutation matrix (ANALYTICS suite, `rc2/RC294_ANALYTICS_EVIDENCE.md` §1)

Null histories (no true change), accuracy {0.3, 0.5, 0.7} × n {12, 16, 20, 30, 50} × {mixed, family-blocked}, 2 histories each, 201 orderings each (original + 200 shuffles):

| n | evaluations | false IMPROVING/DETERIORATING | rate |
|---|---|---|---|
| 12 | 2,412 | 0 | 0.00% |
| 16 | 2,412 | 0 | 0.00% |
| 20 | 2,412 | 5 | 0.21% |
| 30 | 2,412 | 21 | 0.87% |
| 50 | 2,412 | 36 | 1.49% |
| all | 12,060 | 62 | 0.51% |

Sensitivity (genuine within-skill change, mixed order, 20 draws): n=20 15%→95% 17/20 IMPROVING, 95%→15% 19/20 DETERIORATING; n=30 30%→90% 15/20; n=50 45%→85% 11/20, 85%→45% 15/20; n=50 55%→75% 2/20 (a 20-point change at n=50 is mostly below the model's power — stated as a limitation, not hidden). Never the wrong direction. Confidence: high at ≥30 comparable and p ≤ 0.002, medium at ≥20 and p ≤ 0.01, else low.

## 4. Synthetic profiles A–L (ANALYTICS suite, §4 of the same file; real engine questions, synthetic answers)

| profile | ground truth | report |
|---|---|---|
| A | strong averages, weak reverse-recovery | averages STRENGTH, hidden task «العمل بالعكس» 0/8 WEAKNESS, no trend |
| B | accurate but slow | 40/40, ACCURATE_BUT_SLOW note (low), no weakness |
| C | fast, error-prone | RUSHED_ERRORS note, weaknesses at 4/10 |
| D | 3 of 30 answered | every claim refused; «أجبت عن 3 من 30 سؤالًا»; INSUFFICIENT_TREND_EVIDENCE |
| E | one isolated error | never a weakness |
| F | repeated misconception, family-blocked order | pattern surfaced; NO_TREND_DETECTED (p 0.26) — no trend invented by order |
| G | improving within every family | TREND IMPROVING, effect +0.60, p 0.0033, medium |
| H | deteriorating within every family | TREND DETERIORATING, −0.60, p 0.0017, high |
| I / I′ | strong family first then weak / blocks swapped | both INSUFFICIENT_TREND_EVIDENCE (comparable 0); family lines identical |
| J | steady 75% | NO_TREND_DETECTED, effect 0 |
| K | ratios 2/4, averages 3/4, speed 9/10 | DEVELOPING(weak) / DEVELOPING(strong) / STRENGTH; nothing disappears |
| L / L′ | 3 of 10 answered, all correct; training / exam | «أجبت عن 3 من 10 أسئلة» + «3 من 3 إجابات صحيحة»; exam adds «نتيجة الامتحان على مجموع الأسئلة: 30%» |

## 5. The thirteen threshold lines (exact Arabic, ratios family)

| c/n | status (lean) | Wilson 80% | line |
|---|---|---|---|
| 3/3 | INSUFFICIENT | — | النسب: 3/3 — أدلة غير كافية (أقل من 4 أسئلة). |
| 2/3 | INSUFFICIENT | — | النسب: 2/3 — أدلة غير كافية (أقل من 4 أسئلة). |
| 2/4 | DEVELOPING (weak) | [0.23, 0.77] | النسب: 2/4 (50%) — أداء يميل إلى الضعف، والأدلة لا تكفي بعد لحكم مؤكد. |
| 3/4 | DEVELOPING (strong) | [0.43, 0.92] | النسب: 3/4 (75%) — أداء جيد لم يتأكد بعد؛ يلزم مزيد من الأسئلة لاعتباره نقطة قوة. |
| 4/5 | DEVELOPING (strong) | [0.51, 0.94] | … أداء جيد لم يتأكد بعد … |
| 4/8 | DEVELOPING (weak) | [0.29, 0.71] | … أداء يميل إلى الضعف … |
| 5/8 | DEVELOPING (mixed) | [0.40, 0.80] | النسب: 5/8 (63%) — أداء متوسط؛ الأدلة الحالية لا تحسم قوة أو ضعفًا. |
| 5/10 | DEVELOPING (weak) | [0.31, 0.69] | … أداء يميل إلى الضعف … |
| 6/10 | DEVELOPING (mixed) | [0.40, 0.77] | … أداء متوسط … |
| 7/10 | DEVELOPING (strong) | [0.50, 0.85] | … أداء جيد لم يتأكد بعد … |
| 8/10 | STRENGTH | [0.60, 0.91] | النسب: 8/10 (80%) — نقطة قوة (الثقة: متوسطة). |
| 15/20 | DEVELOPING (strong) | [0.61, 0.85] | … أداء جيد لم يتأكد بعد … |
| 16/20 | STRENGTH | [0.66, 0.89] | النسب: 16/20 (80%) — نقطة قوة (الثقة: عالية). |

n < 4 is insufficient; n = 4 never yields STRENGTH or WEAKNESS; WEAKNESS needs the Wilson upper bound below 0.65 (3/10 and 4/10 are weaknesses; 2/4 is not).

## 6. Distractor rationale BEFORE / AFTER (the sign-off's quoted cases)

| site | BEFORE (RC2.9.3) | AFTER (RC2.9.4) |
|---|---|---|
| RAT_E_KNOWN, option = (a+b)×k | «اخترت 81، وهي ناتج 27 × 3. عكست اتجاه النسبة …» — says divided | «اخترت 20، وهي ناتج (3 + 7) × 2. استخدمت مجموع الأجزاء بدل الطرف المطلوب وحده.» |
| RAT_E_SPLIT, option = total ÷ 2 | «… أخذت متوسط المتوسطين مباشرة …» — averages sentence | «اخترت 49.5، وهي ناتج 99 ÷ 2. أخذت منتصف العددين المعطيين، والنسبة لا تُقسم مناصفة.» |
| PCT_H_MIXTURE | «… الحد الذي بعدها …» — sequence sentence | «اخترت 17 لترًا، وهي ناتج 20 − 3. قرأت مقدار الخطوة خطأً بوحدة واحدة.» (no sequence vocabulary; family-scoped) |
| MACH_E_HOURS, option = total + answer | «اخترت 510 …، وهي ناتج 240 + 270. استخدمت العدد الأصلي بدل العدد بعد التغيير.» | «اخترت 825 قميصًا، وهي ناتج 450 + 375. أضفت الكمية الأصلية إلى الناتج المطلوب، والمطلوب هو ناتج الوضع الجديد وحده.» |
| RAT_E_SPLIT, option = part value k | «اخترت 6، وهي ناتج 6.» | «اخترت 3، وهي ناتج 15 ÷ (2 + 3). توقفت عند قيمة الجزء الواحد ولم تضربها في عدد الأجزاء.» |

Corpus gate (`rc294-feedback`, ≥15,000 wrong options; measured 34,500): 0 operation contradictions, 0 cross-family vocabulary, 0 fabricated derivations, 0 vacuous derivations, 0 accidental keys, 0 duplicate options, 0 duplicate rationale texts within a question. 50 items manually inspected: `rc2/RC294_RATIONALE_INSPECTION.md`.

## 7. EASY and MEDIUM breadth BEFORE → AFTER (`rc2/RC294_PHASE_B_EVIDENCE.md`; 250 draws per cell)

EASY (templates / perceptual constructions / reasoning targets): ages 1/1/1 → 4/7/7 · machines 1/1/1 → 4/4/4 · ratios 2/1/4 → 5/2/7 · relational 2/1/2 → 4/4/5 · averages 2/2/2 → 4/4/4 · speed 2/2/2 → 5/5/5 · sequences 2/13/9 → 4/15/11. Band: 46 → 73 blueprints, 47 → 66 constructions, 71 reasoning targets.
MEDIUM: fractions 1/1/1 → 4/4/4 · calendar 1/1/1 → 3/3/3 · ratios 2/3/3 → 4/5/5 · direct_proportion 2/2/2 → 4/4/4 · unit_rate 2/2/2 → 4/4/4. Band: 80 → 91 blueprints, 115 constructions, 100 reasoning targets.
Every new construction changes the dependency, route, direction, target or information structure (listed per template in the evidence file with a rendered item each); none is a number, name or scenario swap.

## 8. EASY / MEDIUM rolling-100 tables (6 journeys × 4 sittings × 30, history carried)

Gate per rolling 100: PV+ND ≤ 8, ND ≤ 5, cluster ≤ 3, streak ≤ 2, duplicate stems 0.

| suite / path | band | refusals | worst PV | worst ND | worst PV+ND | cluster | streak | dup |
|---|---|---|---|---|---|---|---|---|
| BEFORE (RC2.9.3, engine) | EASY | 0 | 52–53 | 11–13 | 63 | 4 | 2 | 0 |
| AFTER, engine path | EASY | 0 | 39–41 | 8–11 | 48 | 3 | ≤2 | 0 |
| AFTER, product path (browser) | EASY | 0 | 38–42 | 8–11 | 48 | 3 | ≤2 | 0 |
| BEFORE (RC2.9.3, engine) | MEDIUM | 0 | 22–23 | 2–3 | 23–24 | 2–3 | ≤2 | 0 |
| AFTER, engine path | MEDIUM | 0 | 14–15 | 1–4 | 15–16 | 2 | ≤2 | 0 |
| AFTER, product path (browser) | MEDIUM | 0 | 13–15 | 1–4 | 15–17 | ≤3 | ≤2 | 0 |

Met: cluster ≤ 3, streak ≤ 2, duplicate stems 0 (both bands, both paths); ND ≤ 5 at MEDIUM. **NOT RESOLVED (Addition 2): PV+ND ≤ 8 at EASY (achieved 48) and at MEDIUM (achieved 15–17); ND ≤ 5 at EASY (achieved 8–11).** Proven ceilings: PV counts every second occurrence of a template|task pair in a rolling 100, so PV ≥ 100 − pairs = 27 at EASY (73 pairs) and 9 at MEDIUM (91 pairs); PV+ND ≥ 100 − constructions = 34 at EASY (66) whatever the scheduler does. Reaching the gate needs ≥ 92 genuine template|task pairs at the band: about 19 more EASY constructions and 1 more MEDIUM one plus a scheduler with zero slack. The sign-off's own measurement of RC2.9.3 was mean PV 52–54 at EASY and 21.7–22.6 at MEDIUM; RC2.9.4 halves the excess over the floor at EASY (52 → 41 against a floor of 27) and at MEDIUM (22 → 14 against a floor of 9).
Flagged pairs from Q1–100 of the first journey per band are printed in `rc2/RC294_SINGLE_BAND_ACCEPTANCE.txt` for human inspection; the three EASY pairs shown are cross-family FOURTH_PROPORTION collapses (a three-way split ~ a ratio-with-difference; a worker count ~ a writing time; a weight ~ a page output) — the same metric artefact the sign-off noted in MIXED, and counted against the gate anyway.

Addition 1 (classifier unchanged; both keys published): key A (in force) EASY 48 / MEDIUM 15; candidate key B (template|task|sub-idea) EASY 39–42 / MEDIUM 8–9. Neither reaches the gate; the classifier is not changed and key B is reported as a finding only.

## 9. MIXED non-regression (`rc2/RC294_ROLLING_ACCEPTANCE.txt`, product path, 3 × (50→50→50) + 50→50→50→50)

| window | RC2.9.3 record | RC2.9.4 |
|---|---|---|
| R1–R3 Q1–100 | PV+ND 4, 3, 7 | 0, 0, 0 |
| R1–R3 Q51–150 | 5, 5, 4 | 0, 1, 0 |
| S1 Q1–100 / Q51–150 / Q101–200 | 7 / 4 / 5 | 0 / 2 / 2 |
| cluster / streak / duplicate stems | ≤2 / ≤2 / 0 | ≤2 / ≤1 / 0 |
| reintroduced while still protected | 1, 0, 0, 2 | 0, 0, 0, 0 |
| conditions | — | 112 of 112 pass |

## 10. Preset and custom-count reliability (PRODUCT JOURNEY and engine)

Engine path, 12 journeys × 4 sittings per count (`tools` probe): EASY and MEDIUM, counts 5/10/14/20/30/40/50 — 12/12 fresh and 12/12 at sittings 2, 3 and 4, every count. Product path (browser): presets 5/10/14/20/30 delivered in full on two consecutive sittings at both bands; custom 40 and 50 delivered at both bands. RC2.9.3: EASY 50 refused 10/10, EASY 40 refused 5/10.
Capability-aware maximum: `engine.sessionCapacity({difficulty, families})` = the smaller of distinct reasoning targets and distinct core constructions at the band (EASY 71, MEDIUM 91, HARD 34, MIXED 100); the page disables presets above it, caps the custom field, prints «الحد الأقصى لعدد الأسئلة في هذا المستوى: N», and refuses a count above it before calling the engine.

## 11. Representative new questions per thin family (one each; the full set with steps and a rationale is in `rc2/RC294_PHASE_B_EVIDENCE.md`)

- EASY ages · AGE_E_YEARS_TO_SUM — عمر يوسف 8 سنوات وعمر والده 34 سنة. بعد كم سنة يصبح مجموع عمريهما 58 سنة؟ → 8 سنوات
- EASY machines · MACH_E_COMPARE — في مصنع تنتج الآلة الأولى 50 علبة/ساعة، وتنتج الآلة الثانية 36 علبة/ساعة. بكم علبة يزيد إنتاج الآلة الأولى على إنتاج الثانية خلال 6 ساعات؟ → 84 علبة
- EASY ratios · RAT_E_TOTAL_FROM_PART — النسبة بين عدد الأولاد وعدد البنات في صف هي 5 : 3. إذا كان عدد البنات يساوي 6، فكم عدد طلاب الصف جميعًا؟ → 16 طالبًا
- EASY relational · REL_E_GAP_CHAIN — نورة أطول من سامي بـ11 سنتيمترًا، وسارة أطول من نورة بـ5 سنتيمترات. بكم سنتيمترًا يزيد طول سارة على طول سامي؟ → 16 سنتيمترًا
- EASY averages · AVG_E_MISSING_VALUE — المتوسط الحسابي لثلاثة أعداد هو 25، ومنها عددان هما 27 و19. ما العدد الثالث؟ → 29
- EASY speed · SPD_E_UNIT_MINUTES — تسير سيارة بسرعة 120 كم/ساعة. ما المسافة التي تقطعها في 36 دقيقة؟ → 72 كيلومترًا
- EASY sequences · SEQ_E_COUNT_TERMS — كم حدًّا في هذه المتتالية؟ 2، 9، 16، 23، …، 107 → 16
- MEDIUM fractions · FRAC_M_START_FROM_REMAINDER — أنفق وليد ثُمن ما معه من المال، ثم أنفق ثلث ما تبقى، فبقي معه 420 درهمًا. كم درهمًا كان معه في البداية؟ → 720 درهمًا
- MEDIUM calendar · CAL_M_NTH_VISIT — يزور مفتش مصنعًا مرة كل 5 أيام، وكانت زيارته الأولى يوم الاثنين. في أي يوم من الأسبوع تكون زيارته الرابعة؟ → الثلاثاء
- MEDIUM ratios · RAT_M_THIRD_FROM_GAP — قُسمت جائزة بين ثلاثة أشخاص بنسبة 3 : 6 : 4. إذا كان نصيب الشخص الثاني يزيد على نصيب الشخص الثالث بـ16 درهمًا، فما نصيب الشخص الأول؟ → 24 درهمًا
- MEDIUM direct_proportion · PROP_M_UNIT_PRICE_COMPARE — تبيع مكتبة 5 كتب بـ40 درهمًا، وتبيع مكتبة أخرى 8 كتب من النوع نفسه بـ56 درهمًا. بكم درهمًا يقل سعر الكتاب الواحد في المكتبة الثانية عن الأخرى؟ → درهم واحد
- MEDIUM unit_rate · RATE_M_COMPARE — تنجز الآلة الأولى 200 صفحة في 8 دقائق، وتنجز الآلة الثانية 420 صفحة في 12 دقيقة. بكم صفحة في الدقيقة يزيد معدل الآلة الثانية على معدل الأخرى؟ → 10 صفحات/دقيقة

## 12. Correctness and editorial (CORRECTNESS suite)

Fresh EASY/MEDIUM corpus (`rc2/RC294_BAND_CORPUS.md`, 1,280 items on unused seeds): validator invalid 0, Arabic invalid 0, Arabic unclassified 0, duplicate option sets 0, key absent 0, rationale problems 0 of 6,400 wrong options, key printed in stem 0; literal duplicate stems 51 of 1,280 through `generateQuestion` (no session dedup; RC2.9.3 measured 17 of 640 — same rate; 0 in every session window). RC2.9.4 development corpus on the reference seeds: 10,000 items, `rc2/RC294_DEVELOPMENT_CORPUS.json`. §23 internal gate: 39 of 39 conditions (`rc2/INTERNAL_GATE.json`). Determinism: `tests/rc2-reproducibility` green; single-band journeys replay identically from seed + history.

## 13. Adversarial self-review (what I tried to break, and what I found)

- Rationale gate false negatives: scanned 34,500 wrong options with independent regexes for every past-tense operation verb; 0 escapes. Weakest remaining sentences are deliberately neutral ones (e.g. «قرأت مقدار الخطوة خطأً بوحدة واحدة» for MISREAD_THE_STEP) — true, but not template-specific.
- Trend model: n=50 null cells run at 1.5% false trend (the matrix rate is 0.51%); tightening maxP below 0.02 halved detection of a genuine 60-point change at n=20. Kept and reported.
- Planner: a construction inside its cooldown is still delivered as a last resort (recorded per sitting); on RC2.9.4 every single-band journey shows 0 «still protected» reintroductions in MIXED and the EASY windows are bounded by pool size, not by fallbacks.
- Entity words: «عمر» (a name) matches the word «عمر» (age) in the entity detector — pre-existing, inflates entity counts on ages items; not touched (a classifier change).
- Band boundary tertiles moved (10.4/15.6 → 9.4/14.8) because the population is 184 templates; this feeds the `complexity_band` evidence field only. No template changed band; NOTHING_RECLASSIFIED passes.

## 14. Limitations

- EASY rolling gate PV+ND ≤ 8 and ND ≤ 5, and MEDIUM PV+ND ≤ 8, are NOT RESOLVED; achieved and ceilings in §8. Closing them needs ≈19 more genuine EASY constructions (≈1 at MEDIUM plus a zero-slack scheduler), which this session did not attempt to fake with reskins.
- HARD behaviour untouched; HARD not re-evaluated (out of scope).
- The RC2.9.2 baseline package is still not in the repository; comparisons are against RC2.9.3 (bde7058), as the sign-off's own were.
- A 20-point genuine change at n=50 is mostly not detected (2/20); the model prefers silence to a false trend.
- `sessionCapacity` is a ceiling from the catalogue (distinct reasoning targets / core constructions), validated empirically at 5–50 for EASY and MEDIUM; it is not a per-seed guarantee for counts between 51 and the ceiling.
