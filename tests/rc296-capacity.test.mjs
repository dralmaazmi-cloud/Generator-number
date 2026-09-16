// RC2.9.6 §1/§2. Family selection must not reach a dead end.
//
// The defect: index.html offered a family subset and a session size
// independently, and the engine then refused about a third of the offered
// combinations — `relational` alone at ten served 0 of 5, `fractions` alone
// served nothing at all. The engine was right to refuse; the product was wrong
// to offer.
//
// The invariant these tests hold is one line:
//
//     if the product offers a count for a selection, the engine serves it.
//
// Nothing here asserts a capacity NUMBER. A number would be a second opinion
// about the engine's arithmetic, and a second opinion is exactly what drifted.

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

import Engine from '../src/index.js';
import {generatePracticeForJourney} from '../practice-journey.js';

const engine = new Engine();
const appSource = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const LADDER = [5, 10, 14, 20, 30];

const shim = () => {
  const m = new Map();
  return {getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k)};
};

/** The product path, exactly as a click reaches it. */
const serve = (families, count, seed) => generatePracticeForJourney({
  engine, storage: shim(), continueJourney: false, options: {families, count, seed}
});

test('RC2.9.6-2.1: the capacity number is the engine own verdict, not a tally', () => {
  const c = engine.sessionCapacity({families: ['ratios']});
  assert.equal(c.basis, 'SESSION_PROBE_EXACT');
  assert.ok(c.probes >= 6, 'a capacity answer rests on several independent dry sessions');
  // The tally bound is still reported — both refusal messages quote it — but it
  // is no longer the answer, and for a thin family it is visibly larger.
  assert.ok(c.maxCount <= c.tallyBound, `planner ${c.maxCount} must not exceed the tally bound ${c.tallyBound}`);
});

test('RC2.9.6-2.2: every count the product offers is a count the engine serves', () => {
  // The families the RC2.9.6 brief measured as dead ends, plus two wide ones so
  // the check cannot pass by disabling everything.
  const selections = [
    ['relational'], ['ratios'], ['calendar'], ['ages'], ['direct_proportion'],
    ['sequences'], ['speed'],
    ['fractions', 'sequences'], ['calendar', 'odd_one_out'], ['ages', 'fractions', 'work_time']
  ];
  const betrayed = [];
  for (const families of selections) {
    const cap = engine.sessionCapacity({families, ladder: LADDER}).maxCount;
    for (const count of LADDER) {
      if (count > cap) continue; // the product disables it
      for (let i = 0; i < 6; i++) {
        try {
          const set = serve(families, count, `rc296-invariant-${families.join('+')}-${count}-${i}`);
          if (set.questions.length !== count) betrayed.push(`${families.join('+')} @${count}: short ${set.questions.length}`);
        } catch (e) {
          betrayed.push(`${families.join('+')} @${count} (offered, cap ${cap}): ${e.code}`);
        }
      }
    }
  }
  assert.deepEqual(betrayed.slice(0, 5), [], `${betrayed.length} offered counts the engine refused`);
});

test('RC2.9.6-2.2: a selection too narrow for the smallest sitting says so', () => {
  for (const families of [['fractions'], ['odd_one_out']]) {
    const cap = engine.sessionCapacity({families});
    assert.equal(cap.servesAMinimumSitting, false, `${families} was offered a sitting it cannot serve`);
    assert.ok(cap.maxCount < cap.minimumSitting);
  }
  // …and a family that CAN serve one is not swept up with them.
  assert.equal(engine.sessionCapacity({families: ['sequences']}).servesAMinimumSitting, true);
});

test('RC2.9.6-2.1: familiesFor answers the reverse direction', () => {
  const r = engine.familiesFor({count: 10});
  assert.ok(r.sufficientAlone.length > 0 && r.insufficientAlone.length > 0,
    'a useful answer separates the families that can serve ten from those that cannot');
  assert.ok(r.insufficientAlone.includes('fractions'));
  assert.ok(r.sufficientAlone.includes('sequences'));
});

test('RC2.9.6-2.4: a narrow weak set is WIDENED, never dropped and never refused', () => {
  // The profile the brief names: a learner whose only weakness is fractions.
  const r = engine.familiesFor({count: 10, families: ['fractions']});
  assert.ok(r.widened, 'a seeded selection must come back widened or unchanged, never null');
  assert.ok(r.widened.families.includes('fractions'),
    'the family the learner got wrong is the point of the sitting and is never dropped');
  assert.ok(r.widened.added.length >= 1, 'fractions alone cannot serve ten, so something must be added');
  assert.equal(r.widened.serves, true);
  // And the widened set really does serve it, through the product path.
  for (let i = 0; i < 5; i++) {
    const set = serve(r.widened.families, 10, `rc296-weak-fractions-${i}`);
    assert.equal(set.questions.length, 10);
  }
});

test('RC2.9.6-2.5: the engine guard is intact and is never caught and retried', () => {
  // Reaching past the product straight at the engine still refuses, by name and
  // with the arithmetic behind it. This is the exact request the RC2.9.6 brief
  // quotes, and the message it quotes is unchanged.
  assert.throws(
    () => engine.generatePractice({families: ['ages'], count: 20, seed: 'rc296-guard'}),
    err => {
      assert.equal(err.code, 'INSUFFICIENT_CONSTRUCTION_BREADTH');
      assert.match(err.message, /slots could be planned with a distinct question idea/);
      assert.match(err.message, /no diversity control was relaxed to produce this/);
      assert.ok(err.capacity, 'the refusal still carries the arithmetic behind it');
      return true;
    });
  // The earlier guard is untouched too: a band with nothing in it is still
  // refused before a question is drawn.
  assert.throws(
    () => engine.generatePractice({families: ['fractions'], count: 20, seed: 'rc296-guard-2'}),
    err => {
      assert.ok(['INSUFFICIENT_BAND_COVERAGE', 'INSUFFICIENT_CONSTRUCTION_BREADTH'].includes(err.code));
      return true;
    });
  // Trap 1: the product must not turn a refusal into a smaller session.
  assert.doesNotMatch(appSource, /INSUFFICIENT_CONSTRUCTION_BREADTH/,
    'app.js must not know the refusal by name — knowing it is how a retry starts');
  assert.doesNotMatch(appSource, /catch[\s\S]{0,200}?generatePracticeForJourney/,
    'a generation refusal must not be caught and re-attempted with a smaller count');
});

test('RC2.9.6-2.2: the product asks the engine, and states a limit rather than an error', () => {
  assert.match(appSource, /sessionCapacity\(/, 'the product must query capacity');
  assert.match(appSource, /servesAMinimumSitting/, 'the product must honour the minimum-sitting answer');
  assert.match(appSource, /ladder:\s*COUNT_LADDER/, 'presets are checked as a ladder');
  // Wording: a limit, not a failure. «خطأ» never appears in a capacity message.
  const messages = [...appSource.matchAll(/(capacityNote|narrowSelectionNote)\b[\s\S]{0,700}?\n}/g)].map(m => m[0]).join('\n');
  assert.ok(messages.length > 0, 'the two capacity messages must exist');
  assert.doesNotMatch(messages, /خطأ/, 'a capacity message must not call a limit an error');
  assert.match(messages, /أضِف عائلة أخرى/, 'a capacity message says what widens the selection');
  // And the stale wording that named a difficulty level is gone with the selector.
  assert.doesNotMatch(appSource, /في هذا المستوى/, 'there are no levels any more');
});

test('RC2.9.6-2.2: the page carries the selection note and the apply gate', () => {
  assert.match(pageSource, /id="familySelectionNote"/);
  assert.match(pageSource, /id="countCapacityHint"/);
  assert.match(appSource, /\$\('applyFamilies'\)/, 'the apply button must follow capacity');
});
