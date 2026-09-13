#!/usr/bin/env node
// RC2.7-2. The BEFORE/AFTER inventory.
//
// The brief's question is not "how many templates are there" — RC2.6 already
// answers that, and the answer flatters. It is "how many DIFFERENT QUESTIONS can
// a reader tell apart", which is a different count entirely: a template that
// tells one story, asks one unknown and renders one sentence contributes one
// perceptible question however many numbers it draws.
//
// So every measure here is taken on what a reader can see or reconstruct, and
// the same definitions are used before and after. Nothing is counted by id
// alone: `distinctConstructions` counts construction SIGNATURES, and a signature
// that differs only because a new id was minted for the same telling would show
// up as an unchanged stem-skeleton count beside it.

import {writeFileSync, mkdirSync} from 'node:fs';

import Engine from '../../src/index.js';
import {FAMILY_REGISTRY} from '../../src/registry.js';
import {TEMPLATE_STRUCTURE, structuralBandOf} from '../../src/qa/structure.js';
import {renderedItem} from '../../src/qa/construction.js';

const BANDS = ['easy', 'medium', 'hard'];

/** Every personal name the renderer can draw, so entity use is measurable. */
export const NAME_POOL = Object.freeze([
  'خالد', 'سالم', 'ماجد', 'راشد', 'ناصر', 'فهد', 'علي', 'بدر', 'حمد', 'سامي',
  'نورة', 'سارة', 'هند', 'ريم', 'ليان', 'مريم', 'أحمد', 'محمد', 'عمر', 'يوسف',
  'ليلى', 'فاطمة', 'عائشة', 'زينب'
]);

const tally = (rows, keyOf) => {
  const m = new Map();
  for (const r of rows) {
    const k = keyOf(r);
    if (k == null) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
};
const top = (m, n = 3) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)
  .map(([k, v]) => ({key: k, count: v}));
const repeatedShare = (m, n) => {
  const inRepeat = [...m.values()].filter(v => v > 1).reduce((a, v) => a + v, 0);
  return n ? Number((inRepeat / n).toFixed(4)) : 0;
};

/** The names a rendered stem actually mentions. */
export function entitiesIn(text) {
  const s = String(text ?? '');
  return NAME_POOL.filter(n => s.includes(n));
}

/**
 * The reasoning FORM a template presents, read off what it declares rather than
 * asserted by hand: forward from givens, backwards from a stated outcome, a
 * choice between stated alternatives, or a reconstruction of something removed.
 */
export function constructionForm(q) {
  const d = q.metadata?.construction_signature?.match(/direction:([^|]+)/)?.[1] ?? 'forward';
  return d;
}

/** Sample a family as widely as the engine allows, without a batch in the way. */
export function sampleFamily(engine, family, {perBand = 220, tag = 'INV'} = {}) {
  const rows = [];
  const fam = FAMILY_REGISTRY.find(f => f.id === family);
  for (const band of BANDS) {
    if (!fam.difficulties.includes(band)) continue;
    for (let i = 0; i < perBand; i++) {
      try {
        rows.push(engine.generateQuestion({family, difficulty: band, seed: `${tag}-${family}-${band}-${i}`}));
      } catch { /* a refused draw is not an inventory item */ }
    }
  }
  return rows;
}

export function inventoryFamily(rows, family) {
  const n = rows.length;
  const m = q => q.metadata ?? {};
  const templates = tally(rows, q => q.generator_id);
  const concepts = tally(rows, q => q.subskill);
  const reasoning = tally(rows, q => m(q).structural_reasoning_signature);
  const construction = tally(rows, q => m(q).construction_signature);
  const targets = tally(rows, q => m(q).asked_unknown);
  const scenarios = tally(rows, q => m(q).scenario_signature);
  const skeletons = tally(rows, q => m(q).stem_skeleton);
  const forms = tally(rows, constructionForm);
  const paramOnly = tally(rows, q => `${q.generator_id}|${m(q).asked_unknown}`);
  const misconceptions = tally(
    rows.flatMap(q => Object.values(m(q).options_meta ?? {})
      .filter(o => !o.correct).map(o => o.misconceptionId)),
    x => x
  );
  const entities = tally(rows.flatMap(q => entitiesIn(q.question)), x => x);

  // Two templates whose skeletons collide are, to a reader, the same question.
  const skeletonToTemplates = new Map();
  for (const q of rows) {
    const k = m(q).stem_skeleton;
    if (!skeletonToTemplates.has(k)) skeletonToTemplates.set(k, new Set());
    skeletonToTemplates.get(k).add(q.generator_id);
  }
  const collidingTemplates = [...skeletonToTemplates.entries()]
    .filter(([, s]) => s.size > 1).map(([k, s]) => ({templates: [...s], skeleton: k.slice(0, 90)}));

  return {
    family,
    sampled: n,
    templates: templates.size,
    templatesByBand: Object.fromEntries(BANDS.map(b =>
      [b, [...templates.keys()].filter(t => structuralBandOf(t) === b).length])),
    concepts: concepts.size,
    reasoningStructures: reasoning.size,
    constructions: construction.size,
    requestedTargets: targets.size,
    targetList: [...targets.keys()].sort(),
    forms: Object.fromEntries(forms),
    scenarios: scenarios.size,
    stemSkeletons: skeletons.size,
    stemSkeletonsPerTemplate: templates.size
      ? Number((skeletons.size / templates.size).toFixed(2)) : 0,
    entityNamesUsed: entities.size,
    distractorModels: misconceptions.size,
    parameterOnlyVariantGroups: paramOnly.size,
    parameterOnlyShare: repeatedShare(paramOnly, n),
    largestConstructionShare: n ? Number((Math.max(0, ...construction.values()) / n).toFixed(4)) : 0,
    topConstructions: top(construction, 3),
    topScenarios: top(scenarios, 3),
    topSkeletons: top(skeletons, 3).map(x => ({count: x.count, key: x.key.slice(0, 90)})),
    templatesSharingOneSkeleton: collidingTemplates
  };
}

export function build({perBand = 220, tag = 'INV'} = {}) {
  const engine = new Engine();
  const families = [];
  const all = [];
  for (const f of FAMILY_REGISTRY) {
    const rows = sampleFamily(engine, f.id, {perBand, tag});
    all.push(...rows);
    families.push(inventoryFamily(rows, f.id));
  }
  const m = q => q.metadata ?? {};
  const totals = {
    sampled: all.length,
    templates: new Set(all.map(q => q.generator_id)).size,
    concepts: new Set(all.map(q => q.subskill)).size,
    reasoningStructures: new Set(all.map(q => m(q).structural_reasoning_signature)).size,
    constructions: new Set(all.map(q => m(q).construction_signature)).size,
    scenarios: new Set(all.map(q => m(q).scenario_signature)).size,
    stemSkeletons: new Set(all.map(q => m(q).stem_skeleton)).size,
    requestedTargets: new Set(all.map(q => m(q).asked_unknown)).size,
    entityNamesUsed: new Set(all.flatMap(q => entitiesIn(q.question))).size,
    distractorModels: new Set(all.flatMap(q => Object.values(m(q).options_meta ?? {})
      .filter(o => !o.correct).map(o => o.misconceptionId))).size,
    exactDuplicates: (() => {
      const t = tally(all, renderedItem);
      return [...t.values()].filter(v => v > 1).reduce((a, v) => a + v, 0);
    })(),
    forms: Object.fromEntries(tally(all, constructionForm))
  };
  return {schema: 'rc27-inventory-v1', generatedAt: new Date().toISOString(), perBand, totals, families};
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv[2] ?? 'rc2/RC27_INVENTORY_BEFORE.json';
  const r = build({perBand: Number(process.env.PER_BAND ?? 220), tag: process.env.TAG ?? 'INV'});
  mkdirSync('rc2', {recursive: true});
  writeFileSync(out, JSON.stringify(r, null, 2) + '\n');
  console.log(JSON.stringify({totals: r.totals, families: r.families.map(f => ({
    family: f.family, templates: f.templates, concepts: f.concepts,
    reasoning: f.reasoningStructures, constructions: f.constructions,
    targets: f.requestedTargets, scenarios: f.scenarios, skeletons: f.stemSkeletons,
    skelPerTemplate: f.stemSkeletonsPerTemplate,
    largestConstructionShare: f.largestConstructionShare,
    distractorModels: f.distractorModels
  }))}, null, 2));
}
