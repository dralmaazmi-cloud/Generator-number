// RC2.8 — the blueprint catalogue and the scheduler that plans over it.
//
// The catalogue is a generated file that the session builder plans against. If
// it drifts from the engine, every diversity figure the scheduler reports is a
// figure about a generator that no longer exists. So it is re-derived here, on
// every run, and compared.

import test from 'node:test';
import assert from 'node:assert/strict';

import Engine from '../src/index.js';
import {BLUEPRINTS, blueprintId, presentationOf, blueprintsForBand, blueprintFor}
  from '../src/compose/blueprints.js';
import {BlueprintScheduler, CAPS_PER_100} from '../src/compose/blueprint-scheduler.js';
import {deriveBlueprints, render} from '../tools/audit/rc28-build-blueprints.mjs';
import {SeededRNG} from '../src/rng.js';
import {readFileSync} from 'node:fs';

test('RC2.8-2: the committed catalogue matches the engine it describes', () => {
  const {rows, unreachable} = deriveBlueprints();
  assert.deepEqual(unreachable, [], 'a template nothing can reach is a template the scheduler plans with and never gets');
  const onDisk = readFileSync(new URL('../src/compose/blueprints.js', import.meta.url), 'utf8');
  assert.equal(onDisk, render(rows),
    'src/compose/blueprints.js is stale — rerun node tools/audit/rc28-build-blueprints.mjs');
});

test('RC2.8-2: every blueprint is reachable by pinning it', () => {
  const engine = new Engine();
  const failures = [];
  for (const b of BLUEPRINTS) {
    let got = null;
    for (let i = 0; i < 6 && !got; i++) {
      try {
        const q = engine.generateQuestion({
          family: b.family, difficulty: b.band, templateId: b.templateId,
          targets: b.targets, seed: `rc28-reach|${blueprintId(b)}|${i}`
        });
        if (q.generator_id === b.templateId) got = q;
      } catch { /* try another seed */ }
    }
    if (!got) failures.push(blueprintId(b));
  }
  assert.deepEqual(failures, [], 'the scheduler cannot plan an idea the renderer will not produce');
});

test('RC2.8-2: a pin the family cannot honour fails loudly', () => {
  const engine = new Engine();
  assert.throws(
    () => engine.generateQuestion({family: 'relational', difficulty: 'easy', templateId: 'REL_H_POSITION', seed: 'x'}),
    err => err.code === 'TEMPLATE_PIN_UNAVAILABLE' || err.code === 'QUESTION_GENERATION_EXHAUSTED',
    'a template that is not at the requested band must not be silently substituted'
  );
});

test('RC2.8-3: a plan repeats no idea while an unused one exists', () => {
  const bands = Array.from({length: 100}, (_, i) => ['easy', 'medium', 'medium', 'hard'][i % 4]);
  const s = new BlueprintScheduler({bandSchedule: bands, rng: new SeededRNG('rc28-plan').fork('p')});
  const r = s.plan();
  assert.equal(r.complete, true, 'a hundred slots must be plannable from this catalogue');
  assert.equal(r.repeats, 0, 'no idea should repeat while the pool has unused ones');
  assert.equal(r.distinctBlueprints, 100);
});

test('RC2.8-3: no presentation exceeds its cluster cap in a plan', () => {
  const bands = Array.from({length: 100}, (_, i) => ['easy', 'medium', 'medium', 'hard'][i % 4]);
  const s = new BlueprintScheduler({bandSchedule: bands, rng: new SeededRNG('rc28-cap').fork('p')});
  const r = s.plan();
  assert.ok(r.largestPresentationCluster <= CAPS_PER_100.presentationCluster,
    `largest cluster ${r.largestPresentationCluster} over cap ${CAPS_PER_100.presentationCluster}`);
});

test('RC2.8-3: neither family nor job repeats in adjacent slots of a plan', () => {
  const bands = Array.from({length: 60}, (_, i) => ['easy', 'medium', 'hard'][i % 3]);
  const s = new BlueprintScheduler({bandSchedule: bands, rng: new SeededRNG('rc28-adj').fork('p')});
  const {plan} = s.plan();
  for (let i = 1; i < plan.length; i++) {
    if (!plan[i] || !plan[i - 1]) continue;
    assert.notEqual(plan[i].family, plan[i - 1].family, `families repeat at slot ${i + 1}`);
    assert.notEqual(plan[i].task, plan[i - 1].task, `jobs repeat at slot ${i + 1}`);
  }
});

test('RC2.8-3: the same seed plans the same session', () => {
  const bands = Array.from({length: 40}, (_, i) => ['easy', 'medium', 'hard'][i % 3]);
  const one = new BlueprintScheduler({bandSchedule: bands, rng: new SeededRNG('rc28-det').fork('p')}).plan();
  const two = new BlueprintScheduler({bandSchedule: bands, rng: new SeededRNG('rc28-det').fork('p')}).plan();
  assert.deepEqual(one.plan.map(blueprintId), two.plan.map(blueprintId));
});

test('RC2.8-3: a request bigger than the pool is refused, not filled with reskins', () => {
  const engine = new Engine();
  assert.throws(
    () => engine.generatePractice({seed: 'rc28-overask', count: 100, difficulty: 'hard'}),
    err => err.code === 'INSUFFICIENT_CONSTRUCTION_BREADTH' || err.code === 'INSUFFICIENT_BAND_COVERAGE',
    'a hundred hard slots against thirty-four hard ideas must fail by name'
  );
});

test('RC2.8-2: an uncatalogued realisation still gets a blueprint', () => {
  const b = blueprintFor('NOT_A_TEMPLATE', 'SOME/JOB', 'fam', 'medium', 'DIRECT_GIVENS');
  assert.equal(b.uncatalogued, true);
  assert.equal(presentationOf(b), 'fam|SOME/JOB|DIRECT_GIVENS');
});

test('RC2.8-2: every band holds enough ideas for a fifty-question session', () => {
  for (const band of ['easy', 'medium', 'hard']) {
    const pool = blueprintsForBand(band);
    assert.ok(pool.length >= 30, `${band} holds only ${pool.length} ideas`);
  }
});
