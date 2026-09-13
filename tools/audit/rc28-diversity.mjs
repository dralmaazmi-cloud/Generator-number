#!/usr/bin/env node
// RC2.8. The user-perceived diversity measurement.
//
// Generates fresh samples and classifies every question against the ones before
// it, on the perceptual identity rather than on any internal id. Prints the
// acceptance conditions with PASS/FAIL beside each, so a run either clears the
// bar or names the condition it missed.
//
// Usage: node tools/audit/rc28-diversity.mjs [--json out.json] [--seeds a,b,c] [--quiet]

import {writeFileSync} from 'node:fs';
import Engine from '../../src/index.js';
import {measureSample} from '../../src/qa/perceptual-classify.js';
import {blueprintsForBand, presentationOf} from '../../src/compose/blueprints.js';

export const BANNED_SEEDS = Object.freeze([
  'independent-20260913-50-a-7f3c91',
  'independent-20260913-50-b-c84e26',
  'independent-20260913-50-c-19ad5b',
  'independent-20260913-100-d-6e20f4'
]);

/**
 * The acceptance thresholds, exactly as the brief states them.
 * `flagged` is PARAMETER_ONLY_VARIANT + NEAR_DUPLICATE_CONSTRUCTION.
 */
export const THRESHOLDS = Object.freeze({
  // `presentation` is not in the brief's list. It is the harsher proxy the
  // classifier documents — same family, same job, same information layout —
  // which reproduces the independent review's own count where the primary
  // labels do not, so the engine cannot pass on the friendlier number alone.
  //
  // Its budget is DERIVED, not chosen: `presentationFloor` below computes how
  // many repeats the catalogue forces on a request of this shape. Setting it by
  // hand would be picking a number the engine can clear; deriving it says "you
  // may not repeat a presentation more often than the pool leaves you no choice
  // about", which is a bar that tightens by itself whenever material is added.
  session50: {flagged: 4, nearDuplicate: null, largestCluster: 3, longestRun: 2,
    worstWindow: 2, presentationCluster: 3},
  sitting100: {flagged: 8, nearDuplicate: 5, largestCluster: 3, longestRun: 2,
    worstWindow: 2, presentationCluster: 3}
});

/**
 * How many presentation repeats the catalogue FORCES on a band schedule.
 *
 * Each band can offer only so many distinct family+job+layout combinations; a
 * band asked for more slots than it has presentations must repeat the
 * difference. Bands share presentations, so this is a lower bound rather than
 * an exact figure — which is what a floor should be.
 */
export function presentationFloor(bandSchedule, families = null) {
  const need = new Map();
  for (const b of bandSchedule) need.set(b, (need.get(b) ?? 0) + 1);
  let floor = 0;
  const detail = [];
  for (const [band, slots] of need) {
    const available = new Set(blueprintsForBand(band, families).map(presentationOf)).size;
    const forced = Math.max(0, slots - available);
    floor += forced;
    detail.push({band, slots, presentations: available, forced});
  }
  return {floor, detail};
}

export function gradeSample(m, limits) {
  const conditions = [
    // First, because every other condition is vacuously true of an empty
    // sample. A refused session is a failure to deliver, not a clean sheet.
    ['the sample was delivered at all', !m.refusal,
      m.refusal ? `${m.refusal.code}: ${m.refusal.message}` : `${m.items} questions`],
    ['the sample is the size that was asked for', m.items === (m.requested ?? m.items),
      `${m.items} / ${m.requested ?? m.items}`],
    ['parameter-only + near-duplicate within budget', m.flagged <= limits.flagged,
      `${m.flagged} / ${limits.flagged}`],
    ['no literal duplicate', m.exactDuplicates === 0, `${m.exactDuplicates}`],
    ['largest perceptual cluster within limit', m.largestPerceptualCluster <= limits.largestCluster,
      `${m.largestPerceptualCluster} / ${limits.largestCluster}`],
    ['longest run of similar questions within limit', m.longestSimilarRun <= limits.longestRun,
      `${m.longestSimilarRun} / ${limits.longestRun}`],
    ['repetition never becomes noticeable in a 20-question window',
      m.worstWindowOf20.repeats <= limits.worstWindow,
      `${m.worstWindowOf20.repeats} / ${limits.worstWindow} (worst window starts at Q${m.worstWindowOf20.start})`],
    ['same family + same job + same layout no oftener than the pool forces',
      m.presentationRepeats <= (m.presentationBudget ?? 0),
      `${m.presentationRepeats} repeats against a floor of ${m.presentationBudget ?? 0}`
      + (m.presentationFloorDetail
        ? ` (${m.presentationFloorDetail.filter(d => d.forced).map(d => `${d.band}: ${d.slots} slots, ${d.presentations} layouts`).join('; ') || 'no band is short'})`
        : '')],
    ['largest presentation cluster within limit',
      m.largestPresentationCluster <= limits.presentationCluster,
      `${m.largestPresentationCluster} / ${limits.presentationCluster}`],
    ['no family classified REPETITIVE', m.families.every(f => f.verdict === 'OK'),
      m.families.filter(f => f.verdict !== 'OK').map(f => `${f.family}(${f.subIdeas}i/${f.taskTypes}t of ${f.appearances})`).join(', ') || 'none'],
    ['every requested target is classified', m.unclassifiedTargets.length === 0,
      m.unclassifiedTargets.join(', ') || 'none']
  ];
  if (limits.nearDuplicate != null) {
    conditions.splice(1, 0, ['near-duplicates within their own budget',
      m.counts.NEAR_DUPLICATE_CONSTRUCTION <= limits.nearDuplicate,
      `${m.counts.NEAR_DUPLICATE_CONSTRUCTION} / ${limits.nearDuplicate}`]);
  }
  return {
    pass: conditions.every(([, ok]) => ok),
    conditions: conditions.map(([name, ok, detail]) => ({name, ok, detail}))
  };
}

/** One sample, generated and measured. Returns the measurement and the engine telemetry. */
export function runSample(engine, {seed, count, difficulty = 'mixed', label}) {
  engine.resetTelemetry();
  let session = null, refusal = null;
  try {
    session = engine.generatePractice({seed, count, difficulty});
  } catch (err) {
    refusal = {code: err.code ?? 'ERROR', message: err.message};
  }
  const telemetry = engine.getTelemetry();
  const candidates = telemetry.sessionCandidates ?? null;
  const rows = session?.questions ?? [];
  const m = measureSample(rows, {label});
  // The floor is computed from the bands the session actually delivered, so a
  // refused or short session is not credited with a looser bar.
  const bands = rows.map(q => q.difficulty ?? q.metadata?.structural_band).filter(Boolean);
  const floor = presentationFloor(bands.length ? bands : [], null);
  return {
    ...m, seed, refusal, requested: count,
    presentationBudget: floor.floor,
    presentationFloorDetail: floor.detail,
    candidatesConsidered: candidates,
    rejectionRate: candidates ? Number(((candidates - rows.length) / candidates).toFixed(4)) : null
  };
}

function report(name, m, limits) {
  const g = gradeSample(m, limits);
  const lines = [`\n=== ${name} — seed ${m.seed} ===`];
  if (m.refusal) lines.push(`  REFUSED: ${m.refusal.code} — ${m.refusal.message}`);
  lines.push(`  items ${m.items} · distinct perceptual signatures ${m.distinctPerceptualSignatures}`
    + ` · tasks ${m.distinctTasks} · sub-ideas ${m.distinctSubIdeas}`);
  lines.push('  ' + Object.entries(m.counts).map(([k, v]) => `${k} ${v}`).join(' · '));
  if (m.candidatesConsidered != null) {
    lines.push(`  candidates considered ${m.candidatesConsidered} → published ${m.items}`
      + ` · rejection rate ${(100 * m.rejectionRate).toFixed(1)}%`);
  }
  for (const c of g.conditions) lines.push(`  ${c.ok ? 'PASS' : 'FAIL'}  ${c.name}: ${c.detail}`);
  lines.push(`  VERDICT: ${g.pass ? 'PASS' : 'FAIL'}`);
  return {text: lines.join('\n'), pass: g.pass, grade: g};
}

function main(argv) {
  const jsonAt = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null;
  const seedArg = argv.includes('--seeds') ? argv[argv.indexOf('--seeds') + 1].split(',') : null;
  const seeds = seedArg ?? [
    'rc28-fresh-50-alpha-3b91d7', 'rc28-fresh-50-beta-0c4ea2', 'rc28-fresh-50-gamma-7de153',
    'rc28-fresh-100-delta-a91f60', 'rc28-fresh-batch-epsilon-52c8b4'
  ];
  for (const s of seeds) {
    if (BANNED_SEEDS.includes(s)) throw new Error(`SEED_IS_BANNED_FOR_VALIDATION: ${s}`);
  }
  const engine = new Engine();
  const out = [];
  const shapes = [
    {seed: seeds[0], count: 50, label: 'session-50-A', limits: THRESHOLDS.session50},
    {seed: seeds[1], count: 50, label: 'session-50-B', limits: THRESHOLDS.session50},
    {seed: seeds[2], count: 50, label: 'session-50-C', limits: THRESHOLDS.session50},
    {seed: seeds[3], count: 100, label: 'sitting-100', limits: THRESHOLDS.sitting100}
  ];
  let allPass = true;
  for (const sh of shapes) {
    const m = runSample(engine, sh);
    const r = report(sh.label, m, sh.limits);
    if (!argv.includes('--quiet')) console.log(r.text);
    allPass = allPass && r.pass;
    out.push({
      shape: sh.label, measurement: {...m, labelled: undefined}, grade: r.grade,
      // The rendered stem and its key are NOT written to disk. Validation samples
      // are drawn from the same space a sealed holdout was drawn from, so an item
      // here can coincide with one there — measured on this release, ten of them
      // did — and a stem printed beside its answer is that holdout's answer key
      // for those items. The labels and signatures are what the file is for; the
      // verbatim questions belong in a report a person reads, not in an artefact
      // that ships.
      labelled: m.labelled.map(({question, answer, ...row}) => row)
    });
  }
  console.log(`\nOVERALL: ${allPass ? 'PASS' : 'FAIL'}`);
  if (jsonAt) {
    writeFileSync(jsonAt, JSON.stringify({generatedAt: new Date().toISOString(), seeds, samples: out, pass: allPass}, null, 2));
    console.log(`written ${jsonAt}`);
  }
  return allPass;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ok = main(process.argv.slice(2));
  process.exitCode = ok ? 0 : 1;
}
