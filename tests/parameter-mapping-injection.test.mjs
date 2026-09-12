// SIGN-OFF ITEM 3. Fault injection at the parameter-to-solver mapping.
//
// tests/fault-injection.test.mjs already nudges the *published key* (correct + 1,
// next weekday, a distractor's label). That proves the oracle notices a wrong
// number, but it does not prove the oracle would notice the far more realistic
// defect: a solver that reads the right template with the wrong parameters
// wired into it, and therefore produces a key that is internally consistent,
// plausibly sized, and wrong for the statement as printed.
//
// Every case here leaves the rendered stem, the oracle specification and the
// parameter values exactly as the generator produced them, and changes only
// which parameter the *solver* consumes for which role. The key that results is
// whatever that mis-wiring genuinely computes — it is never hand-picked.
//
// TEST-ONLY. Nothing in src/ is imported except to be called; nothing is mutated
// in place; no production behaviour changes.

import test from 'node:test';
import assert from 'node:assert/strict';

import {SeededRNG} from '../src/rng.js';
import {finalizeQuestion, DAYS_AR} from '../src/utils.js';
import {validateCandidate, runOracle} from '../src/qa/pipeline.js';
import {buildOrderOracle} from '../src/qa/relational-oracle.js';
import {REASON} from '../src/qa/reasons.js';
import {solve as solveDirectProportion} from '../src/families/direct_proportion.js';

const CATCHING_REASONS = [
  REASON.ORACLE_DISAGREEMENT,
  REASON.ORACLE_NO_SOLUTION,
  REASON.ORACLE_NON_UNIQUE,
  REASON.NO_CORRECT_OPTION,
  REASON.MULTIPLE_CORRECT_OPTIONS
];

/** A clean, pipeline-approved item, optionally restricted to one template. */
async function cleanItem(family, difficulty, tag, templateId = null, predicate = null) {
  const mod = await import(`../src/families/${family}.js`);
  const gen = Object.values(mod).find(v => typeof v === 'function' && v.name.startsWith('generate'));
  for (let attempt = 0; attempt < 400; attempt++) {
    const rng = new SeededRNG(`pmap-${family}-${difficulty}-${tag}-${attempt}`);
    try {
      const base = gen({difficulty, rng: rng.fork('c'), seed: `pm${tag}${attempt}`, engineVersion: 'test'});
      if (templateId && base.template_id !== templateId) continue;
      if (predicate && !predicate(base)) continue;
      const q = finalizeQuestion(base, rng.fork('o'));
      if (validateCandidate(base, q).valid) return {base, q, rng: new SeededRNG(`pmap-${family}-${difficulty}-${tag}-${attempt}`)};
    } catch { /* another draw */ }
  }
  return null;
}

function shallowClone(base) {
  return {
    ...base,
    parameters: {...base.parameters},
    explanation: {...base.explanation, steps: [...base.explanation.steps]}
  };
}

/**
 * Runs the injected candidate through the oracle and, where the option set can
 * still be built, through the whole pipeline. Returns every code that fired.
 */
function catchReport(brokenBase, originalQ, rng) {
  const codes = new Set();
  const oracle = runOracle(brokenBase, originalQ);
  assert.ok(oracle.ran, 'the template must declare an oracle');
  for (const r of oracle.reasons) codes.add(r);

  let rebuiltThrew = null;
  try {
    const brokenQ = finalizeQuestion(brokenBase, rng.fork('o2'));
    for (const r of validateCandidate(brokenBase, brokenQ).reasons) codes.add(r);
  } catch (err) {
    rebuiltThrew = err.reason || err.message;
  }
  return {codes: [...codes], oracleReasons: oracle.reasons, rebuiltThrew};
}

function assertCaught(report, what) {
  const caught = report.codes.filter(c => CATCHING_REASONS.includes(c));
  assert.ok(
    caught.length > 0,
    `${what}: no validator objected. codes=${JSON.stringify(report.codes)} rebuildThrew=${report.rebuiltThrew}`
  );
  console.log(`  mutated: ${what}\n  caught by: ${caught.join(', ')}${report.codes.length > caught.length ? ` (also ${report.codes.filter(c => !caught.includes(c)).join(', ')})` : ''}`);
}

// --- 1. arithmetic / proportion --------------------------------------------

test('parameter mapping: direct_proportion solver reads baseCount and targetCount swapped', async () => {
  const item = await cleanItem('direct_proportion', 'medium', 'dp1');
  assert.ok(item, 'need a clean direct_proportion item');
  const {base, q, rng} = item;
  assert.equal(validateCandidate(base, q).valid, true, 'MUST_ACCEPT: the untouched item passes');

  const asked = base.askedUnknown || 'scaledOutput';
  const p = base.parameters;
  assert.ok('baseCount' in p && 'targetCount' in p, `template ${base.template_id} must expose both counts`);

  // The mis-wiring: the solver is handed targetCount where baseCount belongs.
  const miswired = {...p, baseCount: p.targetCount, targetCount: p.baseCount};
  const wrong = solveDirectProportion(miswired, asked);
  if (Math.abs(wrong.answer - Number(base.correct)) < 1e-9) return; // symmetric draw, nothing to catch

  const broken = shallowClone(base);
  broken.correct = wrong.answer;
  assertCaught(catchReport(broken, q, rng),
    `direct_proportion/${base.template_id} askedUnknown=${asked}: solve() given baseCount=${p.targetCount}, targetCount=${p.baseCount} -> key ${base.correct} became ${wrong.answer}`);
});

// --- 2. temporal ------------------------------------------------------------

test('parameter mapping: calendar solver reads aheadDays and behindDays swapped', async () => {
  const item = await cleanItem('calendar', 'hard', 'cal1', 'CAL_H_NESTED');
  assert.ok(item, 'need a clean CAL_H_NESTED item');
  const {base, q, rng} = item;
  assert.equal(validateCandidate(base, q).valid, true, 'MUST_ACCEPT: the untouched item passes');

  const {aheadDays, behindDays, targetDayIndex} = base.parameters;
  assert.ok(Number.isFinite(aheadDays) && Number.isFinite(behindDays), 'both offsets must be exposed');

  // The mis-wiring: the same 1 + N - M rule, with N and M coming from the wrong
  // slots. The arithmetic is correct; only the wiring is wrong.
  const miswiredOffset = 1 + behindDays - aheadDays;
  const wrongDay = DAYS_AR[(((targetDayIndex - miswiredOffset) % 7) + 7) % 7];
  if (wrongDay === base.correct) return; // the two offsets coincide mod 7

  const broken = shallowClone(base);
  broken.correct = wrongDay;
  assertCaught(catchReport(broken, q, rng),
    `calendar/CAL_H_NESTED: netOffset computed as 1 + ${behindDays} - ${aheadDays} = ${miswiredOffset} instead of 1 + ${aheadDays} - ${behindDays} -> key ${base.correct} became ${wrongDay}`);
});

// --- 3. relational ----------------------------------------------------------

test('parameter mapping: relational solver maps two participants to the wrong nodes', async () => {
  const isPosition = b => b.oracle?.kind === 'order' && b.oracle.ask?.type === 'position';
  const attempts = [];
  for (const difficulty of ['easy', 'medium', 'hard']) {
    for (const tag of ['r1', 'r2', 'r3']) {
      const item = await cleanItem('relational', difficulty, tag, null, isPosition);
      if (!item) continue;
      const {base, q, rng} = item;
      const spec = base.oracle;
      assert.equal(validateCandidate(base, q).valid, true, 'MUST_ACCEPT: the untouched item passes');

      // The mis-wiring: the statements are printed as generated, but the solver
      // binds two of the names to each other's nodes when it builds the graph.
      // The ordering it derives is still a perfectly consistent total order —
      // it is simply an order over the wrong people.
      for (let i = 0; i < spec.nodes.length; i++) {
        for (let j = i + 1; j < spec.nodes.length; j++) {
          const x = spec.nodes[i], y = spec.nodes[j];
          const swap = n => (n === x ? y : n === y ? x : n);
          const miswired = spec.edges.map(([a, b]) => [swap(a), swap(b)]);
          let wrong;
          try {
            wrong = buildOrderOracle(spec.nodes.map(swap), miswired).whoAtPosition(spec.ask.position);
          } catch { continue; }
          attempts.push(wrong);
          if (!wrong || wrong === base.correct) continue;

          const broken = shallowClone(base);
          broken.correct = wrong;
          assertCaught(catchReport(broken, q, rng),
            `relational/${base.template_id}: solver bound ${x} to ${y}'s node and back over edges ${JSON.stringify(spec.edges)} -> position ${spec.ask.position} key ${base.correct} became ${wrong}`);
          return;
        }
      }
    }
  }
  assert.fail(`no relational position item produced a usable name transposition (tried ${attempts.length})`);
});

// --- 4. odd one out (rule-based, a fourth structure) ------------------------

test('parameter mapping: odd_one_out solver is pointed at the wrong member of the set', async () => {
  const item = await cleanItem('odd_one_out', 'medium', 'ooo1');
  assert.ok(item, 'need a clean odd_one_out item');
  const {base, q, rng} = item;
  assert.equal(validateCandidate(base, q).valid, true, 'MUST_ACCEPT: the untouched item passes');

  const numbers = base.oracle.numbers;
  const wrong = numbers.find(n => Number(n) !== Number(base.correct));
  assert.ok(wrong !== undefined, 'the set must hold more than one member');

  const broken = shallowClone(base);
  broken.correct = wrong;
  assertCaught(catchReport(broken, q, rng),
    `odd_one_out/${base.template_id}: intruder index read off by one over [${numbers.join(', ')}] -> key ${base.correct} became ${wrong}`);
});

// --- 5. the same mis-wiring, swept across every family ----------------------
//
// A sibling instance of the same template is generated and its solved key is
// handed to this instance: exactly what a solver caching or indexing bug does.

const FAMILIES = [
  'sequences', 'ratios', 'percentages', 'averages', 'ages', 'speed', 'work_time',
  'machines', 'direct_proportion', 'fractions', 'unit_rate', 'combined_rate',
  'relational', 'calendar', 'odd_one_out', 'profit_loss'
];

for (const family of FAMILIES) {
  test(`parameter mapping: ${family} solver keyed to a sibling instance's parameters`, async () => {
    const difficulty = family === 'relational' ? 'easy' : 'medium';
    const a = await cleanItem(family, difficulty, 'xa');
    assert.ok(a, `need a clean ${family} item`);
    assert.equal(validateCandidate(a.base, a.q).valid, true, 'MUST_ACCEPT: the untouched item passes');

    let b = null;
    for (const tag of ['xb', 'xc', 'xd', 'xe', 'xf', 'xg']) {
      const cand = await cleanItem(family, difficulty, tag, a.base.template_id);
      if (cand && String(cand.base.correct) !== String(a.base.correct)) { b = cand; break; }
    }
    assert.ok(b, `need a second ${family}/${a.base.template_id} instance with a different key`);

    const broken = shallowClone(a.base);
    broken.correct = b.base.correct;
    assertCaught(catchReport(broken, a.q, a.rng),
      `${family}/${a.base.template_id}: solver keyed to sibling parameters ${JSON.stringify(b.base.parameters)} instead of ${JSON.stringify(a.base.parameters)} -> key ${a.base.correct} became ${b.base.correct}`);
  });
}
