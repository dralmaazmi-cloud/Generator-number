#!/usr/bin/env node
// RC2.9.1. Acceptance, measured on the SHIPPED PRODUCT.
//
// Every number below comes from a real Chromium loading the real index.html
// over HTTP, clicking «توليد», leaving the sitting the way the app lets you
// leave it, and clicking «توليد» again. No engine function is called by this
// file. The sittings are read back out of the browser's own localStorage,
// because what is being measured is what the product kept.
//
// The control run is the part that makes this evidence rather than a
// coincidence: the same page, the same seeds, the same everything, with the
// stored journey removed before the second sitting. If the second fifty stayed
// clean in both, the fix was never the cause of anything.

import {measureSample, classify} from '../../src/qa/perceptual-classify.js';
import {classifyQuestionConstructions} from '../../src/arabic/constructions.js';
import {allRenderedText} from '../../src/qa/pipeline.js';
import {unitIdOfWord, surfaceFormsOf} from '../../src/arabic/units.js';
import {serveRepository, launchBrowser, playProductJourney, browserAvailable}
  from './rc291-product-journey.mjs';

/** Seeds minted for this run and used nowhere else in the repository. */
export const STANDALONE_SEEDS = Object.freeze([
  'rc291-accept-50-a-71c4e9', 'rc291-accept-50-b-3fa08d', 'rc291-accept-50-c-be5127'
]);

export const JOURNEYS = Object.freeze([
  {label: 'P1', seeds: ['rc291-accept-p1-s1-04d7ba', 'rc291-accept-p1-s2-9e13c6']},
  {label: 'P2', seeds: ['rc291-accept-p2-s1-2b84fd', 'rc291-accept-p2-s2-c75e10']},
  {label: 'P3', seeds: ['rc291-accept-p3-s1-a6039e', 'rc291-accept-p3-s2-51db47']},
  {label: 'P4', seeds: ['rc291-accept-p4-s1-e82c65', 'rc291-accept-p4-s2-1a70df']},
  {label: 'P5', seeds: ['rc291-accept-p5-s1-7d4916', 'rc291-accept-p5-s2-b3ef82']}
]);

/** The two journeys the causal control is run on. */
export const CONTROL_JOURNEYS = JOURNEYS.slice(0, 2);

const LABELS = ['GENUINELY_DISTINCT', 'HEALTHY_SKILL_RECURRENCE',
  'PARAMETER_ONLY_VARIANT', 'NEAR_DUPLICATE_CONSTRUCTION'];

/** How many of a stretch repeat a construction met anywhere earlier. */
export function repeatsAfter(rows, from) {
  const labelled = classify(rows);
  return labelled.slice(from).filter((row, i) =>
    new Set(labelled.slice(0, from + i).map(x => x.perceptual)).has(row.perceptual)).length;
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

/** A rate answer whose unit is not the one the stem counts. */
export function rateUnitMismatches(rows) {
  const out = [];
  for (const q of rows) {
    for (const opt of Object.values(q.options ?? {})) {
      const text = String(opt);
      if (!text.includes('/')) continue;
      const noun = text.split('/')[0].replace(/[\d.,\s]/g, '').trim();
      if (!noun || noun === 'كم') continue;   // «كم» is an abbreviation, not a counted noun
      const id = unitIdOfWord(noun);
      const named = id
        ? surfaceFormsOf(id).some(form => q.question.includes(form))
        : q.question.includes(noun);
      if (!named) out.push(`${q.generator_id}: «${text}» against a stem that never says ${noun}`);
    }
  }
  return out;
}

const pad = (v, n) => String(v).padStart(n);

function labelRow(name, m) {
  return `${name.padEnd(6)}${pad(m.counts.GENUINELY_DISTINCT, 5)}${pad(m.counts.HEALTHY_SKILL_RECURRENCE, 6)}`
    + `${pad(m.counts.PARAMETER_ONLY_VARIANT, 5)}${pad(m.counts.NEAR_DUPLICATE_CONSTRUCTION, 5)}${pad(m.flagged, 8)}`;
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

  console.log('=== THREE STANDALONE FIFTY-QUESTION SITTINGS, THROUGH THE PRODUCT ===\n');
  console.log('seed                        PV  ND  PV+ND  distinct  cluster  run  dup-stems');
  for (const seed of STANDALONE_SEEDS) {
    const r = await playProductJourney(browser, origin, {seeds: [seed]});
    const rows = r.sessions[0].questions;
    corpus.push(...rows);
    const m = measureSample(rows, {label: seed});
    const dup = rows.length - new Set(rows.map(q => q.metadata.normalized_stem_identity)).size;
    console.log(`${seed}  ${pad(m.counts.PARAMETER_ONLY_VARIANT, 2)}  ${pad(m.counts.NEAR_DUPLICATE_CONSTRUCTION, 2)}`
      + `  ${pad(m.flagged, 5)}  ${pad(m.distinctPerceptualSignatures, 8)}  ${pad(m.largestPerceptualCluster, 7)}`
      + `  ${pad(m.longestSimilarRun, 3)}  ${pad(dup, 9)}`);
    add(`${seed}: fifty delivered`, rows.length === 50, `${rows.length}`);
    add(`${seed}: PV+ND within budget`, m.flagged <= 4, `${m.flagged} / 4`);
    add(`${seed}: no duplicate stem`, dup === 0, `${dup}`);
    add(`${seed}: largest perceptual cluster`, m.largestPerceptualCluster <= 3, `${m.largestPerceptualCluster} / 3`);
    add(`${seed}: longest similar run`, m.longestSimilarRun <= 2, `${m.longestSimilarRun} / 2`);
    add(`${seed}: no family REPETITIVE`, m.families.every(f => f.verdict === 'OK'),
      m.families.filter(f => f.verdict !== 'OK').map(f => f.family).join(', ') || 'none');
  }

  console.log('\n=== FIVE REAL TWO-SITTING JOURNEYS, THROUGH THE PRODUCT ===');
  const journeyRuns = new Map();
  for (const spec of JOURNEYS) {
    const r = await playProductJourney(browser, origin, {seeds: spec.seeds});
    journeyRuns.set(spec.label, r);
    const first = r.sessions[0].questions, second = r.sessions[1].questions;
    const all = [...first, ...second];
    corpus.push(...all);
    const m1 = measureSample(first, {label: `${spec.label}-1`});
    const m2 = measureSample(second, {label: `${spec.label}-2`});
    const mc = measureSample(all, {label: spec.label});
    const dup = all.length - new Set(all.map(q => q.metadata.normalized_stem_identity)).size;
    const call2 = r.calls[1] ?? {};

    console.log(`\n--- ${spec.label} — ${spec.seeds.join(' then ')} ---`);
    console.log('        GD   HSR   PV   ND   PV+ND');
    console.log(labelRow('Q1–50', m1));
    console.log(labelRow('Q51–100', m2));
    console.log(labelRow('TOTAL', mc));
    console.log(`  history present at the session-2 engine call: ${call2.had ? 'YES' : 'NO'}`);
    console.log(`  questionsSeen before session 2: ${call2.questionsSeenBefore ?? '—'}`
      + ` · after: ${call2.questionsSeenAfter ?? '—'}`);
    console.log(`  exact duplicate stems: ${dup}`
      + ` · largest perceptual cluster: ${mc.largestPerceptualCluster}`
      + ` · longest repeated-experience streak: ${mc.longestSimilarRun}`);
    console.log(`  of the second fifty, ${repeatsAfter(all, 50)} repeat something already solved`);
    const repetitive = mc.families.filter(f => f.verdict !== 'OK');
    console.log(`  family verdicts: ${repetitive.length ? repetitive.map(f => `${f.family}=${f.verdict}`).join(', ') : 'all OK'}`);
    const ar = arabicDefects(all);
    console.log(`  arabic: ${ar.invalid.length} invalid · ${ar.unclassified.length} unclassified`
      + ` · stem/option unit mismatches: ${rateUnitMismatches(all).length}`);

    add(`${spec.label}: both sittings delivered fifty`, first.length === 50 && second.length === 50,
      `${first.length} + ${second.length}`);
    add(`${spec.label}: the product handed the engine a history`, call2.had === true,
      call2.had ? `questionsSeen ${call2.questionsSeenBefore}` : 'NO HISTORY — the product did not carry it');
    add(`${spec.label}: combined PV+ND within budget`, mc.flagged <= 8, `${mc.flagged} / 8`);
    add(`${spec.label}: combined ND within budget`, mc.counts.NEAR_DUPLICATE_CONSTRUCTION <= 5,
      `${mc.counts.NEAR_DUPLICATE_CONSTRUCTION} / 5`);
    add(`${spec.label}: no reset spike in Q51–100`, m2.flagged - m1.flagged <= 4,
      `${m1.flagged} → ${m2.flagged}`);
    add(`${spec.label}: the second fifty is comparable to the first`, m2.flagged <= 4, `${m2.flagged} / 4`);
    add(`${spec.label}: zero duplicate stems`, dup === 0, `${dup}`);
    add(`${spec.label}: largest perceptual cluster`, mc.largestPerceptualCluster <= 3,
      `${mc.largestPerceptualCluster} / 3`);
    add(`${spec.label}: longest repeated-experience streak`, mc.longestSimilarRun <= 2,
      `${mc.longestSimilarRun} / 2`);
    add(`${spec.label}: no family REPETITIVE`, repetitive.length === 0,
      repetitive.map(f => f.family).join(', ') || 'none');
    add(`${spec.label}: no Arabic defect`, ar.invalid.length === 0 && ar.unclassified.length === 0,
      `${ar.invalid.length} invalid, ${ar.unclassified.length} unclassified`);
    add(`${spec.label}: no stem/option unit mismatch`, rateUnitMismatches(all).length === 0,
      `${rateUnitMismatches(all).length}`);
  }

  console.log('\n=== THE CONTROL: THE SAME PRODUCT FLOW WITH THE JOURNEY CLEARED ===\n');
  console.log('journey   carried: Q51–100 repeats   cleared: Q51–100 repeats   carried PV+ND   cleared PV+ND');
  for (const spec of CONTROL_JOURNEYS) {
    const carried = journeyRuns.get(spec.label);
    const cleared = await playProductJourney(browser, origin, {seeds: spec.seeds, clearJourneyBetween: true});
    const cAll = [...carried.sessions[0].questions, ...carried.sessions[1].questions];
    const xAll = [...cleared.sessions[0].questions, ...cleared.sessions[1].questions];
    const cRep = repeatsAfter(cAll, 50), xRep = repeatsAfter(xAll, 50);
    const cFlag = measureSample(cAll, {label: 'c'}).flagged, xFlag = measureSample(xAll, {label: 'x'}).flagged;
    console.log(`${spec.label.padEnd(10)}${pad(cRep, 22)}${pad(xRep, 27)}${pad(cFlag, 16)}${pad(xFlag, 16)}`);
    add(`${spec.label} control: the cleared run reaches the engine blind`,
      cleared.calls[1]?.had === false, `had=${cleared.calls[1]?.had}`);
    add(`${spec.label} control: clearing the journey brings the repetition back`,
      xRep > cRep + 10, `${cRep} carried vs ${xRep} cleared`);
  }

  console.log('\n=== THE WHOLE PRODUCT CORPUS ===\n');
  const ar = arabicDefects(corpus);
  const mismatches = rateUnitMismatches(corpus);
  console.log(`questions: ${corpus.length}`);
  console.log(`arabic: ${ar.invalid.length} invalid constructions · ${ar.unclassified.length} unclassified`);
  console.log(`stem/option unit mismatches: ${mismatches.length}`);
  for (const x of [...ar.invalid, ...ar.unclassified, ...mismatches].slice(0, 5)) console.log(`   ${x}`);
  add('no invalid Arabic construction', ar.invalid.length === 0, `${ar.invalid.length}`);
  add('no unclassified Arabic construction', ar.unclassified.length === 0, `${ar.unclassified.length}`);
  add('no stem/option unit mismatch', mismatches.length === 0, `${mismatches.length}`);

  console.log('\n=== CONDITIONS ===\n');
  const failed = conditions.filter(c => !c.ok);
  for (const c of failed) console.log(`  FAIL  ${c.name}: ${c.detail}`);
  console.log(`\n${conditions.length - failed.length} of ${conditions.length} conditions pass.`);
  console.log(failed.length ? 'PRODUCT ACCEPTANCE: FAIL' : 'PRODUCT ACCEPTANCE: PASS');

  await browser.close();
  server.close();
  process.exitCode = failed.length ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
