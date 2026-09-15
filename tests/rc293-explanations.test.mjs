// RC2.9.3-1 — explanation integrity, held closed by name.
//
// RC2.9.2 published explanations a tutor would never write: «60 × 1 = 60»,
// «س = 10 ÷ 1 = 10», «7 + -3 = 4», «1 × (6 − 1)», and one template leaked its
// own «${sc.def}» placeholder to the learner. The normaliser in
// src/arabic/tidy-arithmetic.js removes those traces at publish time. The
// tests below hold three things: the traces are gone from what is published,
// every rule the normaliser applies is an arithmetic identity, and the signals
// the engine computes from the RAW text did not move.

import test from 'node:test';
import assert from 'node:assert/strict';

import Engine from '../src/index.js';
import {tidyArithmetic} from '../src/arabic/tidy-arithmetic.js';
import {extractMathRuns, evaluateExpression, validateDisplayedEquations} from '../src/qa/equations.js';
import {deriveOperationProfile} from '../src/qa/complexity.js';

const engine = new Engine();

/** Every explanation string a learner can read, for one question. */
const readable = q => [
  q.explanation?.how_to_start, ...(q.explanation?.steps ?? []), q.explanation?.answer,
  q.explanation?.fast_method, q.explanation?.remember,
  ...Object.values(q.explanation?.distractor_analysis ?? {})
].filter(s => typeof s === 'string');

/** A broad sweep: every family, every band, many seeds. */
function sweep(perFamily = 60) {
  const rows = [];
  for (const {id: family} of engine.listFamilies()) {
    for (let i = 0; i < perFamily; i++) {
      for (const difficulty of ['easy', 'medium', 'hard']) {
        try {
          rows.push(engine.generateQuestion({family, difficulty, seed: `rc293-expl|${family}|${i}|${difficulty}`}));
        } catch { /* a band a family does not serve */ }
      }
    }
  }
  return rows;
}
const CORPUS = sweep();

// The traces, each written so that a decimal («÷ 1.5»), a fraction («× 1/6»),
// a two-digit literal («× 10») and a digit product inside brackets («(2 × 1)»)
// are not matched: those are legitimate and the normaliser leaves them alone.
const TRACES = {
  'leaked template placeholder': /\$\{/,
  'undefined / NaN / null in prose': /\b(undefined|NaN|null)\b|\[object/,
  'x × 1 = x': /\d [×÷] 1 = /,
  'trailing × 1 or ÷ 1': /\d [×÷] 1(?:[.،؛:](?!\d)| [\u0621-\u064A]|$)/,
  '× 1 ÷ in a product': / × 1 [×÷] /,
  '1 × (…)': /(?<![\d.,٫/])1 × \(/,
  'unit coefficient on a variable': /(?<![\d.,٫/])1[كسصع]/,
  'a signed literal after an operator': / [+−] -\d/,
  'an ASCII hyphen as a minus sign': /(?:^|[=(،:\s])-\d/,
  'an ASCII hyphen as the subtraction operator': /\d - [\d(]/,
  '1 × n': /(?<![\d.,٫/])1 × \d/
};
// The answer line repeats the option text verbatim («الإجابة الصحيحة: -3.»),
// and options print numbers the way the stem does; that layer is parsed by
// several checks as `-?\d` and is deliberately left alone.
const PROSE_ONLY = new Set(['an ASCII hyphen as a minus sign']);

test('RC2.9.3-1: no published explanation carries an arithmetic trace of a unit parameter', () => {
  assert.ok(CORPUS.length > 2000, `sweep must be substantial, saw ${CORPUS.length}`);
  const offenders = {};
  for (const q of CORPUS) {
    for (const text of readable(q)) {
      for (const [name, re] of Object.entries(TRACES)) {
        if (PROSE_ONLY.has(name) && text === q.explanation.answer) continue;
        if (re.test(text)) offenders[`${name} :: ${q.metadata.template_id}`] ??= text;
      }
    }
  }
  assert.deepEqual(offenders, {});
});

test('RC2.9.3-1: the SPD_H_MEET_DELAY opening line names the vehicle, not its placeholder', () => {
  const hits = CORPUS.filter(q => q.metadata.template_id === 'SPD_H_MEET_DELAY');
  assert.ok(hits.length > 0, 'the template must be reachable');
  for (const q of hits) {
    assert.doesNotMatch(q.explanation.how_to_start, /\$\{|sc\.def/);
    assert.match(q.explanation.how_to_start, /^احسب أولًا ما قطعته .+ التي بدأت مبكرًا\.$/);
  }
});

test('RC2.9.3-1: every rule of the normaliser is an identity — printed equalities stay true', () => {
  // Hand-written lines that exercise each rule, checked by the same evaluator
  // the pipeline uses; then the whole corpus, before and after.
  const lines = [
    'ما قطعته أ أثناء التأخير = 60 × 1 = 60.',
    'س = 10 ÷ 1 = 10.',
    'اخترت 1.6، وهي ناتج 8 × 1 ÷ 5.',
    'ومنها س = 16 ÷ 1 = 16، وعمر الأب = 16 × 4 = 64.',
    'الفرق الذي يسبق الحد المفقود = 2 + 2 × 1 = 4.',
    'الحد المفقود = 7 + -3 = 4.',
    'نحسب الفروق: 7 − 10 = -3، -2 − 1 = -3.',
    'الناتج = 5 − -3 = 8.',
    'الزمن الكامل = 3 × 4 ÷ 1 = 12.',
    'اخترت 74، وهي ناتج (12 + 20 + 15) × 1 + 27.'
  ];
  for (const raw of lines) {
    const tidy = tidyArithmetic(raw);
    assert.notEqual(tidy, raw, `rule must fire on «${raw}»`);
    assert.deepEqual(validateDisplayedEquations([tidy]).failures, [], tidy);
    // The value on each side is unchanged by the rewrite.
    const before = extractMathRuns(raw).map(r => r.split('=').map(p => p.trim()).filter(Boolean).at(-1));
    const after = extractMathRuns(tidy).map(r => r.split('=').map(p => p.trim()).filter(Boolean).at(-1));
    for (let i = 0; i < before.length; i++) {
      if (after[i] === undefined) continue; // the whole identity collapsed into prose
      assert.equal(evaluateExpression(after[i]).exact.toNumber(), evaluateExpression(before[i]).exact.toNumber());
    }
  }
  let checked = 0;
  for (const q of CORPUS) {
    const r = validateDisplayedEquations(q.explanation.steps);
    assert.deepEqual(r.failures, [], `${q.metadata.template_id}: ${JSON.stringify(r.failures)}`);
    checked += r.checked;
  }
  assert.ok(checked > 5000, `equalities re-checked: ${checked}`);
});

test('RC2.9.3-1: the normaliser leaves legitimate text alone', () => {
  for (const s of [
    'الأصل = 300 ÷ 1.25 = 240.',
    'اخترت 1/30، وهي ناتج 1/5 × 1/6.',
    'لكن كل فرق: 21 + (2 × 1) = 23، و23 + (2 × 3) = 29.',
    'المسافة = 10 × 10 = 100.',
    'الزمن = 12 ÷ 12 = 1.',
    'الفرق = 12 − 10 = 2.',
    'بتوحيد المقامات: 21 × (س + س + 40) = س × (س + 40).',
    'المتوسط = (50 × 2.5 + 120 × 1) ÷ (1 + 2.5) = 70.'
  ]) assert.equal(tidyArithmetic(s), s);
  assert.equal(tidyArithmetic(null), null);
  assert.equal(tidyArithmetic(undefined), undefined);
});

test('RC2.9.3-1: tidying is display-only — the operation profile is still read from the raw steps', () => {
  // A question whose raw steps carry a «÷ 1» or a «+ -3». Its published
  // operation_kinds must still be what the RAW text says, because the
  // blueprint catalogue, the perceptual signature and the complexity factors
  // were all frozen on that reading. So the published profile is allowed to
  // differ from a profile re-derived from the tidied text — and every such
  // difference must be one the tidy explains: a multiply/divide by one that
  // is no longer printed, or a sign that is now an operator glyph.
  let seen = 0;
  const kindsOf = steps => deriveOperationProfile(steps)?.kinds ?? [];
  for (const q of CORPUS) {
    const published = q.metadata.operation_kinds;
    const fromTidied = kindsOf(q.explanation.steps);
    if (JSON.stringify(published) === JSON.stringify(fromTidied)) continue;
    seen++;
    const lost = published.filter(k => !fromTidied.includes(k));
    const gained = fromTidied.filter(k => !published.includes(k));
    // «7 + -3» read as an addition; «7 − 3» reads as the subtraction it is.
    assert.ok(lost.every(k => ['multiply', 'divide', 'add'].includes(k)), `${q.metadata.template_id} lost ${lost}`);
    assert.ok(gained.every(k => ['subtract', 'add'].includes(k)), `${q.metadata.template_id} gained ${gained}`);
  }
  assert.ok(seen > 0, 'the sweep must contain at least one tidied step to make this test meaningful');
});
