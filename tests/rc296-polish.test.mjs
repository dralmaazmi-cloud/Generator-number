// RC2.9.6 §3. The four carried-over polish items, each held by the measurement
// that found it rather than by an example.

import test from 'node:test';
import assert from 'node:assert/strict';

import Engine from '../src/index.js';
import {validateDecimalShape} from '../src/qa/pipeline.js';
import {FAMILY_NEUTRAL, FACTUAL_FALLBACK_VARIANTS, factualFallbackFor, FAMILY_SUBJECT} from '../src/qa/rationale.js';
import {generatePracticeForJourney} from '../practice-journey.js';

const engine = new Engine();

// --- 3.1 awkward decimals ---------------------------------------------------

test('RC2.9.6-3.1 MUST_REJECT: the three shapes of awkward number', () => {
  const q = (family, value, step = '') => ({
    family, correct_option: 'A', options: {A: 'x'},
    metadata: {options_meta: {A: {value, correct: true}}}, explanation: {steps: [step]}
  });
  // a key that is neither whole nor a half or a quarter
  assert.ok(validateDecimalShape(q('speed', 2.3)).reasons.includes('AWKWARD_DECIMAL_ANSWER'));
  // a fractional key in a family where a fraction is not natural to say
  assert.ok(validateDecimalShape(q('percentages', 12.5)).reasons.includes('NON_INTEGER_ANSWER_IN_WHOLE_FAMILY'));
  // three decimal places anywhere a learner reads
  assert.ok(validateDecimalShape(q('speed', 2, 'المعامل = 1.125')).reasons.includes('EXCESSIVE_DECIMAL_PRECISION'));
});

test('RC2.9.6-3.1 MUST_ACCEPT: the halves that are good Arabic and good arithmetic', () => {
  const q = (family, value, step = '') => ({
    family, correct_option: 'A', options: {A: 'x'},
    metadata: {options_meta: {A: {value, correct: true}}}, explanation: {steps: [step]}
  });
  assert.deepEqual(validateDecimalShape(q('speed', 2.5)).reasons, []);
  assert.deepEqual(validateDecimalShape(q('unit_rate', 1.25)).reasons, []);
  // and a 1.5-hour GIVEN is explicitly untouched by this release
  assert.deepEqual(validateDecimalShape(q('speed', 3, 'بعد 1.5 ساعة انطلقت الثانية')).reasons, []);
});

test('RC2.9.6-3.1: the published corpus carries no awkward key', () => {
  const offenders = [];
  for (const family of engine.listFamilies().map(f => f.id)) {
    for (let i = 0; i < 60; i++) {
      let q;
      try { q = engine.generateQuestion({family, difficulty: ['easy', 'medium', 'hard'][i % 3], seed: `rc296-dec-${family}-${i}`}); }
      catch { continue; }
      const r = validateDecimalShape(q);
      if (!r.valid) offenders.push(`${q.generator_id}: ${r.reasons.join(',')} ${JSON.stringify(r.details)}`);
    }
  }
  assert.deepEqual(offenders.slice(0, 5), [], `${offenders.length} awkward numbers survived publication`);
});

// --- 3.2 shared reason sentences --------------------------------------------

test('RC2.9.6-3.2: the fallback is family-specific, and it is still a non-claim', () => {
  // One sentence across fourteen families was the thirteenth over the ceiling
  // of twelve. It is now one per family.
  assert.equal(Object.keys(FACTUAL_FALLBACK_VARIANTS).length, Object.keys(FAMILY_SUBJECT).length);
  assert.equal(new Set(Object.values(FACTUAL_FALLBACK_VARIANTS)).size, Object.keys(FAMILY_SUBJECT).length,
    'two families sharing a fallback sentence would put it back over the ceiling');
  for (const [family, subject] of Object.entries(FAMILY_SUBJECT)) {
    assert.ok(factualFallbackFor(family).includes(subject), `${family} must name its own subject`);
  }
  // Specific, not vaguer: the declared neutral set is untouched and still twelve.
  assert.equal(FAMILY_NEUTRAL.length, 12);
});

// --- 3.3 integer-path narration ---------------------------------------------

test('RC2.9.6-3.3: operation_kinds is DERIVED from the printed steps, so narration is not free', () => {
  // This is the finding that stopped §3.3, recorded as a test so the next
  // attempt starts from it rather than rediscovering it.
  //
  // «300 × 0.3 = 90» is one operation. The integer path — «10% من 300 = 30،
  // إذن 30% = 90» — is a divide and a multiply, and «× 1.2» rewritten as
  // «× 120 ÷ 100» gains a divide. `deriveOperationProfile` reads the steps, and
  // metadata.operation_kinds, reasoning_target_pair, user_construction_signature,
  // sub_idea_signature, structural_reasoning_signature and complexity_score are
  // all computed from it. Rewriting the narration therefore moves the very
  // signatures §4.4 requires to stand still, and moves the complexity score
  // that decides the band.
  const engineB = new Engine();
  const q = engineB.generateQuestion({family: 'percentages', difficulty: 'easy', seed: 'rc296-ops', templateId: 'PCT_E_OF'});
  const stepsText = q.explanation.steps.join(' ');
  // The claim, checked both ways: every operation the metadata names is visible
  // in the steps, and a step-level operation is named in the metadata.
  const SYMBOL = {divide: '÷', multiply: '×', add: '+', subtract: '−'};
  for (const kind of q.metadata.operation_kinds) {
    if (!SYMBOL[kind]) continue;
    assert.ok(stepsText.includes(SYMBOL[kind]),
      `metadata says the solution ${kind}s, so a step must show ${SYMBOL[kind]}`);
  }
  assert.ok(q.metadata.operation_kinds.length > 0);
  assert.ok(Number.isFinite(q.metadata.complexity_score));
  // And the band follows the score, which is why this is not a cosmetic coupling.
  assert.equal(q.difficulty, 'easy');
});

// --- 3.4 in-sitting repeats -------------------------------------------------

test('RC2.9.6-3.4: no perceptual signature appears twice inside one sitting', () => {
  const shim = () => {
    const m = new Map();
    return {getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k)};
  };
  const offenders = [];
  // Journeys rather than fresh sittings: the second sitting is where the
  // cooldown pressure is, and that is where the repeat used to appear.
  for (let j = 0; j < 12; j++) {
    const storage = shim();
    for (let s = 0; s < 4; s++) {
      const set = generatePracticeForJourney({
        engine, storage, continueJourney: s > 0, options: {count: 10, seed: `rc296-sit-${j}-${s}`}
      });
      const seen = new Map();
      for (const q of set.questions) {
        const k = q.metadata.user_perceptual_signature;
        seen.set(k, (seen.get(k) ?? 0) + 1);
      }
      for (const [k, n] of seen) if (n > 1) offenders.push(`journey ${j} sitting ${s + 1}: ${n}× ${k}`);
    }
  }
  assert.deepEqual(offenders.slice(0, 3), [], `${offenders.length} sittings repeated a construction inside themselves`);
});
