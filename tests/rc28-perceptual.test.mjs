// RC2.8 — the perceptual identity, and what it must and must not distinguish.
//
// The RC2.7 engine reported 100 distinct constructions out of 100 while an
// independent reading of the same hundred found 25 items that were parameter
// reskins or near-duplicates. The signatures were not lying; they were counting
// things a reader does not perceive, and failing to count things a reader does.
//
// These tests fix the definition in place. Each one names a difference and says
// whether it is a difference a SOLVER meets.

import test from 'node:test';
import assert from 'node:assert/strict';

import Engine from '../src/index.js';
import {userPerceptualSignature, taskSignature, taskOf, normalizedRelation, normalizedPath}
  from '../src/qa/perceptual.js';
import {TASK_BY_TARGET, INFO_STRUCTURE_BY_TEMPLATE} from '../src/qa/perceptual-taxonomy.js';
import {classify, measureSample} from '../src/qa/perceptual-classify.js';
import {stemSkeleton, scenarioSignature} from '../src/qa/construction.js';

const eqSpec = (left, right) => ({op: 'eq', left, right});
const mulSpec = (...args) => ({mul: args});

test('RC2.8-1: numbers, names and goods do not make a new question', () => {
  // Same equation shape, same target, same layout — different literals.
  const a = userPerceptualSignature({
    oracle: {constraints: [eqSpec('x', mulSpec(12, 5))]},
    askedUnknown: 'scaledOutput', templateId: 'RATE_E_DIRECT', operationKinds: ['multiply']
  });
  const b = userPerceptualSignature({
    oracle: {constraints: [eqSpec('x', mulSpec(430, 9))]},
    askedUnknown: 'scaledOutput', templateId: 'RATE_E_DIRECT', operationKinds: ['multiply']
  });
  assert.equal(a, b, 'changing the numbers must not change the perceptual identity');
});

test('RC2.8-1: commutative operand order is not a difference', () => {
  const a = normalizedRelation({constraints: [eqSpec(mulSpec('x', 4), 60)]});
  const b = normalizedRelation({constraints: [eqSpec(60, mulSpec(4, 'x'))]});
  assert.equal(a, b, 'a × b = c and c = b × a are the same equation');
});

test('RC2.8-1: a product split across two steps is not a different path', () => {
  assert.equal(normalizedPath(['multiply', 'multiply', 'divide']), normalizedPath(['multiply', 'divide']));
});

test('RC2.8-1: every rank position is ONE task', () => {
  const seats = ['position2', 'position3', 'position4', 'position5', 'position6', 'position7'];
  const tasks = new Set(seats.map(s => taskSignature({askedUnknown: s, templateId: 'REL_H_POSITION'})));
  assert.equal(tasks.size, 1, `asking who is 2nd and who is 5th is one job, got ${[...tasks].join(', ')}`);
  assert.equal([...tasks][0], 'LOCATE_IN_ORDER/PERSON');
  // And the seats that come back undetermined are the same job again.
  assert.equal(taskSignature({askedUnknown: 'undeterminedPosition8', templateId: 'REL_H_POSITION'}),
    'LOCATE_IN_ORDER/PERSON');
});

test('RC2.8-1: the perceptual signature carries no family or template id', () => {
  const sig = userPerceptualSignature({
    oracle: {constraints: [eqSpec('x', mulSpec(3, 4))]},
    askedUnknown: 'scaledOutput', templateId: 'RATE_E_DIRECT', operationKinds: ['multiply']
  });
  assert.ok(!sig.includes('RATE_E_DIRECT'), sig);
  assert.ok(!sig.includes('unit_rate'), sig);
});

test('RC2.8-1: the taxonomy covers every unknown the engine can ask for', () => {
  const engine = new Engine();
  const unmapped = new Set();
  for (let i = 0; i < 260; i++) {
    for (const d of ['easy', 'medium', 'hard']) {
      let q;
      try { q = engine.generateQuestion({seed: `rc28-tax|${i}|${d}`, difficulty: d}); } catch { continue; }
      if (!taskOf(q.metadata.asked_unknown)) unmapped.add(q.metadata.asked_unknown);
    }
  }
  assert.deepEqual([...unmapped], [],
    'an unknown with no declared task falls out of every diversity measure it should be in');
});

test('RC2.8-1: every adjudicated template declares an information layout', () => {
  const engine = new Engine();
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    for (const d of ['easy', 'medium', 'hard']) {
      try { seen.add(engine.generateQuestion({seed: `rc28-info|${i}|${d}`, difficulty: d}).generator_id); } catch { /* band gap */ }
    }
  }
  const missing = [...seen].filter(id => !INFO_STRUCTURE_BY_TEMPLATE[id]);
  assert.deepEqual(missing, [], 'a template with no declared layout silently defaults to DIRECT_GIVENS');
});

test('RC2.8-1: scenario diversity is not measured on a template id', () => {
  // The RC2.7 measurement read «work_time/WORK_M_TARGET» as a scenario, so a
  // template with no declared situation counted as its own situation and the
  // count of distinct scenarios was really a count of templates.
  const engine = new Engine();
  const rows = engine.generatePractice({seed: 'rc28-scenario-check', count: 50}).questions;
  const offenders = rows
    .map(q => q.metadata.scenario_signature)
    .filter(sig => /\/[A-Z]{2,6}_[EMH]_[A-Z0-9_]+$/.test(String(sig)));
  assert.deepEqual(offenders, [],
    'a scenario signature ending in a template id is a template count wearing another name');
});

test('RC2.8-1: a synonym that leaves the sentence shape alone is not a new skeleton', () => {
  const a = stemSkeleton('باع تاجر 12 صندوقًا بـ40 درهمًا. فما ثمن الصندوق الواحد؟');
  const b = stemSkeleton('باع تاجر 30 صندوقًا بـ90 درهمًا. فما ثمن الصندوق الواحد؟');
  assert.equal(a, b, 'only the numerals differ');
});

test('RC2.8-1: the four labels are assigned against what came BEFORE', () => {
  const rows = [
    {family: 'f', generator_id: 'T1', question: 'q1', options: {}, metadata: {
      user_perceptual_signature: 'S1', task_signature: 'T/A', template_id: 'T1'}},
    {family: 'f', generator_id: 'T1', question: 'q2', options: {}, metadata: {
      user_perceptual_signature: 'S1', task_signature: 'T/A', template_id: 'T1'}},
    {family: 'f', generator_id: 'T2', question: 'q3', options: {}, metadata: {
      user_perceptual_signature: 'S1', task_signature: 'T/B', template_id: 'T2'}},
    {family: 'f', generator_id: 'T3', question: 'q4', options: {}, metadata: {
      user_perceptual_signature: 'S2', task_signature: 'T/C', template_id: 'T3'}},
    {family: 'g', generator_id: 'T4', question: 'q5', options: {}, metadata: {
      user_perceptual_signature: 'S3', task_signature: 'T/D', template_id: 'T4'}}
  ];
  const labels = classify(rows).map(r => r.label);
  assert.deepEqual(labels, [
    'GENUINELY_DISTINCT',          // first of its family
    'PARAMETER_ONLY_VARIANT',      // same template, same job
    'NEAR_DUPLICATE_CONSTRUCTION', // different template, same perceptual identity
    'HEALTHY_SKILL_RECURRENCE',    // same family, genuinely different idea
    'GENUINELY_DISTINCT'           // a family not met yet
  ]);
});

test('RC2.8-1: an empty sample is not a clean sheet', () => {
  const m = measureSample([], {label: 'empty'});
  assert.equal(m.items, 0);
  assert.equal(m.flagged, 0);
  // The measurement is honest about being empty; the GRADE is what must refuse
  // it, and tools/audit/rc28-diversity.mjs asserts delivery before anything else.
  assert.equal(m.distinctPerceptualSignatures, 0);
});
