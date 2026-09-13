# RC2.7 — True generative diversity and Arabic question breadth

**Final report.** One question decides this release: *if a normal user solves
50–100 questions, do they feel like genuinely different questions?* The answer
is in §8, with the questions themselves rather than signature counts.

This release did not touch difficulty. No band, threshold, adjudication or hard
coverage target was changed for its own sake; where a fixture had to move it
moved because a shape stopped being deliverable, and the reason is recorded.

---

## 1. The measurement that made the rest possible

The previous release counted "distinct constructions" with a signature that
contained the SCENARIO. Every scenario added inflated it without a reader
seeing a new question — which is exactly how a generator can report diversity
it does not have.

`src/qa/core-construction.js` defines the identity a user actually perceives:

| in the signature | deliberately NOT in it |
| --- | --- |
| equation topology, every literal erased | family, template id |
| the sequence of transformation kinds | scenario label |
| the requested target | personal names, story nouns |
| the entry point (forward, reverse, comparison, min, max) | sentence structure, clause order |
| the arrangement of conditions | every numeric parameter |
| the depth of the dependency chain | |

Shirts, loaves and pages under one rate equation asking one target are ONE
idea. The signature was checked against the independent review before anything
was changed: it reported 193 of 250 batch items in a repeated group (the review
said 200/250) and 35 of 50 in an all-hard session (the review said 35/50). It
agrees with the human reading rather than flattering the engine.

---

## 2. What changed

| change | effect |
| --- | --- |
| Core identity is absolute inside a session | An idea never repeats in one session. A candidate that would repeat one is dropped from the fallback entirely, `accept` THROWS rather than recording a relaxation, and a session that cannot be filled is REFUSED by name with the shortfall. There is no code path left that completes a session with parameter reskins. |
| CORE vs SURFACE relaxation | Every relaxation is classified. Core relaxations are forbidden; surface ones (scenario, entity, sentence shape, information order) are allowed under pressure and each is recorded with its dimension. |
| Batch-level idea budget | A per-session rule said nothing about a user who sits several sessions. Ideas are now shared across a batch and capped at two. It is a cap, not a ban, because the per-band pools (94 easy, 143 medium, 89 hard distinct ideas) cannot support a ban over 250 slots. |
| Seven new targets on existing structures | Each with its own equation written from that side, not a subtraction after the first answer: a later term and a previous term in three sequence rules, the other section of a two-group percentage change, the other partner in a partnership, the other pump, the increased rate. |
| Number-property ideas made visible | The signature collapsed every odd-one-out set to «ruleset», so a family with seven distinct number properties read as four ideas. The rule id now travels with the oracle. |
| Entity concentration bounded per batch | No single named entity beyond three per fifty across a batch. |

One target was built and WITHDRAWN: asking `RATE_H_RATE_FROM_GAP` for the
original time. That stem states a rate and a rate increase, and the RC2.5
wording rule reads it as asking for a rate — correctly. Answering it in hours
would be arguing with a guard rather than respecting it.

---

## 3. What a user meets — measured on the core identity

Three fresh seeds per shape. Surface measures are reported BESIDE the core one,
never folded into it.

| shape | items | distinct ideas | largest group | items in a repeated group | targets | stem skeletons | entities | longest similar run |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| one 50-question session | 50 | **50** | 1 | 0 | 48.7 | 49 | 24.7 | 0 |
| a 100-question sitting | 100 | **78.7** | 2 | 42.7 | 71 | 91 | 29 | 0 |
| a 230-question batch | 230 | **134.7** | 4 | 167.3 | 108.7 | 194 | 30.7 | 0 |

### Before and after, same definitions

| measure | before this release | after |
| --- | ---: | ---: |
| distinct ideas in a 50-question session | 44–48 of 50 | **50 of 50** |
| items in a repeated idea group, 50 questions | 4–11 | **0** |
| items in a repeated idea group, ~100 questions | 58 (independent review) | **38–48** |
| items in a repeated idea group, ~250 questions | 193 of 250 | 163–172 of 230 |
| largest idea group in a batch | 6 | **4** |
| all-hard 50: items in a repeated group | 35 of 50 | refused rather than reskinned |
| core relaxations | not distinguished from surface | **0**, and structurally impossible |

### Safety, unchanged

| gate | observed |
| --- | ---: |
| wrong keys | 0 |
| accepted ambiguity | 0 |
| duplicate options | 0 |
| exact duplicates | 0 |
| semantic duplicates | 0 |
| core construction relaxations | 0 |
| telemetry unbalanced | 0 |
| validation accepted | true |

---

## 4. The repeated groups, written out

At 100 questions a handful of ideas appear twice — never three times. This is
what such a pair looks like. Judge it by reading, not by the signature:

**2 occurrences · target `costFromSellPrice`**

> باع معرض أثاث مقعدًا بـ192 درهمًا محققًا ربحًا قدره 20% من تكلفة الشراء. فما تكلفة الشراء؟
>
> — PL_H_REVERSE · profit_loss/furniture · compact · A) 160 درهمًا

> باعت مكتبة كتابًا بـ300 درهمًا محققًا ربحًا قدره 50% من تكلفة الشراء. فما تكلفة الشراء؟
>
> — PL_H_REVERSE · profit_loss/bookshop · compact · F) 200 درهمًا

**2 occurrences · target `workersForDeadline`**

> المعطيات: يستطيع 6 عمال إنجاز عمل كامل في 12 يومًا؛ عملوا 3 أيام، ثم تقرر إنهاء ما تبقى خلال 3 أيام فقط. كم عاملًا يجب أن يعمل خلال المدة الأخيرة؟
>
> — WORK_M_TARGET · work_time/WORK_M_TARGET · listed · F) 18 عاملًا

> يستطيع 6 عمال إنجاز عمل كامل في 15 يومًا، وعملوا 4 أيام، ثم تقرر إنهاء ما تبقى خلال 3 أيام فقط. كم عاملًا يجب أن يعمل خلال المدة الأخيرة؟
>
> — WORK_M_TARGET · work_time/WORK_M_TARGET · compact · C) 22 عاملًا

The pair is the same mathematics in a different shop with different numbers.
That is a real repeat and it is counted as one. What no longer happens is a
THIRD occurrence, or a pair sitting next to each other, or the same idea
recurring under four scenarios and being counted as four constructions.

---

## 5. The positive evidence — one skill, genuinely different questions

**المتوسط الحسابي — averages**

> متوسط الأطوال كلها في سجل أطوال 11 لوحًا هو 18 مترًا، ومتوسط أول 6 ألواح في السجل هو 16 مترًا، ومتوسط آخر 6 ألواح فيه هو 22 مترًا. فما طول اللوح الذي يقع في الموضع الأوسط من السجل؟
>
> — target `overlappingValue` · AVG_H_OVERLAP

> متوسط أطوال 7 ألواح هو 24 مترًا، وأُضيف لوح طوله 32 مترًا. فما متوسط الأطوال بعد الإضافة؟
>
> — target `newAverageAfterAdd` · AVG_E_ADD

> متوسط 10 قيم هو 12. قُسموا إلى مجموعتين: متوسط الأولى 20، ومتوسط الثانية 10. كم قيمة في المجموعة الأولى؟
>
> — target `firstGroupCount` · AVG_H_SPLIT_SIZE

**المتتاليات — sequences**

> `6، 42، 8، 72، 10، 110، 12، ؟` — ما العدد التالي في المتتالية؟
>
> — target `secondOfPair` · SEQ_M_PAIR_RULE

> `؟، 243، 81، 27، 9` — ما العدد السابق في المتتالية؟
>
> — target `previousTerm` · SEQ_E_GEO

> `36، 41، 46، 52، 56، 61` — أي الحدود الآتية لا يتفق مع قاعدة المتتالية؟
>
> — target `wrongTerm` · SEQ_M_WRONG_TERM

> `12، 19، 57، 55، 62، 186، 184، ؟` — ما العدد التالي في المتتالية؟
>
> — target `nextTerm` · SEQ_M_CYCLE3

---

## 6. Language, scenarios and entities

| dimension | what varies |
| --- | --- |
| Arabic sentence structure | four genuinely different shapes, not four wordings: a compact conjoined sentence, a sequence of short sentences, an explicit `المعطيات:` list, and the exam layout `المطلوب: … المعطيات: …` where the requested quantity is a noun phrase rather than an interrogative |
| information order | given order, rotated, and outcome-first — permitted only where the clauses are self-contained; a clause opening «ثم» or referring back to «الباقي» keeps its place |
| scenarios | seven pools — aggregate, production, trade, journey, population, catalogue, split — each bringing its own agents, counted things, verbs and unit of measure |
| entities | 48 personal names with declared gender, 26 sites, 12 apparatus, so a question can be set somewhere without naming anyone |
| agreement | everything that must agree with a drawn entity is STORED, not derived: the object suffix (باعه/باعها), the feminine marker on a passive verb (بيع/بيعت), the nominative form for a passive subject, each seller's own conjugated verbs |

Measured: 49 distinct sentence skeletons in a 50-question session, 
29 distinct named entities across 100 questions, 
4.7 sentence structures in play.

---

## 7. Remaining thin families and honest limits

| limit | figure | what it means |
| --- | --- | --- |
| total distinct ideas | ~340 | The ceiling on how long a sitting can be before ideas recur. 100 questions is comfortable; 250 is not. |
| ideas per band | 94 easy · 143 medium · 89 hard | Why the batch rule is a cap rather than a ban. |
| all-easy 50-question session | ~45 reachable ideas | Refused at 50. The easy band cannot yet fill fifty slots without repeating an idea. |
| all-hard 50-question session | ~35 reachable ideas | Refused, by name, with the shortfall reported. Raising it means adding hard constructions, which this release was explicitly told not to do. |
| `odd_one_out` | 7 ideas, 1 sentence | Six numbers and «which does not belong». There is one way to ask it; its breadth is in the number properties. |
| `ages`, `calendar` | 7–8 ideas each | The thinnest of the story families. Each template tells one idea; they are the first place to add sub-ideas next. |

---

## 8. The question

**If a normal user solves 50–100 questions, do they feel like genuinely
different questions?**

- **At 50: yes, without qualification.** 50 distinct ideas out of 50, largest group 1, 
  zero items in a repeated group, 49 distinct sentence skeletons, 
  48.7 distinct requested targets, no two similar questions adjacent.
- **At 100: yes, with a stated qualification.** 78.7 distinct ideas out of 100; 
  about twenty ideas appear exactly twice, never three times, and never adjacent. 
  The independent review measured 58 of 100 as repetitive before this work; it is now 38–48,
  and every one of those is a genuine second occurrence rather than a reskin counted as new.
- **Beyond 150 the pool runs out**, and the report says so rather than letting
  surface variation cover it.

The evidence is `rc2/RC27_USER_DIVERSITY.json` — every figure here is read from
it — and the questions in §4 and §5 are printed exactly as a candidate meets them.

---

## 9. Freeze and repository status

| field | value |
| --- | --- |
| release | `RC2.7` |
| frozen commit | `c4c63be08f652717d27ff71e88707a442d6bc0ea` |
| tree SHA | `634acecf03a2bd1c5e082f738a213fb908e1ba22` |
| production bundle SHA-256 | `e5ee88f303dafb1dad7a52fa22d05dbccc504c521f1a9ae3149fa19db254ffb3` |
| production files | 55 |
| tests at freeze | 454 |
| §23 internal gate | `PASS` — 39 conditions, 0 failed |
| sign-off holdout | `AUDIT-2026-09-13-G` — named, NOT generated |

Regression suite at the freeze: 454 tests, 419 pass, 0 fail, 35 skipped. The
skips are declared: freeze tests that stand down before §24, and measurements
retired with a stated reason where a fifty-question all-hard shape stopped being
deliverable. No measurement was kept by lowering its bar, and the historical
holdout plans were left untouched — rewriting a sealed record's shape would
falsify it.

