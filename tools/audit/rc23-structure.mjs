#!/usr/bin/env node
// RC2.3 — the structural adjudication, measured.
//
// The brief is explicit that declared/computed agreement is not evidence that
// difficulty is right, so nothing in here reports it as such. What can be
// reported:
//
//   CLASSIFICATION   all 107 templates, their band, the structural criteria
//                    each hard one meets, and the routine markers each
//                    non-hard one carries.
//
//   COVERAGE         how many structures and families each band can be built
//                    from, and what a 50-question session and a 250-question
//                    batch therefore draw on.
//
//   FRESH SAMPLE     250+ hard questions on unseen seeds, re-adjudicated
//                    against the published solution rather than against the
//                    table that produced them. This can FALSIFY an entry; it
//                    cannot confirm one, and it is reported that way.
//
//   REGRESSION       the one genuinely independent check available: Holdout D
//                    was adjudicated by people who had never seen this table,
//                    and reported 38 of its 82 hard items genuinely hard. The
//                    adjudication is applied to the same 82 and the counts are
//                    compared. No item id appears anywhere in production.
//
//   LEAKAGE          easy and medium sampled the same way.
//
//   SCORE AGREEMENT  how often the RC2.2 complexity score would have banded an
//                    item where the structure bands it. Reported as EVIDENCE of
//                    where the two views differ — not as a target, and not as a
//                    gate. A high number here would mean the score is a good
//                    proxy, not that the bands are right.

import {writeFileSync, mkdirSync, readFileSync, existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

import Engine, {ENGINE_VERSION} from '../../src/index.js';
import {FAMILY_REGISTRY, FAMILY_MAP} from '../../src/registry.js';
import {
  TEMPLATE_STRUCTURE, ADJUDICATED_TEMPLATE_IDS, HARD_CRITERIA, ROUTINE_MARKERS,
  structuralBandOf, contradictions, templatesAtBand
} from '../../src/qa/structure.js';

const BANDS = ['easy', 'medium', 'hard'];

/** Every template, its band, and why. */
export function classification() {
  const familyOf = {};
  for (const f of FAMILY_REGISTRY) for (const t of f.templates) familyOf[t] = f.id;
  const rows = ADJUDICATED_TEMPLATE_IDS.map(id => ({
    templateId: id,
    family: familyOf[id] ?? null,
    capability: `${TEMPLATE_STRUCTURE[id].band.toUpperCase()}_CAPABLE`,
    band: TEMPLATE_STRUCTURE[id].band,
    criteria: TEMPLATE_STRUCTURE[id].criteria,
    routine: TEMPLATE_STRUCTURE[id].routine,
    why: TEMPLATE_STRUCTURE[id].why
  }));
  const unfamilied = rows.filter(r => !r.family).map(r => r.templateId);
  return {
    total: rows.length,
    byBand: BANDS.reduce((a, b) => (a[b] = rows.filter(r => r.band === b).length, a), {}),
    criteriaUse: Object.keys(HARD_CRITERIA).reduce(
      (a, c) => (a[c] = rows.filter(r => r.criteria.includes(c)).length, a), {}),
    routineUse: Object.keys(ROUTINE_MARKERS).reduce(
      (a, c) => (a[c] = rows.filter(r => r.routine.includes(c)).length, a), {}),
    templatesNotInAnyFamily: unfamilied,
    templates: rows
  };
}

/** What each band can be built from, and what that means for a session. */
export function coverage({sessionSize = 50, batchHardSlots = 82, perTemplateCap = 4} = {}) {
  const out = {};
  for (const band of BANDS) {
    const ids = templatesAtBand(band);
    const families = FAMILY_REGISTRY.filter(f => f.difficulties.includes(band));
    out[band] = {
      templates: ids.length,
      families: families.length,
      familyIds: families.map(f => f.id),
      familiesWithout: FAMILY_REGISTRY.filter(f => !f.difficulties.includes(band)).map(f => f.id),
      perFamily: families.map(f => ({
        family: f.id, templates: f.templates.filter(t => structuralBandOf(t) === band).length
      })),
      // The session floor the engine enforces up front.
      structuresNeededForSession: Math.ceil(sessionSize / perTemplateCap),
      sessionDeliverable: ids.length >= Math.ceil(sessionSize / perTemplateCap),
      meanUsesPerStructureInABatch: ids.length
        ? Number((batchHardSlots / ids.length).toFixed(2)) : null
    };
  }
  return out;
}

/**
 * A fresh sample at one band, re-adjudicated against what each question
 * publishes.
 *
 * The re-adjudication is deliberately one-directional. `contradictions()` asks
 * whether the evidence a question carries is CONSISTENT with the criteria its
 * template claims — an item claiming simultaneous constraints that solves no
 * equation and declares no joint conditions is a contradiction, and that is
 * worth catching. Consistency is not proof: no derivation from a worked solution
 * establishes that a solver had to choose a frame. The honest report is the
 * falsification count, which is what this returns.
 */
export function freshSample({band = 'hard', n = 300, seedTag = 'RC23-FRESH'} = {}) {
  const engine = new Engine();
  const items = [];
  let attempts = 0, exhausted = 0;
  const started = Date.now();
  const latencies = [];
  while (items.length < n && attempts < n * 30) {
    const seed = `${seedTag}-${band}-${attempts}`;
    attempts++;
    const t0 = Date.now();
    let q;
    try { q = engine.generateQuestion({family: 'random', difficulty: band, seed}); }
    catch (err) { if (err.code === 'QUESTION_GENERATION_EXHAUSTED') exhausted++; continue; }
    latencies.push(Date.now() - t0);
    items.push(q);
  }
  const wrongBand = items.filter(q => q.difficulty !== band);
  const fromCapable = items.filter(q => structuralBandOf(q.metadata.template_id) === band);
  const contradicted = [];
  for (const q of items) {
    const c = contradictions(q);
    if (c.length) contradicted.push({templateId: q.metadata.template_id, problems: c});
  }
  const criteriaSeen = {};
  for (const q of items) {
    for (const c of q.metadata.structural_criteria ?? []) criteriaSeen[c] = (criteriaSeen[c] ?? 0) + 1;
  }
  const perTemplate = {};
  for (const q of items) perTemplate[q.metadata.template_id] = (perTemplate[q.metadata.template_id] ?? 0) + 1;
  const scoreAgrees = items.filter(q => q.metadata.score_agrees_with_structure).length;
  const sorted = [...latencies].sort((a, b) => a - b);
  const pct = p => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : null);

  return {
    band, requested: n, generated: items.length, attempts, exhausted,
    // By construction, since selection reads the same adjudication the label
    // comes from. Reported as a CHECK on the wiring, never as a finding.
    fromHardCapableStructures: {
      count: fromCapable.length,
      share: Number((fromCapable.length / items.length).toFixed(4)),
      note: 'true by construction: selection and label read one adjudication. A value below 1 means the wiring has a hole.'
    },
    releasedAtWrongBand: wrongBand.length,
    structuralContradictions: {
      count: contradicted.length,
      note: 'evidence published by the question contradicting the criteria its template claims. One-directional: zero does not confirm the criteria, it fails to refute them.',
      examples: contradicted.slice(0, 10)
    },
    criteriaDistribution: criteriaSeen,
    distinctTemplates: Object.keys(perTemplate).length,
    maxSharePerTemplate: Math.max(0, ...Object.values(perTemplate)),
    scoreVsStructure: {
      agrees: scoreAgrees,
      share: Number((scoreAgrees / items.length).toFixed(4)),
      note: 'EVIDENCE ONLY. The RC2.2 complexity score is not what bands an item; this says how often it would have agreed.'
    },
    latencyMs: {p50: pct(0.5), p95: pct(0.95), p99: pct(0.99), measured: latencies.length > 0},
    wallMs: Date.now() - started
  };
}

/**
 * The independent check. Holdout D's hard items were adjudicated by reviewers
 * who had never seen this table; they reported 38 of 82 genuinely hard. Applying
 * the adjudication to the same 82 says how many come from HARD_CAPABLE
 * structures. No item id is read into production — the holdout is opened here,
 * in an audit tool, and only the template ids are used.
 */
export function holdoutDRegression({path = 'rc2/holdout-d-full.jsonl.gz', auditSaysHard = 38} = {}) {
  if (!existsSync(path)) return {available: false, path};
  const rows = gunzipSync(readFileSync(path)).toString('utf8').trim().split('\n').map(l => JSON.parse(l));
  const hard = rows.filter(r => r.declaredDifficulty === 'hard');
  const stillHard = hard.filter(r => structuralBandOf(r.templateId) === 'hard');
  const demoted = {};
  for (const r of hard) {
    if (structuralBandOf(r.templateId) !== 'hard') demoted[r.templateId] = (demoted[r.templateId] ?? 0) + 1;
  }
  return {
    available: true,
    releasedAsHard: hard.length,
    independentAuditSaysGenuinelyHard: auditSaysHard,
    adjudicationKeepsAsHard: stillHard.length,
    adjudicationDemotes: hard.length - stillHard.length,
    differenceFromAudit: stillHard.length - auditSaysHard,
    demotedByTemplate: Object.fromEntries(Object.entries(demoted).sort((a, b) => b[1] - a[1])),
    note: 'Regression evidence only. No item id and no per-item verdict is used by production; the adjudication was written from template structure and is compared against the audit afterwards.'
  };
}

/** Same seed, same questions. */
export function reproducibility({seed = 'RC23-REPRO', count = 50} = {}) {
  const a = new Engine().generatePractice({count, difficulty: 'mixed', family: 'random', seed});
  const b = new Engine().generatePractice({count, difficulty: 'mixed', family: 'random', seed});
  const same = a.questions.every((q, i) =>
    q.id === b.questions[i].id
    && q.correct_option === b.questions[i].correct_option
    && q.question === b.questions[i].question);
  return {seed, count, identical: same};
}

export function build(opts = {}) {
  const report = {
    schema: 'rc23-structure-v1',
    generatedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
    classification: classification(),
    coverage: coverage(opts),
    fresh: {
      hard: freshSample({band: 'hard', n: opts.hardSample ?? 300}),
      medium: freshSample({band: 'medium', n: opts.otherSample ?? 300}),
      easy: freshSample({band: 'easy', n: opts.otherSample ?? 300})
    },
    holdoutDRegression: holdoutDRegression(),
    reproducibility: reproducibility()
  };
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = build();
  mkdirSync('rc2', {recursive: true});
  writeFileSync('rc2/RC23_STRUCTURE.json', JSON.stringify(r, null, 2) + '\n');
  const {classification: c, coverage: cov, fresh, holdoutDRegression: reg} = r;
  console.log(JSON.stringify({
    templates: c.total, byBand: c.byBand, criteriaUse: c.criteriaUse,
    coverage: Object.fromEntries(Object.entries(cov).map(([b, v]) =>
      [b, {templates: v.templates, families: v.families, sessionDeliverable: v.sessionDeliverable,
        meanUsesPerStructureInABatch: v.meanUsesPerStructureInABatch}])),
    hardSample: {
      generated: fresh.hard.generated, wrongBand: fresh.hard.releasedAtWrongBand,
      contradictions: fresh.hard.structuralContradictions.count,
      distinctTemplates: fresh.hard.distinctTemplates,
      scoreAgrees: fresh.hard.scoreVsStructure.share,
      latencyMs: fresh.hard.latencyMs, exhausted: fresh.hard.exhausted
    },
    holdoutDRegression: reg.available ? {
      releasedAsHard: reg.releasedAsHard, auditSays: reg.independentAuditSaysGenuinelyHard,
      adjudicationKeeps: reg.adjudicationKeepsAsHard, difference: reg.differenceFromAudit
    } : reg,
    reproducible: r.reproducibility.identical
  }, null, 2));
}
