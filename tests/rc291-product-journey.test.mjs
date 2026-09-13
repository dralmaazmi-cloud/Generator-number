// RC2.9.1 — the PRODUCT's side of the cross-session contract.
//
// tests/rc29-journey.test.mjs is an ENGINE CONTRACT test: it carries the
// history between calls itself, which proves the engine honours a history it is
// given. It proved nothing about the application, and for one release it was
// described as carrying "exactly what the product carries" while the product
// carried nothing at all.
//
// These tests are about the application. They drive
// `generatePracticeForJourney` — the one function app.js calls to make a
// session — against a Storage double standing in for the browser's
// localStorage, and they assert the round trip the product is responsible for:
// restore, pass, keep. The browser-level version, which clicks the real buttons
// on the real page, is tests/rc291-browser-journey.test.mjs.

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

import Engine from '../src/index.js';
import {measureSample, classify} from '../src/qa/perceptual-classify.js';
import {generatePracticeForJourney, loadDiversityHistory, savePracticeJourney,
  clearPracticeJourney, readPracticeJourney, JOURNEY_KEY, JOURNEY_SCHEMA} from '../practice-journey.js';

/** The browser Storage surface app.js uses, and nothing more of it than that. */
function storageDouble(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
    /** What a reload would find: the bytes the browser kept. */
    snapshot: () => Object.fromEntries(map)
  };
}

/** The engine, with a record of what the product actually handed it. */
function recordingEngine() {
  const engine = new Engine();
  const calls = [];
  const real = engine.generatePractice.bind(engine);
  engine.generatePractice = opts => {
    calls.push({seed: opts.seed, diversityHistory: opts.diversityHistory ?? null});
    return real(opts);
  };
  return {engine, calls};
}

const SETTINGS = {families: [], difficulty: 'mixed', count: 50};
const play = (engine, storage, seed, extra = {}) =>
  generatePracticeForJourney({engine, storage, options: {...SETTINGS, seed}, ...extra});

// --- A: the ordinary continuation -------------------------------------------

test('RC2.9.1-A: the second session is handed the history the first one produced', () => {
  const {engine, calls} = recordingEngine();
  const storage = storageDouble();

  const first = play(engine, storage, 'rc291-a-s1');
  assert.equal(first.questions.length, 50);
  assert.equal(calls[0].diversityHistory, null, 'a journey that has not started carries nothing');

  const kept = readPracticeJourney(storage);
  assert.equal(kept.schema, JOURNEY_SCHEMA, 'the product must keep the history under its own schema');
  assert.equal(kept.questionsSeen, 50);
  assert.deepEqual(kept.history, first.diversity_history, 'what was kept is what the engine returned');

  play(engine, storage, 'rc291-a-s2');
  assert.deepEqual(calls[1].diversityHistory, first.diversity_history,
    'the second session must receive the exact history the first one produced');
  assert.equal(readPracticeJourney(storage).questionsSeen, 100);
});

// --- B: reload and resume ----------------------------------------------------

test('RC2.9.1-B: the journey survives a reload of the application', () => {
  const {engine, calls} = recordingEngine();
  const before = storageDouble();
  const first = play(engine, before, 'rc291-b-s1');

  // What a reload is: the page is gone, every module is re-evaluated, and the
  // only thing that crosses is the bytes the browser kept.
  const bytes = JSON.parse(JSON.stringify(before.snapshot()));
  const after = storageDouble(bytes);

  play(engine, after, 'rc291-b-s2');
  assert.deepEqual(calls[1].diversityHistory, first.diversity_history,
    'a reload between sittings must not cost the journey its memory');
});

// --- C: determinism ----------------------------------------------------------

test('RC2.9.1-C: the same seeds and the same stored state replay identically', () => {
  const run = () => {
    const engine = new Engine();
    const storage = storageDouble();
    const a = play(engine, storage, 'rc291-c-s1');
    const b = play(engine, storage, 'rc291-c-s2');
    return {
      questions: [...a.questions, ...b.questions].map(q => q.question),
      stored: readPracticeJourney(storage).history
    };
  };
  const one = run(), two = run();
  assert.deepEqual(one.questions, two.questions);
  assert.deepEqual(one.stored, two.stored);
});

// --- D: a deliberate fresh start ---------------------------------------------

test('RC2.9.1-D: an explicit reset starts the next journey from nothing', () => {
  const {engine, calls} = recordingEngine();
  const storage = storageDouble();
  play(engine, storage, 'rc291-d-s1');
  assert.ok(loadDiversityHistory(storage), 'precondition: a journey is under way');

  clearPracticeJourney(storage);
  assert.equal(loadDiversityHistory(storage), null);

  play(engine, storage, 'rc291-d-s2');
  assert.equal(calls[1].diversityHistory, null, 'after a reset the engine must be asked blind');
  assert.equal(readPracticeJourney(storage).questionsSeen, 50, 'and the new journey starts counting again');
});

test('RC2.9.1-D: a set generated outside the journey neither reads nor is read', () => {
  // `continueJourney: false` is the same deliberate act taken for one set.
  const {engine, calls} = recordingEngine();
  const storage = storageDouble();
  play(engine, storage, 'rc291-d2-s1');
  const kept = readPracticeJourney(storage).history;
  play(engine, storage, 'rc291-d2-s2', {continueJourney: false});
  assert.equal(calls[1].diversityHistory, null);
  assert.notDeepEqual(readPracticeJourney(storage).history, kept, 'the fresh set becomes the journey');
});

// --- E: the carried history actually changes the sitting ---------------------

test('RC2.9.1-E: the same second-session seed produces a different sitting with and without the history', () => {
  const seedOne = 'rc291-e-s1', seedTwo = 'rc291-e-s2';

  const carried = storageDouble();
  const engineA = new Engine();
  const first = play(engineA, carried, seedOne);
  const second = play(engineA, carried, seedTwo);

  const blind = storageDouble();
  const engineB = new Engine();
  play(engineB, blind, seedOne);
  clearPracticeJourney(blind);
  const secondBlind = play(engineB, blind, seedTwo);

  assert.notDeepEqual(
    second.questions.map(q => q.question),
    secondBlind.questions.map(q => q.question),
    'if the history made no difference to what was scheduled, it was not being used'
  );

  // And the difference is the one that matters: how much of the second fifty
  // the reader has already solved.
  const repeatsIn = rows => {
    const labelled = classify([...first.questions, ...rows]);
    return labelled.slice(50).filter((row, i) =>
      new Set(labelled.slice(0, 50 + i).map(x => x.perceptual)).has(row.perceptual)).length;
  };
  const withHistory = repeatsIn(second.questions);
  const without = repeatsIn(secondBlind.questions);
  assert.ok(withHistory < without,
    `carrying the history must reduce repeats: ${withHistory} carried vs ${without} blind`);
  assert.ok(withHistory <= 4, `${withHistory} of the second fifty repeat something already solved`);
});

// --- F: nothing else may drop the journey ------------------------------------

test('RC2.9.1-F: deleting a saved session does not erase the practice journey', () => {
  // The trap named in the brief: the saved-session card's «حذف» means "throw
  // away the half-finished sitting", not "let me meet those ideas again".
  const storage = storageDouble();
  const {engine} = recordingEngine();
  play(engine, storage, 'rc291-f-s1');
  const kept = readPracticeJourney(storage).history;

  const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  for (const line of source.split('\n')) {
    if (!/removeItem|clearSavedSession/.test(line)) continue;
    assert.ok(!line.includes(JOURNEY_KEY) && !/clearPracticeJourney/.test(line),
      `a session-clearing line must not touch the journey: ${line.trim()}`);
  }

  storage.removeItem('numerical_generator_saved_session_v2');
  assert.deepEqual(readPracticeJourney(storage).history, kept);
});

test('RC2.9.1-F: an unusable stored journey starts a clean one instead of failing', () => {
  const {engine, calls} = recordingEngine();
  for (const junk of ['', 'not json', '{}', JSON.stringify({schema: 'someone-elses-v9', history: {}})]) {
    const storage = storageDouble({[JOURNEY_KEY]: junk});
    assert.equal(loadDiversityHistory(storage), null, `refused: ${junk.slice(0, 24)}`);
    const set = play(engine, storage, 'rc291-f2');
    assert.equal(set.questions.length, 50);
  }
  assert.ok(calls.every(c => c.diversityHistory === null));
});

test('RC2.9.1-F: storage that refuses to write costs the memory, never the sitting', () => {
  const engine = new Engine();
  const readOnly = {
    getItem: () => null,
    setItem: () => { throw new Error('QuotaExceededError'); },
    removeItem: () => {}
  };
  const set = play(engine, readOnly, 'rc291-f3');
  assert.equal(set.questions.length, 50, 'a full quota must not cost the user their session');
});

test('RC2.9.1-F: a session that returns no history leaves the stored one alone', () => {
  const storage = storageDouble();
  const engine = new Engine();
  const first = play(engine, storage, 'rc291-f4');
  savePracticeJourney(storage, null);
  assert.deepEqual(readPracticeJourney(storage).history, first.diversity_history);
});

// --- the wiring itself --------------------------------------------------------

test('RC2.9.1: the application generates sessions through the journey, never around it', () => {
  // The defect was one call site. This is the test that would have caught it.
  const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const direct = source.split('\n')
    .map((line, i) => ({line, n: i + 1}))
    .filter(({line}) => /\.generatePractice\s*\(/.test(line));
  assert.deepEqual(direct.map(d => `${d.n}: ${d.line.trim()}`), [],
    'app.js must call generatePracticeForJourney, which is what carries the history');
  assert.match(source, /generatePracticeForJourney\(/, 'and it must actually call it');
  assert.match(source, /from '\.\/practice-journey\.js'/);
});

test('RC2.9.1: the product stores the journey beside its other progress, under one key', () => {
  const source = readFileSync(new URL('../practice-journey.js', import.meta.url), 'utf8');
  assert.equal(JOURNEY_KEY, 'numerical_generator_practice_journey_v1');
  // No module-level mutable state: the Storage the caller passes is the only
  // source of truth, so two tabs cannot disagree with what was persisted.
  // Module-level only: a `let` inside a function is a local, and the property
  // that matters is that nothing survives between calls except the Storage.
  const moduleState = source.split('\n').filter(l => /^(let|var)\s/.test(l));
  assert.deepEqual(moduleState, [], 'the journey module must hold no state of its own');
});

test('RC2.9.1: a standalone fifty is unchanged by any of this', () => {
  // The gate the product fix must not move: one sitting, judged alone.
  const storage = storageDouble();
  const engine = new Engine();
  const m = measureSample(play(engine, storage, 'rc291-standalone').questions, {label: 'standalone'});
  assert.ok(m.flagged <= 4, `PV+ND ${m.flagged}`);
});
