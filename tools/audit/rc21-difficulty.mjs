#!/usr/bin/env node
// RC2.1-2 — difficulty calibration, per template.
//
// The independent review of holdout B found 39 misclassified items: 36 declared
// harder than they are and 3 declared easier, with the inflation concentrated in
// the ALL_HARD session (25 of 50). Individual items are symptoms. What is
// actually wrong is a set of TEMPLATES whose declared band does not match the
// reasoning they demand, so this measures templates, not items, and never reads
// a holdout id.
//
// The arbiter is the RC2-015 complexity model, whose boundaries are placed by a
// stated rule rather than fitted. Where a template's own declared band disagrees
// with the band its reasoning burden lands in, one of the two is wrong and the
// disagreement is reported for a decision — reclassify the declaration, or give
// the template parameters that earn the band it claims.

import {writeFileSync, mkdirSync} from 'node:fs';

import Engine, {ENGINE_VERSION} from '../../src/index.js';
import {BAND_BOUNDARIES, COMPLEXITY_WEIGHTS} from '../../src/qa/complexity.js';

const BANDS = ['easy', 'medium', 'hard'];
const median = xs => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : Number(((s[m - 1] + s[m]) / 2).toFixed(2));
};
const bandOf = score => (score < BAND_BOUNDARIES.easyMedium ? 'easy'
  : score < BAND_BOUNDARIES.mediumHard ? 'medium' : 'hard');

export function sample({perBand = 2600, seedTag = 'RC21-DIFF'} = {}) {
  const engine = new Engine();
  const byTemplate = {};
  const items = [];
  for (const band of BANDS) {
    for (let i = 0; i < perBand; i++) {
      let q;
      try { q = engine.generateQuestion({family: 'random', difficulty: band, seed: `${seedTag}-${band}-${i}`}); }
      catch { continue; }
      const t = byTemplate[q.generator_id] ??= {
        templateId: q.generator_id, family: q.family,
        declared: q.difficulty, scores: [], factors: {}
      };
      t.scores.push(q.metadata.complexity_score);
      for (const [k, v] of Object.entries(q.metadata.complexity_factors ?? {})) {
        (t.factors[k] ??= []).push(v);
      }
      items.push({
        templateId: q.generator_id, family: q.family,
        declared: q.difficulty, computed: q.metadata.complexity_band,
        score: q.metadata.complexity_score
      });
    }
  }
  return {byTemplate, items};
}

export function analyse({byTemplate, items}) {
  const templates = Object.values(byTemplate).map(t => {
    const med = median(t.scores);
    const computedBand = bandOf(med);
    return {
      templateId: t.templateId, family: t.family,
      declared: t.declared, n: t.scores.length,
      medianScore: med,
      minScore: Math.min(...t.scores), maxScore: Math.max(...t.scores),
      medianBand: computedBand,
      agrees: computedBand === t.declared,
      direction: computedBand === t.declared ? null
        : BANDS.indexOf(t.declared) > BANDS.indexOf(computedBand) ? 'OVERCLASSIFIED' : 'UNDERCLASSIFIED',
      medianFactors: Object.fromEntries(Object.entries(t.factors).map(([k, v]) => [k, median(v)]))
    };
  }).sort((a, b) => a.medianScore - b.medianScore);

  // RC2-015 placed the boundaries by a stated rule — a boundary sits midway
  // between the medians of the two bands it separates — precisely so that a
  // later change to the model shows up here instead of being absorbed. RC2.1
  // changed the model (dependencyDepth is derived now, not declared), so the
  // medians moved and the rule must be reapplied rather than the old numbers
  // kept. This recomputes what the rule implies; it does not fit the boundaries
  // to maximise agreement.
  const bandMedians = Object.fromEntries(BANDS.map(b =>
    [b, median(items.filter(i => i.declared === b).map(i => i.score))]));
  const impliedBoundaries = {
    easyMedium: Number(((bandMedians.easy + bandMedians.medium) / 2).toFixed(1)),
    mediumHard: Number(((bandMedians.medium + bandMedians.hard) / 2).toFixed(1))
  };

  const itemAgreement = items.filter(i => i.declared === i.computed).length / (items.length || 1);
  const perDeclared = {};
  for (const b of BANDS) {
    const inBand = items.filter(i => i.declared === b);
    perDeclared[b] = {
      items: inBand.length,
      agreeing: inBand.filter(i => i.computed === b).length,
      agreement: Number((inBand.filter(i => i.computed === b).length / (inBand.length || 1)).toFixed(4)),
      computedSpread: BANDS.reduce((a, c) => (a[c] = inBand.filter(i => i.computed === c).length, a), {})
    };
  }

  return {
    templates,
    disagreeing: templates.filter(t => !t.agrees),
    overclassified: templates.filter(t => t.direction === 'OVERCLASSIFIED'),
    underclassified: templates.filter(t => t.direction === 'UNDERCLASSIFIED'),
    bandMedians,
    impliedBoundaries,
    boundariesInUse: BAND_BOUNDARIES,
    boundariesMatchRule: impliedBoundaries.easyMedium === BAND_BOUNDARIES.easyMedium
      && impliedBoundaries.mediumHard === BAND_BOUNDARIES.mediumHard,
    itemAgreement: Number(itemAgreement.toFixed(4)),
    perDeclared,
    poolSizes: BANDS.reduce((a, b) => (a[b] = templates.filter(t => t.declared === b).length, a), {})
  };
}

/**
 * The review's headline finding was that the ALL_HARD session was half made of
 * items that are not hard. Measured on real sessions rather than on single
 * questions, and broken down by family, because the interesting question is not
 * "how many" but "which families have no genuinely hard stock to draw from".
 */
export function allHardEvidence({sessions = 8, count = 50, seedTag = 'RC21-ALLHARD'} = {}) {
  const engine = new Engine();
  const perFamily = {};
  const perTemplate = {};
  let total = 0, notHard = 0;
  for (let s = 0; s < sessions; s++) {
    const out = engine.generatePractice({count, difficulty: 'hard', family: 'random', seed: `${seedTag}-${s}`});
    for (const q of out.questions) {
      total++;
      const band = q.metadata.complexity_band;
      if (band !== 'hard') notHard++;
      const f = perFamily[q.family] ??= {delivered: 0, hard: 0, scores: []};
      f.delivered++; f.scores.push(q.metadata.complexity_score);
      if (band === 'hard') f.hard++;
      const t = perTemplate[q.generator_id] ??= {delivered: 0, hard: 0, family: q.family, scores: []};
      t.delivered++; t.scores.push(q.metadata.complexity_score);
      if (band === 'hard') t.hard++;
    }
  }
  const families = Object.entries(perFamily).map(([family, f]) => ({
    family, delivered: f.delivered, computedHard: f.hard,
    share: Number((f.hard / f.delivered).toFixed(3)),
    medianScore: median(f.scores)
  })).sort((a, b) => a.share - b.share);

  const templates = Object.entries(perTemplate).map(([templateId, t]) => ({
    templateId, family: t.family, delivered: t.delivered,
    computedHard: t.hard, medianScore: median(t.scores),
    reachesHardBand: median(t.scores) >= BAND_BOUNDARIES.mediumHard
  })).sort((a, b) => a.medianScore - b.medianScore);

  return {
    sessions, questionsPerSession: count, total,
    computedHard: total - notHard,
    computedNotHard: notHard,
    notHardShare: Number((notHard / total).toFixed(4)),
    familiesWithNoGenuinelyHardStock: families.filter(f => f.medianScore < BAND_BOUNDARIES.mediumHard).map(f => f.family),
    perFamily: families,
    perTemplate: templates
  };
}

export function build(opts = {}) {
  const raw = sample(opts);
  const a = analyse(raw);
  return {
    schema: 'rc21-difficulty-v1',
    section: 'RC2.1-2',
    generatedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
    boundaries: BAND_BOUNDARIES,
    weights: COMPLEXITY_WEIGHTS,
    method: [
      'Every template is sampled across all three requested bands and scored by the RC2-015 complexity model.',
      'A template is judged by the MEDIAN score of its own instances, so one extreme parameter draw cannot reclassify it.',
      'Where the median band disagrees with the declared band, the template is listed for a decision. No holdout item id is read.'
    ],
    allHard: allHardEvidence(),
    ...a
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = build();
  mkdirSync('rc2', {recursive: true});
  writeFileSync('rc2/RC21_DIFFICULTY.json', JSON.stringify(r, null, 2) + '\n');
  console.log(`templates ${r.templates.length} | item agreement ${(r.itemAgreement * 100).toFixed(1)}%`);
  console.log('band medians:', JSON.stringify(r.bandMedians),
    '\n  boundaries in use:', JSON.stringify(r.boundariesInUse),
    '\n  rule implies    :', JSON.stringify(r.impliedBoundaries),
    r.boundariesMatchRule ? '(match)' : '(DRIFTED — the model moved, reapply the rule)');
  console.log('pools:', JSON.stringify(r.poolSizes));
  console.log('per declared band:', JSON.stringify(r.perDeclared, null, 1));
  console.log(`\nALL_HARD: ${r.allHard.total} questions across ${r.allHard.sessions} sessions, ` +
    `${r.allHard.computedNotHard} not hard (${(r.allHard.notHardShare * 100).toFixed(1)}%)`);
  console.log('  families whose hard stock does not reach the hard band:',
    r.allHard.familiesWithNoGenuinelyHardStock.join(', ') || 'none');
  for (const f of r.allHard.perFamily.slice(0, 6)) {
    console.log(`    ${f.family.padEnd(19)} hard ${String(Math.round(f.share * 100)).padStart(3)}%  median ${f.medianScore}`);
  }
  console.log(`\nOVERCLASSIFIED (${r.overclassified.length}):`);
  for (const t of r.overclassified) console.log(`  ${t.templateId.padEnd(22)} ${t.family.padEnd(18)} declared ${t.declared.padEnd(6)} median ${String(t.medianScore).padStart(5)} -> ${t.medianBand}`);
  console.log(`\nUNDERCLASSIFIED (${r.underclassified.length}):`);
  for (const t of r.underclassified) console.log(`  ${t.templateId.padEnd(22)} ${t.family.padEnd(18)} declared ${t.declared.padEnd(6)} median ${String(t.medianScore).padStart(5)} -> ${t.medianBand}`);
}
