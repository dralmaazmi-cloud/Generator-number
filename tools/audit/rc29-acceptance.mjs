#!/usr/bin/env node
// RC2.9-7. The acceptance run, on seeds no part of this release was tuned on.
//
// What it measures, and why in this shape:
//
//   * Three ORDINARY sessions of fifty, because that is what a user asks for.
//   * Five JOURNEYS of two ordinary sessions, judged as the combined hundred,
//     because that is what a user who wants a hundred actually does — and it is
//     where the release before this one failed, with 29 to 34 of each second
//     fifty repeating something already solved.
//   * The per-question diagnostics the brief names, so a reviewer can see the
//     spike that a reset would cause rather than take its absence on trust.
//
// Nothing here asks the engine for a hundred questions in one call. The product
// cannot do that, so a measurement that does would be measuring a path no user
// ever takes.

import Engine from '../../src/index.js';
import {measureSample} from '../../src/qa/perceptual-classify.js';
import {playSession, playJourney, measureJourney, gradeJourney, JOURNEY_GATES} from './rc29-journey.mjs';
import {RULE_FAMILY} from './rc28-sequences.mjs';
import {classifyQuestionConstructions} from '../../src/arabic/constructions.js';
import {allRenderedText} from '../../src/qa/pipeline.js';

/** Seeds minted for this run and used nowhere else in the repository. */
export const ACCEPTANCE_SESSIONS = Object.freeze([
  'rc29-accept-50-a-2f6b91',
  'rc29-accept-50-b-8c1d04',
  'rc29-accept-50-c-5a37e2'
]);

export const ACCEPTANCE_JOURNEYS = Object.freeze([
  {label: 'J1', seeds: ['rc29-accept-j1-s1-d40a7c', 'rc29-accept-j1-s2-91be35']},
  {label: 'J2', seeds: ['rc29-accept-j2-s1-6f28d1', 'rc29-accept-j2-s2-b03e49']},
  {label: 'J3', seeds: ['rc29-accept-j3-s1-17c5ae', 'rc29-accept-j3-s2-e86204']},
  {label: 'J4', seeds: ['rc29-accept-j4-s1-9db3f0', 'rc29-accept-j4-s2-4c71a8']},
  {label: 'J5', seeds: ['rc29-accept-j5-s1-a25e6d', 'rc29-accept-j5-s2-30f9b7']}
]);

const SESSION_GATES = Object.freeze({flagged: 4});

/**
 * Was there a RESET-LIKE SPIKE at the session boundary?
 *
 * A planner that forgets produces a step change: the second fifty carries many
 * more repeats than the first. This compares the flagged count of each half
 * against the other and reports the step, so the absence of a reset is a
 * measurement rather than an assurance.
 */
export function boundaryStep(m) {
  const first = m.halves[0]?.flagged ?? 0;
  const second = m.halves[1]?.flagged ?? 0;
  return {first, second, step: second - first};
}

/** The sequence rule families and task archetypes a corpus actually reached. */
export function sequenceBreadth(rows) {
  const rules = new Set(), tasks = new Set();
  for (const q of rows) {
    if (q.family !== 'sequences') continue;
    rules.add(RULE_FAMILY[q.metadata?.template_id ?? q.generator_id] ?? '?');
    tasks.add(String(q.metadata?.task_signature ?? '?').split('/')[0]);
  }
  return {rules: [...rules].sort(), tasks: [...tasks].sort()};
}

/** Answer-side conditions: a diverse session that is wrong is not a pass. */
export function answerIntegrity(rows) {
  const duplicateOptions = [], missingKey = [];
  for (const q of rows) {
    const opts = Object.values(q.options ?? {}).map(o => String(o).trim());
    if (new Set(opts).size !== opts.length) duplicateOptions.push(q.id ?? q.generator_id);
    if (!q.correct_option || !Object.keys(q.options ?? {}).includes(q.correct_option)) {
      missingKey.push(q.id ?? q.generator_id);
    }
  }
  return {duplicateOptions, missingKey};
}

/**
 * Arabic, on the rendered text of everything the corpus published.
 *
 * `invalid` is a construction the declared table rules out; `unclassified` is
 * one it does not recognise, which is reported rather than waved through — a
 * defect the classifier cannot name is still a defect.
 */
export function arabicDefects(rows) {
  const invalid = [], unclassified = [];
  for (const q of rows) {
    const r = classifyQuestionConstructions(allRenderedText(q));
    for (const c of r.invalid) invalid.push(`${q.generator_id}: ${c.id} — ${c.text}`);
    for (const c of r.unclassified) unclassified.push(`${q.generator_id}: ${c.text}`);
  }
  return {invalid, unclassified};
}

/**
 * A rate answer rendered in a unit the stem never names.
 *
 * «كم» is the written abbreviation of «كيلومتر» and is the one numerator that
 * legitimately differs from the noun in the stem, so it is named here rather
 * than left to look like a pass.
 */
export function rateUnitMismatches(rows) {
  const out = [];
  for (const q of rows) {
    for (const opt of Object.values(q.options ?? {})) {
      const text = String(opt);
      if (!text.includes('/')) continue;
      const noun = text.split('/')[0].replace(/[\d.,\s]/g, '').trim();
      if (!noun || noun === 'كم') continue;
      if (!q.question.includes(noun)) out.push(`${q.generator_id}: «${text}» against a stem that never says ${noun}`);
    }
  }
  return out;
}

function pct(n, d) { return d ? `${((100 * n) / d).toFixed(0)}%` : '—'; }

function main() {
  const engine = new Engine();
  const conditions = [];
  const add = (name, ok, detail) => conditions.push({name, ok, detail});
  const corpus = [];

  console.log('=== THREE ORDINARY SESSIONS OF FIFTY ===\n');
  console.log('seed                       PV  ND  PV+ND  distinct  cluster  run  dup-stems');
  for (const seed of ACCEPTANCE_SESSIONS) {
    const s = playSession(engine, {seed, count: 50});
    corpus.push(...s.questions);
    const m = measureSample(s.questions, {label: seed});
    const stems = new Set(s.questions.map(q => q.metadata?.normalized_stem_identity ?? q.question));
    const dup = s.questions.length - stems.size;
    console.log(`${seed}  ${String(m.counts.PARAMETER_ONLY_VARIANT).padStart(2)}`
      + `  ${String(m.counts.NEAR_DUPLICATE_CONSTRUCTION).padStart(2)}`
      + `  ${String(m.flagged).padStart(5)}`
      + `  ${String(m.distinctPerceptualSignatures).padStart(8)}`
      + `  ${String(m.largestPerceptualCluster).padStart(7)}`
      + `  ${String(m.longestSimilarRun).padStart(3)}  ${String(dup).padStart(9)}`);
    add(`${seed}: delivered fifty`, s.questions.length === 50, `${s.questions.length}${s.refusal ? ` (${s.refusal.code})` : ''}`);
    add(`${seed}: PV+ND within budget`, m.flagged <= SESSION_GATES.flagged, `${m.flagged} / ${SESSION_GATES.flagged}`);
    add(`${seed}: no literal duplicate stem`, dup === 0, `${dup}`);
    add(`${seed}: largest perceptual cluster`, m.largestPerceptualCluster <= JOURNEY_GATES.largestPerceptualCluster,
      `${m.largestPerceptualCluster} / ${JOURNEY_GATES.largestPerceptualCluster}`);
    add(`${seed}: longest similar run`, m.longestSimilarRun <= JOURNEY_GATES.longestSimilarRun,
      `${m.longestSimilarRun} / ${JOURNEY_GATES.longestSimilarRun}`);
    add(`${seed}: no family REPETITIVE`, m.families.every(f => f.verdict === 'OK'),
      m.families.filter(f => f.verdict !== 'OK').map(f => f.family).join(', ') || 'none');
  }

  console.log('\n=== FIVE JOURNEYS, EACH TWO ORDINARY SESSIONS, JUDGED AS ONE HUNDRED ===\n');
  console.log('       Q1-50           Q51-100         combined                              boundary');
  console.log('       PV ND  PV+ND    PV ND  PV+ND    PV+ND  ND  distinct  cluster run dup  step  2nd-half-repeats  1st-repeat');
  for (const spec of ACCEPTANCE_JOURNEYS) {
    const journey = playJourney(engine, {seeds: spec.seeds});
    corpus.push(...journey.sessions.flatMap(s => s.questions));
    const m = measureJourney(journey, {label: spec.label});
    const g = gradeJourney(m);
    const b = boundaryStep(m);
    const h = m.halves;
    const row = (x) => `${String(x.counts.PARAMETER_ONLY_VARIANT).padStart(2)} ${String(x.counts.NEAR_DUPLICATE_CONSTRUCTION).padStart(2)}  ${String(x.flagged).padStart(5)}`;
    console.log(`${spec.label}     ${row(h[0])}    ${row(h[1])}    `
      + `${String(m.combined.flagged).padStart(5)}  ${String(m.combined.nearDuplicates).padStart(2)}`
      + `  ${String(m.combined.distinctPerceptualSignatures).padStart(8)}`
      + `  ${String(m.combined.largestPerceptualCluster).padStart(7)}`
      + ` ${String(m.combined.longestSimilarRun).padStart(3)}`
      + ` ${String(m.duplicateStemCount).padStart(3)}`
      + `  ${String(b.step >= 0 ? `+${b.step}` : b.step).padStart(4)}`
      + `  ${String(m.secondHalfRepeats).padStart(16)}`
      + `  ${m.firstRepeatAt ? `Q${m.firstRepeatAt}` : 'none'}`);
    for (const c of g.conditions) add(`${spec.label}: ${c.name}`, c.ok, c.detail);
    // A reset shows as a step change at the boundary, so the step is a gate of
    // its own rather than something read off the table by eye.
    add(`${spec.label}: no reset-like spike at the boundary`,
      b.step <= SESSION_GATES.flagged, `Q1-50 ${b.first} → Q51-100 ${b.second} (step ${b.step >= 0 ? '+' : ''}${b.step})`);
  }

  console.log('\n=== THE WHOLE ACCEPTANCE CORPUS ===\n');
  const breadth = sequenceBreadth(corpus);
  const integrity = answerIntegrity(corpus);
  console.log(`questions: ${corpus.length}`);
  console.log(`sequence rule families reached: ${breadth.rules.length} — ${breadth.rules.join(', ')}`);
  console.log(`sequence task archetypes reached: ${breadth.tasks.length} — ${breadth.tasks.join(', ')}`);
  console.log(`duplicate option sets: ${integrity.duplicateOptions.length} · keys not among the options: ${integrity.missingKey.length}`);
  add('sequence rule breadth', breadth.rules.length >= 8, `${breadth.rules.length} / 8`);
  add('sequence task archetypes', breadth.tasks.length >= 5, `${breadth.tasks.length} / 5`);
  add('no duplicate options', integrity.duplicateOptions.length === 0, `${integrity.duplicateOptions.length}`);
  const arabic = arabicDefects(corpus);
  const rateUnits = rateUnitMismatches(corpus);
  console.log(`arabic: ${arabic.invalid.length} invalid constructions · ${arabic.unclassified.length} unclassified`);
  console.log(`stem/option unit mismatches: ${rateUnits.length}`);
  for (const x of [...arabic.invalid, ...arabic.unclassified, ...rateUnits].slice(0, 5)) console.log(`   ${x}`);
  add('no invalid Arabic construction', arabic.invalid.length === 0, `${arabic.invalid.length}`);
  add('no unclassified Arabic construction', arabic.unclassified.length === 0, `${arabic.unclassified.length}`);
  add('no stem/option unit mismatch', rateUnits.length === 0, `${rateUnits.length}`);
  add('every key is among its options', integrity.missingKey.length === 0, `${integrity.missingKey.length}`);

  // Determinism: same seed and same incoming history, twice.
  const replayA = playJourney(new Engine(), {seeds: ACCEPTANCE_JOURNEYS[0].seeds});
  const replayB = playJourney(new Engine(), {seeds: ACCEPTANCE_JOURNEYS[0].seeds});
  const same = JSON.stringify(replayA.sessions.map(s => s.questions.map(q => q.question)))
    === JSON.stringify(replayB.sessions.map(s => s.questions.map(q => q.question)));
  add('deterministic replay for the same seed and history', same, same ? 'identical' : 'DIVERGED');

  console.log('\n=== CONDITIONS ===\n');
  const failed = conditions.filter(c => !c.ok);
  for (const c of failed) console.log(`  FAIL  ${c.name}: ${c.detail}`);
  console.log(`\n${conditions.length - failed.length} of ${conditions.length} conditions pass (${pct(conditions.length - failed.length, conditions.length)}).`);
  console.log(failed.length ? 'ACCEPTANCE: FAIL' : 'ACCEPTANCE: PASS');
  process.exitCode = failed.length ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
