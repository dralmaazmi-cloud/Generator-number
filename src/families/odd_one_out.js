// The number that does not belong.
//
// Section 9: it is not enough that the intended rule holds. The oracle sweeps
// the whole approved rule library, and a set is rejected when two rules of
// comparable, low complexity single out *different* numbers. A contrived,
// complicated competing rule is not grounds for rejection, and a set with one
// genuine rule must pass.

import {mk, usable, buildBase, bandPool, resample} from './_shared.js';
import {checkOddOneOutAmbiguity, DISCOVERABILITY_CEILING, approvedRules} from '../qa/ambiguity.js';
import {canonicalNumberSet} from '../qa/fingerprint.js';

const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];

export function generateOddOneOut({difficulty, rng, seed, engineVersion, telemetry, pinTemplate = null, pinTargets = null}) {
  const ctx = {difficulty, rng, seed, engineVersion, telemetry, pinTargets, family: 'odd_one_out', family_ar: 'العدد الذي لا ينتمي', category: 'العدد الذي لا ينتمي إلى المجموعة'};
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
    ['ODD_H_TRIANGULAR', triangularPattern],
    // RC2.8-4. Two jobs over a number set that are not «find the intruder».
    ['ODD_M_PROPERTY', sharedProperty],
    ['ODD_M_EXTEND', extendTheSet],
    // RC2.9.5 §4. The same set, two jobs a solver does not do at EASY today:
    // naming the rule, and admitting a new member to it. Both are EASY here
    // because the rule is drawn from the most discoverable ones only — a
    // multiple of a small number, a square — and the numbers stay small.
    ['ODD_E_PROPERTY', easySharedProperty],
    ['ODD_E_EXTEND', easyExtendTheSet]
  ], pinTemplate)(ctx);
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

// --- RC2.8-4. Naming a property, and extending a set -------------------------
//
// Seven templates in this family and one question between them: «which number
// does not belong». The property changed — multiples, squares, cubes, pronics,
// triangulars — but the job never did, so a solver meeting the family three
// times in a hundred questions met the same job three times.
//
// These two ask about the same number sets from the other two directions a
// person naturally asks them from:
//
//   ODD_M_PROPERTY  every number belongs. Name what they share. The answer is a
//                   property, not a number, and nothing is eliminated.
//   ODD_M_EXTEND    every number belongs, and one MORE would. Find it. The set
//                   is a given rather than the thing under suspicion.
//
// Both are checked by re-testing the approved rule library against the printed
// numbers, in src/qa/pipeline.js: the shown set must share exactly one
// discoverable property, or the question has more than one defensible answer.

/**
 * Rules a solver can be expected to find, with enough room to build a set.
 *
 * Digit-count rules are excluded. «All of these have two digits» is a fact about
 * how the numbers are written, not about the numbers, and a set built on it is
 * five consecutive integers with nothing to discover — 13، 14، 15، 16، 17 was
 * the first thing this template produced. The ambiguity sweep still knows about
 * those rules, because a solver can still offer one; they just cannot be the
 * property a question is BUILT on.
 */
function buildableRules() {
  // «All of these are even» is a property, but it is not a question: five
  // consecutive even numbers give a solver nothing to find. Parity stays in the
  // distractor pool, where it is a real temptation, and out of the answer.
  const TOO_PLAIN = new Set(['even', 'odd']);
  return approvedRules().filter(r =>
    r.salience <= DISCOVERABILITY_CEILING && r.uniquePositive
    && !TOO_PLAIN.has(r.id) && !/^digits\d+$/.test(r.id));
}

/** The first `count` positive values above `from` that satisfy `rule`. */
function valuesFor(rule, from, count, limit = 4000) {
  const out = [];
  for (let n = from; n <= limit && out.length < count; n++) if (rule.test(n)) out.push(n);
  return out.length === count ? out : null;
}

/**
 * The discoverable properties that hold for EVERY number in a set.
 *
 * A set built on one rule often satisfies another by construction — five
 * multiples of four are also five even numbers — and then there is no single
 * right answer to «what do these share». Checked here so the item is drawn
 * again rather than built and refused by the oracle.
 */
function sharedRulesOf(numbers) {
  return approvedRules().filter(r =>
    r.salience <= DISCOVERABILITY_CEILING && !/^digits\d+$/.test(r.id)
    && numbers.every(n => r.test(n)));
}

function sharedProperty(ctx) {
  const {rng} = ctx;
  const rules = buildableRules();
  const rule = rng.pick(rules);
  const set = valuesFor(rule, rng.int(2, 30), 5);
  if (!set) return resampleOdd(ctx, sharedProperty);
  const shared = sharedRulesOf(set);
  if (shared.length !== 1 || shared[0].id !== rule.id) return resampleOdd(ctx, sharedProperty);
  // The other readings a solver might offer: properties that hold for SOME of
  // the shown numbers but not all. A property that holds for none is not a
  // temptation and would make the option list easy to thin out by inspection.
  // Drawn from the WHOLE approved library, not only from the rules a set can be
  // built on: «its digits add to a multiple of three» is a poor foundation for a
  // set and an excellent wrong answer. Restricting the distractor pool to
  // buildable rules left so few partial matches that only triangular numbers
  // ever survived — forty draws, forty triangular sets.
  const partial = approvedRules()
    // …but not the digit-count rules. «عدد من 2 خانة» puts a numeral in front of
    // a noun the units lexicon does not govern, which the Arabic construction
    // classifier correctly refuses; and the rule is about spelling rather than
    // about the number, so it is a poor wrong answer as well as an unsayable one.
    .filter(r => r.id !== rule.id && !/^digits\d+$/.test(r.id))
    .map(r => ({rule: r, hits: set.filter(n => r.test(n)).length}))
    .filter(x => x.hits >= 1 && x.hits < set.length);
  // Five wrong readings are needed to fill an option set, and a set that
  // cannot offer five genuine partial matches is drawn again rather than padded
  // with a property nothing in the set satisfies.
  if (partial.length < 5) return resampleOdd(ctx, sharedProperty);
  const chosen = rng.sample(partial, 5);
  const distractors = usable(ctx, chosen.map(x =>
    mk(x.rule.ar, 'CHECKED_ONLY_PART_OF_THE_SET',
      `«${x.rule.ar}» تنطبق على ${x.hits} من أعداد المجموعة فقط`)));
  return buildBase(ctx, {
    templateId: 'ODD_M_PROPERTY',
    subskill: 'تسمية الخاصية المشتركة',
    difficulty: 'medium',
    question: 'ما الخاصية التي تشترك فيها كل أعداد المجموعة الآتية؟',
    displayExpression: set.join('، '),
    correct: rule.ar, distractors, format: v => String(v),
    steps: [
      `نختبر الخاصية على كل عدد: ${set.map(n => `${n} ✓`).join('، ')}.`,
      `الخاصية «${rule.ar}» تصحّ على الأعداد كلها، لا على بعضها.`,
      'الخيارات الأخرى تصحّ على جزء من المجموعة فقط، والمطلوب ما يجمعها كلها.'
    ],
    howToStart: 'اختبر كل خاصية على أصغر عدد وأكبر عدد أولًا؛ ما يفشل على أحدهما يسقط.',
    remember: 'الخاصية المشتركة هي التي تصحّ على كل عضو، لا على أغلبهم.',
    fastMethod: 'ابدأ بالخصائص البسيطة — زوجي، مربع، أولي — ثم انتقل إلى ما هو أدق.',
    estimatedSteps: 2, conceptTags: ['number-properties', 'rule-discovery'],
    parameters: {numbers: set},
    commutative: {numberSet: canonicalNumberSet(set)},
    orderInsensitive: ['numbers'],
    oracle: {kind: 'property', mode: 'shared', numbers: set, intendedRuleId: rule.id},
    askedUnknown: 'sharedProperty', stageCount: 2,
    pedagogy: {
      targetSkill: `NAME_RULE_${rule.id}`, targetMisconception: 'CHECKED_ONLY_PART_OF_THE_SET',
      // The wrong method is settling on a property after checking part of the
      // set. It cannot coincide with the key: every offered wrong property is
      // chosen BECAUSE it fails on at least one shown number, and the set is
      // drawn again unless exactly one discoverable rule holds for all of them.
      wrongMethodValue: chosen[0].rule.ar,
      degenerateWhen: [{when: false,
        note: 'the offered wrong properties each fail on at least one member by construction'}]
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 1, ruleSearchDepth: rule.salience + 1, arithmeticBurden: 2},
    textParams: false
  });
}

function extendTheSet(ctx) {
  const {rng} = ctx;
  const rules = buildableRules();
  const rule = rng.pick(rules);
  const set = valuesFor(rule, rng.int(2, 24), 4);
  if (!set) return resampleOdd(ctx, extendTheSet);
  const shared = sharedRulesOf(set);
  if (shared.length !== 1 || shared[0].id !== rule.id) return resampleOdd(ctx, extendTheSet);
  const next = valuesFor(rule, set.at(-1) + 1, 1);
  if (!next) return resampleOdd(ctx, extendTheSet);
  const correct = next[0];
  // Wrong options are numbers a solver lands on by reading the set as something
  // simpler than it is: the arithmetic next step, one either side of the true
  // member, and a value that merely shares the surface look of the set.
  const gap = set.at(-1) - set.at(-2);
  const near = [set.at(-1) + gap, correct - 1, correct + 1, correct + 2, correct - 2,
    set.at(-1) + 2 * gap, correct + 3]
    .filter(v => v > 0 && !rule.test(v) && !set.includes(v));
  const unique = [...new Set(near)];
  if (unique.length < 5) return resampleOdd(ctx, extendTheSet);
  const offered = unique.slice(0, 5);
  const distractors = usable(ctx, offered.map((v, i) =>
    mk(v, i === 0 ? 'CONTINUED_THE_SET_ARITHMETICALLY' : 'NEAR_MISS_ON_THE_PROPERTY',
      i === 0 ? `${set.at(-1)} + ${gap}` : `${v} لا يحقق الخاصية «${rule.ar}»`)));
  return buildBase(ctx, {
    templateId: 'ODD_M_EXTEND',
    subskill: 'ضمّ عدد جديد إلى مجموعة بخاصية واحدة',
    difficulty: 'medium',
    question: 'أعداد المجموعة الآتية تشترك في خاصية واحدة. أي عدد يمكن ضمّه إليها؟',
    displayExpression: set.join('، '),
    correct, distractors, format: v => String(v),
    steps: [
      `أعداد المجموعة كلها تحقق الخاصية «${rule.ar}».`,
      `نختبر الخيارات على الخاصية نفسها، فنجد ${correct} وحده يحققها.`
    ],
    howToStart: 'اكتشف الخاصية من المجموعة أولًا، ثم اختبر بها الخيارات.',
    remember: 'فرق ثابت بين الأعداد لا يعني أن القاعدة جمع؛ اختبر الخاصية نفسها.',
    fastMethod: `ابحث عن أصغر عدد بعد ${set.at(-1)} يحقق «${rule.ar}».`,
    estimatedSteps: 2, conceptTags: ['number-properties', 'set-extension'],
    // The answer is a declared parameter as well as the key: the worked steps
    // name it, and a value the explanation states has to be sourced.
    parameters: {numbers: set, joiningNumber: correct},
    commutative: {numberSet: canonicalNumberSet(set)},
    orderInsensitive: ['numbers'],
    oracle: {kind: 'property', mode: 'extend', numbers: set, intendedRuleId: rule.id,
      options: [correct, ...offered]},
    askedUnknown: 'setMember', stageCount: 2,
    pedagogy: {
      targetSkill: `EXTEND_RULE_${rule.id}`, targetMisconception: 'CONTINUED_THE_SET_ARITHMETICALLY',
      // The wrong method is continuing the last visible gap instead of the
      // property. It would coincide if that value happened to satisfy the rule,
      // which is filtered out before the options are built, so the item is never
      // degenerate — and the filter is what makes that true, not luck.
      wrongMethodValue: set.at(-1) + gap,
      degenerateWhen: [{when: rule.test(set.at(-1) + gap),
        note: 'the arithmetic continuation would also satisfy the property'}]
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 1, ruleSearchDepth: rule.salience + 1, arithmeticBurden: 2},
    textParams: false
  });
}

/**
 * This family's own retry. `attempt` above wraps the odd-one-out builders and
 * expects a null to mean "ambiguous set, draw again"; these two report the same
 * way, so they share the mechanism rather than inventing a second one.
 */
function resampleOdd(ctx, self) {
  return resample(ctx, self);
}

/** The rules a solver can name at a glance: salience 1, small numbers. */
function plainRules() {
  const PLAIN = new Set(['square', 'mult3', 'mult4', 'mult5', 'mult6']);
  return approvedRules().filter(r => PLAIN.has(r.id));
}

/**
 * RC2.9.5 §4. EASY: name the property the set shares.
 *
 * The task is IDENTIFY_RULE rather than IDENTIFY_MEMBER — the solver reads the
 * set and says what it is, instead of finding what does not fit — and the
 * information is a RULE_CHOICE rather than a bare set display. The rule is one
 * of the plain ones and every number is under a hundred, so the reading is
 * immediate; what makes it a question is that three of the wrong readings hold
 * for part of the set.
 */
function easySharedProperty(ctx) {
  const {rng} = ctx;
  const rule = rng.pick(plainRules());
  const set = valuesFor(rule, rng.int(2, 12), 4);
  if (!set || set.at(-1) > 99) return resampleOdd(ctx, easySharedProperty);
  const shared = sharedRulesOf(set);
  if (shared.length !== 1 || shared[0].id !== rule.id) return resampleOdd(ctx, easySharedProperty);
  const partial = approvedRules()
    .filter(r => r.id !== rule.id && !/^digits\d+$/.test(r.id))
    .map(r => ({rule: r, hits: set.filter(n => r.test(n)).length}))
    .filter(x => x.hits >= 1 && x.hits < set.length);
  if (partial.length < 5) return resampleOdd(ctx, easySharedProperty);
  const chosen = rng.sample(partial, 5);
  const distractors = usable(ctx, chosen.map(x =>
    mk(x.rule.ar, 'CHECKED_ONLY_PART_OF_THE_SET',
      `«${x.rule.ar}» تنطبق على ${x.hits} من أعداد المجموعة فقط`)));
  return buildBase(ctx, {
    templateId: 'ODD_E_PROPERTY',
    subskill: 'تسمية الخاصية المشتركة في مجموعة صغيرة',
    difficulty: 'easy',
    question: 'أي خاصية تصحّ على كل أعداد المجموعة الآتية؟',
    displayExpression: set.join('، '),
    correct: rule.ar, distractors, format: v => String(v),
    steps: [
      `نختبر الخاصية على كل عدد: ${set.map(n => `${n} ✓`).join('، ')}.`,
      `«${rule.ar}» وحدها تصحّ على الأعداد الأربعة كلها.`
    ],
    howToStart: 'اختبر كل خيار على أصغر عدد وأكبر عدد؛ ما يفشل على أحدهما يسقط.',
    remember: 'الخاصية المشتركة تصحّ على كل عضو، لا على أغلبهم.',
    fastMethod: 'ابدأ بأبسط خاصية تراها في العدد الأول ثم اختبرها على الباقي.',
    estimatedSteps: 1, conceptTags: ['number-properties', 'rule-discovery'],
    parameters: {numbers: set},
    commutative: {numberSet: canonicalNumberSet(set)},
    orderInsensitive: ['numbers'],
    oracle: {kind: 'property', mode: 'shared', numbers: set, intendedRuleId: rule.id},
    askedUnknown: 'sharedProperty', stageCount: 1,
    pedagogy: {
      targetSkill: `NAME_RULE_${rule.id}`, targetMisconception: 'CHECKED_ONLY_PART_OF_THE_SET',
      wrongMethodValue: chosen[0].rule.ar
    },
    complexityFactors: {reasoningTransformations: 1, conceptCount: 1, stageCount: 1, arithmeticBurden: 1},
    textParams: {essentialParams: ['numbers']}
  });
}

/**
 * RC2.9.5 §4. EASY: admit a new member to the set.
 *
 * SET_EXTENSION, and the direction of inference is the opposite of the
 * intruder question: the rule is inferred from the set and then applied
 * forward to a candidate, rather than tested against each shown member.
 */
function easyExtendTheSet(ctx) {
  const {rng} = ctx;
  // A multiple rule cannot carry this job: the arithmetic continuation of a run
  // of multiples IS the next multiple, so the wrong route and the key coincide.
  // The rules here grow by a changing step, which is exactly what makes
  // «continue the last gap» a wrong answer worth offering.
  const EXTENDABLE = new Set(['square', 'triangular', 'pronic']);
  const rule = rng.pick(approvedRules().filter(r => EXTENDABLE.has(r.id)));
  const set = valuesFor(rule, rng.int(2, 10), 4);
  if (!set || set.at(-1) > 120) return resampleOdd(ctx, easyExtendTheSet);
  const shared = sharedRulesOf(set);
  if (shared.length !== 1 || shared[0].id !== rule.id) return resampleOdd(ctx, easyExtendTheSet);
  const next = valuesFor(rule, set.at(-1) + 1, 1);
  if (!next) return resampleOdd(ctx, easyExtendTheSet);
  const correct = next[0];
  const gap = set.at(-1) - set.at(-2);
  const near = [set.at(-1) + gap, correct - 1, correct + 1, correct + 2, correct - 2, correct + 3, correct - 3]
    .filter(v => v > 0 && !rule.test(v) && !set.includes(v));
  const unique = [...new Set(near)];
  if (unique.length < 5) return resampleOdd(ctx, easyExtendTheSet);
  const offered = unique.slice(0, 5);
  const distractors = usable(ctx, offered.map((v, i) =>
    mk(v, i === 0 ? 'CONTINUED_THE_SET_ARITHMETICALLY' : 'NEAR_MISS_ON_THE_PROPERTY',
      i === 0 ? `${set.at(-1)} + ${gap}` : `${v} لا يحقق الخاصية «${rule.ar}»`)));
  return buildBase(ctx, {
    templateId: 'ODD_E_EXTEND',
    subskill: 'ضمّ عدد إلى مجموعة بخاصية واحدة واضحة',
    difficulty: 'easy',
    question: 'أعداد المجموعة الآتية تشترك في خاصية واحدة. أي عدد يصلح لضمّه إليها؟',
    displayExpression: set.join('، '),
    correct, distractors, format: v => String(v),
    steps: [
      `الأعداد الثلاثة كلها تحقق «${rule.ar}».`,
      `نختبر الخيارات بالخاصية نفسها، فيحققها ${correct} وحده.`
    ],
    howToStart: 'سمِّ الخاصية من المجموعة أولًا، ثم اختبر بها الخيارات.',
    remember: 'الفرق الثابت بين الأعداد لا يعني أن القاعدة جمع؛ اختبر الخاصية نفسها.',
    fastMethod: `ابحث عن أصغر عدد بعد ${set.at(-1)} يحقق «${rule.ar}».`,
    estimatedSteps: 1, conceptTags: ['number-properties', 'set-extension'],
    parameters: {numbers: set, joiningNumber: correct},
    commutative: {numberSet: canonicalNumberSet(set)},
    orderInsensitive: ['numbers'],
    oracle: {kind: 'property', mode: 'extend', numbers: set, intendedRuleId: rule.id,
      options: [correct, ...offered]},
    askedUnknown: 'setMember', stageCount: 1,
    pedagogy: {
      targetSkill: `EXTEND_BY_RULE_${rule.id}`, targetMisconception: 'CONTINUED_THE_SET_ARITHMETICALLY',
      wrongMethodValue: set.at(-1) + gap,
      degenerateWhen: [{when: rule.test(set.at(-1) + gap),
        note: 'the arithmetic continuation would also satisfy the property'}]
    },
    complexityFactors: {reasoningTransformations: 1, conceptCount: 1, stageCount: 1, arithmeticBurden: 1},
    textParams: {derivedFromParams: ['joiningNumber'], essentialParams: ['numbers']}
  });
}
