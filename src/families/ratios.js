import {gcd} from '../utils.js';
import {mk, usable, u, num, buildBase, eq, X, add, sub, mul, mod, resample} from './_shared.js';

export function generateRatios({difficulty, rng, seed, engineVersion, telemetry}) {
  const ctx = {difficulty, rng, seed, engineVersion, telemetry, family: 'ratios', family_ar: 'النسب وتقسيم الكميات', category: 'النسب وتقسيم الكميات'};
  const list = difficulty === 'easy' ? [splitTotal, scaleKnown]
    : difficulty === 'medium' ? [commonTermSum, commonTermDifference, addToOneSide]
    : [transferBetweenSides, twoRatiosExternalSum];
  return rng.pick(list)(ctx);
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
    mk(total / (a + b) * Math.max(1, mine - 1), 'MISSED_ONE_STAGE', `${k} × (${mine} − 1)`),
    mk(total / mine, 'REVERSED_DIRECT_PROPORTION', `${total} ÷ ${mine}`),
    mk(total, 'USED_ORIGINAL_TOTAL', `المجموع المعطى ${total}`),
    mk(mine * other, 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE', `${mine} × ${other}`),
    mk(total / 2, 'USED_ARITHMETIC_MEAN_OF_AVERAGES', `${total} ÷ 2`),
    mk(total / other, 'REVERSED_DIRECT_PROPORTION', `${total} ÷ ${other}`),
    mk(a * b * k, 'MULTIPLIED_COUNTS_INSTEAD_OF_RATE', `${a} × ${b} × ${k}`),
    mk(total * mine / other, 'REVERSED_DIRECT_PROPORTION', `${total} × ${mine} ÷ ${other}`),
    mk(k * mine * 2, 'APPLIED_STEP_TWICE', `${k} × ${mine} × 2`)
  ]);
  return buildBase(ctx, {
    templateId: 'RAT_E_SPLIT',
    subskill: 'تقسيم مجموع وفق نسبة',
    difficulty: 'easy',
    question: `النسبة بين أ : ب = ${a} : ${b}. إذا كان مجموعهما ${total}، فما قيمة ${askA ? 'أ' : 'ب'}؟`,
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
  return buildBase(ctx, {
    templateId: 'RAT_E_KNOWN',
    subskill: 'استخدام قيمة طرف معلوم في نسبة',
    difficulty: 'easy',
    question: `النسبة أ : ب = ${a} : ${b}. إذا كانت ${askB ? 'أ' : 'ب'} = ${given}، فما قيمة ${askB ? 'ب' : 'أ'}؟`,
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
function unifyCommonTerm(rng) {
  const a = rng.int(1, 4), b = rng.int(2, 5);
  let c = rng.int(2, 6);
  // Section 10: when b already equals c there is nothing to unify, and the
  // template stops measuring the skill it exists for.
  if (c === b) c = c === 6 ? 5 : c + 1;
  const d = rng.int(2, 6);
  return {a, b, c, d, A: a * c, B: b * c, C: d * b, unified: true};
}

function commonTermSum(ctx) {
  const {rng} = ctx;
  const {a, b, c, d, A, B, C} = unifyCommonTerm(rng);
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
  return buildBase(ctx, {
    templateId: 'RAT_M_COMMON_SUM',
    subskill: 'نسبتان بحد مشترك مع مجموع الطرفين الخارجيين',
    difficulty: 'medium',
    question: `النسبة أ : ب = ${a} : ${b}، والنسبة ب : ج = ${c} : ${d}. إذا كان أ + ج = ${given}، فما قيمة ب؟`,
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
  return buildBase(ctx, {
    templateId: 'RAT_M_COMMON_DIFF',
    subskill: 'نسبتان بحد مشترك مع فرق الطرفين',
    difficulty: 'medium',
    question: `النسبة أ : ب = ${a} : ${b}، والنسبة ب : ج = ${c} : ${d}. إذا كان الفرق بين أ وج يساوي ${given}، فما مجموع أ + ب + ج؟`,
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
    mk(k, 'USED_PART_VALUE_AS_ANSWER', `${crossRightC} ÷ ${coefficient}`),
    mk(addUnits, 'USED_GIVEN_VALUE_AS_ANSWER', `الكمية المضافة ${addUnits}`),
    mk(A - B, 'SUBTRACTED_INSTEAD_OF_ADDED', `${A} − ${B}`),
    mk((p + q) * (k + 1), 'OFF_BY_ONE_STEP', `(${p} + ${q}) × (${k} + 1)`),
    mk((p + q) * (k - 1), 'OFF_BY_ONE_STEP', `(${p} + ${q}) × (${k} − 1)`),
    mk((p + q) * k * 2, 'APPLIED_STEP_TWICE', `(${p} + ${q}) × ${k} × 2`)
  ]);
  return buildBase(ctx, {
    templateId: 'RAT_M_ADD_SIDE',
    subskill: 'تغير النسبة بعد إضافة كمية إلى أحد الطرفين',
    difficulty: 'medium',
    question: `النسبة بين أ : ب = ${p} : ${q}. أُضيفت ${u(addUnits, 'unit')} إلى ب فأصبحت النسبة أ : ب = ${p} : ${r}. فما مجموع أ + ب قبل الإضافة؟`,
    correct, distractors, format: plain,
    steps: [
      `نضع أ = ${p}ك وب = ${q}ك، حيث ك قيمة الجزء.`,
      `بعد الإضافة تصبح ب = ${q}ك + ${addUnits}، والنسبة أ : ب = ${p} : ${r}.`,
      `بالضرب التبادلي: ${r} × ${p}ك = ${p} × (${q}ك + ${addUnits}).`,
      `نحسب المعاملات: ${r} × ${p} = ${crossLeft} و${p} × ${q} = ${crossRightK} و${p} × ${addUnits} = ${crossRightC}؛ فتصير المعادلة ${crossLeft}ك = ${crossRightK}ك + ${crossRightC}.`,
      `بطرح الحدين المتشابهين: ${crossLeft} − ${crossRightK} = ${coefficient}، إذن ${coefficient}ك = ${crossRightC}.`,
      `ك = ${crossRightC} ÷ ${coefficient} = ${k}.`,
      `المجموع قبل الإضافة = ${p} × ${k} + ${q} × ${k} = ${correct}.`
    ],
    howToStart: 'ثبت الطرف الذي لم يتغير، ثم اكتب معادلة النسبة بعد الإضافة.',
    remember: 'في تغير النسبة، ميّز بوضوح بين القيم الأصلية والقيم بعد التغيير.',
    fastMethod: 'اكتب الطرفين بدلالة ك ثم حل معادلة الضرب التبادلي.',
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
  const steps = [
    `نضع أ = ${p}ك وب = ${q}ك.`,
    `بعد النقل: أ = ${p}ك − ${x}، وب = ${q}ك + ${x}، والمجموع لم يتغير.`,
    `النسبة الجديدة ${nrA} : ${nrB} تعطي المعادلة ${nrB} × (${p}ك − ${x}) = ${nrA} × (${q}ك + ${x}).`,
    `نحسب المعاملات: ${nrB} × ${p} = ${nrB * p} و${nrA} × ${q} = ${nrA * q} و${nrB} × ${x} = ${nrB * x} و${nrA} × ${x} = ${nrA * x}.`,
    `فتصير المعادلة ${nrB * p}ك − ${nrB * x} = ${nrA * q}ك + ${nrA * x}، ومنها ${nrB * p} − ${nrA * q} = ${nrB * p - nrA * q} و${nrB * x} + ${nrA * x} = ${nrB * x + nrA * x}.`,
    `ك = ${nrB * x + nrA * x} ÷ ${nrB * p - nrA * q} = ${k}.`,
    `${askA ? 'أ' : 'ب'} قبل النقل = ${askA ? p : q} × ${k} = ${correct}.`
  ];
  return buildBase(ctx, {
    templateId: 'RAT_H_TRANSFER',
    subskill: 'نقل كمية بين طرفين وتغير النسبة',
    difficulty: 'hard',
    question: `النسبة بين أ : ب = ${p} : ${q}. نُقلت ${u(x, 'unit')} من أ إلى ب فأصبحت النسبة أ : ب = ${nrA} : ${nrB}. فما قيمة ${askA ? 'أ' : 'ب'} قبل النقل؟`,
    correct, distractors, format: plain,
    steps,
    howToStart: 'اكتب الطرفين على صورة أجزاء ثم طبّق النقل على الطرفين معًا.',
    remember: 'في النقل، المجموع ثابت لكن كل طرف يتغير بعكس الآخر.',
    fastMethod: 'استخدم بقاء المجموع وثبات مقدار النقل لتحديد مقياس النسبة.',
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
  const {a, b, c, d, A, B, C} = unifyCommonTerm(rng);
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
  return buildBase(ctx, {
    templateId: 'RAT_H_TWO_COMB',
    subskill: 'توحيد نسبتين ثم استخدام مجموع مركب',
    difficulty: 'hard',
    question: `النسبة أ : ب = ${a} : ${b}، والنسبة ب : ج = ${c} : ${d}. إذا كان أ + ب = ${given}، فما قيمة ج؟`,
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
