// RC2.4 — expanded HARD coverage, and the RC2.3 guarantees it must not cost.
//
// RC2.3 stopped at 19 hard structures across 5 of 16 families and said so rather
// than lowering the bar. RC2.4 raises coverage the only way that was open: by
// adding structures that meet the criteria as they stand. These tests check both
// halves — that the coverage is real, and that nothing was reclassified,
// relaxed or redefined to get it.

import test from 'node:test';
import assert from 'node:assert/strict';

import Engine from '../src/index.js';
import {SeededRNG} from '../src/rng.js';
import {finalizeQuestion, validateQuestion} from '../src/utils.js';
import {FAMILY_REGISTRY, FAMILY_MAP} from '../src/registry.js';
import {
  TEMPLATE_STRUCTURE, HARD_CRITERIA, ROUTINE_MARKERS,
  templatesAtBand, isHardCapable, criteriaOf, contradictions
} from '../src/qa/structure.js';
import {RC23_HARD, newHardTemplates, allHardSessions, newTemplateOptions} from '../tools/audit/rc24-hard-coverage.mjs';

// --- RC2.3 is preserved -----------------------------------------------------

test('RC2.4: the structural criteria are untouched', () => {
  // The brief forbids relaxing them, so the vocabulary itself is pinned. A new
  // criterion invented to admit a template would show up here.
  assert.deepEqual(Object.keys(HARD_CRITERIA).sort(), [
    'COMPOSED_INVERSION', 'CROSS_PART_INTEGRATION', 'PARTIAL_ORDER_BRANCHING',
    'RULE_DISCOVERY', 'SIMULTANEOUS_CONSTRAINTS', 'STRATEGY_SELECTION'
  ]);
  assert.deepEqual(Object.keys(ROUTINE_MARKERS).sort(),
    ['FIXED_PIPELINE', 'REPEATED_OPERATION', 'SINGLE_FORMULA']);
});

test('RC2.4/RC2.5: nothing was reclassified upward, and the demotions are the declared ones', () => {
  // RC2.4's rule was that no RC2.3 hard template lost its band. RC2.5 changes
  // that deliberately and in one direction only: the Holdout E blind review
  // found most of the delivered HARD items overclassified, and the relational
  // re-adjudication against the derived graph conditions demoted two shapes that
  // never draw a hard graph. Downward moves are the point of RC2.5; upward moves
  // are still forbidden, and the demotions are named so a silent one is caught.
  const RC25_DEMOTED = ['REL_M_CONFIRM', 'REL_H_GUARANTEE', 'REL_M_COUNT'];
  for (const id of RC25_DEMOTED) {
    assert.equal(isHardCapable(id), false, `${id} should have been demoted by RC2.5`);
  }
  for (const id of RC23_HARD) {
    if (RC25_DEMOTED.includes(id)) continue;
    assert.equal(isHardCapable(id), true, `${id} lost its hard band`);
  }
  // ...and every shape the RC2.3 brief ruled out of hard is still out of it.
  // This is the requirement that coverage was raised by adding structures, not
  // by promoting the routine ones that were demoted for being routine.
  for (const id of ['PROP_H_COST_PLUS', 'PCT_M_SUCCESSIVE', 'PCT_H_CHAIN_VALUE', 'RATE_H_TWO_PHASE',
    'PL_H_CHAIN', 'RAT_E_SPLIT', 'PCT_E_REVERSE_ONE', 'PL_H_REVERSE', 'AVG_M_COMBINE',
    'WORK_H_TWO_STAGE', 'MACH_H_STAGE_UP', 'COMB_H_STAGED', 'WORK_M_CHANGE', 'MACH_M_NEW_FAST',
    'PCT_H_REVERSE_CHAIN', 'AVG_H_TARGET', 'SEQ_H_RECURRENCE']) {
    assert.equal(isHardCapable(id), false, `${id} was promoted rather than left where RC2.3 put it`);
  }
});

test('RC2.4: routine structure still never reaches hard', () => {
  for (const id of Object.keys(TEMPLATE_STRUCTURE)) {
    const e = TEMPLATE_STRUCTURE[id];
    if (e.band !== 'hard') continue;
    assert.ok(e.criteria.length > 0, `${id} is hard with no criterion`);
    assert.equal(e.routine.length, 0, `${id} is hard while carrying routine markers ${e.routine}`);
  }
});

test('RC2.4: the two families at their honest ceiling stay there', () => {
  // A chain of unit fractions and a single-property search do not become hard by
  // adding layers, and the brief says to leave them alone.
  assert.deepEqual(FAMILY_MAP.fractions.difficulties, ['easy']);
  assert.ok(!FAMILY_MAP.odd_one_out.difficulties.includes('hard'));
});

// --- the coverage itself ----------------------------------------------------

test('RC2.4: hard coverage is materially broader than RC2.3', () => {
  const hard = templatesAtBand('hard');
  const families = FAMILY_REGISTRY.filter(f => f.difficulties.includes('hard'));
  // RC2.4 reached 37. RC2.5 demoted three relational shapes and added one
  // (REL_H_COUNT_BRANCHED), leaving 35 — still nearly double RC2.3's 19, and
  // arrived at by removing structures that do not meet the bar rather than by
  // holding a number.
  assert.ok(hard.length >= 35, `${hard.length} hard templates, RC2.3 had ${RC23_HARD.length}`);
  assert.ok(families.length >= 14, `${families.length} hard families, RC2.3 had 5`);
  // Spread, not a pile: no family may hold more than a quarter of the hard band.
  for (const f of families) {
    const n = f.templates.filter(t => TEMPLATE_STRUCTURE[t].band === 'hard').length;
    assert.ok(n / hard.length < 0.25, `${f.id} holds ${n} of ${hard.length} hard structures`);
  }
});

test('RC2.4: every added template names a criterion and is reachable', async () => {
  const added = newHardTemplates();
  assert.ok(added.length >= 18, `${added.length} added`);
  const seen = new Map();
  for (const f of FAMILY_REGISTRY) {
    if (!f.difficulties.includes('hard')) continue;
    const mod = await import(`../src/families/${f.id}.js`);
    const gen = Object.values(mod).find(v => typeof v === 'function' && /^generate/.test(v.name));
    for (let i = 0; i < 200; i++) {
      const seed = `RC24-REACH-${f.id}-${i}`;
      let base, q;
      try {
        base = gen({difficulty: 'hard', rng: new SeededRNG(seed).fork('c'), seed, engineVersion: 'test', telemetry: null});
        q = finalizeQuestion(base, new SeededRNG(seed).fork('o'));
      } catch { continue; }
      if (!seen.has(base.template_id)) seen.set(base.template_id, q);
    }
  }
  for (const id of added) {
    assert.ok(criteriaOf(id).length > 0, `${id} claims no criterion`);
    const q = seen.get(id);
    assert.ok(q, `${id} is adjudicated hard but never drawn`);
    assert.equal(q.difficulty, 'hard');
    assert.deepEqual(contradictions(q), [], `${id} publishes evidence contradicting its criteria`);
    assert.equal(validateQuestion(q).valid, true, `${id} publishes an invalid question`);
  }
});

// --- the acceptance evidence ------------------------------------------------

test('RC2.4: five ALL_HARD sessions of fifty, delivered together', () => {
  // How a 250-question assessment is actually produced, and how every holdout so
  // far has been generated: one batch, so cross-session repetition is governed.
  const r = allHardSessions({sessions: 5, count: 50, seedTag: 'RC24-TEST-BATCH', mode: 'BATCH'});
  assert.equal(r.failedSessions, 0);
  assert.equal(r.totalQuestions, 250);
  assert.equal(r.filler, 0, `${r.filler} questions were not from a HARD_CAPABLE structure`);
  assert.equal(r.wrongKeys, 0);
  assert.equal(r.ambiguous, 0);
  assert.equal(r.invalidQuestions, 0);
  assert.equal(r.exactDuplicates, 0);
  assert.equal(r.semanticDuplicates, 0);
  // Breadth, measured three ways.
  assert.ok(r.acrossAllSessions.templates.distinct >= 35,
    `${r.acrossAllSessions.templates.distinct} distinct templates across the batch`);
  assert.ok(r.acrossAllSessions.families.distinct >= 13,
    `${r.acrossAllSessions.families.distinct} families across the batch`);
  assert.ok(r.acrossAllSessions.reasoning.distinct >= 40,
    `${r.acrossAllSessions.reasoning.distinct} reasoning signatures across the batch`);
  // No single template dominates any one session.
  const cap = new Engine().config.maxTemplateIdRepeatsPerSession;
  for (const s of r.perSession) {
    assert.ok(s.templates.max <= cap, `session ${s.session}: one template took ${s.templates.max} of 50`);
    assert.ok(s.templates.distinct >= 20, `session ${s.session}: only ${s.templates.distinct} distinct templates`);
    assert.ok(s.families.distinct >= 9, `session ${s.session}: only ${s.families.distinct} families`);
  }
});

test('RC2.4: five unrelated ALL_HARD sittings still carry no filler', () => {
  // Sessions that share no state can legitimately repeat an instance — nothing
  // connects them — so this measures the two things that must hold regardless.
  const r = allHardSessions({sessions: 5, count: 50, seedTag: 'RC24-TEST-INDEP', mode: 'INDEPENDENT'});
  assert.equal(r.failedSessions, 0);
  assert.equal(r.filler, 0);
  assert.equal(r.wrongKeys, 0);
  assert.equal(r.ambiguous, 0);
  assert.ok(r.acrossAllSessions.families.distinct >= 13);
});

test('RC2.4: the added templates carry misconception-linked options, not magnitude fillers', () => {
  const r = newTemplateOptions({perTemplate: 25, seedTag: 'RC24-TEST-OPT'});
  assert.ok(r.templatesMeasured >= 18, `only ${r.templatesMeasured} of the added templates were drawn`);
  assert.ok(r.options > 1500, `only ${r.options} options measured`);
  // Every option carries provenance by construction — makeOptionSet refuses one
  // without it — so what is measured here is whether the provenance is varied
  // and whether the values are ones a learner could write down.
  assert.ok(r.repeatedDiagnosis.share < 0.1,
    `${(100 * r.repeatedDiagnosis.share).toFixed(1)}% of options repeat a diagnosis already on the page`);
  assert.ok(r.outOfScaleAt25x.share < 0.05,
    `${(100 * r.outOfScaleAt25x.share).toFixed(1)}% of options are 25x from the key`);
  assert.equal(r.fractionalCountOptions, 0,
    'an option offered a fraction of an indivisible thing');
  // And no template leans on one diagnosis for its whole set.
  for (const t of r.perTemplate) {
    assert.ok(t.slips >= 4, `${t.templateId} draws its options from only ${t.slips} distinct slips`);
  }
});

test('RC2.4: reproducible, and the same seed replays through both APIs', () => {
  const a = new Engine().generatePractice({count: 40, difficulty: 'hard', family: 'random', seed: 'RC24-REPRO'});
  const b = new Engine().generatePractice({count: 40, difficulty: 'hard', family: 'random', seed: 'RC24-REPRO'});
  assert.deepEqual(a.questions.map(q => q.id), b.questions.map(q => q.id));
  assert.deepEqual(a.questions.map(q => q.correct_value), b.questions.map(q => q.correct_value));
  for (const id of newHardTemplates().slice(0, 6)) {
    const e = new Engine();
    const one = e.generateQuestion({family: 'random', difficulty: 'hard', seed: `RC24-REPRO-${id}`});
    const two = new Engine().generateQuestion({family: 'random', difficulty: 'hard', seed: `RC24-REPRO-${id}`});
    assert.equal(one.question, two.question);
  }
});

test('RC2.4: telemetry still reconciles, and hard sessions still cost what they report', () => {
  const e = new Engine();
  e.resetTelemetry();
  let delivered = 0;
  for (let i = 0; i < 3; i++) {
    delivered += e.generatePractice({count: 50, difficulty: 'hard', family: 'random', seed: `RC24-TEL-${i}`}).questions.length;
  }
  const r = e.getTelemetry().sessionReconciliation;
  assert.equal(r.delivered, delivered);
  assert.equal(r.balanced, true);
  assert.equal(r.difference, 0);
  assert.equal(r.anonymous, 0);
  assert.equal(e.getTelemetry().exhaustions, 0, 'a hard session must not exhaust');
});
