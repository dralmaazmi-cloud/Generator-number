#!/usr/bin/env node
// RC2.9-0. The user journey, measured the way a user meets it.
//
// The developer-side measurement that passed RC2.8 asked for a hundred
// questions in one call. The product cannot do that: a session is fifty
// questions, and a user who wants a hundred sits two of them. The independent
// Phase-A review measured that journey and found the first fifty clean and the
// second fifty a replay — 29 to 34 of 50 repeating something already solved —
// because the second call starts the planner from an empty page.
//
// So this harness never asks for a hundred. It calls the same public entry the
// application calls, twice, and judges the combined hundred.
//
// WHAT IT IS, EXACTLY — corrected in RC2.9.1.
//
// This is an ENGINE CONTRACT test. It carries `diversity_history` between the
// two calls ITSELF. It proves that an engine handed a history honours it; it
// proves nothing whatever about whether the product hands it one. RC2.9
// described this file as "carrying exactly what the product carries" and that
// was false: the product carried nothing, and an independent review measuring
// the real application found 26–34 repeats in each second fifty while this
// harness reported none.
//
// The product's side is measured by tools/audit/rc291-product-journey.mjs and
// tools/audit/rc291-acceptance.mjs, which drive the real page in a real browser
// and let the application do the persisting. Final acceptance comes from those.
// This file stays as what it always was, honestly labelled.

import Engine from '../../src/index.js';
import {measureSample, classify, presentationKey} from '../../src/qa/perceptual-classify.js';

/**
 * One session, through the public path and nothing else.
 *
 * `history` is whatever the product hands forward. Before RC2.9 there is
 * nothing to hand forward, which is the defect; the parameter exists from the
 * start so the BEFORE and AFTER runs are the same code measuring the same path.
 */
export function playSession(engine, {seed, count = 50, difficulty = 'mixed', history = null}) {
  const started = Date.now();
  let session = null, refusal = null;
  try {
    session = engine.generatePractice({seed, count, difficulty, diversityHistory: history});
  } catch (err) {
    refusal = {code: err.code ?? 'ERROR', message: err.message};
  }
  return {
    questions: session?.questions ?? [],
    // The outgoing history the product would persist. Absent until RC2.9-1.
    history: session?.diversity_history ?? null,
    refusal,
    ms: Date.now() - started
  };
}

/**
 * A journey: two ordinary sessions, the second continuing the first.
 * @param {string[]} seeds one per session — the product gives each session its own
 */
export function playJourney(engine, {seeds, count = 50, difficulty = 'mixed', carry = true}) {
  const sessions = [];
  let history = null;
  for (const seed of seeds) {
    const s = playSession(engine, {seed, count, difficulty, history});
    sessions.push(s);
    if (carry) history = s.history ?? history;
  }
  return {sessions, endingHistory: history};
}

const norm = s => String(s ?? '').replace(/\s+/g, ' ').trim();

/**
 * RC2.9-4. The stem ALONE, options excluded.
 *
 * The exact-duplicate measure keyed on stem+options, so the same question with
 * its choices in another order counted as two questions. To a reader it is the
 * same question twice; the options are not what is being asked.
 */
export const normalizedStemIdentity = q =>
  norm(q.question ?? q.stem) + (q.display_expression ? ` ⟨${norm(q.display_expression)}⟩` : '');

/** Where the halves of a journey differ, which is the whole question here. */
export function measureJourney(journey, {label = 'journey'} = {}) {
  const halves = journey.sessions.map((s, i) =>
    ({...measureSample(s.questions, {label: `${label}-s${i + 1}`}), refusal: s.refusal}));
  const combined = journey.sessions.flatMap(s => s.questions);
  const whole = measureSample(combined, {label});
  const labelled = classify(combined);

  const stems = new Map();
  for (const q of combined) {
    const k = normalizedStemIdentity(q);
    stems.set(k, (stems.get(k) ?? 0) + 1);
  }
  const duplicateStems = [...stems.entries()].filter(([, v]) => v > 1);

  // The first time the reader meets something they have already solved.
  const seen = new Set();
  let firstRepeat = null;
  for (const r of labelled) {
    if (seen.has(r.perceptual)) { firstRepeat = r.index; break; }
    seen.add(r.perceptual);
  }

  const tally = keyOf => {
    const m = new Map();
    for (const r of labelled) m.set(keyOf(r), (m.get(keyOf(r)) ?? 0) + 1);
    return m;
  };
  const reasoning = tally(r => r.subIdea);
  const task = tally(r => r.task);
  const presentation = tally(presentationKey);

  return {
    label,
    halves: halves.map(h => ({
      items: h.items, counts: h.counts, flagged: h.flagged, refusal: h.refusal
    })),
    combined: {
      items: whole.items,
      counts: whole.counts,
      flagged: whole.flagged,
      nearDuplicates: whole.counts.NEAR_DUPLICATE_CONSTRUCTION,
      largestPerceptualCluster: whole.largestPerceptualCluster,
      longestSimilarRun: whole.longestSimilarRun,
      distinctPerceptualSignatures: whole.distinctPerceptualSignatures,
      families: whole.families
    },
    // The number the review reported: how many of the SECOND fifty repeat
    // something from anywhere earlier in the journey, first fifty included.
    secondHalfRepeats: labelled.slice(halves[0]?.items ?? 50)
      .filter((r, i, arr) => {
        const before = new Set(labelled.slice(0, (halves[0]?.items ?? 50) + i).map(x => x.perceptual));
        return before.has(r.perceptual);
      }).length,
    firstRepeatAt: firstRepeat,
    duplicateStems: duplicateStems.map(([k, v]) => ({stem: k, times: v})),
    duplicateStemCount: duplicateStems.reduce((a, [, v]) => a + v - 1, 0),
    repeatedReasoningArchetypes: [...reasoning.values()].filter(v => v > 1).length,
    repeatedTaskArchetypes: [...task.values()].filter(v => v > 1).length,
    largestPresentationCluster: Math.max(0, ...presentation.values()),
    labelled
  };
}

export const JOURNEY_GATES = Object.freeze({
  perSessionFlagged: 4,
  combinedFlagged: 8,
  combinedNearDuplicates: 5,
  duplicateStems: 0,
  largestPerceptualCluster: 3,
  longestSimilarRun: 2
});

export function gradeJourney(m) {
  const c = [
    ['both sessions delivered', m.halves.every(h => !h.refusal && h.items > 0),
      m.halves.map(h => h.refusal ? h.refusal.code : `${h.items}`).join(' + ')],
    ['session 1 PV+ND within budget', (m.halves[0]?.flagged ?? 99) <= JOURNEY_GATES.perSessionFlagged,
      `${m.halves[0]?.flagged} / ${JOURNEY_GATES.perSessionFlagged}`],
    ['session 2 PV+ND within budget', (m.halves[1]?.flagged ?? 99) <= JOURNEY_GATES.perSessionFlagged,
      `${m.halves[1]?.flagged} / ${JOURNEY_GATES.perSessionFlagged}`],
    ['combined PV+ND within budget', m.combined.flagged <= JOURNEY_GATES.combinedFlagged,
      `${m.combined.flagged} / ${JOURNEY_GATES.combinedFlagged}`],
    ['combined ND within budget', m.combined.nearDuplicates <= JOURNEY_GATES.combinedNearDuplicates,
      `${m.combined.nearDuplicates} / ${JOURNEY_GATES.combinedNearDuplicates}`],
    ['no literal duplicate stem', m.duplicateStemCount === JOURNEY_GATES.duplicateStems,
      `${m.duplicateStemCount}`],
    ['largest perceptual cluster within limit',
      m.combined.largestPerceptualCluster <= JOURNEY_GATES.largestPerceptualCluster,
      `${m.combined.largestPerceptualCluster} / ${JOURNEY_GATES.largestPerceptualCluster}`],
    ['longest similar run within limit', m.combined.longestSimilarRun <= JOURNEY_GATES.longestSimilarRun,
      `${m.combined.longestSimilarRun} / ${JOURNEY_GATES.longestSimilarRun}`],
    ['no family REPETITIVE', m.combined.families.every(f => f.verdict === 'OK'),
      m.combined.families.filter(f => f.verdict !== 'OK').map(f => f.family).join(', ') || 'none'],
    // The defect this release is about, stated as its own condition: the second
    // fifty must not be a replay of the first.
    ['the second fifty is not a replay of the first',
      (m.halves[1]?.flagged ?? 99) <= JOURNEY_GATES.perSessionFlagged
      && m.secondHalfRepeats <= JOURNEY_GATES.combinedFlagged,
      `${m.secondHalfRepeats} of the second fifty repeat something already solved`]
  ];
  return {pass: c.every(([, ok]) => ok), conditions: c.map(([name, ok, detail]) => ({name, ok, detail}))};
}

/** The three deterministic journeys this release is held to. */
export const BEFORE_JOURNEYS = Object.freeze([
  {label: 'journey-A', seeds: ['rc29-journey-a-s1-4e81', 'rc29-journey-a-s2-90cf']},
  {label: 'journey-B', seeds: ['rc29-journey-b-s1-3da7', 'rc29-journey-b-s2-1b62']},
  {label: 'journey-C', seeds: ['rc29-journey-c-s1-c705', 'rc29-journey-c-s2-58ea']}
]);

if (import.meta.url === `file://${process.argv[1]}`) {
  const engine = new Engine();
  let allPass = true;
  for (const spec of BEFORE_JOURNEYS) {
    const m = measureJourney(playJourney(engine, {seeds: spec.seeds}), {label: spec.label});
    const g = gradeJourney(m);
    allPass = allPass && g.pass;
    console.log(`\n=== ${spec.label} — ${spec.seeds.join(' then ')} ===`);
    console.log(`  Q1–50    ${JSON.stringify(m.halves[0].counts)}  PV+ND ${m.halves[0].flagged}`);
    console.log(`  Q51–100  ${JSON.stringify(m.halves[1].counts)}  PV+ND ${m.halves[1].flagged}`);
    console.log(`  combined PV+ND ${m.combined.flagged} · ND ${m.combined.nearDuplicates}`
      + ` · distinct ${m.combined.distinctPerceptualSignatures}/100`
      + ` · first repeat at Q${m.firstRepeatAt ?? '—'}`
      + ` · duplicate stems ${m.duplicateStemCount}`);
    console.log(`  of the second fifty, ${m.secondHalfRepeats} repeat something already solved`);
    for (const c of g.conditions) console.log(`  ${c.ok ? 'PASS' : 'FAIL'}  ${c.name}: ${c.detail}`);
  }
  console.log(`\nOVERALL: ${allPass ? 'PASS' : 'FAIL'}`);
  process.exitCode = allPass ? 0 : 1;
}
