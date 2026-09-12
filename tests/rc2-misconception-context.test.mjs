// RC2-013 — a misconception must be applicable to the stem it is attached to.
//
// USED_SUM_OF_SPEEDS_IN_CHASE says, in Arabic, "you added the two speeds in a
// CHASE problem; you should have subtracted them." The audit found it on 154 of
// its 195 uses under stems with no chase in them: one car covering two halves of
// a journey, and the same distance driven at two speeds. The value was the right
// value for that slip. The sentence described a problem the learner had never
// read. 79% of that misconception's uses were feedback about someone else's
// question.
//
// The remedy is a check, not an edit: a misconception whose text names a
// situation is declared with the Arabic that has to be present for the sentence
// to be true. Running that check over the engine turned up more of the same —
// IGNORED_UPGRADE ("you ignored the improvement") on stems where machines
// stopped, where a price rose, where workers left, and where the deadline
// shortened; USED_POST_TRANSFER_VALUE ("after the transfer") on a stem with an
// addition and no transfer.

import test from 'node:test';
import assert from 'node:assert/strict';

import Engine from '../src/index.js';
import {SeededRNG} from '../src/rng.js';
import {finalizeQuestion} from '../src/utils.js';
import {validateCandidate} from '../src/qa/pipeline.js';
import {validateMisconceptionContext, CONTEXT_BOUND} from '../src/qa/misconception-context.js';
import {MISCONCEPTIONS} from '../src/qa/misconceptions.js';
import {REASON} from '../src/qa/reasons.js';
import {generateSpeed} from '../src/families/speed.js';

const FAMILIES = [
  'sequences', 'ratios', 'percentages', 'averages', 'ages', 'speed', 'work_time',
  'machines', 'direct_proportion', 'fractions', 'unit_rate', 'combined_rate',
  'relational', 'calendar', 'odd_one_out', 'profit_loss'
];

// --- the check itself --------------------------------------------------------

test('RC2-013 MUST_REJECT: the chase sentence on a stem with no chase', () => {
  // The exact RC1 shape: the half-and-half journey stem, sum-of-speeds value.
  const v = validateMisconceptionContext({
    question: 'قطعت سيارة نصف المسافة بسرعة 90 كم/ساعة، والنصف الآخر بسرعة 60 كم/ساعة. إذا استغرقت الرحلة كاملة 5 ساعات، فما المسافة الكلية؟',
    distractors: [{value: 750, misconceptionId: 'USED_SUM_OF_SPEEDS_IN_CHASE'}]
  });
  assert.equal(v.valid, false);
  assert.deepEqual(v.reasons, [REASON.MISCONCEPTION_NOT_APPLICABLE]);
  assert.equal(v.details.misconceptionContext[0].situation, 'chase');
});

test('RC2-013 MUST_ACCEPT: the same sentence on a stem that has a chase', () => {
  const v = validateMisconceptionContext({
    question: 'انطلقت سيارة أ بسرعة 60 كم/ساعة. بعد ساعتين انطلقت سيارة ب من المكان نفسه وفي الاتجاه نفسه بسرعة 90 كم/ساعة. بعد كم ساعة من انطلاق ب تلحق بسيارة أ؟',
    distractors: [{value: 0.8, misconceptionId: 'USED_SUM_OF_SPEEDS_IN_CHASE'}]
  });
  assert.equal(v.valid, true);
});

test('RC2-013: a declared target misconception is checked too, not only the distractors', () => {
  const v = validateMisconceptionContext({
    question: 'ثمن 4 وحدات هو 80 درهمًا. كم ثمن 6 وحدات؟',
    distractors: [],
    pedagogy: {targetMisconception: 'IGNORED_UPGRADE'}
  });
  assert.equal(v.valid, false);
  assert.equal(v.details.misconceptionContext[0].value, 'targetMisconception');
});

test('RC2-013: a general misconception is never accused of naming a situation', () => {
  const v = validateMisconceptionContext({
    question: 'أي عدد لا ينتمي إلى المجموعة؟',
    distractors: [{value: 7, misconceptionId: 'OFF_BY_ONE_STEP'}, {value: 9, misconceptionId: 'APPLIED_STEP_TWICE'}]
  });
  assert.equal(v.valid, true);
});

test('RC2-013 meta: every context-bound id exists in the catalogue, and its markers can fail', () => {
  for (const [id, rule] of Object.entries(CONTEXT_BOUND)) {
    assert.ok(MISCONCEPTIONS[id], `${id} is declared context-bound but is not a misconception`);
    assert.ok(rule.markers.length > 0, `${id} has no markers`);
    assert.ok(rule.situation && rule.description, `${id} must say what situation it asserts`);
    // A marker set that matches an unrelated stem checks nothing.
    const unrelated = 'ما العدد التالي في المتتابعة: 2، 4، 8، 16؟';
    assert.ok(
      !rule.markers.some(m => m.test(unrelated)),
      `${id} matches a sequence question, so its markers assert nothing`
    );
  }
});

// --- the two templates the audit named ---------------------------------------

test('RC2-013: the two templates the audit named no longer carry the chase sentence', () => {
  const seen = new Set();
  for (const difficulty of ['medium', 'hard']) {
    for (let i = 0; i < 400; i++) {
      const rng = new SeededRNG(`ctx-${difficulty}-${i}`);
      let base;
      try { base = generateSpeed({difficulty, rng: rng.fork('c'), seed: `s${i}`, engineVersion: 'test'}); } catch { continue; }
      if (!['SPD_M_EQUAL_DIST', 'SPD_H_TIME_DIFF'].includes(base.template_id)) continue;
      seen.add(base.template_id);
      for (const d of base.distractors) {
        assert.notEqual(d.misconceptionId, 'USED_SUM_OF_SPEEDS_IN_CHASE', `${base.template_id} has no chase in it`);
        assert.notEqual(d.misconceptionId, 'USED_DIFFERENCE_OF_SPEEDS_IN_MEETING', `${base.template_id} has no meeting in it`);
      }
    }
  }
  assert.equal(seen.size, 2, 'both templates must have been reached');
});

test('RC2-013: the chase sentence still appears where a chase actually is', () => {
  let found = 0;
  for (let i = 0; i < 400 && found < 5; i++) {
    const rng = new SeededRNG(`chase-${i}`);
    let base;
    try { base = generateSpeed({difficulty: 'hard', rng: rng.fork('c'), seed: `s${i}`, engineVersion: 'test'}); } catch { continue; }
    if (base.template_id !== 'SPD_H_CATCH') continue;
    assert.ok(
      base.distractors.some(d => d.misconceptionId === 'USED_SUM_OF_SPEEDS_IN_CHASE'),
      'the chase template must keep the misconception it exists to teach against'
    );
    found++;
  }
  assert.equal(found, 5, 'the sweep must reach the chase template');
});

// --- and nothing else in the engine misattributes ----------------------------

test('RC2-013: no template in any family attaches a situation to a stem without it', async () => {
  const offenders = {};
  let candidates = 0;
  for (const family of FAMILIES) {
    const mod = await import(`../src/families/${family}.js`);
    const gen = Object.values(mod).find(v => typeof v === 'function' && v.name.startsWith('generate'));
    for (const difficulty of ['easy', 'medium', 'hard']) {
      for (let i = 0; i < 120; i++) {
        const rng = new SeededRNG(`ctx-sweep-${family}-${difficulty}-${i}`);
        let base;
        try { base = gen({difficulty, rng: rng.fork('c'), seed: `s${i}`, engineVersion: 'test', telemetry: null}); } catch { continue; }
        candidates++;
        const v = validateMisconceptionContext(base);
        if (!v.valid) {
          for (const o of v.details.misconceptionContext) {
            const key = `${base.template_id} / ${o.misconceptionId}`;
            offenders[key] = (offenders[key] || 0) + 1;
          }
        }
      }
    }
  }
  assert.ok(candidates > 5000, `the sweep must be substantial, saw ${candidates}`);
  assert.deepEqual(offenders, {});
});

test('RC2-013: the check is wired into the pipeline, not only exported', () => {
  // A candidate carrying a misattributed misconception must fail validateCandidate.
  const rng = new SeededRNG('wired-1');
  const base = generateSpeed({difficulty: 'medium', rng: rng.fork('c'), seed: 'wired', engineVersion: 'test'});
  const clean = finalizeQuestion(base, rng.fork('o'));
  assert.equal(validateCandidate(base, clean).valid, true, 'the untouched item must pass');

  const broken = {...base, distractors: base.distractors.map((d, i) =>
    i === 0 ? {...d, misconceptionId: 'USED_SUM_OF_SPEEDS_IN_CHASE'} : d)};
  const verdict = validateCandidate(broken, clean);
  assert.ok(verdict.reasons.includes(REASON.MISCONCEPTION_NOT_APPLICABLE), verdict.reasons.join(','));
});

test('RC2-013: no published question carries a misattributed misconception', () => {
  const engine = new Engine();
  const bands = ['easy', 'medium', 'hard'];
  let n = 0;
  for (let i = 0; i < 300; i++) {
    let q;
    try { q = engine.generateQuestion({family: 'random', difficulty: bands[i % 3], seed: `ctx-pub-${i}`}); } catch { continue; }
    n++;
    for (const opt of Object.keys(q.options)) {
      if (opt === q.correct_option) continue;
      const fb = q.metadata.option_feedback?.[opt];
      if (!fb) continue;
      const rule = CONTEXT_BOUND[fb.misconception_id];
      if (!rule) continue;
      assert.ok(
        rule.markers.some(m => m.test(q.question)),
        `${q.generator_id} option ${opt}: ${fb.misconception_id} names a ${rule.situation} the stem does not have`
      );
    }
  }
  assert.ok(n > 280, `the engine must still publish, published ${n}`);
});
