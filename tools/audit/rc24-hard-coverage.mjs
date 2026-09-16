#!/usr/bin/env node
// RC2.4 — the acceptance evidence for expanded HARD coverage.
//
// RC2.3 stopped because 19 hard structures across 5 of 16 families could not
// fill repeated ALL_HARD sessions without leaning on the same handful of
// reasoning patterns. This measures whether that is still true, on seeds no
// earlier release used, and reports the distributions rather than a verdict:
// per-session template spread, family spread, and reasoning-signature spread,
// beside the RC2.3 figures for the same measurements.

import {writeFileSync, mkdirSync} from 'node:fs';

import Engine, {ENGINE_VERSION} from '../../src/index.js';
import {FAMILY_REGISTRY} from '../../src/registry.js';
import {TEMPLATE_STRUCTURE, templatesAtBand, isHardCapable, criteriaOf} from '../../src/qa/structure.js';
import {validateQuestion} from '../../src/utils.js';
import {scaleRatio} from '../../src/qa/distractor-plausibility.js';

/** The templates this release added, derived rather than listed. */
export const RC23_HARD = Object.freeze([
  'SEQ_H_POW_INDEX', 'SEQ_H_ALT_DIV',
  'RAT_M_COMMON_SUM', 'RAT_M_COMMON_DIFF', 'RAT_H_TWO_COMB', 'RAT_M_ADD_SIDE', 'RAT_H_TRANSFER',
  'AGE_M_FUT_RATIO', 'AGE_H_TWO_TIME', 'AGE_H_PAST_FUT',
  'SPD_H_CATCH', 'SPD_H_MEET_DELAY', 'SPD_M_EQUAL_DIST', 'SPD_H_TIME_DIFF',
  'REL_M_CONFIRM', 'REL_M_BRANCH_UNRES', 'REL_M_COUNT', 'REL_H_POSITION', 'REL_H_GUARANTEE'
]);

export const newHardTemplates = () => templatesAtBand('hard').filter(t => !RC23_HARD.includes(t));

const tally = xs => {
  const m = new Map();
  for (const x of xs) if (x !== undefined && x !== null) m.set(x, (m.get(x) ?? 0) + 1);
  return m;
};
const spread = m => ({distinct: m.size, max: Math.max(0, ...m.values())});

/**
 * Five ALL_HARD sessions, and everything the brief asks about them.
 *
 * `mode` decides how the five relate to each other, and both are reported
 * because they answer different questions.
 *
 *   BATCH        the five are delivered together, which is how a 250-question
 *                assessment is actually produced and how every holdout so far
 *                has been generated. Cross-session repetition is then governed
 *                by the batch fingerprint set (RC2.1-5), and the brief's "0
 *                exact, 0 semantic duplicates" is a claim about this.
 *
 *   INDEPENDENT  five unrelated sittings that share no state. Nothing prevents
 *                the same instance appearing in two of them, and measuring it
 *                says how large the hard instance space is rather than whether
 *                a defect is present.
 */
export function allHardSessions({sessions = 5, count = 50, seedTag = 'RC24-ACCEPT', mode = 'BATCH'} = {}) {
  const engine = new Engine();
  const rows = [];
  const exactAll = [], semanticAll = [], reasoningAll = [], templateAll = [], familyAll = [];
  let filler = 0, wrongKeys = 0, ambiguous = 0, invalid = 0, failedSessions = 0;
  const started = Date.now();

  const produced = [];
  if (mode === 'BATCH') {
    try {
      const batch = engine.generateMockBatch({
        seed: seedTag,
        sessions: Array.from({length: sessions}, () => ({count, difficulty: 'hard', family: 'random'}))
      });
      produced.push(...batch.sessions);
    } catch { failedSessions = sessions; }
  } else {
    for (let i = 0; i < sessions; i++) {
      try { produced.push(engine.generatePractice({count, difficulty: 'hard', family: 'random', seed: `${seedTag}-${i}`, bandSession: true})); }
      catch { failedSessions++; }
    }
  }

  for (let i = 0; i < produced.length; i++) {
    const s = produced[i];
    for (const q of s.questions) {
      if (!isHardCapable(q.metadata.template_id) || q.difficulty !== 'hard') filler++;
      const v = validateQuestion(q);
      if (!v.valid) invalid++;
      // The oracle already agreed before publication; this re-reads the option
      // set for the two failures a key can still have.
      const meta = q.metadata.options_meta[q.correct_option];
      if (!meta?.correct || meta.value === undefined) wrongKeys++;
      if (q.metadata.ambiguity_verdict === 'AMBIGUOUS') ambiguous++;
      exactAll.push(q.metadata.fingerprint);
      semanticAll.push(q.metadata.semantic_fingerprint);
      reasoningAll.push(q.metadata.structural_reasoning_signature);
      templateAll.push(q.metadata.template_id);
      familyAll.push(q.family);
    }
    const t = tally(s.questions.map(q => q.metadata.template_id));
    const f = tally(s.questions.map(q => q.family));
    const r = tally(s.questions.map(q => q.metadata.structural_reasoning_signature));
    rows.push({
      session: i + 1, delivered: s.questions.length,
      templates: spread(t), families: spread(f), reasoning: spread(r),
      diversityWarnings: (s.validation.diversity_warnings ?? []).length,
      templateCounts: Object.fromEntries([...t.entries()].sort((a, b) => b[1] - a[1])),
      familyCounts: Object.fromEntries([...f.entries()].sort((a, b) => b[1] - a[1]))
    });
  }

  const exact = tally(exactAll), semantic = tally(semanticAll);
  return {
    mode,
    sessions: rows.length, requestedPerSession: count, failedSessions,
    totalQuestions: exactAll.length,
    filler, wrongKeys, ambiguous, invalidQuestions: invalid,
    exactDuplicates: exactAll.length - exact.size,
    semanticDuplicates: semanticAll.length - semantic.size,
    acrossAllSessions: {
      templates: spread(tally(templateAll)),
      families: spread(tally(familyAll)),
      reasoning: spread(tally(reasoningAll))
    },
    perSession: rows,
    wallMs: Date.now() - started
  };
}

/** Option quality for the templates this release added, measured on their own. */
export function newTemplateOptions({perTemplate = 40, seedTag = 'RC24-OPT'} = {}) {
  const engine = new Engine();
  const targets = new Set(newHardTemplates());
  const per = {};
  let options = 0, repeats = 0, outOfScale = 0, fractionalCounts = 0, seen = 0;
  for (let i = 0; i < perTemplate * targets.size * 12 && seen < perTemplate * targets.size; i++) {
    let q;
    try { q = engine.generateQuestion({family: 'random', difficulty: 'hard', seed: `${seedTag}-${i}`}); }
    catch { continue; }
    const id = q.metadata.template_id;
    if (!targets.has(id)) continue;
    const row = per[id] ??= {templateId: id, items: 0, options: 0, repeats: 0, outOfScale: 0, fractionalCounts: 0, slips: new Set()};
    if (row.items >= perTemplate) continue;
    row.items++; seen++;
    const key = q.metadata.options_meta[q.correct_option].value;
    const used = new Set();
    for (const o of Object.values(q.metadata.options_meta)) {
      if (o.correct) continue;
      options++; row.options++;
      row.slips.add(o.misconceptionId);
      if (used.has(o.misconceptionId)) { repeats++; row.repeats++; } else used.add(o.misconceptionId);
      const r = scaleRatio(o.value, key);
      if (r !== null && r >= 25) { outOfScale++; row.outOfScale++; }
      if (q.metadata.answer_count_unit && typeof o.value === 'number' && !Number.isInteger(o.value)) {
        fractionalCounts++; row.fractionalCounts++;
      }
    }
  }
  return {
    templatesMeasured: Object.keys(per).length,
    items: seen, options,
    repeatedDiagnosis: {count: repeats, share: Number((repeats / Math.max(options, 1)).toFixed(4))},
    outOfScaleAt25x: {count: outOfScale, share: Number((outOfScale / Math.max(options, 1)).toFixed(4))},
    fractionalCountOptions: fractionalCounts,
    perTemplate: Object.values(per).map(r => ({
      ...r, slips: [...r.slips].length, distinctSlips: [...r.slips],
      outOfScaleShare: Number((r.outOfScale / Math.max(r.options, 1)).toFixed(3))
    })).sort((a, b) => b.outOfScaleShare - a.outOfScaleShare)
  };
}

export function coverageTable() {
  const hard = templatesAtBand('hard');
  const added = newHardTemplates();
  const byFamily = {};
  for (const f of FAMILY_REGISTRY) {
    const h = f.templates.filter(t => TEMPLATE_STRUCTURE[t].band === 'hard');
    byFamily[f.id] = {
      hardTemplates: h.length,
      added: h.filter(t => added.includes(t)),
      criteria: Object.fromEntries(h.map(t => [t, criteriaOf(t)]))
    };
  }
  return {
    hardTemplatesBefore: RC23_HARD.length, hardTemplatesAfter: hard.length,
    hardFamiliesBefore: 5,
    hardFamiliesAfter: FAMILY_REGISTRY.filter(f => f.difficulties.includes('hard')).length,
    familiesWithoutHard: FAMILY_REGISTRY.filter(f => !f.difficulties.includes('hard')).map(f => f.id),
    addedByFamily: Object.fromEntries(Object.entries(byFamily).filter(([, v]) => v.added.length).map(([k, v]) => [k, v.added])),
    byFamily
  };
}

export function build(opts = {}) {
  return {
    schema: 'rc24-hard-coverage-v1',
    generatedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
    coverage: coverageTable(),
    acceptance: allHardSessions({...opts, mode: 'BATCH'}),
    acceptanceIndependent: allHardSessions({...opts, mode: 'INDEPENDENT', seedTag: 'RC24-INDEP'}),
    newTemplateOptions: newTemplateOptions(opts)
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = build();
  mkdirSync('rc2', {recursive: true});
  writeFileSync('rc2/RC24_HARD_COVERAGE.json', JSON.stringify(r, null, 2) + '\n');
  console.log(JSON.stringify({
    coverage: {
      hardTemplates: `${r.coverage.hardTemplatesBefore} -> ${r.coverage.hardTemplatesAfter}`,
      hardFamilies: `${r.coverage.hardFamiliesBefore} -> ${r.coverage.hardFamiliesAfter}`,
      familiesWithoutHard: r.coverage.familiesWithoutHard,
      addedByFamily: r.coverage.addedByFamily
    },
    acceptance: {
      mode: r.acceptance.mode,
      sessions: r.acceptance.sessions, total: r.acceptance.totalQuestions,
      filler: r.acceptance.filler, wrongKeys: r.acceptance.wrongKeys,
      ambiguous: r.acceptance.ambiguous, invalid: r.acceptance.invalidQuestions,
      exactDuplicates: r.acceptance.exactDuplicates, semanticDuplicates: r.acceptance.semanticDuplicates,
      acrossAllSessions: r.acceptance.acrossAllSessions,
      perSession: r.acceptance.perSession.map(s => ({
        session: s.session, templates: s.templates, families: s.families, reasoning: s.reasoning,
        warnings: s.diversityWarnings
      }))
    },
    independentSittings: {
      mode: r.acceptanceIndependent.mode,
      exactDuplicates: r.acceptanceIndependent.exactDuplicates,
      semanticDuplicates: r.acceptanceIndependent.semanticDuplicates,
      filler: r.acceptanceIndependent.filler,
      acrossAllSessions: r.acceptanceIndependent.acrossAllSessions
    },
    newTemplateOptions: {
      templatesMeasured: r.newTemplateOptions.templatesMeasured,
      items: r.newTemplateOptions.items, options: r.newTemplateOptions.options,
      repeatedDiagnosis: r.newTemplateOptions.repeatedDiagnosis,
      outOfScaleAt25x: r.newTemplateOptions.outOfScaleAt25x,
      fractionalCountOptions: r.newTemplateOptions.fractionalCountOptions
    }
  }, null, 2));
}
