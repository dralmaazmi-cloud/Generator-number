// RC2.9.5 §2. Single-band practice is gone, and gone from the ENGINE rather
// than only from the screen.
//
// Removing the control is not enough: a saved preference written before this
// release, an old link, or a restored session can still carry a band. Three
// layers are checked here.
//
//   1. the page has no difficulty control at all, and app.js reads none;
//   2. the engine refuses a single-band practice session by name, and says so
//      with a code a caller can act on;
//   3. the product's one session-generating function rewrites whatever band it
//      is handed to mixed, so a learner resuming an old session gets a mixed
//      sitting instead of an error.
//
// generateQuestion keeps its band: tests, tooling and the acceptance suites
// need one question at a band, and that is not a product path.

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

import Engine from '../src/index.js';
import {generatePracticeForJourney, PRACTICE_DIFFICULTY} from '../practice-journey.js';

const engine = new Engine();
const appSource = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const journeySource = readFileSync(new URL('../practice-journey.js', import.meta.url), 'utf8');

test('RC2.9.5-2.1: the page carries no difficulty control', () => {
  assert.doesNotMatch(pageSource, /id="difficulty"/, 'index.html still has a difficulty control');
  assert.doesNotMatch(pageSource, /<option value="(easy|medium|hard|adaptive)"/, 'a band option survives in the page');
  assert.doesNotMatch(pageSource, /id="adaptiveHint"/);
  assert.doesNotMatch(pageSource, /id="(harderSession|easierSession)"/, 'the band-shifting buttons survive');
});

test('RC2.9.5-2.1: app.js never reads a difficulty control or names a band as a setting', () => {
  assert.doesNotMatch(appSource, /\$\('difficulty'\)/, 'app.js still reads a difficulty control');
  assert.doesNotMatch(appSource, /difficulty:\s*'(easy|medium|hard|adaptive)'/, 'app.js still asks for a band');
  assert.doesNotMatch(appSource, /bandSession/, 'the product must never take the measurement path');
  assert.doesNotMatch(journeySource, /bandSession/, 'the product must never take the measurement path');
  assert.match(appSource, /const PRACTICE_DIFFICULTY = 'mixed'/);
});

test('RC2.9.5-2.2: the engine refuses a single-band practice session', () => {
  for (const band of ['easy', 'medium', 'hard']) {
    assert.throws(
      () => engine.generatePractice({seed: `rc295-refuse-${band}`, count: 10, difficulty: band}),
      err => {
        assert.equal(err.code, 'SINGLE_BAND_PRACTICE_REMOVED');
        assert.equal(err.requested, band);
        assert.match(err.message, /RC2\.9\.5/);
        return true;
      },
      `${band} was not refused`);
  }
});

test('RC2.9.5-2.2: mixed is generated as before, and one question at a band still works', () => {
  const set = engine.generatePractice({seed: 'rc295-mixed', count: 20});
  assert.equal(set.questions.length, 20);
  assert.ok(new Set(set.questions.map(q => q.difficulty)).size > 1, 'a mixed session spans bands');
  const q = engine.generateQuestion({family: 'ages', difficulty: 'easy', seed: 'rc295-one'});
  assert.equal(q.difficulty, 'easy');
});

test('RC2.9.5-2.2: measurement asks in as many words, and only measurement can', () => {
  const band = engine.generatePractice({seed: 'rc295-measure', count: 10, difficulty: 'easy', bandSession: true});
  assert.deepEqual([...new Set(band.questions.map(q => q.difficulty))], ['easy']);
});

test('RC2.9.5-2.3: a persisted band is ignored by the product, not honoured and not thrown', () => {
  const storage = new Map();
  const shim = {getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k)};
  assert.equal(PRACTICE_DIFFICULTY, 'mixed');
  for (const stale of ['easy', 'medium', 'hard', 'adaptive', undefined]) {
    const set = generatePracticeForJourney({
      engine, storage: shim,
      options: {seed: `rc295-stale-${stale}`, count: 10, difficulty: stale},
      continueJourney: false
    });
    assert.equal(set.questions.length, 10);
    assert.ok(new Set(set.questions.map(q => q.difficulty)).size > 1,
      `a journey started from a stale '${stale}' setting delivered one band`);
  }
});

test('RC2.9.5-2.3: the journey survives the change — history written under the old mix still carries', () => {
  // The migration decision is (a) KEEP the history. This is what keeping it
  // means in practice: a journey written before the change is accepted, its
  // cooldown still protects the learner, and the next sitting continues it.
  const storage = new Map();
  const shim = {getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k)};
  const first = generatePracticeForJourney({engine, storage: shim, options: {seed: 'rc295-mig-1', count: 20}, continueJourney: false});
  const second = generatePracticeForJourney({engine, storage: shim, options: {seed: 'rc295-mig-2', count: 20}});
  assert.equal(first.questions.length, 20);
  assert.equal(second.questions.length, 20);
  const seen = new Set(first.questions.map(q => q.metadata.normalized_stem_identity));
  const repeats = second.questions.filter(q => seen.has(q.metadata.normalized_stem_identity));
  assert.equal(repeats.length, 0, 'the second sitting repeated a stem the first one delivered');
});
