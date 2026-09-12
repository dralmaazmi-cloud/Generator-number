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

## Pending

Additional production defects found by the independent blind review of the
frozen 250-question sample will be appended here before RC2 begins, so that RC2
is a single consolidated patch rather than RC2 → RC3.
