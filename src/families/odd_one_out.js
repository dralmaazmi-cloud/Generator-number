// The number that does not belong.
//
// Section 9: it is not enough that the intended rule holds. The oracle sweeps
// the whole approved rule library, and a set is rejected when two rules of
// comparable, low complexity single out *different* numbers. A contrived,
// complicated competing rule is not grounds for rejection, and a set with one
// genuine rule must pass.

import {mk, usable, buildBase, bandPool} from './_shared.js';
import {checkOddOneOutAmbiguity, DISCOVERABILITY_CEILING} from '../qa/ambiguity.js';
import {canonicalNumberSet} from '../qa/fingerprint.js';

const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];

export function generateOddOneOut({difficulty, rng, seed, engineVersion, telemetry}) {
  const ctx = {difficulty, rng, seed, engineVersion, telemetry, family: 'odd_one_out', family_ar: 'العدد الذي لا ينتمي', category: 'العدد الذي لا ينتمي إلى المجموعة'};
  // RC2.3-1. The catalogue, not a set of per-band pools: which of these is
  // eligible for the requested band is decided by the structural adjudication in
  // src/qa/structure.js, so a template cannot sit in a band nobody adjudicated.
  return bandPool(rng, 'odd_one_out', difficulty, [
    ['ODD_E_MULT', multiples],
    ['ODD_E_SQUARES', squares],
    ['ODD_M_PRONIC', pronic],
    ['ODD_M_PRIME2', primeDoubles],
    ['ODD_M_CUBES', cubes],
    ['ODD_H_SQ_MINUS', squareMinusOne],
    ['ODD_H_TRIANGULAR', triangularPattern]
  ])(ctx);
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
  // RC2-007/008/009. AMBIGUOUS and UNDISCOVERABLE are never published.
  // BORDERLINE may be, under the declared policy, and stays visible in metrics.
  const ambiguity = checkOddOneOutAmbiguity(group, outlier);
  if (!ambiguity.supportsIntended) return null;
  if (ambiguity.ambiguous || ambiguity.undiscoverable) return null;
  // RC2-009. The template's *declared* rule must itself be discoverable. A rule
  // the library treats as beyond a candidate's reach must not certify a
  // question merely because it is the one the author had in mind, and it is not
  // enough that some unrelated simpler rule happens to agree with the key —
  // that was the S5/22 case, a Hard item solvable by "which one is even".
  if (!declaredRuleIsDiscoverable(ruleId)) return null;

  const distractors = usable(ctx, valid.map(v => mk(v, 'SATISFIES_SHARED_PROPERTY', `${v} يحقق الخاصية: ${propertyText}`)));
  return buildBase(ctx, {
    templateId,
    subskill,
    difficulty: ctx.difficulty,
    question: 'أي عدد لا ينتمي إلى المجموعة الآتية؟',
    // RC2.1-3. The options are the displayed set and the key is one member of
    // it, so the spread between them is the question, not an out-of-scale option.
    stimulusIsOptions: true,
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
    // RC2.7-D. The rule id travels with the oracle so the core signature can
    // tell one number property from another; it is already a declared
    // parameter of the item, not a new fact about it.
    oracle: {kind: 'ruleset', numbers: group, intendedOutlier: outlier, intendedRule: ruleId},
    askedUnknown: 'outlier',
    stageCount: 1,
    pedagogy: {targetSkill: `RULE_${ruleId}`, targetMisconception: 'SATISFIES_SHARED_PROPERTY'},
    // RC2-015. `conditionCount: 6` was the count of numbers on the page, not of
    // conditions, and it was identical for every template in this family — a
    // flat 4.2 that told the model nothing. What varies is the search a solver
    // has to do, which RC2-008 already measures.
    complexityFactors: {
      reasoningTransformations: 2,
      conceptCount: 1,
      ruleSearchDepth: ambiguity.intendedSalience + ambiguity.surfaceCompeting.length,
      arithmeticBurden: ctx.difficulty === 'hard' ? 3 : 2
    },
    metadata: {
      outlier_display_position: group.indexOf(outlier) + 1,
      property: propertyText,
      // RC2-007/008/009: the publication verdict, kept for corpus metrics.
      ambiguity_verdict: ambiguity.verdict,
      ambiguity_intended_salience: ambiguity.intendedSalience,
      ambiguity_surface_competing: ambiguity.surfaceCompeting.map(r => `${r.ruleId}->${r.outlier}`)
    },
    textParams: false
  });
}

/**
 * RC2-009. The salience the rule library assigns to each template's declared
 * rule. A declared rule above DISCOVERABILITY_CEILING cannot be published.
 */
const DECLARED_RULE_SALIENCE = {
  MULTIPLE: 1,
  SQUARE: 1,
  CUBE: 2,
  PRONIC: 2,
  PRIME_DOUBLE: 2,
  SQUARE_MINUS_ONE: 2,
  TRIANGULAR: 2
};

function declaredRuleIsDiscoverable(ruleId) {
  const salience = DECLARED_RULE_SALIENCE[ruleId];
  return Number.isFinite(salience) && salience <= DISCOVERABILITY_CEILING;
}

/** Retries the same shape with fresh numbers when the ambiguity sweep rejects one. */
function attempt(ctx, make) {
  for (let i = 0; i < 30; i++) {
    const built = make(ctx);
    if (built) return built;
    // RC2-003. This is the rejection RC1 could not see: 135 of 1,256 draws
    // discarded here, none of it in the histogram.
    ctx.telemetry?.familyResample({
      family: ctx.family, templateId: 'odd_one_out/attempt',
      reasonCode: 'AMBIGUOUS_ODD_ONE_OUT', attempt: i + 1, seed: ctx.seed
    });
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
    // RC2-008. A run of consecutive cubes always contains exactly one perfect
    // square (64 = 8², 729 = 27²), and "the only perfect square" competes with
    // the cube rule at a lower salience. When the run carries such a number the
    // intruder must be a square too, so that no single member is the only one.
    const squaresInRun = valid.filter(isSquare).length;
    const outlier = placeOutlier(rng, valid,
      n => !isCube(n) && (squaresInRun !== 1 || isSquare(n)));
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

/**
 * RC2-009. This template used to publish "prime + k" sets. That rule sits above
 * the discoverability ceiling: in the frozen RC1 sample, S5/46 ran prime + 10
 * over six consecutive odd numbers, where primality — the reading any candidate
 * tries first — singles out two numbers, neither of them the key. S5/22 was the
 * mirror image, a Hard item whose only findable route was "which one is even".
 *
 * The template is not retired, which would shrink the inventory. It is rebuilt
 * on triangular numbers: a genuinely hard property to spot inside a run, and one
 * a candidate can actually reach.
 */
function triangularPattern(ctx) {
  return attempt(ctx, ({rng}) => {
    // RC2-011. Five starting indices gave five possible runs, so the intruder
    // the item could ask for took five values across the whole corpus.
    const start = rng.int(3, 14);
    const tri = n => (n * (n + 1)) / 2;
    const valid = Array.from({length: 5}, (_, i) => tri(start + i));
    const outlier = placeOutlier(rng, valid, n => !isTriangular(n));
    if (outlier === null) return null;
    return build(ctx, {
      templateId: 'ODD_H_TRIANGULAR', ruleId: 'TRIANGULAR', ruleParams: {baseStart: start},
      subskill: 'أعداد مثلثية',
      valid, outlier,
      propertyText: 'عدد مثلثي',
      proofs: valid.map((v, i) => `${v} = (${start + i} × ${start + i + 1}) ÷ 2.`),
      remember: 'العدد المثلثي هو مجموع الأعداد من 1 حتى n، مثل 6 و10 و15 و21.'
    });
  });
}

function isSquare(n) { return n >= 0 && Number.isInteger(Math.sqrt(n)); }
function isCube(n) { if (n < 0) return false; const r = Math.round(Math.cbrt(n)); return r ** 3 === n; }
function isPronic(n) { for (let k = 1; k * (k + 1) <= n; k++) if (k * (k + 1) === n) return true; return false; }
function isTriangular(n) { return n > 0 && isSquare(8 * n + 1); }
