// RC2-004 — a seed is a seed, or the engine says it is not.
//
// RC1 carried cross-session fingerprint memory on by default, so
// generatePractice was a function of (seed, everything this engine object had
// generated before). The audit found the same seed producing different
// sessions in a long-lived engine, while the engine still described itself as
// deterministic. The behaviour was not wrong on its own; declaring it
// reproducible was.
//
// Two modes now exist by name, and each is held to exactly what it claims:
//   DETERMINISTIC_SINGLE_GENERATION (default) — pure in its declared inputs.
//   STATEFUL_SESSION_GENERATION (opt in)      — the engine's history is an
//                                               input, and it says so.

import test from 'node:test';
import assert from 'node:assert/strict';

import Engine from '../src/index.js';

const strip = s => s.questions.map(q => ({
  id: q.id, question: q.question, correct: q.correct_option,
  options: {...q.options}
}));

const SEED = 'RC2-004-REPRO';

test('RC2-004: the default mode is the deterministic one, and it is declared', () => {
  const s = new Engine().generatePractice({count: 10, difficulty: 'mixed', seed: SEED});
  assert.equal(s.validation.generation_mode, 'DETERMINISTIC_SINGLE_GENERATION');
});

test('RC2-004: a fresh engine and a long-lived one replay the same seed identically', () => {
  const fresh = new Engine().generatePractice({count: 12, difficulty: 'mixed', seed: SEED});

  // The RC1 failure shape: an engine that has already done a lot of work.
  const worn = new Engine();
  for (let i = 0; i < 6; i++) {
    worn.generatePractice({count: 10, difficulty: 'mixed', seed: `warm-${i}`});
  }
  for (let i = 0; i < 40; i++) {
    try { worn.generateQuestion({family: 'random', difficulty: 'hard', seed: `warm-q-${i}`}); } catch {}
  }
  const later = worn.generatePractice({count: 12, difficulty: 'mixed', seed: SEED});

  assert.deepEqual(strip(later), strip(fresh));
});

test('RC2-004: replaying the same seed twice on the same engine is identical', () => {
  const engine = new Engine();
  const a = engine.generatePractice({count: 12, difficulty: 'mixed', seed: SEED});
  const b = engine.generatePractice({count: 12, difficulty: 'mixed', seed: SEED});
  assert.deepEqual(strip(b), strip(a));
});

test('RC2-004: an all-hard session replays identically too', () => {
  const fresh = new Engine().generatePractice({count: 15, difficulty: 'hard', seed: `${SEED}-HARD`, bandSession: true});
  const worn = new Engine();
  worn.generatePractice({count: 25, difficulty: 'hard', seed: 'warm-hard', bandSession: true});
  const later = worn.generatePractice({count: 15, difficulty: 'hard', seed: `${SEED}-HARD`, bandSession: true});
  assert.deepEqual(strip(later), strip(fresh));
});

test('RC2-004: the deterministic mode never consults cross-session memory', () => {
  const engine = new Engine();
  engine.generatePractice({count: 12, difficulty: 'mixed', seed: SEED});
  // Nothing was remembered, so nothing can perturb a later replay.
  assert.deepEqual(engine._recentFingerprints, []);
});

test('RC2-004: the stateful mode is available, records history, and says it is stateful', () => {
  const engine = new Engine();
  const first = engine.generatePractice({
    count: 12, difficulty: 'mixed', seed: SEED, mode: 'STATEFUL_SESSION_GENERATION'
  });
  assert.equal(first.validation.generation_mode, 'STATEFUL_SESSION_GENERATION');
  assert.ok(engine._recentFingerprints.length > 0, 'the stateful mode must remember');

  // The same seed again, now with the engine's own history as an input. This
  // divergence is the declared behaviour of the mode, not a defect.
  const second = engine.generatePractice({
    count: 12, difficulty: 'mixed', seed: SEED, mode: 'STATEFUL_SESSION_GENERATION'
  });
  assert.notDeepEqual(strip(second), strip(first),
    'a mode that claims to avoid its own history must actually differ');
});

test('RC2-004: the legacy opt-in flag still selects the stateful mode', () => {
  const s = new Engine().generatePractice({
    count: 8, difficulty: 'mixed', seed: SEED, useRecentSessionMemory: true
  });
  assert.equal(s.validation.generation_mode, 'STATEFUL_SESSION_GENERATION');
});

test('RC2-004: an unknown mode is refused, not silently coerced', () => {
  assert.throws(
    () => new Engine().generatePractice({count: 5, seed: SEED, mode: 'BEST_EFFORT'}),
    /Unknown generation mode/
  );
});

test('RC2-004: a stateful session cannot perturb a later deterministic replay', () => {
  const reference = new Engine().generatePractice({count: 12, difficulty: 'mixed', seed: SEED});
  const engine = new Engine();
  engine.generatePractice({count: 12, difficulty: 'mixed', seed: SEED, mode: 'STATEFUL_SESSION_GENERATION'});
  engine.generatePractice({count: 12, difficulty: 'mixed', seed: 'other', mode: 'STATEFUL_SESSION_GENERATION'});
  const replay = engine.generatePractice({count: 12, difficulty: 'mixed', seed: SEED});
  assert.equal(replay.validation.generation_mode, 'DETERMINISTIC_SINGLE_GENERATION');
  assert.deepEqual(strip(replay), strip(reference));
});

test('RC2-004: single-question generation is a pure function of its inputs', () => {
  const a = new Engine().generateQuestion({family: 'speed', difficulty: 'medium', seed: 'RC2-004-Q'});
  const worn = new Engine();
  for (let i = 0; i < 50; i++) {
    try { worn.generateQuestion({family: 'random', difficulty: 'hard', seed: `w-${i}`}); } catch {}
  }
  const b = worn.generateQuestion({family: 'speed', difficulty: 'medium', seed: 'RC2-004-Q'});
  assert.deepEqual(
    {q: b.question, o: {...b.options}, c: b.correct_option},
    {q: a.question, o: {...a.options}, c: a.correct_option}
  );
});
