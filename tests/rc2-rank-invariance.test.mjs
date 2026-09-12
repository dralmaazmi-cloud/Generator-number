// RC2-001 — proof that the published answer's numeric rank does not influence
// generation. Three independent angles, as required by the authorisation:
//   A. static call-site analysis over production source;
//   B. runtime instrumentation: generation must not read rank-target state;
//   C. counterfactual rank invariance: with question state, distractor pool and
//      RNG held fixed, varying any rank target or weight configuration must not
//      change the distractor SET that is selected.
//
// Each angle carries a meta-test proving it can fail, so none of them is an
// invariant that cannot be violated.

import test from 'node:test';
import {supportedBand} from './_support/bands.mjs';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';

import Engine from '../src/index.js';
import {SeededRNG} from '../src/rng.js';
import {makeOptionSet, LETTERS} from '../src/utils.js';

const PRODUCTION_ROOTS = ['src', 'app.js', 'report.js'];

function productionFiles(target, out = []) {
  const st = statSync(target);
  if (st.isDirectory()) for (const e of readdirSync(target)) productionFiles(join(target, e), out);
  else if (target.endsWith('.js')) out.push(target);
  return out;
}

// --- A. static call-site analysis -------------------------------------------

test('RC2-001/A: no production module defines or reads rank-target state', () => {
  const banned = [
    /RANK_DRAW_WEIGHTS/,
    /drawRankPosition/,
    /pickBalancedDistractors\s*\(/,      // a call, not the historical note
    /hasLoneRoundNumber/,
    /targetRank/,
    /desiredRank/,
    /rankWeights/
  ];
  const offenders = [];
  for (const root of PRODUCTION_ROOTS) {
    for (const file of productionFiles(root)) {
      const src = readFileSync(file, 'utf8');
      // Strip block and line comments: the historical note in utils.js names the
      // removed function on purpose and must not count as a call site.
      const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
      for (const re of banned) if (re.test(code)) offenders.push(`${file}: ${re}`);
    }
  }
  assert.deepEqual(offenders, [], `rank-target state found in production: ${offenders.join(', ')}`);
});

test('RC2-001/A meta: the scan would catch a reintroduced chooser', () => {
  const code = 'const w = RANK_DRAW_WEIGHTS[below]; return drawRankPosition(rng, lo, hi);';
  assert.ok(/RANK_DRAW_WEIGHTS/.test(code) && /drawRankPosition/.test(code));
});

// --- B. runtime instrumentation ---------------------------------------------

test('RC2-001/B: generation reads no ambient rank-target state', () => {
  const reads = [];
  for (const name of ['RANK_DRAW_WEIGHTS', 'targetRank', 'desiredRank', 'rankWeights', '__RANK_TARGET__']) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      get() { reads.push(name); return name === 'RANK_DRAW_WEIGHTS' ? [1, 1, 1, 1, 1, 1] : 3; }
    });
  }
  try {
    const engine = new Engine();
    for (let i = 0; i < 120; i++) engine.generateQuestion({family: 'random', difficulty: 'mixed', seed: `rc2-rank-b-${i}`});
  } finally {
    for (const name of ['RANK_DRAW_WEIGHTS', 'targetRank', 'desiredRank', 'rankWeights', '__RANK_TARGET__']) delete globalThis[name];
  }
  assert.deepEqual(reads, [], `generation read rank-target state: ${[...new Set(reads)].join(', ')}`);
});

test('RC2-001/B meta: the trap fires when something does read it', () => {
  const reads = [];
  Object.defineProperty(globalThis, '__RANK_TARGET__', {configurable: true, get() { reads.push('hit'); return 3; }});
  const x = globalThis.__RANK_TARGET__;
  delete globalThis.__RANK_TARGET__;
  assert.equal(x, 3);
  assert.deepEqual(reads, ['hit']);
});

// --- C. counterfactual rank invariance --------------------------------------

/** A pool with error paths on both sides of the key, so a chooser would have room. */
function fixture() {
  const correct = 24;
  const distractors = [
    {value: 12, misconceptionId: 'STOPPED_AT_INTERMEDIATE_TOTAL', derivation: '24 ÷ 2'},
    {value: 16, misconceptionId: 'USED_GIVEN_VALUE_AS_ANSWER', derivation: 'القيمة المعطاة 16'},
    {value: 18, misconceptionId: 'STOPPED_AFTER_FIRST_STAGE', derivation: '6 × 3'},
    {value: 20, misconceptionId: 'USED_ONLY_FIRST_RATE', derivation: '4 × 5'},
    {value: 30, misconceptionId: 'ADDED_INSTEAD_OF_SCALING', derivation: '24 + 6'},
    {value: 36, misconceptionId: 'APPLIED_STEP_TWICE', derivation: '24 × 1.5'},
    {value: 48, misconceptionId: 'REVERSED_INVERSE_PROPORTION', derivation: '24 × 2'},
    {value: 72, misconceptionId: 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE', derivation: '24 × 3'}
  ];
  return {correct, distractors};
}

const setOf = result => LETTERS
  .filter(l => !result.options_meta[l].correct)
  .map(l => result.options_meta[l].value)
  .sort((a, b) => a - b)
  .join(',');

test('RC2-001/C: the distractor set is identical across every injected rank target', () => {
  const {correct, distractors} = fixture();
  const sets = new Set();
  for (const target of [1, 2, 3, 4, 5, 6]) {
    for (const weights of [[1,1,1,1,1,1], [10,1,1,1,1,1], [1,1,1,1,1,10], [3.17,0.87,0.28,0.22,0.39,1.07]]) {
      globalThis.__RANK_TARGET__ = target;
      globalThis.RANK_DRAW_WEIGHTS = weights;
      const out = makeOptionSet({
        correct, distractors,
        rng: new SeededRNG('rc2-rank-invariance'),   // RNG state held fixed
        format: v => String(v)
      });
      sets.add(setOf(out));
      delete globalThis.__RANK_TARGET__;
      delete globalThis.RANK_DRAW_WEIGHTS;
    }
  }
  assert.equal(sets.size, 1, `the selected distractor set varied with the rank target: ${[...sets].join(' | ')}`);
});

test('RC2-001/C: the same holds through the whole engine, for every family', () => {
  const families = new Engine().listFamilies().map(f => f.id);
  for (const family of families) {
    const seen = new Set();
    for (const target of [1, 3, 6]) {
      globalThis.__RANK_TARGET__ = target;
      const q = new Engine().generateQuestion({family, difficulty: supportedBand(family, 'medium'), seed: `rc2-rank-c-${family}`});
      seen.add(LETTERS.filter(l => !q.metadata.options_meta[l].correct)
        .map(l => String(q.metadata.options_meta[l].value)).sort().join(','));
      delete globalThis.__RANK_TARGET__;
    }
    assert.equal(seen.size, 1, `${family}: distractor set varied with the injected rank target`);
  }
});

test('RC2-001/C meta: a chooser that reads the target would be caught', () => {
  // A stand-in for the removed pickBalancedDistractors: same pool, same RNG,
  // but the selection depends on a rank target. The test above must be able to
  // tell this apart from the real implementation.
  const {correct, distractors} = fixture();
  const chooseByRank = target => {
    const below = distractors.filter(d => d.value < correct);
    const above = distractors.filter(d => d.value > correct);
    const wantBelow = Math.min(Math.max(target - 1, 0), below.length);
    return [...below.slice(0, wantBelow), ...above.slice(0, 5 - wantBelow)]
      .map(d => d.value).sort((a, b) => a - b).join(',');
  };
  const sets = new Set([1, 3, 6].map(chooseByRank));
  assert.ok(sets.size > 1, 'the meta-fixture must vary with the rank target, or angle C proves nothing');
});

// --- the observation fields still exist, and remain observations -------------

test('RC2-001: rank is still recorded, after the fact, for measurement', () => {
  const engine = new Engine();
  const q = engine.generateQuestion({family: 'speed', difficulty: 'medium', seed: 'rc2-rank-observe'});
  assert.ok(Number.isInteger(q.metadata.correct_numeric_rank), 'numeric rank must still be reported');
  assert.ok(q.metadata.correct_numeric_rank >= 1 && q.metadata.correct_numeric_rank <= 6);
});
