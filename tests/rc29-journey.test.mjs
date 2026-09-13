// RC2.9 — the user journey, held to the experience rather than to the call.
//
// RC2.8 passed its own measurement by asking for a hundred questions in one
// call. The product cannot do that: a session is fifty questions, and a user
// who wants a hundred sits two. Measured that way, the independent Phase-A
// review found the first fifty clean and the second fifty a replay — 29 to 34
// of 50 repeating something already solved, beginning at Q51, because the
// second call starts the planner from an empty page.
//
// Every test here goes through `generatePractice` twice, exactly as the
// application does, and judges the hundred the user actually meets.

import test from 'node:test';
import assert from 'node:assert/strict';

import Engine from '../src/index.js';
import {playJourney, playSession, measureJourney, gradeJourney, JOURNEY_GATES,
  BEFORE_JOURNEYS, normalizedStemIdentity} from '../tools/audit/rc29-journey.mjs';

for (const spec of BEFORE_JOURNEYS) {
  test(`RC2.9-0: ${spec.label} — two ordinary sessions read as one hundred questions`, () => {
    const m = measureJourney(playJourney(new Engine(), {seeds: spec.seeds}), {label: spec.label});
    const g = gradeJourney(m);
    const failed = g.conditions.filter(c => !c.ok).map(c => `${c.name} (${c.detail})`);
    assert.deepEqual(failed, [], failed.join('; '));
  });
}

test('RC2.9-0: the second session is statistically comparable to the first', () => {
  // Not merely "within budget" — the shapes must be alike. A second fifty that
  // scrapes the budget while the first was spotless is the replay this release
  // exists to stop, one step quieter.
  for (const spec of BEFORE_JOURNEYS) {
    const m = measureJourney(playJourney(new Engine(), {seeds: spec.seeds}), {label: spec.label});
    const [a, b] = m.halves;
    assert.ok(Math.abs(a.flagged - b.flagged) <= JOURNEY_GATES.perSessionFlagged,
      `${spec.label}: first fifty ${a.flagged}, second fifty ${b.flagged}`);
    assert.ok(m.secondHalfRepeats <= JOURNEY_GATES.combinedFlagged,
      `${spec.label}: ${m.secondHalfRepeats} of the second fifty repeat something already solved`);
  }
});

test('RC2.9-0: no stem is asked twice in one journey, whatever the options do', () => {
  for (const spec of BEFORE_JOURNEYS) {
    const j = playJourney(new Engine(), {seeds: spec.seeds});
    const seen = new Map();
    for (const q of j.sessions.flatMap(s => s.questions)) {
      const k = normalizedStemIdentity(q);
      assert.ok(!seen.has(k), `${spec.label}: «${k}» asked at Q${seen.get(k)} and again`);
      seen.set(k, seen.size + 1);
    }
  }
});

test('RC2.9-1: a journey with no history behaves exactly like a first session', () => {
  // The contract in both directions: continuing must not restart, and starting
  // must not inherit. A user opening the app for the first time gets the
  // session the seed describes and nothing else.
  const a = playSession(new Engine(), {seed: 'rc29-clean-start', history: null});
  const b = playSession(new Engine(), {seed: 'rc29-clean-start'});
  assert.deepEqual(a.questions.map(q => q.question), b.questions.map(q => q.question));
});

test('RC2.9-1: same seed and same incoming history replay identically', () => {
  const first = playSession(new Engine(), {seed: 'rc29-replay-s1'});
  const one = playSession(new Engine(), {seed: 'rc29-replay-s2', history: first.history});
  const two = playSession(new Engine(), {seed: 'rc29-replay-s2', history: first.history});
  assert.deepEqual(one.questions.map(q => q.question), two.questions.map(q => q.question));
  assert.deepEqual(one.history, two.history, 'the outgoing history must be a function of the inputs too');
});

test('RC2.9-1: the history survives serialisation', () => {
  const first = playSession(new Engine(), {seed: 'rc29-serialise-s1'});
  assert.ok(first.history, 'a session must hand the product something to persist');
  const revived = JSON.parse(JSON.stringify(first.history));
  const live = playSession(new Engine(), {seed: 'rc29-serialise-s2', history: first.history});
  const reloaded = playSession(new Engine(), {seed: 'rc29-serialise-s2', history: revived});
  assert.deepEqual(reloaded.questions.map(q => q.question), live.questions.map(q => q.question),
    'a history that has been through JSON must plan the same session');
});

test('RC2.9-1: the history stays bounded at the product horizon', () => {
  // The target is fifty to a hundred questions. State that grows without limit
  // is a different defect wearing this one's clothes.
  const engine = new Engine();
  let history = null;
  for (let i = 0; i < 6; i++) {
    history = playSession(engine, {seed: `rc29-bounded-${i}`, history}).history;
  }
  const size = JSON.stringify(history).length;
  assert.ok(size < 200000, `history grew to ${size} bytes over six sessions`);
});
