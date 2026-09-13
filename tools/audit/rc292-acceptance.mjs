#!/usr/bin/env node
// RC2.9.2. Acceptance for the rolling horizon, measured on the SHIPPED PRODUCT.
//
// Every number below comes from a real Chromium loading the real index.html,
// clicking «توليد», leaving the sitting the way the app lets you leave it, and
// doing it again. The application performs the history round trip; this file
// calls no engine function.
//
// What it asks, which is not what RC2.9.1 asked:
//
//   RC2.9.1 asked whether Q1–100 was good. RC2.9.2 asks whether EVERY rolling
//   hundred is — Q1–100 and Q51–150 for a three-sitting journey, and Q101–200
//   as well for the four-sitting stress. A planner that behaves well only from
//   a standing start passes the first and fails the rest.

import {measureSample, classify} from '../../src/qa/perceptual-classify.js';
import {classifyQuestionConstructions} from '../../src/arabic/constructions.js';
import {allRenderedText} from '../../src/qa/pipeline.js';
import {COOLDOWN} from '../../src/compose/diversity-history.js';
import {RULE_FAMILY} from './rc28-sequences.mjs';
import {serveRepository, launchBrowser, playProductJourney, browserAvailable}
  from './rc291-product-journey.mjs';

/** Seeds minted for this run and used nowhere else in the repository. */
export const JOURNEYS = Object.freeze([
  {label: 'R1', seeds: ['rc292-acc-r1-s1-5be207', 'rc292-acc-r1-s2-c14f8a', 'rc292-acc-r1-s3-90d36e']},
  {label: 'R2', seeds: ['rc292-acc-r2-s1-2fa471', 'rc292-acc-r2-s2-8e05bd', 'rc292-acc-r2-s3-47c9f2']},
  {label: 'R3', seeds: ['rc292-acc-r3-s1-b6d180', 'rc292-acc-r3-s2-31e7ac', 'rc292-acc-r3-s3-d859f4']}
]);

/** The long run: not two hundred unique questions, but no wall and no reset. */
export const STRESS = Object.freeze({
  label: 'S1',
  seeds: ['rc292-str-s1-0a4e93', 'rc292-str-s2-76fc21', 'rc292-str-s3-e5b048', 'rc292-str-s4-3d9176']
});

export const GATES = Object.freeze({
  flaggedPerWindow: 8, nearDuplicatesPerWindow: 5,
  cluster: 3, run: 2, duplicateStems: 0, perSitting: 4
});

/** Every rolling hundred, which is what the acceptance invariant is about. */
export function rollingWindows(questions, size = 100, step = 50) {
  const out = [];
  for (let start = 0; start + size <= questions.length; start += step) {
    const rows = questions.slice(start, start + size);
    const m = measureSample(rows, {label: `Q${start + 1}-${start + size}`});
    out.push({
      label: `Q${start + 1}–${start + size}`, counts: m.counts, flagged: m.flagged,
      nearDuplicates: m.counts.NEAR_DUPLICATE_CONSTRUCTION,
      cluster: m.largestPerceptualCluster, run: m.longestSimilarRun,
      duplicateStems: rows.length - new Set(rows.map(q => q.metadata.normalized_stem_identity)).size,
      families: m.families
    });
  }
  return out;
}

/**
 * Constructions that came back, and how far apart the two sightings were.
 *
 * Split by WHERE the two sightings fell, because they are two different rules.
 * Both inside one sitting is the scheduler's cluster cap at work — a
 * construction may appear twice in a sitting, and the window measures say how
 * that reads. Across sittings is the COOLDOWN, and inside the cooldown it is
 * the fallback, which is what has to stay rare and far.
 */
export function reintroductions(questions, sittingSize = 50) {
  const lastAt = new Map();
  const withinSitting = [], acrossSittings = [];
  questions.forEach((q, i) => {
    const sig = q.metadata.user_perceptual_signature;
    const at = i + 1;
    if (lastAt.has(sig)) {
      const from = lastAt.get(sig);
      const row = {sig, from, at, distance: at - from, q};
      const sameSitting = Math.floor((from - 1) / sittingSize) === Math.floor((at - 1) / sittingSize);
      (sameSitting ? withinSitting : acrossSittings).push(row);
    }
    lastAt.set(sig, at);
  });
  return {withinSitting, acrossSittings};
}

export function arabicDefects(rows) {
  const invalid = [], unclassified = [];
  for (const q of rows) {
    const r = classifyQuestionConstructions(allRenderedText(q));
    for (const c of r.invalid) invalid.push(`${q.generator_id}: ${c.id} — ${c.text}`);
    for (const c of r.unclassified) unclassified.push(`${q.generator_id}: ${c.text}`);
  }
  return {invalid, unclassified};
}

export function sequenceBreadth(rows) {
  const rules = new Set(), tasks = new Set();
  let n = 0;
  for (const q of rows) {
    if (q.family !== 'sequences') continue;
    n++;
    rules.add(RULE_FAMILY[q.metadata?.template_id ?? q.generator_id] ?? '?');
    tasks.add(String(q.metadata?.task_signature ?? '?').split('/')[0]);
  }
  return {n, rules: [...rules].sort(), tasks: [...tasks].sort()};
}

const pad = (v, n) => String(v).padStart(n);
const labelRow = (name, m) =>
  `${name.padEnd(9)}${pad(m.counts.GENUINELY_DISTINCT, 4)}${pad(m.counts.HEALTHY_SKILL_RECURRENCE, 6)}`
  + `${pad(m.counts.PARAMETER_ONLY_VARIANT, 5)}${pad(m.counts.NEAR_DUPLICATE_CONSTRUCTION, 5)}${pad(m.flagged, 8)}`;

async function runJourney(browser, origin, spec, add, corpus) {
  const r = await playProductJourney(browser, origin, {seeds: spec.seeds});
  const questions = r.sessions.flatMap(s => s.questions);
  corpus.push(...questions);

  console.log(`\n--- ${spec.label} — ${spec.seeds.length} ordinary sittings ---`);
  console.log('          GD   HSR   PV   ND   PV+ND');
  r.sessions.forEach((s, i) => {
    const m = measureSample(s.questions, {label: `${spec.label}-${i + 1}`});
    console.log(labelRow(`Q${i * 50 + 1}–${(i + 1) * 50}`, m));
    add(`${spec.label}: sitting ${i + 1} delivered fifty`, s.questions.length === 50,
      `${s.questions.length}${s.refusal ? ` — ${String(s.refusal).slice(0, 60)}` : ''}`);
    add(`${spec.label}: sitting ${i + 1} PV+ND within budget`, m.flagged <= GATES.perSitting,
      `${m.flagged} / ${GATES.perSitting}`);
  });

  console.log('\n  rolling windows');
  console.log('          GD   HSR   PV   ND   PV+ND  cluster  streak  dup');
  const windows = rollingWindows(questions);
  for (const w of windows) {
    console.log(labelRow(w.label, w) + `${pad(w.cluster, 9)}${pad(w.run, 8)}${pad(w.duplicateStems, 5)}`);
    add(`${spec.label} ${w.label}: PV+ND within budget`, w.flagged <= GATES.flaggedPerWindow,
      `${w.flagged} / ${GATES.flaggedPerWindow}`);
    add(`${spec.label} ${w.label}: ND within budget`, w.nearDuplicates <= GATES.nearDuplicatesPerWindow,
      `${w.nearDuplicates} / ${GATES.nearDuplicatesPerWindow}`);
    add(`${spec.label} ${w.label}: largest perceptual cluster`, w.cluster <= GATES.cluster,
      `${w.cluster} / ${GATES.cluster}`);
    add(`${spec.label} ${w.label}: longest repeated-experience streak`, w.run <= GATES.run,
      `${w.run} / ${GATES.run}`);
    add(`${spec.label} ${w.label}: zero duplicate stems`, w.duplicateStems === GATES.duplicateStems,
      `${w.duplicateStems}`);
    add(`${spec.label} ${w.label}: no family REPETITIVE`, w.families.every(f => f.verdict === 'OK'),
      w.families.filter(f => f.verdict !== 'OK').map(f => f.family).join(', ') || 'none');
  }

  // The engine call boundary: what the product handed over, sitting by sitting.
  console.log('\n  history at each engine call');
  r.calls.forEach((c, i) => {
    console.log(`    sitting ${i + 1}: history present ${c.had ? 'YES' : 'NO '}`
      + ` · questionsSeen before ${pad(c.questionsSeenBefore ?? 0, 3)} → after ${pad(c.questionsSeenAfter ?? 0, 3)}`);
    if (i > 0) add(`${spec.label}: sitting ${i + 1} was handed a history`, c.had === true, `had=${c.had}`);
  });

  const {withinSitting, acrossSittings} = reintroductions(questions);
  const expired = acrossSittings.filter(x => x.distance >= COOLDOWN.perceptual);
  const early = acrossSittings.filter(x => x.distance < COOLDOWN.perceptual);
  console.log(`\n  a construction seen twice inside one sitting: ${withinSitting.length}`
    + ` (the cluster cap allows two; the window figures above say how it reads)`);
  console.log(`  reintroduced ACROSS sittings after its cooldown expired: ${expired.length}`
    + (expired.length ? ` · closest ${Math.min(...expired.map(x => x.distance))} apart` : ''));
  for (const x of expired.slice(0, 4)) {
    console.log(`    Q${x.from} → Q${x.at} (${x.distance} apart)  ${x.q.generator_id}`);
  }
  console.log(`  reintroduced across sittings while STILL protected: ${early.length}`);
  for (const x of early) {
    console.log(`    Q${x.from} → Q${x.at} (${x.distance} apart)  ${x.q.generator_id}`);
  }
  // The stated trade: at most one such slot per sitting, and never a recent one.
  add(`${spec.label}: cross-sitting reuse inside the window is bounded`,
    early.length <= r.sessions.length, `${early.length} in ${r.sessions.length} sittings`);
  add(`${spec.label}: no cross-sitting reuse is recent`, early.every(x => x.distance >= 50),
    early.length ? `closest ${Math.min(...early.map(x => x.distance))}` : 'none');
  add(`${spec.label}: old constructions do come back`, expired.length > 0 || questions.length <= 100,
    `${expired.length} reintroduced after expiry`);

  const seq = sequenceBreadth(questions);
  const ar = arabicDefects(questions);
  console.log(`  sequences: ${seq.n} rendered · ${seq.rules.length} rule families · ${seq.tasks.length} tasks`);
  console.log(`    ${seq.rules.join(', ')}`);
  console.log(`  arabic: ${ar.invalid.length} invalid · ${ar.unclassified.length} unclassified`);
  add(`${spec.label}: no Arabic defect`, ar.invalid.length === 0 && ar.unclassified.length === 0,
    `${ar.invalid.length} invalid, ${ar.unclassified.length} unclassified`);
  return {r, questions, windows, seq};
}

async function main() {
  if (!await browserAvailable()) {
    console.log('no Chromium available — this harness measures the product in a real browser');
    process.exitCode = 2;
    return;
  }
  const {server, origin} = await serveRepository();
  const browser = await launchBrowser();
  const conditions = [];
  const add = (name, ok, detail) => conditions.push({name, ok, detail});
  const corpus = [];

  console.log('=== THREE REAL 50 → 50 → 50 JOURNEYS, THROUGH THE PRODUCT ===');
  for (const spec of JOURNEYS) await runJourney(browser, origin, spec, add, corpus);

  console.log('\n\n=== THE LONG RUN: 50 → 50 → 50 → 50 ===');
  const stress = await runJourney(browser, origin, STRESS, add, corpus);
  add('the stress journey delivers every sitting',
    stress.r.sessions.every(s => s.questions.length === 50),
    stress.r.sessions.map(s => s.questions.length).join(' + '));

  console.log('\n=== THE WHOLE PRODUCT CORPUS ===\n');
  const seq = sequenceBreadth(corpus);
  const ar = arabicDefects(corpus);
  console.log(`questions: ${corpus.length}`);
  console.log(`sequences rendered: ${seq.n} · rule families ${seq.rules.length} · task archetypes ${seq.tasks.length}`);
  console.log(`  ${seq.rules.join(', ')}`);
  console.log(`arabic: ${ar.invalid.length} invalid · ${ar.unclassified.length} unclassified`);
  const dupOptions = corpus.filter(q => {
    const o = Object.values(q.options ?? {}).map(x => String(x).trim());
    return new Set(o).size !== o.length;
  });
  const badKey = corpus.filter(q => !Object.keys(q.options ?? {}).includes(q.correct_option));
  console.log(`duplicate option sets: ${dupOptions.length} · keys not among the options: ${badKey.length}`);
  add('sequence rule breadth across the corpus', seq.rules.length >= 8, `${seq.rules.length} / 8`);
  add('sequence task breadth across the corpus', seq.tasks.length >= 5, `${seq.tasks.length} / 5`);
  add('no duplicate options', dupOptions.length === 0, `${dupOptions.length}`);
  add('every key is among its options', badKey.length === 0, `${badKey.length}`);
  add('no invalid Arabic construction', ar.invalid.length === 0, `${ar.invalid.length}`);
  add('no unclassified Arabic construction', ar.unclassified.length === 0, `${ar.unclassified.length}`);

  console.log('\n=== CONDITIONS ===\n');
  const failed = conditions.filter(c => !c.ok);
  for (const c of failed) console.log(`  FAIL  ${c.name}: ${c.detail}`);
  console.log(`\n${conditions.length - failed.length} of ${conditions.length} conditions pass.`);
  console.log(failed.length ? 'ROLLING ACCEPTANCE: FAIL' : 'ROLLING ACCEPTANCE: PASS');

  await browser.close();
  server.close();
  process.exitCode = failed.length ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
