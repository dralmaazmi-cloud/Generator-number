# RC2 — FAILED DIAGNOSTIC HOLDOUT `AUDIT-2026-09-12-B`

## What this is

250 questions generated **exactly once** from the frozen RC2 engine, and the
evidence about them. The holdout **failed**. This package is delivered for an
independent blind review of that failure.

It is **not** a sign-off holdout and it does not become one. A later remediation
(RC2.1) must be reviewed against a *different*, unused holdout seed.

## Provenance

| | |
|---|---|
| Holdout seed | `AUDIT-2026-09-12-B` |
| RC2_COMMIT | `56565ec4e1be4ace34dff60a0b5b6368e6177cf0` |
| Tree hash | `43515585d1901495df4607472cf637d0349f9295` |
| Engine | 1.4.0 |
| Production bundle | `69e39e737a0347ae5edd890011b6cb1161fcc1edc5482fdf98b9669fcf0e3c53` |
| §23 gate | PASS, 15 conditions, at `fa6cc617f3cfc69ea8baf8cc49eab5d5a0baba0d` |
| Session seed rule | `${HOLDOUT_SEED}-${sessionId}` — stated so the holdout is replayable |

Production has not been modified since the freeze. The questions below were not
inspected, regenerated, replaced or repaired to build this package.

## How this package was built

By `tools/audit/rc2-holdout-package.mjs`, which imports **node builtins and
nothing else** — no engine, no family module, no pipeline, no validator. A tool
with no access to a generator cannot regenerate a question, and that is checkable
from its import list rather than taken on trust. Every byte here is derived from
the preserved files listed under `integrity.sources` in `MANIFEST.json`,
none of which was written to.

## Contents

```
MANIFEST.json                              every file, its sha256, provenance, limitations
blind/blind-questions.jsonl                250 items, NO KEYS
blind/blind-questions.txt                  the same, human-readable, logical-order Unicode
blind/session-1..5.html                    printable blind papers, RTL
blind/session-1..5.pdf                     the same, rendered
keys/answer-key.jsonl                      itemId -> correct option + value   (SEALED: do not open before review)
keys/item-metadata.jsonl                   template, complexity, fingerprints (SEALED: do not open before review)
telemetry/HOLDOUT_TELEMETRY_EVIDENCE.json  the discard accounting, with its derivation
```

The blind set carries itemId, session, family, templateId, declared difficulty,
stem and the six options in published order. It excludes the key, the correct
value, the computed complexity score and band, and all three fingerprints.
Nothing was reordered.

## The failure, in one paragraph

The engine-level telemetry identity holds exactly:
373 = 359 + 0 + 13 + 1, difference
0. That is not what
failed. What failed is one layer up. The session builder discards questions the
engine has **already published** when they clash with its repetition
preferences, and records a disposition for only some of them:

| | |
|---|---|
| generated / published candidates | **359** |
| delivered to sessions | **250** |
| discarded | **109** |
| discarded **with** a recorded disposition | **5** |
| discarded **without** any telemetry disposition | **104** |

So 29.0% of everything the engine
built on this run was thrown away with no recorded reason. Reproduced
independently on a development seed at 74 of 328 (22.6%), so the finding does not
rest on the holdout alone. Three code paths are responsible and are named in
`telemetry/HOLDOUT_TELEMETRY_EVIDENCE.json`. **The fix has not been
implemented.** It edits frozen production, which §24 forbids after the freeze.

## What this package does NOT support

The preserved holdout corpus records stems, options, keys and the
diversity/complexity metadata. It does **not** record per-question explanations,
solution steps, per-option derivations or misconception ids — those fields were
never written to the preserved artifact.

- **Supported:** mathematical correctness, key correctness, option plausibility, Arabic language quality, difficulty labelling, duplication and diversity.
- **Not supported:** review of explanation text and per-distractor feedback quality.

Recovering those would mean replaying the holdout seeds through the engine.
Replay is deterministic and would return byte-identical questions, but it is
still a second generation, it has **not** been performed, and it needs explicit
authorisation.

## The stimulus line, and how it got here

Two families render a stimulus beside the stem, and only two — `sequences` and
`odd_one_out`. The first build of this package omitted it, which left all 15
sequences items unsolvable (H-S1-11 and H-S5-09 among them). Fixed.

The preserved corpus never recorded the rendered string, but it did record the
parameters it was rendered from, inside the fingerprint. The stimulus is
therefore **reconstructed**, following production's own rule verbatim — read out
of `src/families/sequences.js` and `src/families/odd_one_out.js`, which is
neither a modification nor a replay:

| case | rule | source |
|---|---|---|
| sequences, missing middle | `shownTerms` with the key's position replaced by `؟` | sequences.js:54 |
| sequences, previous term | `؟، ` + `shownTerms` | sequences.js:55 |
| sequences, next term | `shownTerms` + `، ؟` | sequences.js:56 |
| odd_one_out | `parameters.numbers` joined with `، `, in display order | odd_one_out.js:76 |

Every blind record carries `stimulusProvenance` and the exact `stimulusRule`
used, so a reviewer can see this is derived rather than preserved. **No question,
option, key or seed was changed.** For the missing-middle case the builder refuses
to emit unless the key occurs exactly once in the term list, because guessing
which term is blank would be guessing at the question; all three such items
resolved unambiguously.

## Solvability, verified mechanically

`SOLVABILITY.json` — **250 of 250 solvable, 0 failures.** The check does not rest
on inspection. `displayExpression` is emitted by exactly two family modules,
established by grep over `src/families/*.js`; for the other fourteen families the
stem and the six options are provably the whole of what a candidate ever saw. For
the two display families, every term production would have rendered must be
present, and for sequences the key must not be readable inside the stimulus — a
blanked term that leaked its own answer would be worse than no stimulus at all.
That last rule is deliberately not applied to `odd_one_out`, where the key is one
of the six displayed numbers by construction.

## The PDF text layer — renderer, or production?

**Both, and the distinction matters.** Measured, not asserted:

| | visible-layer presentation-form share | stems findable in visible layer |
|---|---|---|
| production's own PDF export (RC2-006 evidence) | **78.3%** | 0 of 8 |
| these blind papers | **64.8%** | — |

So this is **not** a defect introduced by the holdout-package renderer. It is a
property of Chromium print-to-PDF, and production's own export measures *worse*.
It does show the underlying limitation is real and unresolved in any
Chromium-printed PDF — which is precisely why RC2-006 closed as
`RISK_REMEDIATED_AND_MEASURED` and not as `FIXED`. Production could not repair
the PDF layer; it shipped a logical-order Unicode sidecar in the HTML instead and
declared the limit.

The real gap was that this package had **omitted that remediation**. Fixed: the
blind papers now carry the same `report-logical-text` block production ships, so
the package is no weaker than production. For search and copy use
`blind/blind-questions.txt`, the `.jsonl`, or that block — not the PDF text
layer.

- **Latency in `rc2/HOLDOUT.json`** reads `0` for the per-question percentiles.
  Those are *unmeasured*, not zero — see HOLDOUT-F2. The per-session figures in
  that file are real (1.076–2.624 ms/question).

## Integrity

Recompute and compare against `MANIFEST.json`:

```sh
gunzip -c rc2/holdout.jsonl.gz | sha256sum   # 2c0ceb13c002f78f49cc2436a615378850e88ce25a0bb75d9f01ebf2640c4a42
cd rc2/holdout-package && sha256sum -c <(node -e "for(const f of require('./MANIFEST.json').files) console.log(f.sha256+'  '+f.path)")
```
