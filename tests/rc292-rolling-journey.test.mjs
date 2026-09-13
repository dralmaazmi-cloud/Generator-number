// RC2.9.2 — the rolling horizon, at the product boundary.
//
// RC2.9.1 carried the journey and stopped the second fifty replaying the first.
// It carried it as a LIFETIME BAN, and a lifetime ban meets the end of a finite
// question universe: driven through the shipped application, the third sitting
// filled fifteen of its fifty slots and refused itself with
// INSUFFICIENT_CONSTRUCTION_BREADTH.
//
// These tests are about the replacement — a cooldown measured in absolute
// question positions — and they are written at the same boundary RC2.9.1's are:
// `generatePracticeForJourney`, the one function app.js calls, against a
// Storage double. The browser-level version is in
// tests/rc291-browser-journey.test.mjs.

import test from 'node:test';
import assert from 'node:assert/strict';

import Engine from '../src/index.js';
import {measureSample, classify} from '../src/qa/perceptual-classify.js';
import {COOLDOWN, JourneyMemory, normalizeHistory, HISTORY_SCHEMA, HISTORY_SCHEMA_V1}
  from '../src/compose/diversity-history.js';
import {generatePracticeForJourney, readPracticeJourney, clearPracticeJourney}
  from '../practice-journey.js';
import {RULE_FAMILY} from '../tools/audit/rc28-sequences.mjs';

function storageDouble(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
    snapshot: () => Object.fromEntries(map)
  };
}

const SETTINGS = {families: [], difficulty: 'mixed', count: 50};
const play = (engine, storage, seed) =>
  generatePracticeForJourney({engine, storage, options: {...SETTINGS, seed}});

/** Sit `n` sittings of fifty, the way the product does, and keep everything. */
function journeyOf(n, tag, {storage = storageDouble(), engine = new Engine()} = {}) {
  const sessions = [];
  for (let s = 1; s <= n; s++) sessions.push(play(engine, storage, `${tag}-s${s}`));
  return {sessions, storage, questions: sessions.flatMap(s => s.questions)};
}

/** Every rolling hundred inside a journey, as the acceptance invariant states it. */
function rollingWindows(questions, size = 100, step = 50) {
  const out = [];
  for (let start = 0; start + size <= questions.length; start += step) {
    const rows = questions.slice(start, start + size);
    const m = measureSample(rows, {label: `Q${start + 1}-${start + size}`});
    out.push({
      label: `Q${start + 1}–${start + size}`,
      flagged: m.flagged,
      nearDuplicates: m.counts.NEAR_DUPLICATE_CONSTRUCTION,
      cluster: m.largestPerceptualCluster,
      run: m.longestSimilarRun,
      duplicateStems: rows.length - new Set(rows.map(q => q.metadata.normalized_stem_identity)).size
    });
  }
  return out;
}

// --- A: three sittings, all delivered ----------------------------------------

test('RC2.9.2-A: a third sitting is delivered in full, where RC2.9.1 refused it', () => {
  const {sessions, storage} = journeyOf(3, 'rc292-a');
  assert.deepEqual(sessions.map(s => s.questions.length), [50, 50, 50]);
  assert.equal(readPracticeJourney(storage).questionsSeen, 150);
});

test('RC2.9.2-A: and a fourth, and a fifth', () => {
  // The point is not two hundred and fifty unique questions. It is that nothing
  // walks off the end of the universe: there is no sitting at which the pool is
  // permanently spent.
  const {sessions} = journeyOf(5, 'rc292-a2');
  assert.deepEqual(sessions.map(s => s.questions.length), [50, 50, 50, 50, 50]);
});

// --- B, C, D: the cooldown, and exactly where its boundary is ----------------

test('RC2.9.2-D: the cooldown boundary is exact, with no off-by-one', () => {
  // Stated once in the code and once here. Seen at L, protected while
  // position − L < COOLDOWN, eligible at position − L === COOLDOWN.
  const journey = new JourneyMemory(null);
  journey.record({perceptual: 'X'}, 1);
  const cd = COOLDOWN.perceptual;

  assert.equal(journey.isProtected('perceptual', 'X', 2), true, 'the very next question');
  assert.equal(journey.isProtected('perceptual', 'X', cd), true, `Q${cd} is still inside the window`);
  assert.equal(journey.isProtected('perceptual', 'X', cd + 1), false, `Q${cd + 1} is the first free position`);
  assert.equal(journey.isProtected('perceptual', 'X', cd + 2), false);

  // And the review's own example: met at Q70, still blocked at Q101.
  journey.record({perceptual: 'Y'}, 70);
  assert.equal(journey.isProtected('perceptual', 'Y', 101), true, 'Q70 is 31 back, not 100');
  assert.equal(journey.isProtected('perceptual', 'Y', 170), false, 'Q70 + 100 is free');
});

test('RC2.9.2-C: a construction met inside the window is still blocked next sitting', () => {
  // The cooldown holds, with one stated exception that the session declares in
  // its own validation rather than hiding: when a slot's band has momentarily
  // no free construction left, it takes the one the user met LONGEST ago
  // instead of refusing the sitting. That is the trade RC2.9.2 makes, and it is
  // bounded — at most one slot per sitting, and never a recent construction.
  for (const tag of ['rc292-c', 'rc292-c2', 'rc292-c3']) {
    const {sessions, questions} = journeyOf(2, tag);
    assert.equal(questions.length, 100);
    const first = new Map();
    sessions[0].questions.forEach((q, i) => first.set(q.metadata.user_perceptual_signature, i + 1));

    const returned = sessions[1].questions
      .map((q, i) => ({q, at: 51 + i, from: first.get(q.metadata.user_perceptual_signature)}))
      .filter(x => x.from != null);
    const declared = sessions[1].validation.journey.protected_reuses;

    assert.ok(returned.length <= 1, `${tag}: ${returned.length} constructions came back inside the window`);
    assert.equal(returned.length, declared.length,
      `${tag}: the session must declare every reuse it made — ${declared.length} declared, ${returned.length} found`);
    for (const x of returned) {
      assert.ok(x.at - x.from >= 50,
        `${tag}: Q${x.from} came back at Q${x.at}, only ${x.at - x.from} apart`);
    }
  }
});

test('RC2.9.2-B: a construction whose window has closed becomes eligible again', () => {
  // Not «may» in principle — the engine must actually use the freed material,
  // or the third sitting could only have been delivered by relaxing something.
  const {questions} = journeyOf(3, 'rc292-b');
  const firstFifty = new Map();
  questions.slice(0, 50).forEach((q, i) =>
    firstFifty.set(q.metadata.user_perceptual_signature, i + 1));

  const reintroduced = questions.slice(100)
    .map((q, i) => ({q, at: 101 + i, from: firstFifty.get(q.metadata.user_perceptual_signature)}))
    .filter(x => x.from != null);

  assert.ok(reintroduced.length > 0,
    'the third sitting must be drawing on material whose cooldown has expired');
  for (const x of reintroduced) {
    assert.ok(x.at - x.from >= COOLDOWN.perceptual,
      `Q${x.from} came back at Q${x.at}, ${x.at - x.from} apart, inside the cooldown`);
  }
});

test('RC2.9.2: every rolling hundred of a long journey meets the same standard', () => {
  // The central invariant: not «Q1–100 looks good» but «every hundred does».
  for (const tag of ['rc292-w1', 'rc292-w2']) {
    const {questions} = journeyOf(4, tag);
    const windows = rollingWindows(questions);
    assert.equal(windows.length, 3, 'Q1–100, Q51–150, Q101–200');
    for (const w of windows) {
      assert.ok(w.flagged <= 8, `${tag} ${w.label}: PV+ND ${w.flagged}`);
      assert.ok(w.nearDuplicates <= 5, `${tag} ${w.label}: ND ${w.nearDuplicates}`);
      assert.ok(w.cluster <= 3, `${tag} ${w.label}: largest cluster ${w.cluster}`);
      assert.ok(w.run <= 2, `${tag} ${w.label}: longest streak ${w.run}`);
      assert.equal(w.duplicateStems, 0, `${tag} ${w.label}: ${w.duplicateStems} duplicate stems`);
    }
  }
});

test('RC2.9.2: no reset-like spike at a sitting boundary', () => {
  const {sessions} = journeyOf(3, 'rc292-spike');
  const flagged = sessions.map(s => measureSample(s.questions, {label: 's'}).flagged);
  for (const f of flagged) assert.ok(f <= 4, `a sitting flagged ${f}`);
  // A planner that forgot would show a step change; one that expired an old
  // window shows none.
  assert.ok(Math.max(...flagged) - Math.min(...flagged) <= 4, flagged.join(' → '));

  const labelled = classify(sessions.flatMap(s => s.questions));
  const repeatsIn = (from, to) => labelled.slice(from, to).filter((r, i) =>
    new Set(labelled.slice(0, from + i).map(x => x.perceptual)).has(r.perceptual)).length;
  assert.ok(repeatsIn(50, 100) <= 4, `Q51–100 repeats ${repeatsIn(50, 100)}`);
});

// --- E, F, G, H: the product contract ----------------------------------------

test('RC2.9.2-E: serialising between every sitting changes nothing', () => {
  const straight = journeyOf(3, 'rc292-e');

  let storage = storageDouble();
  const engine = new Engine();
  const reloaded = [];
  for (let s = 1; s <= 3; s++) {
    reloaded.push(play(engine, storage, `rc292-e-s${s}`));
    // The page goes away; only the bytes cross.
    storage = storageDouble(JSON.parse(JSON.stringify(storage.snapshot())));
  }
  assert.deepEqual(
    reloaded.flatMap(s => s.questions).map(q => q.question),
    straight.questions.map(q => q.question)
  );
});

test('RC2.9.2-F: the same seeds and the same rolling state replay identically', () => {
  const one = journeyOf(3, 'rc292-f');
  const two = journeyOf(3, 'rc292-f');
  assert.deepEqual(one.questions.map(q => q.question), two.questions.map(q => q.question));
  assert.deepEqual(readPracticeJourney(one.storage).history, readPracticeJourney(two.storage).history);
});

test('RC2.9.2-G: a deliberate fresh start begins clean', () => {
  const {storage} = journeyOf(2, 'rc292-g');
  clearPracticeJourney(storage);
  const engine = new Engine();
  const fresh = play(engine, storage, 'rc292-g-s3');
  assert.equal(fresh.questions.length, 50);
  assert.equal(readPracticeJourney(storage).questionsSeen, 50, 'the new journey counts from nothing');
});

test('RC2.9.2-H: the stored journey stays bounded however long the practice runs', () => {
  const {storage} = journeyOf(8, 'rc292-h');
  const bytes = JSON.stringify(readPracticeJourney(storage)).length;
  // Bounded by the cooldowns, not by how much has been practised: eight
  // sittings is four hundred questions and the longest window is a hundred and
  // fifty of them.
  assert.ok(bytes < 200000, `${bytes} bytes after four hundred questions`);
  const history = readPracticeJourney(storage).history;
  assert.equal(history.questionsSeen, 400);
  for (const [kind, entries] of Object.entries(history.seen)) {
    assert.ok(entries.length <= COOLDOWN[kind], `${kind}: ${entries.length} entries over ${COOLDOWN[kind]}`);
    for (const [, at] of entries) {
      assert.ok(400 - at < COOLDOWN[kind], `${kind}: an entry ${400 - at} back is past its own window`);
    }
  }
});

test('RC2.9.2-I: the rendered sequence corpus shows real rule breadth', () => {
  // Registry inventory proves nothing about what a user meets. This counts the
  // rule families actually RENDERED, normalised — ×3+2 and ×3+5 are one affine
  // recurrence, not two rules.
  //
  // Measured over the corpus rather than over a single journey, and the reason
  // is arithmetic rather than convenience: a hundred and fifty questions
  // contain twelve to eighteen sequences, and eight distinct rule families
  // cannot be guaranteed inside thirteen items while every other diversity
  // control is also binding. Per-journey figures are reported by
  // tools/audit/rc292-acceptance.mjs so the spread is visible, not averaged
  // away; what is asserted here is the breadth the corpus demonstrates.
  const rules = new Set(), tasks = new Set();
  let sequences = 0;
  for (const tag of ['rc292-i1', 'rc292-i2', 'rc292-i3']) {
    for (const q of journeyOf(3, tag).questions) {
      if (q.family !== 'sequences') continue;
      sequences++;
      rules.add(RULE_FAMILY[q.generator_id] ?? `?${q.generator_id}`);
      tasks.add(String(q.metadata.task_signature ?? '?').split('/')[0]);
    }
  }
  assert.ok(sequences >= 30, `only ${sequences} sequences rendered`);
  assert.ok(rules.size >= 8, `${rules.size} rule families — ${[...rules].join(', ')}`);
  assert.ok(tasks.size >= 5, `${tasks.size} task archetypes`);
  assert.ok(!rules.has('?'), 'every rendered sequence template must be classified');
});

// --- the stored shape ---------------------------------------------------------

test('RC2.9.2: a half-finished RC2.9.1 journey is migrated, not thrown away', () => {
  // v1 stored identities with no positions, one entry per question. A learner
  // mid-journey when the release lands keeps their history rather than meeting
  // the last fifty questions again.
  const v1 = {
    schema: HISTORY_SCHEMA_V1, questionsSeen: 50,
    perceptual: ['a', 'b', 'c'], stem: ['s1'], reasoning: [], blueprint: [], skeleton: [],
    task: [], presentation: [], family: [], entity: []
  };
  const migrated = normalizeHistory(v1);
  assert.equal(migrated.schema, HISTORY_SCHEMA);
  assert.equal(migrated.questionsSeen, 50);
  assert.deepEqual(migrated.seen.perceptual, [['a', 48], ['b', 49], ['c', 50]]);

  const journey = new JourneyMemory(v1);
  assert.equal(journey.isProtected('perceptual', 'c', 51), true, 'the most recent is still protected');
  assert.equal(journey.isProtected('perceptual', 'a', 149), false, 'and the oldest expires on schedule');
});

test('RC2.9.2: an unusable stored history still starts a journey', () => {
  for (const junk of [null, 'nonsense', {}, {schema: 'someone-elses'}, {schema: HISTORY_SCHEMA, seen: 4}]) {
    const j = new JourneyMemory(junk);
    assert.equal(j.questionsSeen, 0);
    assert.equal(j.isProtected('perceptual', 'anything', 1), false);
  }
});
