// The number that does not belong.
//
// Section 9: it is not enough that the intended rule holds. The oracle sweeps
// the whole approved rule library, and a set is rejected when two rules of
// comparable, low complexity single out *different* numbers. A contrived,
// complicated competing rule is not grounds for rejection, and a set with one
// genuine rule must pass.

import {mk, usable, buildBase} from './_shared.js';
import {checkOddOneOutAmbiguity} from '../qa/ambiguity.js';
import {canonicalNumberSet} from '../qa/fingerprint.js';

const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];

export function generateOddOneOut({difficulty, rng, seed, engineVersion}) {
  const ctx = {difficulty, rng, seed, engineVersion, family: 'odd_one_out', family_ar: 'العدد الذي لا ينتمي', category: 'العدد الذي لا ينتمي إلى المجموعة'};
  const list = difficulty === 'easy' ? [multiples, squares]
    : difficulty === 'medium' ? [cubes, pronic, primeDoubles]
    : [squareMinusOne, primePlusPattern];
  return rng.pick(list)(ctx);
}

/**
 * Section 38. The outlier must not be findable by its position in the number
 * line. Building it as "the largest value plus a bit" made "pick the largest"
 * a winning strategy on this family, so the intruder is placed at a random
 * point in the run — above it, below it, or between two of its members.
 */
function placeOutlier(rng, valid, fails) {
  const sorted = [...valid].sort((a, b) => a - b);
  const span = sorted.at(-1) - sorted[0];
  const step = Math.max(1, Math.round(span / (sorted.length - 1)));
  const anchors = [
    sorted[0] - step,
    ...sorted.slice(0, -1).map((v, i) => Math.round((v + sorted[i + 1]) / 2)),
    sorted.at(-1) + step
  ];
  for (const anchor of rng.shuffle(anchors)) {
    for (let delta = 0; delta <= step + 4; delta++) {
      for (const candidate of [anchor + delta, anchor - delta]) {
        if (candidate <= 0) continue;
        if (valid.includes(candidate)) continue;
        if (!fails(candidate)) continue;
        return candidate;
      }
    }
  }
  return null;
}

function build(ctx, spec) {
  const {rng} = ctx;
  const {templateId, subskill, valid, outlier, propertyText, proofs, remember, ruleId, ruleParams = {}} = spec;
  const group = rng.shuffle([...valid, outlier]);

  // Section 9: reject here rather than shipping an item with two defensible
  // answers. The check runs before anything else is built.
  const ambiguity = checkOddOneOutAmbiguity(group, outlier);
  if (!ambiguity.supportsIntended || ambiguity.ambiguous) return null;

  const distractors = usable(valid.map(v => mk(v, 'SATISFIES_SHARED_PROPERTY', `${v} يحقق الخاصية: ${propertyText}`)));
  return buildBase(ctx, {
    templateId,
    subskill,
    difficulty: ctx.difficulty,
    question: 'أي عدد لا ينتمي إلى المجموعة الآتية؟',
    displayExpression: group.join('، '),
    correct: outlier,
    distractors,
    format: v => String(v),
    steps: [
      ...proofs,
      `${outlier} لا يحقق الخاصية «${propertyText}»؛ لذلك هو العدد المختلف.`
    ],
    howToStart: 'ابحث عن خاصية واحدة تجمع خمسة أعداد وتترك عددًا واحدًا خارجها.',
    remember,
    fastMethod: `اختبر الخاصية «${propertyText}» على الأعداد حتى تجد الوحيد الذي يفشل.`,
    estimatedSteps: ctx.difficulty === 'easy' ? 2 : ctx.difficulty === 'medium' ? 3 : 4,
    conceptTags: ['odd-one-out', 'number-properties'],
    // The rule's own constants are parameters of the item, not intermediate
    // values: they define which property the set is built on.
    parameters: {numbers: group, ...ruleParams},
    // Section 13-A: the number set is genuinely commutative, so shuffling the
    // display must land on the same fingerprint.
    commutative: {numberSet: canonicalNumberSet(group)},
    // RC2-022: `numbers` is the same set again, in display order only, so two
    // permutations of one set must not look like two different questions.
    orderInsensitive: ['numbers'],
    oracle: {kind: 'ruleset', numbers: group, intendedOutlier: outlier},
    askedUnknown: 'outlier',
    stageCount: 1,
    pedagogy: {targetSkill: `RULE_${ruleId}`, targetMisconception: 'SATISFIES_SHARED_PROPERTY'},
    complexityFactors: {
      reasoningTransformations: 2,
      conceptCount: 1,
      conditionCount: 6,
      arithmeticBurden: ctx.difficulty === 'hard' ? 3 : 2
    },
    metadata: {outlier_display_position: group.indexOf(outlier) + 1, property: propertyText},
    textParams: false
  });
}

/** Retries the same shape with fresh numbers when the ambiguity sweep rejects one. */
function attempt(ctx, make) {
  for (let i = 0; i < 30; i++) {
    const built = make(ctx);
    if (built) return built;
  }
  const err = new Error('odd_one_out: could not find an unambiguous set');
  err.reason = 'AMBIGUOUS_ODD_ONE_OUT';
  throw err;
}

function multiples(ctx) {
  return attempt(ctx, ({rng}) => {
    const m = rng.pick([4, 5, 6, 7, 8, 9]);
    const start = rng.int(2, 5);
    const valid = Array.from({length: 5}, (_, i) => m * (start + i));
    const outlier = placeOutlier(rng, valid, n => n % m !== 0);
    if (outlier === null) return null;
    return build(ctx, {
      templateId: 'ODD_E_MULT', ruleId: 'MULTIPLE', ruleParams: {multiple: m},
      subskill: `مضاعفات العدد ${m}`,
      valid, outlier,
      propertyText: `مضاعف للعدد ${m}`,
      proofs: valid.map(v => `${v} = ${m} × ${v / m}.`),
      remember: 'في سؤال المختلف، جرّب المضاعفات البسيطة قبل البحث عن قاعدة أعقد.'
    });
  });
}

function squares(ctx) {
  return attempt(ctx, ({rng}) => {
    const start = rng.int(2, 6);
    const valid = Array.from({length: 5}, (_, i) => (start + i) ** 2);
    const outlier = placeOutlier(rng, valid, n => !isSquare(n));
    if (outlier === null) return null;
    return build(ctx, {
      templateId: 'ODD_E_SQUARES', ruleId: 'SQUARE', ruleParams: {baseStart: start},
      subskill: 'مربعات كاملة',
      valid, outlier,
      propertyText: 'مربع كامل',
      proofs: valid.map((v, i) => `${v} = ${start + i} × ${start + i}.`),
      remember: 'إذا رأيت سلسلة مربعات متتابعة فابحث عن العدد الوحيد غير المربع.'
    });
  });
}

function cubes(ctx) {
  return attempt(ctx, ({rng}) => {
    const start = rng.int(2, 4);
    const valid = Array.from({length: 5}, (_, i) => (start + i) ** 3);
    const outlier = placeOutlier(rng, valid, n => !isCube(n));
    if (outlier === null) return null;
    return build(ctx, {
      templateId: 'ODD_M_CUBES', ruleId: 'CUBE', ruleParams: {baseStart: start},
      subskill: 'مكعبات كاملة',
      valid, outlier,
      propertyText: 'مكعب كامل',
      proofs: valid.map((v, i) => `${v} = ${start + i} × ${start + i} × ${start + i}.`),
      remember: 'الأعداد 8 و27 و64 و125 إشارة قوية إلى المكعبات.'
    });
  });
}

function pronic(ctx) {
  return attempt(ctx, ({rng}) => {
    const start = rng.int(2, 5);
    const valid = Array.from({length: 5}, (_, i) => {
      const n = start + i;
      return n * (n + 1);
    });
    const outlier = placeOutlier(rng, valid, n => !isPronic(n));
    if (outlier === null) return null;
    return build(ctx, {
      templateId: 'ODD_M_PRONIC', ruleId: 'PRONIC', ruleParams: {baseStart: start},
      subskill: 'حاصل ضرب عددين صحيحين متتاليين',
      valid, outlier,
      propertyText: 'حاصل ضرب عددين صحيحين متتاليين',
      proofs: valid.map((v, i) => `${v} = ${start + i} × ${start + i + 1}.`),
      remember: 'ابحث عن بنية واحدة واضحة تجمع خمسة أعداد، مثل حاصل ضرب عددين متتاليين.'
    });
  });
}

function primeDoubles(ctx) {
  return attempt(ctx, ({rng}) => {
    const start = rng.int(1, 3);
    const primes = PRIMES.slice(start, start + 5);
    const valid = primes.map(p => 2 * p);
    const outlier = placeOutlier(rng, valid, n => n % 2 === 0 && !PRIMES.includes(n / 2));
    if (outlier === null) return null;
    return build(ctx, {
      templateId: 'ODD_M_PRIME2', ruleId: 'PRIME_DOUBLE', ruleParams: {primes},
      subskill: 'ضعف أعداد أولية متتالية',
      valid, outlier,
      propertyText: 'ضعف عدد أولي',
      proofs: valid.map(v => `${v} ÷ 2 = ${v / 2}، وهو عدد أولي.`),
      remember: 'إذا كانت كل الأعداد زوجية، اقسمها على 2 وابحث عن خاصية في النواتج.'
    });
  });
}

function squareMinusOne(ctx) {
  return attempt(ctx, ({rng}) => {
    const start = rng.int(3, 6);
    const valid = Array.from({length: 5}, (_, i) => (start + i) ** 2 - 1);
    const outlier = placeOutlier(rng, valid, n => !isSquare(n + 1));
    if (outlier === null) return null;
    return build(ctx, {
      templateId: 'ODD_H_SQ_MINUS', ruleId: 'SQUARE_MINUS_ONE', ruleParams: {baseStart: start},
      subskill: 'أعداد أقل بواحد من مربع كامل',
      valid, outlier,
      propertyText: 'مربع كامل ناقص 1',
      proofs: valid.map((v, i) => `${v} + 1 = ${v + 1} = ${start + i} × ${start + i}.`),
      remember: 'قد تكون الخاصية «قريبًا من مربع» لا مربعًا كاملًا نفسه.'
    });
  });
}

function primePlusPattern(ctx) {
  return attempt(ctx, ({rng}) => {
    const primes = PRIMES.slice(1, 6);
    const offset = rng.pick([4, 6, 10]);
    const valid = primes.map(p => p + offset);
    const outlier = placeOutlier(rng, valid, n => n > offset && !PRIMES.includes(n - offset));
    if (outlier === null) return null;
    return build(ctx, {
      templateId: 'ODD_H_PRIME_OFFSET', ruleId: 'PRIME_PLUS_OFFSET', ruleParams: {offset, primes},
      subskill: 'عدد أولي مع إزاحة ثابتة',
      valid, outlier,
      propertyText: `عدد أولي + ${offset}`,
      proofs: valid.map(v => `${v} − ${offset} = ${v - offset}، وهو عدد أولي.`),
      remember: 'إذا لم تظهر خاصية مباشرة، جرّب إزالة إزاحة ثابتة من الأعداد.'
    });
  });
}

function isSquare(n) { return n >= 0 && Number.isInteger(Math.sqrt(n)); }
function isCube(n) { if (n < 0) return false; const r = Math.round(Math.cbrt(n)); return r ** 3 === n; }
function isPronic(n) { for (let k = 1; k * (k + 1) <= n; k++) if (k * (k + 1) === n) return true; return false; }
