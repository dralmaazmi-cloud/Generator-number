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

## Two further caveats

- **PDF text layer.** The visible text layer of the PDFs is Arabic *presentation
  forms* (about 583 against 317 base letters on session 1), so search and
  copy-paste out of the PDF are unreliable. This is the known RC2-006 limitation.
  Use `blind/blind-questions.txt` or the `.jsonl` as the authoritative text;
  the PDFs are for reading and printing.
- **Latency in `rc2/HOLDOUT.json`** reads `0` for the per-question
  percentiles. Those are *unmeasured*, not zero — see HOLDOUT-F2. The per-session
  figures in that file are real (1.076–2.624 ms/question).

## Integrity

Recompute and compare against `MANIFEST.json`:

```sh
gunzip -c rc2/holdout.jsonl.gz | sha256sum   # 2c0ceb13c002f78f49cc2436a615378850e88ce25a0bb75d9f01ebf2640c4a42
cd rc2/holdout-package && sha256sum -c <(node -e "for(const f of require('./MANIFEST.json').files) console.log(f.sha256+'  '+f.path)")
```
