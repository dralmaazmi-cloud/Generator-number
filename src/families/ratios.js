import {gcd} from '../utils.js';
import {mk, usable, u, num, buildBase, eq, X, add, sub, mul, mod, resample, bandPool, composeSentences} from './_shared.js';

export function generateRatios({difficulty, rng, seed, engineVersion, telemetry, pinTemplate = null, pinTargets = null}) {
  const ctx = {difficulty, rng, seed, engineVersion, telemetry, pinTargets, family: 'ratios', family_ar: 'النسب وتقسيم الكميات', category: 'النسب وتقسيم الكميات'};
  // RC2.3-1. The catalogue, not a set of per-band pools: which of these is
  // eligible for the requested band is decided by the structural adjudication in
  // src/qa/structure.js, so a template cannot sit in a band nobody adjudicated.
  return bandPool(rng, 'ratios', difficulty, [
    ['RAT_E_KNOWN', scaleKnown],
    ['RAT_E_SPLIT', splitTotal],
    ['RAT_M_COMMON_SUM', commonTermSum],
    ['RAT_M_COMMON_DIFF', commonTermDifference],
    ['RAT_H_TWO_COMB', twoRatiosExternalSum],
    ['RAT_M_ADD_SIDE', addToOneSide],
    ['RAT_H_TRANSFER', transferBetweenSides],
    // RC2.7-3. A largest admissible value.
    ['RAT_H_MAX_PART', largestAdmissiblePart]
  ], pinTemplate)(ctx);
}

const plain = v => num(v);

/** Section 12: a stated ratio these templates present as final must be in
 *  lowest terms and must not have equal sides, or the item is trivial. */
function reducedUnequalPair(rng, maxA = 5, maxB = 9) {
  for (let t = 0; t < 40; t++) {
    const a = rng.int(1, maxA);
    const b = rng.int(2, maxB);
    if (a !== b && gcd(a, b) === 1) return [a, b];
  }
  return [2, 3];
}

function splitTotal(ctx) {
  const {rng} = ctx;
  const [a, b] = reducedUnequalPair(rng, 5, 8);
  const k = rng.int(3, 12);
  const total = (a + b) * k;
  const askA = rng.bool();
  const mine = askA ? a : b;
  const other = askA ? b : a;
  const correct = mine * k;
  const params = {partA: a, partB: b, total};
  const distractors = usable(ctx, [
    mk(other * k, 'USED_WRONG_SIDE_OF_RATIO', `${other} × ${k}`),
    mk(k, 'USED_PART_VALUE_AS_ANSWER', `${total} ÷ (${a} + ${b})`),
    mk(total - correct, 'USED_WRONG_SIDE_OF_RATIO', `${total} − ${correct}`),
    mk(total / (a + b) * (mine + 1), 'RATE_APPLIED_TO_WRONG_COUNT', `${k} × (${mine} + 1)`),
    mk(total / (a + b) * (mine - 1), 'MISSED_ONE_STAGE', `${k} × (${mine} − 1)`),
    mk(total / mine, 'REVERSED_DIRECT_PROPORTION', `${total} ÷ ${mine}`),
    mk(total, 'USED_ORIGINAL_TOTAL', `المجموع المعطى ${total}`),
    mk(mine * other, 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE', `${mine} × ${other}`),
    mk(total / 2, 'USED_ARITHMETIC_MEAN_OF_AVERAGES', `${total} ÷ 2`),
    mk(total / other, 'REVERSED_DIRECT_PROPORTION', `${total} ÷ ${other}`),
    mk(a * b * k, 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE', `${a} × ${b} × ${k}`),
    mk(total * mine / other, 'REVERSED_DIRECT_PROPORTION', `${total} × ${mine} ÷ ${other}`),
    mk(k * mine * 2, 'APPLIED_STEP_TWICE', `${k} × ${mine} × 2`)
  ]);
  const stem = composeSentences(ctx, `النسبة بين أ : ب = ${a} : ${b}. إذا كان مجموعهما ${total}، فما قيمة ${askA ? 'أ' : 'ب'}؟`);
  return buildBase(ctx, {
    templateId: 'RAT_E_SPLIT',
    subskill: 'تقسيم مجموع وفق نسبة',
    difficulty: 'medium',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: plain,
    steps: [
      `مجموع أجزاء النسبة = ${a} + ${b} = ${a + b}.`,
      `قيمة الجزء الواحد = ${total} ÷ ${a + b} = ${k}.`,
      `${askA ? 'أ' : 'ب'} = ${mine} × ${k} = ${correct}.`
    ],
    howToStart: 'احسب مجموع أجزاء النسبة ثم قيمة الجزء الواحد.',
    remember: 'في تقسيم المجموع، قيمة الجزء = المجموع ÷ مجموع أجزاء النسبة.',
    fastMethod: 'المجموع ÷ مجموع الأجزاء، ثم اضرب في أجزاء الطرف المطلوب.',
    estimatedSteps: 3, conceptTags: ['ratio'], parameters: params,
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, a + b), mul(total, mine))]},
    askedUnknown: askA ? 'sideA' : 'sideB', stageCount: 2,
    ratio: {a, b, requireReduced: true, requireDistinctSides: true, label: 'given'},
    pedagogy: {
      targetSkill: 'SPLIT_BY_RATIO', targetMisconception: 'USED_WRONG_SIDE_OF_RATIO',
      wrongMethodValue: other * k
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 1, stageCount: 2, arithmeticBurden: 2},
    textParams: {essentialParams: ['partA', 'partB', 'total']}
  });
}

function scaleKnown(ctx) {
  const {rng} = ctx;
  const [a, b] = reducedUnequalPair(rng, 5, 9);
  const k = rng.int(2, 10);
  const askB = rng.bool(0.7);
  const givenParts = askB ? a : b;
  const wantedParts = askB ? b : a;
  const given = givenParts * k;
  const correct = wantedParts * k;
  const params = {partA: a, partB: b, givenValue: given};
  const distractors = usable(ctx, [
    mk(given, 'USED_GIVEN_VALUE_AS_ANSWER', `القيمة المعطاة ${given}`),
    mk(k, 'USED_PART_VALUE_AS_ANSWER', `${given} ÷ ${givenParts}`),
    mk((a + b) * k, 'USED_SUM_OF_PARTS', `(${a} + ${b}) × ${k}`),
    mk(given * givenParts / wantedParts, 'REVERSED_DIRECT_PROPORTION', `${given} × ${givenParts} ÷ ${wantedParts}`),
    mk(Math.abs(b - a) * k, 'SUBTRACTED_INSTEAD_OF_ADDED', `|${b} − ${a}| × ${k}`),
    mk(given + wantedParts, 'ADDED_INSTEAD_OF_SCALING', `${given} + ${wantedParts}`),
    mk(given * wantedParts, 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE', `${given} × ${wantedParts}`),
    mk(given - wantedParts, 'SUBTRACTED_INSTEAD_OF_ADDED', `${given} − ${wantedParts}`)
  ]);
  const stem = composeSentences(ctx, `النسبة أ : ب = ${a} : ${b}. إذا كانت ${askB ? 'أ' : 'ب'} = ${given}، فما قيمة ${askB ? 'ب' : 'أ'}؟`);
  return buildBase(ctx, {
    templateId: 'RAT_E_KNOWN',
    subskill: 'استخدام قيمة طرف معلوم في نسبة',
    difficulty: 'easy',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: plain,
    steps: [
      `${askB ? 'أ' : 'ب'} تمثل ${givenParts} من أجزاء النسبة وقيمتها ${given}.`,
      `قيمة الجزء الواحد = ${given} ÷ ${givenParts} = ${k}.`,
      `${askB ? 'ب' : 'أ'} = ${wantedParts} × ${k} = ${correct}.`
    ],
    howToStart: 'استخرج قيمة الجزء الواحد من الطرف المعلوم.',
    remember: 'إذا عرفت قيمة أحد طرفي النسبة، اقسمها على عدد أجزائه أولًا.',
    fastMethod: 'استخرج قيمة الجزء ثم اضرب في أجزاء الطرف المطلوب.',
    estimatedSteps: 2, conceptTags: ['ratio'], parameters: params,
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, givenParts), mul(given, wantedParts))]},
    askedUnknown: askB ? 'sideB' : 'sideA', stageCount: 2,
    ratio: {a, b, requireReduced: true, requireDistinctSides: true, label: 'given'},
    pedagogy: {
      targetSkill: 'RATIO_FROM_ONE_SIDE', targetMisconception: 'REVERSED_DIRECT_PROPORTION',
      wrongMethodValue: given * givenParts / wantedParts
    },
    complexityFactors: {reasoningTransformations: 2, conceptCount: 1, stageCount: 2, arithmeticBurden: 2},
    textParams: {essentialParams: ['partA', 'partB', 'givenValue']}
  });
}

/**
 * Unifies the shared term by cross-multiplying (b x c) rather than by the lcm.
 * Every unified part is then a product of two numbers printed in the stem, so
 * the explanation can derive it instead of announcing it (Section 8-C).
 */
/**
 * RC2-003. Both printed ratios must be reduced and two-sided — RC2-020's
 * invariant, which the pipeline enforces. The draw used to ignore it, so roughly
 * 69% of every draw of the three templates built on this helper was refused
 * after the fact: the largest single unabsorbed rejection cost in the engine.
 *
 * Drawing a reduced pair directly is not a change of policy and not a change of
 * what is published — the published corpus already contained only reduced pairs,
 * because the invariant removed the rest. It removes the waste, and the
 * invariant stays exactly where it was as the guard.
 *
 * This constrains the ratio PRINTED IN THE STEM, which the learner can see. It
 * is not a property of the answer, and nothing here looks at the answer.
 */
function unifyCommonTerm(rng) {
  const coprimePair = (loA, hiA, loB, hiB) => {
    for (let tries = 0; tries < 60; tries++) {
      const x = rng.int(loA, hiA), y = rng.int(loB, hiB);
      if (x !== y && gcd(x, y) === 1) return [x, y];
    }
    return null;
  };
  const first = coprimePair(1, 4, 2, 5);
  const second = coprimePair(2, 6, 2, 6);
  if (!first || !second) return null;
  const [a, b] = first;
  let [c, d] = second;
  // Section 10: when b already equals c there is nothing to unify, and the
  // template stops measuring the skill it exists for.
  if (c === b) {
    const alt = coprimePair(2, 6, 2, 6);
    if (!alt || alt[0] === b) return null;
    [c, d] = alt;
  }
  return {a, b, c, d, A: a * c, B: b * c, C: d * b, unified: true};
}

function commonTermSum(ctx) {
  const {rng} = ctx;
  const drawn = unifyCommonTerm(rng);
  if (!drawn) return resample(ctx, commonTermSum);
  const {a, b, c, d, A, B, C} = drawn;
  const k = rng.int(1, 5);
  const given = (A + C) * k;
  const correct = B * k;
  if (A === C) return resample(ctx, commonTermSum);
  const params = {firstA: a, firstB: b, secondB: c, secondC: d, sumAC: given};
  const distractors = usable(ctx, [
    mk(A * k, 'USED_WRONG_SIDE_OF_RATIO', `${A} × ${k}`, 3),
    mk(C * k, 'USED_WRONG_SIDE_OF_RATIO', `${C} × ${k}`, 3),
    mk((A + B + C) * k, 'USED_SUM_OF_PARTS', `(${A} + ${B} + ${C}) × ${k}`),
    mk(k, 'USED_PART_VALUE_AS_ANSWER', `${given} ÷ ${A + C}`),
    mk(given, 'USED_GIVEN_VALUE_AS_ANSWER', `المجموع المعطى ${given}`),
    mk(given * b / (a + b), 'MISSED_ONE_STAGE', `${given} × ${b} ÷ (${a} + ${b})`),
    mk((A + B + C) * k + given, 'USED_ORIGINAL_TOTAL', `(${A} + ${B} + ${C}) × ${k} + ${given}`)
  ]);
  const stem = composeSentences(ctx, `النسبة أ : ب = ${a} : ${b}، والنسبة ب : ج = ${c} : ${d}. إذا كان أ + ج = ${given}، فما قيمة ب؟`);
  return buildBase(ctx, {
    templateId: 'RAT_M_COMMON_SUM',
    subskill: 'نسبتان بحد مشترك مع مجموع الطرفين الخارجيين',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: plain,
    steps: [
      `نضرب النسبة الأولى في ${c} والثانية في ${b} ليتساوى حد ب: ${a} × ${c} = ${A}، و${b} × ${c} = ${B}، و${d} × ${b} = ${C}.`,
      `إذن أ : ب : ج = ${A} : ${B} : ${C}.`,
      `أ + ج = ${A} + ${C} = ${A + C}.`,
      `قيمة الجزء الواحد = ${given} ÷ ${A + C} = ${k}.`,
      `ب = ${B} × ${k} = ${correct}.`
    ],
    howToStart: 'وحّد قيمة الحد المشترك ب أولًا.',
    remember: 'في نسبتين لهما حد مشترك، لا تجمعهما قبل توحيد الحد المشترك.',
    fastMethod: 'وحّد ب، ثم حوّل المجموع المعطى إلى قيمة جزء.',
    estimatedSteps: 4, conceptTags: ['ratio', 'common-term'], parameters: params,
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, A + C), mul(given, B))]},
    askedUnknown: 'commonTerm', stageCount: 3,
    // RC2-020. Both printed ratios carry the template's invariants. RC1
    // declared none here at all, so the second edge escaped entirely and sets
    // such as ب : ج = 6 : 2 reached publication unreduced.
    ratio: [
      {a, b, requireReduced: true, requireDistinctSides: true, label: 'first'},
      {a: c, b: d, requireReduced: true, requireDistinctSides: true, label: 'second'}
    ],
    pedagogy: {
      targetSkill: 'UNIFY_COMMON_TERM', targetMisconception: 'USED_SUM_OF_PARTS',
      wrongMethodValue: (A + B + C) * k,
      degenerateWhen: [{when: b === c, note: 'terms already unified: nothing to unify'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 3, arithmeticBurden: 3, dependencyDepth: 2},
    textParams: {essentialParams: ['firstA', 'firstB', 'secondB', 'secondC', 'sumAC']}
  });
}

function commonTermDifference(ctx) {
  const {rng} = ctx;
  let picked = null;
  for (let t = 0; t < 50; t++) {
    const cand = unifyCommonTerm(rng);
    if (!cand) continue;
    const diffParts = Math.abs(cand.C - cand.A);
    if (diffParts >= 1 && diffParts <= 10) { picked = {...cand, diffParts}; break; }
  }
  if (!picked) return resample(ctx, commonTermDifference);
  const {a, b, c, d, A, B, C, diffParts} = picked;
  const k = rng.int(1, 5);
  const given = diffParts * k;
  const correct = (A + B + C) * k;
  const params = {firstA: a, firstB: b, secondB: c, secondC: d, differenceAC: given};
  const distractors = usable(ctx, [
    mk(B * k, 'USED_WRONG_SIDE_OF_RATIO', `${B} × ${k}`, 3),
    mk((A + C) * k, 'MISSED_ONE_STAGE', `(${A} + ${C}) × ${k}`),
    mk((A + B) * k, 'MISSED_ONE_STAGE', `(${A} + ${B}) × ${k}`),
    mk((B + C) * k, 'MISSED_ONE_STAGE', `(${B} + ${C}) × ${k}`),
    mk(given, 'USED_GIVEN_VALUE_AS_ANSWER', `الفرق المعطى ${given}`),
    mk(k, 'USED_PART_VALUE_AS_ANSWER', `${given} ÷ ${diffParts}`),
    mk((A + B + C) * k, 'USED_SUM_OF_PARTS', `(${A} + ${B} + ${C}) × ${k}`)
  ]);
  const stem = composeSentences(ctx, `النسبة أ : ب = ${a} : ${b}، والنسبة ب : ج = ${c} : ${d}. إذا كان الفرق بين أ وج يساوي ${given}، فما مجموع أ + ب + ج؟`);
  return buildBase(ctx, {
    templateId: 'RAT_M_COMMON_DIFF',
    subskill: 'نسبتان بحد مشترك مع فرق الطرفين',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: plain,
    steps: [
      `نضرب النسبة الأولى في ${c} والثانية في ${b} ليتساوى حد ب: ${a} × ${c} = ${A}، و${b} × ${c} = ${B}، و${d} × ${b} = ${C}.`,
      `إذن أ : ب : ج = ${A} : ${B} : ${C}.`,
      `فرق الأجزاء بين أ وج = ${Math.max(A, C)} − ${Math.min(A, C)} = ${diffParts}.`,
      `قيمة الجزء الواحد = ${given} ÷ ${diffParts} = ${k}.`,
      `مجموع الأجزاء = ${A} + ${B} + ${C} = ${A + B + C}.`,
      `المجموع = ${A + B + C} × ${k} = ${correct}.`
    ],
    howToStart: 'وحّد النسب ثم استخدم الفرق لمعرفة قيمة الجزء.',
    remember: 'الفرق الحقيقي يساوي فرق الأجزاء × قيمة الجزء.',
    fastMethod: 'بعد التوحيد: قيمة الجزء = الفرق الحقيقي ÷ فرق الأجزاء.',
    estimatedSteps: 4, conceptTags: ['ratio', 'common-term'], parameters: params,
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, diffParts), mul(given, A + B + C))]},
    askedUnknown: 'sumOfAllThree', stageCount: 3,
    // RC2-020. Both printed ratios carry the template's invariants. RC1
    // declared none here at all, so the second edge escaped entirely and sets
    // such as ب : ج = 6 : 2 reached publication unreduced.
    ratio: [
      {a, b, requireReduced: true, requireDistinctSides: true, label: 'first'},
      {a: c, b: d, requireReduced: true, requireDistinctSides: true, label: 'second'}
    ],
    pedagogy: {
      targetSkill: 'UNIFY_COMMON_TERM', targetMisconception: 'MISSED_ONE_STAGE',
      wrongMethodValue: (A + C) * k,
      degenerateWhen: [{when: A === C, note: 'zero difference leaves the scale undetermined'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 3, arithmeticBurden: 4, dependencyDepth: 2},
    textParams: {essentialParams: ['firstA', 'firstB', 'secondB', 'secondC', 'differenceAC']}
  });
}

function addToOneSide(ctx) {
  const {rng} = ctx;
  const p = rng.pick([2, 3, 4, 5]);
  const q = rng.pick([1, 2, 3].filter(v => v !== p && gcd(p, v) === 1));
  if (q === undefined) return resample(ctx, addToOneSide);
  const r = q + rng.pick([1, 2, 3]);
  if (gcd(p, r) !== 1 || p === r) return resample(ctx, addToOneSide);
  const k = rng.int(2, 5);
  const A = p * k, B = q * k, newB = r * k;
  const addUnits = newB - B;
  const correct = A + B;
  const crossLeft = r * p;          // r × p
  const crossRightK = p * q;        // p × q
  const crossRightC = p * addUnits; // p × add
  const coefficient = crossLeft - crossRightK;
  const params = {partA: p, partB: q, newPartB: r, addedUnits: addUnits};
  const distractors = usable(ctx, [
    mk(A, 'USED_WRONG_SIDE_OF_RATIO', `${p} × ${k}`),
    mk(newB, 'USED_POST_ADDITION_VALUE', `${r} × ${k}`),
    mk(A + newB, 'USED_NEW_TOTAL', `${A} + ${newB}`),
    mk(B, 'USED_WRONG_SIDE_OF_RATIO', `${q} × ${k}`),
    mk(k, 'USED_PART_VALUE_AS_ANSWER', `${addUnits} ÷ ${r - q}`),
    mk(addUnits, 'USED_GIVEN_VALUE_AS_ANSWER', `الكمية المضافة ${addUnits}`),
    mk(A - B, 'SUBTRACTED_INSTEAD_OF_ADDED', `${A} − ${B}`),
    mk((p + q) * (k + 1), 'OFF_BY_ONE_STEP', `(${p} + ${q}) × (${k} + 1)`),
    mk((p + q) * (k - 1), 'OFF_BY_ONE_STEP', `(${p} + ${q}) × (${k} − 1)`),
    mk((p + q) * k * 2, 'APPLIED_STEP_TWICE', `(${p} + ${q}) × ${k} × 2`)
  ]);
  const stem = composeSentences(ctx, `النسبة بين أ : ب = ${p} : ${q}. أُضيفت ${u(addUnits, 'unit')} إلى ب فأصبحت النسبة أ : ب = ${p} : ${r}. فما مجموع أ + ب قبل الإضافة؟`);
  return buildBase(ctx, {
    templateId: 'RAT_M_ADD_SIDE',
    subskill: 'تغير النسبة بعد إضافة كمية إلى أحد الطرفين',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: plain,
    // RC2.9.3-2. The idea, not the cross-multiplication: أ did not change and
    // keeps its p parts in both ratios, so the part is the same size before
    // and after, and what was added is exactly (r − q) parts of it.
    steps: [
      `الطرف أ لم يتغير، وله ${u(p, 'part')} في النسبتين؛ إذن قيمة الجزء (ك) واحدة قبل الإضافة وبعدها.`,
      `حصة ب قبل الإضافة ${q}ك، وبعدها ${q}ك + ${addUnits}، وهي تساوي ${r}ك لأن النسبة صارت ${p} : ${r}.`,
      `الأجزاء التي أُضيفت إلى ب = ${r} − ${q} = ${r - q}، أي ${r - q} × ك = ${addUnits}.`,
      `ك = ${addUnits} ÷ ${r - q} = ${k}.`,
      `المجموع قبل الإضافة = ${p} × ${k} + ${q} × ${k} = ${correct}.`
    ],
    howToStart: 'ثبّت الطرف الذي لم يتغير: أجزاؤه هي نفسها قبل الإضافة وبعدها، فالإضافة كلها تقع في أجزاء الطرف الآخر.',
    remember: 'في تغير النسبة، ميّز بوضوح بين القيم الأصلية والقيم بعد التغيير.',
    fastMethod: 'الطرف الثابت يحفظ قيمة الجزء: المضاف ÷ (أجزاء الطرف الآخر بعد − قبل) = قيمة الجزء.',
    estimatedSteps: 4, conceptTags: ['ratio', 'equation'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      // x is A+B = (p+q)k, so k = x/(p+q); the post-addition ratio must hold.
      constraints: [
        eq(mul(X, r, q + p, p), mul(add(mul(q, X), mul(addUnits, p + q)), p, p + q)),
        eq(mod(mul(X, p), p + q), 0)
      ]
    },
    askedUnknown: 'sumBeforeChange', stageCount: 3,
    ratio: [
      {a: p, b: q, requireReduced: true, requireDistinctSides: true, label: 'before'},
      {a: p, b: r, requireReduced: true, requireDistinctSides: true, label: 'after'}
    ],
    pedagogy: {
      targetSkill: 'RATIO_CHANGE_EQUATION', targetMisconception: 'USED_NEW_TOTAL',
      wrongMethodValue: A + newB,
      degenerateWhen: [{when: q === r, note: 'the added amount changes nothing'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, equationSolving: 1, stageCount: 2, arithmeticBurden: 4},
    textParams: {essentialParams: ['partA', 'partB', 'newPartB', 'addedUnits']}
  });
}

function transferBetweenSides(ctx) {
  const {rng} = ctx;
  let found = null;
  for (let t = 0; t < 120; t++) {
    const p = rng.int(3, 6);
    const q = rng.int(1, p - 1);
    if (gcd(p, q) !== 1) continue;
    const k = rng.int(4, 10);
    const A = p * k, B = q * k;
    const x = rng.int(1, Math.min(6, A - 1));
    const newA = A - x, newB = B + x;
    const g = gcd(newA, newB);
    if (g > 1 && newA / g <= 9 && newB / g <= 9 && newA / g !== newB / g) {
      found = {p, q, k, A, B, x, nrA: newA / g, nrB: newB / g};
      break;
    }
  }
  if (!found) return resample(ctx, transferBetweenSides);
  const {p, q, k, A, B, x, nrA, nrB} = found;
  const askA = rng.bool();
  const correct = askA ? A : B;
  const params = {partA: p, partB: q, transferred: x, newPartA: nrA, newPartB: nrB};
  const distractors = usable(ctx, [
    mk(askA ? B : A, 'USED_WRONG_SIDE_OF_RATIO', `الطرف الآخر ${askA ? B : A}`),
    // RC2-012: the value after the transfer and the value before it are the two
    // errors this template exists to catch, and each necessarily sits one
    // transfer away from the value asked for, so each names the step it follows.
    mk(askA ? A - x : B + x, 'USED_POST_TRANSFER_VALUE', `${askA ? `${A} − ${x}` : `${B} + ${x}`}`, 4),
    mk(askA ? A + x : B - x, 'USED_PRE_TRANSFER_VALUE', `${askA ? `${A} + ${x}` : `${B} − ${x}`}`, 4),
    mk(A + B, 'USED_SUM_OF_PARTS', `${A} + ${B}`, 4),
    mk(k, 'USED_PART_VALUE_AS_ANSWER', `قيمة الجزء ${k}`),
    mk((askA ? nrA : nrB) * k, 'USED_POST_TRANSFER_VALUE', `${askA ? nrA : nrB} × ${k}`),
    mk(x, 'USED_GIVEN_VALUE_AS_ANSWER', `الكمية المنقولة ${x}`),
    mk((askA ? p : q) * (k + 1), 'OFF_BY_ONE_STEP', `${askA ? p : q} × (${k} + 1)`),
    mk((askA ? p : q) * (k - 1), 'OFF_BY_ONE_STEP', `${askA ? p : q} × (${k} − 1)`),
    mk(A + B - x, 'USED_POST_TRANSFER_VALUE', `${A + B} − ${x}`)
  ]);
  // RC2.9.3-2. The same algebra, narrated as a tutor does it: expand the
  // brackets, gather like terms, solve. A product with a factor of one is not
  // written out — «9 × 1 = 9» tells the reader nothing.
  const coefficient = nrB * p - nrA * q;
  const constant = nrA * x + nrB * x;
  const products = [[nrB, p], [nrB, x], [nrA, q], [nrA, x]]
    .filter(([m, n]) => m !== 1 && n !== 1)
    .map(([m, n]) => `${m} × ${n} = ${m * n}`);
  const steps = [
    `نضع أ = ${p}ك وب = ${q}ك، والمجموع لا يتغير بالنقل.`,
    `بعد النقل: أ = ${p}ك − ${x}، وب = ${q}ك + ${x}.`,
    `النسبة الجديدة ${nrA} : ${nrB} تعني أن ${nrB} × (${p}ك − ${x}) = ${nrA} × (${q}ك + ${x}).`,
    products.length
      ? `نفك الأقواس: ${products.join('، ')}؛ فتصير المعادلة ${nrB * p}ك − ${nrB * x} = ${nrA * q}ك + ${nrA * x}.`
      : `نفك الأقواس، فتصير المعادلة ${nrB * p}ك − ${nrB * x} = ${nrA * q}ك + ${nrA * x}.`,
    `نجمع حدود ك في طرف والأعداد في الطرف الآخر: معامل ك = ${nrB * p} − ${nrA * q} = ${coefficient}، والعدد المقابل = ${nrA * x} + ${nrB * x} = ${constant}${coefficient === 1 ? '' : `؛ فتصير ${coefficient}ك = ${constant}`}.`,
    `ك = ${constant} ÷ ${coefficient} = ${k}.`,
    `${askA ? 'أ' : 'ب'} قبل النقل = ${askA ? p : q} × ${k} = ${correct}.`
  ];
  const stem = composeSentences(ctx, `النسبة بين أ : ب = ${p} : ${q}. نُقلت ${u(x, 'unit')} من أ إلى ب فأصبحت النسبة أ : ب = ${nrA} : ${nrB}. فما قيمة ${askA ? 'أ' : 'ب'} قبل النقل؟`);
  return buildBase(ctx, {
    templateId: 'RAT_H_TRANSFER',
    subskill: 'نقل كمية بين طرفين وتغير النسبة',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: plain,
    steps,
    howToStart: 'اكتب الطرفين على صورة أجزاء ثم طبّق النقل على الطرفين معًا.',
    remember: 'في النقل، المجموع ثابت لكن كل طرف يتغير بعكس الآخر.',
    fastMethod: 'اكتب الطرفين بعد النقل بدلالة ك، ثم حل معادلة النسبة الجديدة بالضرب التبادلي.',
    estimatedSteps: 5, conceptTags: ['ratio', 'transfer', 'equation'], parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: askA
        ? [eq(mul(sub(X, x), nrB, p), mul(add(mul(q, X), mul(p, x)), nrA)), eq(mod(X, p), 0)]
        : [eq(mul(sub(mul(p, X), mul(q, x)), nrB), mul(mul(add(X, x), q), nrA)), eq(mod(X, q), 0)]
    },
    askedUnknown: askA ? 'sideABeforeTransfer' : 'sideBBeforeTransfer', stageCount: 3,
    ratio: [
      {a: p, b: q, requireReduced: true, requireDistinctSides: true, label: 'before'},
      {a: nrA, b: nrB, requireReduced: true, requireDistinctSides: true, label: 'after'}
    ],
    pedagogy: {
      targetSkill: 'TRANSFER_CONSERVES_TOTAL', targetMisconception: 'USED_POST_TRANSFER_VALUE',
      wrongMethodValue: askA ? A - x : B + x,
      degenerateWhen: [{when: x === 0, note: 'nothing is transferred'}]
    },
    complexityFactors: {reasoningTransformations: 4, conceptCount: 3, equationSolving: 1, stageCount: 3, arithmeticBurden: 5, dependencyDepth: 2},
    textParams: {essentialParams: ['partA', 'partB', 'transferred', 'newPartA', 'newPartB']}
  });
}

function twoRatiosExternalSum(ctx) {
  const {rng} = ctx;
  const drawn = unifyCommonTerm(rng);
  if (!drawn) return resample(ctx, twoRatiosExternalSum);
  const {a, b, c, d, A, B, C} = drawn;
  const k = rng.int(2, 6);
  const given = (A + B) * k;
  const correct = C * k;
  const params = {firstA: a, firstB: b, secondB: c, secondC: d, sumAB: given};
  const distractors = usable(ctx, [
    mk(A * k, 'USED_WRONG_SIDE_OF_RATIO', `${A} × ${k}`, 3),
    mk(B * k, 'USED_WRONG_SIDE_OF_RATIO', `${B} × ${k}`, 3),
    mk((A + C) * k, 'MISSED_ONE_STAGE', `(${A} + ${C}) × ${k}`),
    mk((B + C) * k, 'MISSED_ONE_STAGE', `(${B} + ${C}) × ${k}`),
    mk((A + B + C) * k, 'USED_SUM_OF_PARTS', `(${A} + ${B} + ${C}) × ${k}`),
    mk(k, 'USED_PART_VALUE_AS_ANSWER', `${given} ÷ ${A + B}`),
    // RC2-012: deepened.
    mk(given, 'USED_GIVEN_VALUE_AS_ANSWER', `المجموع المعطى ${given}`),
    mk((A + B) * k, 'USED_SUM_OF_PARTS', `(${A} + ${B}) × ${k}`),
    mk(C * k * 2, 'APPLIED_STEP_TWICE', `${C} × ${k} × 2`),
    mk(given - C * k, 'SUBTRACTED_INSTEAD_OF_ADDED', `${given} − ${C * k}`)
  ]);
  const stem = composeSentences(ctx, `النسبة أ : ب = ${a} : ${b}، والنسبة ب : ج = ${c} : ${d}. إذا كان أ + ب = ${given}، فما قيمة ج؟`);
  return buildBase(ctx, {
    templateId: 'RAT_H_TWO_COMB',
    subskill: 'توحيد نسبتين ثم استخدام مجموع مركب',
    difficulty: 'hard',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: plain,
    steps: [
      `نضرب النسبة الأولى في ${c} والثانية في ${b} ليتساوى حد ب: ${a} × ${c} = ${A}، و${b} × ${c} = ${B}، و${d} × ${b} = ${C}.`,
      `إذن أ : ب : ج = ${A} : ${B} : ${C}.`,
      `أ + ب = ${A} + ${B} = ${A + B}.`,
      `قيمة الجزء الواحد = ${given} ÷ ${A + B} = ${k}.`,
      `ج = ${C} × ${k} = ${correct}.`
    ],
    howToStart: 'وحّد الحد المشترك ثم اربط المعلومة المركبة بالأجزاء.',
    remember: 'بعد التوحيد، كل معلومة عن مجموع أو فرق تصبح عددًا من الأجزاء.',
    fastMethod: 'حوّل أ+ب إلى أجزاء، استخرج قيمة الجزء، ثم احسب ج.',
    estimatedSteps: 5, conceptTags: ['ratio', 'common-term'], parameters: params,
    oracle: {kind: 'constraint', answerKind: 'number', constraints: [eq(mul(X, A + B), mul(given, C))]},
    askedUnknown: 'thirdTerm', stageCount: 3,
    // RC2-020. Both printed ratios carry the template's invariants. RC1
    // declared none here at all, so the second edge escaped entirely and sets
    // such as ب : ج = 6 : 2 reached publication unreduced.
    ratio: [
      {a, b, requireReduced: true, requireDistinctSides: true, label: 'first'},
      {a: c, b: d, requireReduced: true, requireDistinctSides: true, label: 'second'}
    ],
    pedagogy: {
      targetSkill: 'UNIFY_COMMON_TERM', targetMisconception: 'USED_SUM_OF_PARTS',
      wrongMethodValue: (A + B + C) * k,
      degenerateWhen: [{when: b === c, note: 'terms already unified'}]
    },
    complexityFactors: {reasoningTransformations: 3, conceptCount: 2, stageCount: 3, arithmeticBurden: 4, dependencyDepth: 2},
    textParams: {essentialParams: ['firstA', 'firstB', 'secondB', 'secondC', 'sumAB']}
  });
}

// --- RC2.7-3. A largest admissible value ------------------------------------
//
// Every other construction in this family asks for a value that the givens
// determine exactly. This one asks for the largest value the givens ALLOW, which
// is a different question: the answer is pinned by a bound and a wholeness
// condition acting together rather than by an equation, and the natural first
// move — divide the bound by the ratio term — is wrong.
function largestAdmissiblePart(ctx) {
  const {rng} = ctx;
  const p = rng.pick([2, 3, 4, 5]);
  const q = p + rng.pick([1, 2, 3, 4, 5]);
  if (gcd(p, q) !== 1) return resample(ctx, largestAdmissiblePart);
  const sum = p + q;
  const k = rng.int(3, 9);
  // A remainder is what makes the ceiling bite: with the bound an exact multiple
  // of the ratio sum, "divide and take the quotient" would be right by accident
  // and the item would stop measuring the wholeness condition.
  const remainder = rng.int(1, sum - 1);
  const bound = sum * k + remainder;
  const total = sum * k;
  const correct = q * k;
  if (correct < 6 || bound > 400) return resample(ctx, largestAdmissiblePart);
  const params = {firstTerm: p, secondTerm: q, upperBound: bound, largestTotal: total, ratioMultiple: k};
  const distractors = usable(ctx, [
    mk(p * k, 'USED_WRONG_SIDE_OF_RATIO', `${p} × ${k}`, 2),
    mk(total, 'USED_SUM_OF_PARTS', `${sum} × ${k}`, 2),
    mk(q * (k + 1), 'USED_THE_BOUND_ITSELF', `${q} × ${k + 1}`, 2),
    mk(Math.floor(bound / q) , 'DIVIDED_THE_BOUND_BY_THE_RATIO_TERM', `الجزء الصحيح من ${bound} ÷ ${q}`, 1),
    mk(k, 'USED_PART_VALUE_AS_ANSWER', `${total} ÷ ${sum}`, 1),
    mk(bound - total, 'USED_DIFFERENCE_AS_ANSWER', `${bound} − ${total}`, 2),
    mk(q * k - q, 'OFF_BY_ONE_STEP', `${q} × ${k} − ${q}`, 2),
    mk(Math.floor(bound / sum) * p, 'USED_WRONG_SIDE_OF_RATIO', `${k} × ${p}`, 2)
  ]);
  const stem = composeSentences(ctx,
    `تُقسم كمية من الوحدات بين طرفين بنسبة ${p} : ${q}. `
    + `نصيب كل طرف عدد صحيح من الوحدات، ومجموع النصيبين أقل من ${u(bound, 'unit')}. `
    + `فما أكبر عدد ممكن من الوحدات لنصيب الطرف الثاني؟`,
    {askFirst: 'أكبر عدد ممكن من الوحدات لنصيب الطرف الثاني'});
  return buildBase(ctx, {
    templateId: 'RAT_H_MAX_PART',
    subskill: 'أكبر نصيب ممكن تحت حد أعلى',
    difficulty: 'hard',
    scenario: 'bounded_share', direction: 'maximum',
    question: stem.text,
    stemStructure: stem.structure, informationOrder: stem.order,
    correct, distractors, format: v => num(v),
    answerIsCount: true,
    steps: [
      // Worded so that no numeral is immediately followed by a word the
      // construction table does not classify: each clause ends on its equality.
      `النصيبان عددان صحيحان بنسبة ${p} : ${q}؛ أي أن كلًّا منهما حاصل ضرب طرفه في معامل صحيح واحد، ومجموعهما من مضاعفات ${p} + ${q} = ${sum}.`,
      `المجموع دون الحد المعطى، وأكبر مضاعف لمجموع الطرفين يبقى دون ذلك الحد هو ${sum} × ${k} = ${total}؛ أما المضاعف الذي يليه فهو ${total} + ${sum} = ${total + sum}، وهذا يبلغ الحد المعطى أو يتجاوزه.`,
      `عند هذا المجموع يكون معامل النسبة ${k}، فنصيب الطرف الثاني = ${q} × ${k} = ${correct}.`
    ],
    howToStart: 'اسأل أولًا: أي المجاميع ممكنة أصلًا؟ ثم خذ أكبرها.',
    remember: 'عندما يكون النصيبان صحيحين، المجموع من مضاعفات مجموع طرفي النسبة.',
    fastMethod: `اقسم الحد الأعلى على ${sum}، خذ الجزء الصحيح، ثم اضربه في ${q}.`,
    estimatedSteps: 3, conceptTags: ['ratio', 'bound', 'maximum'],
    parameters: params,
    oracle: {
      kind: 'constraint', answerKind: 'number',
      constraints: [
        eq(mul(X, sum), mul(q, total)),
        eq(mod(X, q), 0)
      ]
    },
    askedUnknown: 'largestSecondShare', stageCount: 3,
    pedagogy: {
      targetSkill: 'BOUNDED_INTEGER_SHARE', targetMisconception: 'DIVIDED_THE_BOUND_BY_THE_RATIO_TERM',
      wrongMethodValue: Math.floor(bound / q)
    },
    complexityFactors: {
      reasoningTransformations: 3, conceptCount: 3, conditionCount: 2, stageCount: 3,
      arithmeticBurden: 4, reverseReasoning: 1
    },
    textParams: {essentialParams: ['firstTerm', 'secondTerm', 'upperBound']}
  });
}
